/**
 * 牧心堂 · POST /api/user/birth
 *
 * 更新当前登录用户的生辰档案（生命代码 → 情缘合盘互通用）。
 *
 * Request Body:
 *   {
 *     birthDate: string  (YYYY-MM-DD，必填)
 *     birthHour?: number (0-23，可选)
 *     gender?:    '男' | '女' (可选)
 *   }
 *
 * Response:
 *   200 { ok: true, user: { id, birthDate, birthHour, gender } }
 *   400 { ok: false, error: 'invalid_input' }
 *   401 { ok: false, error: 'unauthenticated' }
 *   503 { ok: false, error: 'unconfigured' }
 *
 * 安全：
 *   - 使用 auth.uid() 拿到的 user.id 写入（与 RLS `auth.uid() = id` 对齐）
 *   - 不接受他人 id；只更新当前用户自己
 *   - 未登录 → 401；未配置 → 503（不静默）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthClient, isSupabaseAuthConfigured } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BirthBody {
  birthDate?: unknown;
  birthHour?: unknown;
  gender?: unknown;
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
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
  let body: BirthBody;
  try {
    body = (await req.json()) as BirthBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const birthDate = typeof body.birthDate === 'string' ? body.birthDate : '';
  if (!isValidDate(birthDate)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_birthDate' },
      { status: 400 },
    );
  }

  let birthHour: number | null = null;
  if (body.birthHour !== undefined && body.birthHour !== null) {
    const h = Number(body.birthHour);
    if (!Number.isFinite(h) || h < 0 || h > 23 || !Number.isInteger(h)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_birthHour' },
        { status: 400 },
      );
    }
    birthHour = h;
  }

  let gender: '男' | '女' | null = null;
  if (body.gender === '男' || body.gender === '女') {
    gender = body.gender;
  } else if (body.gender !== undefined && body.gender !== null) {
    return NextResponse.json(
      { ok: false, error: 'invalid_gender' },
      { status: 400 },
    );
  }

  // 3) 写入（使用 auth.uid() 拿到的 userId，RLS 会校验）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (sb.from('user_profiles') as any)
    .update({ birth_date: birthDate, birth_hour: birthHour, gender })
    .eq('id', userId);

  if (updateErr) {
    console.warn('[api/user/birth] update failed:', updateErr);
    return NextResponse.json(
      { ok: false, error: 'db_error', detail: updateErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: userId,
      birthDate,
      birthHour,
      gender,
    },
  });
}
