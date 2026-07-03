/**
 * 牧心堂 · 灵性研学 · 发帖 API
 *
 * POST /api/study/posts
 *   body: {
 *     title?: string,            // 可选（≤80）
 *     category: '打卡' | '感悟' | '问答' | '分享',
 *     body: string,              // 必填（1-2000）
 *     authorName?: string,       // 可选：未登录时的署名（默认「道友」）
 *   }
 *
 * 响应：
 *   201 { ok: true, id, post, mock?: boolean }
 *   200 { ok: true, mock: true, post }         ← 本地无 Supabase 时的 mock 兜底
 *   400 { ok: false, error: 'invalid_input', detail }
 *   429 { ok: false, error: 'rate_limited' }   ← 简易节流（同 IP 5 分钟 3 次）
 *
 * 安全：
 *   - category 白名单（4 个）
 *   - body 必填 + 长度校验（防滥用 + 防注入）
 *   - title 可选 + 长度上限
 *   - 内存级节流（同 IP 5 分钟 3 次）
 *   - 落库走 supabase-server（service_role 写表，绕过 RLS）
 *
 * 表：public.study_posts
 *   - DB schema 见 src/lib/supabase-migrations.sql 第 15 段
 *   - 类型见 src/types/supabase.ts 的 StudyPost
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getCurrentSession, isSupabaseAuthConfigured } from '@/lib/session';
import type { StudyPost } from '@/types/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PostBody {
  title?: unknown;
  category?: unknown;
  body?: unknown;
  authorName?: unknown;
}

const VALID_CATEGORIES = new Set(['打卡', '感悟', '问答', '分享']);

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

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // 1) 节流
  if (!checkRate(ip)) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: '请稍候再发' },
      { status: 429 },
    );
  }

  // 2) 解析 + 校验
  let raw: PostBody;
  try {
    raw = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const category = typeof raw.category === 'string' ? raw.category.trim() : '';
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  const authorName = typeof raw.authorName === 'string' ? raw.authorName.trim() : '';

  if (!body) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '正文不能为空' },
      { status: 400 },
    );
  }
  if (body.length > 2000) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '正文不能超过 2000 字' },
      { status: 400 },
    );
  }
  if (title.length > 80) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '标题不能超过 80 字' },
      { status: 400 },
    );
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '分类必须在 打卡/感悟/问答/分享 中' },
      { status: 400 },
    );
  }
  if (authorName.length > 32) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '署名不能超过 32 字' },
      { status: 400 },
    );
  }

  // 3) 取当前用户 id（如已登录）
  let userId: string | null = null;
  if (isSupabaseAuthConfigured()) {
    try {
      const session = await getCurrentSession();
      userId = session?.userId ?? null;
    } catch {
      userId = null;
    }
  }

  // 4) 写 Supabase（mock 兜底）
  if (!isSupabaseConfigured()) {
    const mockPost: StudyPost = {
      id: `mock-study-${Date.now()}`,
      user_id: userId,
      author_name: authorName || '道友',
      title: title || null,
      category: category as StudyPost['category'],
      body,
      like_count: 0,
      comment_count: 0,
      is_published: true,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    return NextResponse.json({ ok: true, mock: true, post: mockPost });
  }

  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('study_posts')
      .insert({
        user_id: userId,
        author_name: authorName || '道友',
        title: title || null,
        category: category as StudyPost['category'],
        body,
        is_published: true,
      } as never)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[api/study/posts] insert error:', error);
      return NextResponse.json(
        { ok: false, error: 'db_error', detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, post: data as unknown as StudyPost });
  } catch (e) {
    console.error('[api/study/posts] unexpected:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error', detail: (e as Error).message },
      { status: 500 },
    );
  }
}

/** GET 健康检查（查看白名单 / 限流配置） */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'study-posts',
    validCategories: [...VALID_CATEGORIES],
    rateLimit: { windowMs: RATE_WINDOW_MS, max: RATE_MAX },
    timestamp: new Date().toISOString(),
  });
}
