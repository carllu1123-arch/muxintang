/**
 * 牧心堂 · POST /api/user/spend
 *
 * 通用积分扣减接口（藏经阁积分流通体系）。
 *
 * 当前消耗场景：
 *   - wallpaper  壁纸下载积分兑换（50 积分/次）
 *   - poster     金句海报生成（20 积分/次）
 *   - 后续可扩展：AI 解读、专属内容解锁等
 *
 * Request Body:
 *   {
 *     amount: number  (正整数，必填)
 *     reason: string  (场景标识，必填，用于审计/日志)
 *   }
 *
 * Response:
 *   200 { ok: true, balance: number, spent: number }
 *   400 { ok: false, error: 'invalid_input' }
 *   401 { ok: false, error: 'unauthenticated' }
 *   402 { ok: false, error: 'insufficient_credits', required, balance }
 *   503 { ok: false, error: 'unconfigured' }
 *
 * 安全：
 *   - 通过 auth.uid() 拿到 userId，RLS 保证只能改自己
 *   - 扣减前先查余额，避免无谓的 RPC 调用
 *   - 使用 increment_credits(p_delta = -amount) RPC 原子扣减
 *   - user_profiles.credits 有 check (credits >= 0) 约束，
 *     并发竞态导致余额变负时 RPC 会抛异常 → 兜底返回 insufficient_credits
 *   - reason 仅写入日志，不落库（如需审计可后续建 credits_log 表）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthClient, isSupabaseAuthConfigured } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SpendBody {
  amount?: unknown;
  reason?: unknown;
}

export async function POST(req: NextRequest) {
  if (!isSupabaseAuthConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'unconfigured' },
      { status: 503 },
    );
  }

  // 1) 鉴权
  const sb = await getAuthClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: 'unconfigured' },
      { status: 503 },
    );
  }
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json(
      { ok: false, error: 'unauthenticated' },
      { status: 401 },
    );
  }
  const userId = userData.user.id;

  // 2) 解析 body
  let body: SpendBody;
  try {
    body = (await req.json()) as SpendBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const amountRaw = body.amount;
  const amount =
    typeof amountRaw === 'number' && Number.isFinite(amountRaw)
      ? Math.floor(amountRaw)
      : NaN;
  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: 'amount must be positive integer' },
      { status: 400 },
    );
  }

  const reason =
    typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 64)
      : '';
  if (!reason) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: 'reason required' },
      { status: 400 },
    );
  }

  // 3) 查当前余额
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error: profileErr } = await (sb.from('user_profiles') as any)
    .select('credits')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr) {
    console.warn('[api/user/spend] query credits failed:', profileErr);
    return NextResponse.json(
      { ok: false, error: 'db_error' },
      { status: 500 },
    );
  }
  const balance = (profile?.credits as number) ?? 0;

  if (balance < amount) {
    return NextResponse.json(
      {
        ok: false,
        error: 'insufficient_credits',
        required: amount,
        balance,
      },
      { status: 402 },
    );
  }

  // 4) 原子扣减（RPC：increment_credits(userId, -amount)）
  //    并发竞态下若 credits 变负，CHECK 约束会抛异常 → 兜底返回 insufficient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newBalance, error: rpcErr } = await (sb.rpc as any)(
    'increment_credits',
    { p_user_id: userId, p_delta: -amount },
  );

  if (rpcErr) {
    console.warn(
      `[api/user/spend] rpc failed (reason=${reason}, amount=${amount}):`,
      rpcErr.message,
    );
    // 大概率是 check 约束（credits >= 0）触发
    return NextResponse.json(
      {
        ok: false,
        error: 'insufficient_credits',
        required: amount,
        balance,
      },
      { status: 402 },
    );
  }

  const finalBalance = (newBalance as number) ?? 0;
  console.info(
    `[api/user/spend] user=${userId} spent=${amount} reason=${reason} balance=${balance}->${finalBalance}`,
  );

  return NextResponse.json({
    ok: true,
    balance: finalBalance,
    spent: amount,
  });
}
