/**
 * 牧心堂 · 统一数据访问层
 *
 * 设计原则：
 * 1. 优先使用 Supabase 真实数据（当 NEXT_PUBLIC_SUPABASE_URL 配置时）
 * 2. 失败 / 未配置时，自动回退到 mock-data.ts（开发 / 演示用）
 * 3. 所有函数都是 async，调用方不需要关心是 DB 还是 mock
 * 4. 业务页面只需 `import { getArticles, getArticle } from '@/lib/data'`
 *
 * 切换数据源：
 *   - 填好 .env.local 中的 NEXT_PUBLIC_SUPABASE_URL/ANON_KEY → 走 DB
 *   - 不填或 NEXT_PUBLIC_USE_MOCK_SUPABASE=true → 走 mock
 *
 * 注：本文件只在 Server Component / Route Handler 内被调用，
 *    使用 supabase-server.ts 的服务端客户端（service_role 优先）。
 */

import { isSupabaseConfigured, createClient } from '@/lib/supabase-server';
import * as mock from './mock-data';
import type {
  ArticleWithAuthor,
  Creator,
  JournalEntry,
  NovelWithAuthor,
  UserTier,
} from '@/types/supabase';

/** 数据源开关（注意：不能以 use 开头命名，否则会被 React Hook 规则误判） */
function isDbReady(): boolean {
  return isSupabaseConfigured();
}

/* ============================================
 * Categories（专栏分类）— 来自前端常量，无 DB 表
 * ============================================ */
export const CATEGORIES = mock.CATEGORIES;
export type CategoryMeta = mock.CategoryMeta;

/* ============================================
 * Articles
 * ============================================ */

export async function getArticles(category?: string): Promise<ArticleWithAuthor[]> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      let q = sb
        .from('v_articles_with_author')
        .select('*')
        .order('published_at', { ascending: false });
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data as ArticleWithAuthor[]) ?? [];
    } catch (e) {
      console.warn('[data] getArticles DB failed, fallback to mock:', e);
    }
  }
  // mock 兜底
  const items = category
    ? mock.ARTICLES.filter((a) => a.category === category)
    : mock.ARTICLES;
  return items.map(toArticleView);
}

export async function getArticle(
  category: string,
  slug: string,
): Promise<ArticleWithAuthor | null> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('v_articles_with_author')
        .select('*')
        .eq('category', category)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
       
      return data ? (data as unknown as ArticleWithAuthor) : null;
    } catch (e) {
      console.warn('[data] getArticle DB failed, fallback to mock:', e);
    }
  }
  const a = mock.findArticle(category, slug);
  return a ? toArticleView(a) : null;
}

/** generateStaticParams 用 */
export async function getAllArticlePaths(): Promise<
  { category: string; slug: string }[]
> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('articles')
        .select('category, slug');
      if (error) throw error;
      return data ?? [];
    } catch {
      // 兜底
    }
  }
  return mock.ARTICLES.map((a) => ({ category: a.category, slug: a.slug }));
}

/* ============================================
 * Novels
 * ============================================ */

export async function getChapters(): Promise<NovelWithAuthor[]> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('v_novels_with_author')
        .select('*')
        .order('chapter_index', { ascending: true });
      if (error) throw error;
      return (data as NovelWithAuthor[]) ?? [];
    } catch (e) {
      console.warn('[data] getChapters DB failed, fallback to mock:', e);
    }
  }
  return mock.CHAPTERS.map(toNovelView);
}

export async function getChapter(slug: string): Promise<NovelWithAuthor | null> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('v_novels_with_author')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
       
      return data ? (data as unknown as NovelWithAuthor) : null;
    } catch (e) {
      console.warn('[data] getChapter DB failed, fallback to mock:', e);
    }
  }
  const c = mock.findChapter(slug);
  return c ? toNovelView(c) : null;
}

export async function getAllChapterPaths(): Promise<{ slug: string }[]> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('novels')
        .select('slug');
      if (error) throw error;
      return data ?? [];
    } catch {
      // 兜底
    }
  }
  return mock.CHAPTERS.map((c) => ({ slug: c.slug }));
}

/* ============================================
 * Journal Entries
 * ============================================ */

export async function getJournalEntries(): Promise<JournalEntry[]> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('journal_entries')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as JournalEntry[]) ?? [];
    } catch (e) {
      console.warn('[data] getJournalEntries DB failed, fallback to mock:', e);
    }
  }
  return mock.JOURNAL_ENTRIES as unknown as JournalEntry[];
}

/* ============================================
 * Creators
 * ============================================ */

export async function getCreators(): Promise<Creator[]> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('creators')
        .select('*')
        .eq('is_published', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data as Creator[]) ?? [];
    } catch (e) {
      console.warn('[data] getCreators DB failed, fallback to mock:', e);
    }
  }
  return mock.CREATORS as unknown as Creator[];
}

/* ============================================
 * Profile / Subscription（需要服务端）
 * ============================================ */

export async function getMyProfile(userId: string): Promise<{
  id: string;
  display_name: string;
  tier: UserTier;
  tier_expires_at: string | null;
  credits: number;
  practice_days: number;
} | null> {
  if (!isDbReady()) return null;
  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('user_profiles')
      .select('id, display_name, tier, tier_expires_at, credits, practice_days')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    console.warn('[data] getMyProfile failed:', e);
    return null;
  }
}

/* ============================================
 * 转换：mock shape → DB view shape
 * ============================================ */

function toArticleView(
  a: (typeof mock.ARTICLES)[number],
): ArticleWithAuthor {
  return {
    id: `mock-${a.category}-${a.slug}`,
    category: a.category,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    body: a.body.join('\n\n'),
    cover_glyph: '✦',
    cover_url: null,
    is_free: true, // mock 全部免费
    tier_required: 'free',
    author_id: null,
    author_name: a.author,
    author_honor: null,
    author_glyph: '☉',
    author_avatar_url: null,
    published_at: new Date(a.publishedAt).toISOString(),
    reading_minutes: a.readingMinutes,
    view_count: 0,
    like_count: 0,
  };
}

function toNovelView(
  c: (typeof mock.CHAPTERS)[number],
): NovelWithAuthor {
  return {
    id: `mock-novel-${c.slug}`,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    body: c.body.join('\n\n'),
    chapter_index: c.number,
    cover_glyph: '❡',
    cover_url: null,
    author_id: null,
    author_name: '寂光阿阇梨',
    author_honor: '根本上师',
    author_glyph: '☀',
    author_avatar_url: null,
    published_at: new Date(c.publishedAt).toISOString(),
    reading_minutes: c.readingMinutes,
    view_count: 0,
    story_type: c.storyType,
  };
}
