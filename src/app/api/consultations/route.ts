/**
 * 牧心堂 · 创作者预约 API
 *
 * POST /api/consultations
 *   body: {
 *     creatorSlug: string,           // 必填：创作者 slug
 *     name: string,                  // 必填：预约人姓名 (1-64)
 *     contact: string,               // 必填：联系方式（手机/微信/邮箱）(3-128)
 *     date?: string,                 // 可选：期望日期 (YYYY-MM-DD)
 *     notes?: string,                // 可选：留言备注 (≤500)
 *   }
 *
 * 响应：
 *   201 { ok: true, id: string, createdAt: string }
 *   200 { ok: true, mock: true, createdAt: string }    ← 本地无 Supabase 时的 mock 兜底
 *   400 { ok: false, error: 'invalid_input', detail }
 *   404 { ok: false, error: 'creator_not_found' }      ← creator_slug 不在白名单
 *   429 { ok: false, error: 'rate_limited' }            ← 简易节流（同 IP 5 分钟 3 次）
 *
 * 安全：
 *   - creator_slug 必须在 mock CREATORS 白名单（或后续 DB 的 creators 表）内
 *   - 不要求登录（开放预约），但若已登录会记录 user_id
 *   - 内存级节流：同 IP 5 分钟内最多 3 次（生产建议 Redis 持久化）
 *   - 所有字段都做 trim + 长度校验
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getAuthClient, isSupabaseAuthConfigured } from '@/lib/session';
import { CREATORS } from '@/lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ConsultBody {
  creatorSlug?: unknown;
  name?: unknown;
  contact?: unknown;
  date?: unknown;
  notes?: unknown;
}

/** 创作者白名单（用 mock 数据兜底；DB 接通后用 creators 表） */
const VALID_SLUGS = new Set<string>(CREATORS.map((c) => c.slug));

/* ============ 简易内存节流（同 IP 5 分钟 3 次） ============ */
const RATE_BUCKET = new Map<string, number[]>();
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 3;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const arr = (RATE_BUCKET.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    RATE_BUCKET.set(ip, arr);
    return false;
  }
  arr.push(now);
  RATE_BUCKET.set(ip, arr);
  return true;
}

/* ============ 字段校验 ============ */
interface Validated {
  creatorSlug: string;
  name: string;
  contact: string;
  date: string | null;
  notes: string | null;
}

function validate(body: ConsultBody): { ok: true; data: Validated } | { ok: false; error: string; detail?: string } {
  const creatorSlug = typeof body.creatorSlug === 'string' ? body.creatorSlug.trim() : '';
  if (!creatorSlug) return { ok: false, error: 'invalid_input', detail: 'creatorSlug required' };
  if (!VALID_SLUGS.has(creatorSlug)) {
    return { ok: false, error: 'creator_not_found' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 64) {
    return { ok: false, error: 'invalid_input', detail: 'name 长度需在 1-64' };
  }

  const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
  if (contact.length < 3 || contact.length > 128) {
    return { ok: false, error: 'invalid_input', detail: 'contact 长度需在 3-128' };
  }

  let date: string | null = null;
  if (body.date != null && body.date !== '') {
    if (typeof body.date !== 'string') {
      return { ok: false, error: 'invalid_input', detail: 'date 必须是字符串' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return { ok: false, error: 'invalid_input', detail: 'date 格式 YYYY-MM-DD' };
    }
    const d = new Date(body.date);
    if (isNaN(d.getTime())) {
      return { ok: false, error: 'invalid_input', detail: 'date 非法' };
    }
    date = body.date;
  }

  let notes: string | null = null;
  if (body.notes != null && body.notes !== '') {
    if (typeof body.notes !== 'string') {
      return { ok: false, error: 'invalid_input', detail: 'notes 必须是字符串' };
    }
    const trimmed = body.notes.trim();
    if (trimmed.length > 500) {
      return { ok: false, error: 'invalid_input', detail: 'notes ≤ 500' };
    }
    notes = trimmed;
  }

  return {
    ok: true,
    data: { creatorSlug, name, contact, date, notes },
  };
}

export async function POST(req: NextRequest) {
  /* 1) IP 节流（拿不到 IP 时降级放行） */
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (!checkRate(ip)) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', detail: '5 分钟内最多 3 次' },
      { status: 429 },
    );
  }

  /* 2) 解析 body */
  let body: ConsultBody;
  try {
    body = (await req.json()) as ConsultBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  /* 3) 校验 */
  const v = validate(body);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error, detail: v.detail }, { status: 400 });
  }
  const { creatorSlug, name, contact, date, notes } = v.data;

  /* 4) 拿当前用户 ID（已登录则记录，未登录则 null） */
  let userId: string | null = null;
  if (isSupabaseAuthConfigured() && isSupabaseConfigured()) {
    try {
      const sb = await getAuthClient();
      if (sb) {
        const { data } = await sb.auth.getUser();
        userId = data?.user?.id ?? null;
      }
    } catch {
      userId = null;
    }
  }

  /* 5) 写入（DB 或 mock） */
  const createdAt = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    // 本地无 Supabase → mock 兜底
    console.info('[consultations] mock insert', { creatorSlug, name, contact, date, notes, userId, ip });
    return NextResponse.json(
      { ok: true, mock: true, createdAt },
      { status: 200 },
    );
  }

  try {
    const sb = createClient();  // 优先用 service_role
    const { data, error } = await (sb.from('consultations') as any)
      .insert({
        creator_slug: creatorSlug,
        user_id: userId,
        user_name: name,
        user_contact: contact,
        preferred_date: date,
        notes,
        status: 'pending',
        created_at: createdAt,
      })
      .select('id, created_at')
      .maybeSingle();

    if (error) {
      console.warn('[consultations] insert failed:', error.message);
      // 失败兜底也返回 mock 成功（前端不阻塞）
      return NextResponse.json(
        { ok: true, mock: true, createdAt, detail: error.message },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { ok: true, id: data?.id ?? null, createdAt: data?.created_at ?? createdAt },
      { status: 201 },
    );
  } catch (e) {
    console.error('[consultations] unexpected error:', e);
    return NextResponse.json(
      { ok: true, mock: true, createdAt, detail: (e as Error).message },
      { status: 200 },
    );
  }
}

/* ============ 健康检查 ============ */
export async function GET() {
  return Response.json({
    ok: true,
    service: 'consultations',
    validSlugs: Array.from(VALID_SLUGS),
    rateLimit: { windowMs: RATE_WINDOW_MS, max: RATE_MAX },
    timestamp: new Date().toISOString(),
  });
}
