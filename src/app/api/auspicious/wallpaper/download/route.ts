/**
 * 牧心堂 · POST /api/auspicious/wallpaper/download
 *
 * 吉祥馆壁纸下载的"额度 + 积分兑换"网关。
 *
 * 业务规则：
 *   - 付费会员（monthly/yearly/lifetime）：无限免费下载，不消耗额度
 *   - 免费道友（free）：
 *       · 每月 1 张免费额度（wallpaper_month / wallpaper_used 跟踪）
 *       · 当月额度用完后，可消耗 50 藏经阁积分兑换一次下载
 *
 * Request Body:
 *   { mode: 'free' | 'credits' }
 *     - mode='free'    → 消耗当月免费额度（free 用户每月 1 次；付费用户直接放行）
 *     - mode='credits' → 消耗 50 积分兑换一次（仅 free 用户额度耗尽时使用）
 *
 * Response:
 *   200 { ok: true, balance?, wallpaperUsed?, wallpaperMonth? }
 *   401 { ok: false, error: 'unauthenticated' }
 *   402 { ok: false, error: 'quota_exhausted' | 'insufficient_credits', ... }
 *   503 { ok: false, error: 'unconfigured' }
 *
 * 设计说明：
 *   - 本接口只做"额度/积分的扣减与记录"，不代理图片字节
 *   - 前端在收到 ok=true 后，再 fetch imgUrl 下载（imgUrl 本就在 <img src> 中可见）
 *   - 积分扣减复用 increment_credits RPC，保证原子性与 check 约束
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthClient, isSupabaseAuthConfigured } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 藏经阁积分兑换一次壁纸下载的成本 */
const CREDITS_COST = 50;
/** 免费道友每月免费额度 */
const FREE_MONTHLY_QUOTA = 1;

/** 当前月份 'YYYY-MM'（服务器本地时区，足够用） */
function currentMonth(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

interface DownloadBody {
  mode?: unknown;
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
  let body: DownloadBody;
  try {
    body = (await req.json()) as DownloadBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }
  const mode = body.mode === 'credits' ? 'credits' : body.mode === 'free' ? 'free' : null;
  if (!mode) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: 'mode must be free|credits' },
      { status: 400 },
    );
  }

  // 3) 读 profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error: profileErr } = await (sb.from('user_profiles') as any)
    .select('tier, credits, wallpaper_month, wallpaper_used')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr) {
    console.warn('[api/wallpaper/download] query profile failed:', profileErr);
    return NextResponse.json(
      { ok: false, error: 'db_error' },
      { status: 500 },
    );
  }

  const tier = (profile?.tier as string) ?? 'free';
  const credits = (profile?.credits as number) ?? 0;
  const storedMonth = (profile?.wallpaper_month as string | null) ?? null;
  const storedUsed = (profile?.wallpaper_used as number) ?? 0;

  const month = currentMonth();
  // 跨月自动重置
  const effectiveUsed = storedMonth === month ? storedUsed : 0;

  const isPaid = tier !== 'free';

  // 4) mode='free'：消耗免费额度
  if (mode === 'free') {
    // 付费会员：无限免费，不消耗额度
    if (isPaid) {
      return NextResponse.json({
        ok: true,
        unlimited: true,
        wallpaperUsed: effectiveUsed,
        wallpaperMonth: month,
      });
    }
    // 免费道友：检查当月额度
    if (effectiveUsed < FREE_MONTHLY_QUOTA) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updErr } = await (sb.from('user_profiles') as any)
        .update({
          wallpaper_month: month,
          wallpaper_used: effectiveUsed + 1,
        })
        .eq('id', userId);
      if (updErr) {
        console.warn('[api/wallpaper/download] update quota failed:', updErr);
        return NextResponse.json(
          { ok: false, error: 'db_error' },
          { status: 500 },
        );
      }
      return NextResponse.json({
        ok: true,
        wallpaperUsed: effectiveUsed + 1,
        wallpaperMonth: month,
        freeRemaining: FREE_MONTHLY_QUOTA - (effectiveUsed + 1),
      });
    }
    // 额度耗尽 → 提示可积分兑换
    return NextResponse.json(
      {
        ok: false,
        error: 'quota_exhausted',
        canExchange: true,
        creditsCost: CREDITS_COST,
        balance: credits,
      },
      { status: 402 },
    );
  }

  // 5) mode='credits'：消耗 50 积分兑换
  //    付费会员无需积分（直接走 free 模式即可），这里也放行不扣
  if (isPaid) {
    return NextResponse.json({
      ok: true,
      unlimited: true,
      balance: credits,
    });
  }

  if (credits < CREDITS_COST) {
    return NextResponse.json(
      {
        ok: false,
        error: 'insufficient_credits',
        required: CREDITS_COST,
        balance: credits,
      },
      { status: 402 },
    );
  }

  // 原子扣减（check 约束兜底竞态）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newBalance, error: rpcErr } = await (sb.rpc as any)(
    'increment_credits',
    { p_user_id: userId, p_delta: -CREDITS_COST },
  );

  if (rpcErr) {
    console.warn(
      `[api/wallpaper/download] credits rpc failed (user=${userId}):`,
      rpcErr.message,
    );
    return NextResponse.json(
      {
        ok: false,
        error: 'insufficient_credits',
        required: CREDITS_COST,
        balance: credits,
      },
      { status: 402 },
    );
  }

  const finalBalance = (newBalance as number) ?? 0;
  console.info(
    `[api/wallpaper/download] user=${userId} exchanged ${CREDITS_COST} credits, balance=${credits}->${finalBalance}`,
  );

  return NextResponse.json({
    ok: true,
    balance: finalBalance,
    spent: CREDITS_COST,
    wallpaperUsed: effectiveUsed,
    wallpaperMonth: month,
  });
}
