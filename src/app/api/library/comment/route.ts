/**
 * 牧心堂 · 行者故事评论 API
 *
 * GET  /api/library/comment?slug=xxx  — 获取某章节的评论列表
 * POST /api/library/comment           — 提交新评论
 *
 * 表：chapter_comments (id, chapter_slug, user_id, author_name, author_role, body, reading_tag, is_featured)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getAuthClient } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 模拟评论数据（Supabase 未配置时兜底） */
const MOCK_COMMENTS: Record<string, Array<{
  id: string;
  chapter_slug: string;
  author_name: string;
  author_role: string;
  body: string;
  reading_tag: string | null;
  is_featured: boolean;
  created_at: string;
}>> = {
  'ch1-the-call': [
    {
      id: 'mock_c1',
      chapter_slug: 'ch1-the-call',
      author_name: '寂光阿阇梨',
      author_role: 'acharya',
      body: '这一声钟响，敲的不是山门，是心门。道友若有所感，不妨在此留下你的修行随感。',
      reading_tag: null,
      is_featured: true,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'mock_c2',
      chapter_slug: 'ch1-the-call',
      author_name: '行路人',
      author_role: 'reader',
      body: '读到"他回头"这一句，忽然鼻酸。原来修行第一步，不是向前走，是敢回头。',
      reading_tag: '读到第 1 段产生此感',
      is_featured: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: '缺少 slug 参数' }, { status: 400 });
  }

  // Mock 兜底
  if (!isSupabaseConfigured()) {
    const list = MOCK_COMMENTS[slug] ?? [];
    // 精选置顶 + 时间倒序
    const sorted = [...list].sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return NextResponse.json({ comments: sorted });
  }

  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('chapter_comments')
      .select('*')
      .eq('chapter_slug', slug)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/library/comment] query failed:', error);
      return NextResponse.json({ comments: MOCK_COMMENTS[slug] ?? [] });
    }

    return NextResponse.json({ comments: data ?? [] });
  } catch (e) {
    console.error('[api/library/comment] unexpected:', e);
    return NextResponse.json({ comments: MOCK_COMMENTS[slug] ?? [] });
  }
}

export async function POST(req: NextRequest) {
  let body: {
    chapter_slug?: unknown;
    body?: unknown;
    reading_tag?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须为 JSON' }, { status: 400 });
  }

  const chapterSlug = typeof body.chapter_slug === 'string' ? body.chapter_slug.trim() : '';
  if (!chapterSlug) {
    return NextResponse.json({ error: '缺少章节 slug' }, { status: 400 });
  }
  const commentText = typeof body.body === 'string' ? body.body.trim() : '';
  if (!commentText || commentText.length > 500) {
    return NextResponse.json({ error: '留言内容无效（1-500 字）' }, { status: 400 });
  }
  const readingTag =
    typeof body.reading_tag === 'string' ? body.reading_tag.trim().slice(0, 50) : null;

  // 读取登录用户
  let userId: string | null = null;
  let authorName = '匿名道友';
  let authorRole = 'reader';
  try {
    const authClient = await getAuthClient();
    if (authClient) {
      const { data: userData } = await authClient.auth.getUser();
      if (userData?.user) {
        userId = userData.user.id;
        authorName =
          (userData.user.user_metadata?.display_name as string) ||
          userData.user.email?.split('@')[0] ||
          '道友';
        // 读 profile.role
         
        const { data: profile } = await (authClient.from('user_profiles') as any)
          .select('display_name, role')
          .eq('id', userData.user.id)
          .maybeSingle();
         
        const p = profile as any;
        if (p) {
          if (p.display_name) authorName = p.display_name;
          if (p.role === 'acharya' || p.role === 'admin') {
            authorRole = p.role;
          }
        }
      }
    }
  } catch {
    /* 未登录静默 */
  }

  // Mock 兜底
  if (!isSupabaseConfigured()) {
    const newComment = {
      id: `mock_c${Date.now()}`,
      chapter_slug: chapterSlug,
      author_name: authorName,
      author_role: authorRole,
      body: commentText,
      reading_tag: readingTag,
      is_featured: false,
      created_at: new Date().toISOString(),
    };
    const list = MOCK_COMMENTS[chapterSlug] ?? [];
    list.push(newComment);
    MOCK_COMMENTS[chapterSlug] = list;
    return NextResponse.json({ ok: true, comment: newComment, mock: true });
  }

  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('chapter_comments')
      .insert({
        chapter_slug: chapterSlug,
        user_id: userId,
        author_name: authorName,
        author_role: authorRole,
        body: commentText,
        reading_tag: readingTag,
        is_featured: false,
      } as never)
      .select('*')
      .single();

    if (error) {
      console.error('[api/library/comment] insert failed:', error);
      return NextResponse.json({ error: '留言失败，请稍后重试' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, comment: data });
  } catch (e) {
    console.error('[api/library/comment] unexpected:', e);
    return NextResponse.json({ error: '服务异常' }, { status: 500 });
  }
}

/**
 * PATCH /api/library/comment?id=xxx
 * 阿阇梨精选置顶：仅 role='acharya' 或 'admin' 可调用
 * body: { is_featured: boolean }
 */
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少评论 id' }, { status: 400 });
  }

  let body: { is_featured?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须为 JSON' }, { status: 400 });
  }
  const isFeatured = body.is_featured === true;

  // 校验当前用户角色
  let userRole = 'reader';
  try {
    const authClient = await getAuthClient();
    if (authClient) {
      const { data: userData } = await authClient.auth.getUser();
      if (userData?.user) {
         
        const { data: profile } = await (authClient.from('user_profiles') as any)
          .select('role')
          .eq('id', userData.user.id)
          .maybeSingle();
         
        userRole = (profile as any)?.role ?? 'reader';
      }
    }
  } catch {
    /* 静默 */
  }

  if (userRole !== 'acharya' && userRole !== 'admin') {
    return NextResponse.json(
      { error: '仅阿阇梨可执行精选操作' },
      { status: 403 },
    );
  }

  // Mock 兜底
  if (!isSupabaseConfigured()) {
    // 在 mock 数据中找到并更新
    for (const slug of Object.keys(MOCK_COMMENTS)) {
      const list = MOCK_COMMENTS[slug];
      const c = list.find((x) => x.id === id);
      if (c) {
        c.is_featured = isFeatured;
        return NextResponse.json({ ok: true, comment: c, mock: true });
      }
    }
    return NextResponse.json({ error: '评论不存在' }, { status: 404 });
  }

  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('chapter_comments')
      .update({ is_featured: isFeatured, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/library/comment] patch failed:', error);
      return NextResponse.json({ error: '精选操作失败' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, comment: data });
  } catch (e) {
    console.error('[api/library/comment] patch unexpected:', e);
    return NextResponse.json({ error: '服务异常' }, { status: 500 });
  }
}
