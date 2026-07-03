/**
 * 牧心堂 · 行者故事 段落批注 API
 *
 * GET  /api/library/annotation?slug=xxx  — 获取某章节的所有批注
 * POST /api/library/annotation           — 提交新批注
 *
 * 表：chapter_annotations (id, chapter_slug, paragraph_idx, selected_text, note, ...)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getAuthClient } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mock 批注数据 */
const MOCK_ANNOTATIONS: Record<string, Array<{
  id: string;
  chapter_slug: string;
  paragraph_idx: number;
  selected_text: string;
  note: string;
  author_name: string;
  author_role: string;
  created_at: string;
}>> = {
  'ch1-the-call': [
    {
      id: 'mock_a1',
      chapter_slug: 'ch1-the-call',
      paragraph_idx: 3,
      selected_text: '他回头——不是看身后的路，是看自己这一生。',
      note: '这一句让我停了很久。修行原来不是向前追，是敢回头。',
      author_name: '行路人',
      author_role: 'reader',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: '缺少 slug 参数' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ annotations: MOCK_ANNOTATIONS[slug] ?? [] });
  }

  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('chapter_annotations')
      .select('*')
      .eq('chapter_slug', slug)
      .order('paragraph_idx', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[api/library/annotation] query failed:', error);
      return NextResponse.json({ annotations: MOCK_ANNOTATIONS[slug] ?? [] });
    }

    return NextResponse.json({ annotations: data ?? [] });
  } catch (e) {
    console.error('[api/library/annotation] unexpected:', e);
    return NextResponse.json({ annotations: MOCK_ANNOTATIONS[slug] ?? [] });
  }
}

export async function POST(req: NextRequest) {
  let body: {
    chapter_slug?: unknown;
    paragraph_idx?: unknown;
    selected_text?: unknown;
    note?: unknown;
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
  const paragraphIdx = typeof body.paragraph_idx === 'number' ? body.paragraph_idx : -1;
  if (paragraphIdx < 0) {
    return NextResponse.json({ error: '段落索引无效' }, { status: 400 });
  }
  const selectedText =
    typeof body.selected_text === 'string' ? body.selected_text.trim() : '';
  if (!selectedText || selectedText.length > 200) {
    return NextResponse.json({ error: '选中文本无效（1-200 字）' }, { status: 400 });
  }
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (!note || note.length > 300) {
    return NextResponse.json({ error: '批注内容无效（1-300 字）' }, { status: 400 });
  }

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
    const newAnn = {
      id: `mock_a${Date.now()}`,
      chapter_slug: chapterSlug,
      paragraph_idx: paragraphIdx,
      selected_text: selectedText,
      note,
      author_name: authorName,
      author_role: authorRole,
      created_at: new Date().toISOString(),
    };
    const list = MOCK_ANNOTATIONS[chapterSlug] ?? [];
    list.push(newAnn);
    MOCK_ANNOTATIONS[chapterSlug] = list;
    return NextResponse.json({ ok: true, annotation: newAnn, mock: true });
  }

  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('chapter_annotations')
      .insert({
        chapter_slug: chapterSlug,
        paragraph_idx: paragraphIdx,
        selected_text: selectedText,
        note,
        user_id: userId,
        author_name: authorName,
        author_role: authorRole,
      } as never)
      .select('*')
      .single();

    if (error) {
      console.error('[api/library/annotation] insert failed:', error);
      return NextResponse.json({ error: '批注保存失败' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, annotation: data });
  } catch (e) {
    console.error('[api/library/annotation] unexpected:', e);
    return NextResponse.json({ error: '服务异常' }, { status: 500 });
  }
}
