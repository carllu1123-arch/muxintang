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

/**
 * 灵性研学发帖流（/study 页面用）
 *
 * 数据源：study_posts 表（DB 接通后）
 *       ∪ journal_entries 表（旧的"已发布精选"也会展示，保持过渡期数据完整）
 *       ∪ mock 兜底（JOURNAL_ENTRIES）
 *
 * 返回统一形态（mock / DB / journal 都规整为 StudyPost）
 */
export async function getStudyPosts(): Promise<JournalEntry[]> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      // 1) 取 study_posts（UGC 实时流）
      const ugcPromise = sb
        .from('study_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(80);

      // 2) 取 journal_entries（已发布精选）
      const jrnPromise = sb
        .from('journal_entries')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(30);

      const [{ data: ugc, error: ugcErr }, { data: jrn, error: jrnErr }] =
        await Promise.all([ugcPromise, jrnPromise]);

      if (ugcErr) console.warn('[data] study_posts failed:', ugcErr);
      if (jrnErr) console.warn('[data] journal_entries failed:', jrnErr);

      // 合并：study_posts 优先（同一天按 published_at 倒序）
      const merged: JournalEntry[] = [
        ...((ugc ?? []) as JournalEntry[]),
        ...((jrn ?? []) as JournalEntry[]),
      ];
      merged.sort(
        (a, b) =>
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime(),
      );
      return merged;
    } catch (e) {
      console.warn('[data] getStudyPosts DB failed, fallback to mock:', e);
    }
  }
  // mock 兜底：把 mock 的 camelCase 字段映射为 snake_case（JournalEntry 形态）
  return mock.JOURNAL_ENTRIES.map((m) => ({
    id: m.id,
    user_id: null,
    author_name: m.author,
    type: m.type,
    title: m.title,
    excerpt: m.excerpt,
    body: m.excerpt, // mock 没有 body，用 excerpt 兜底
    like_count: m.likes,
    comment_count: m.comments,
    is_published: true,
    published_at: m.publishedAt,
    created_at: m.publishedAt,
  })) as unknown as JournalEntry[];
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

/** 根据 slug 获取单个创作者（个人主页用） */
export async function getCreatorBySlug(slug: string): Promise<Creator | null> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('creators')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      return data ? (data as Creator) : null;
    } catch (e) {
      console.warn('[data] getCreatorBySlug DB failed, fallback to mock:', e);
    }
  }
  const c = mock.CREATORS.find((x) => x.slug === slug);
  return c ? (c as unknown as Creator) : null;
}

/** generateStaticParams 用：所有创作者 slug */
export async function getAllCreatorPaths(): Promise<{ slug: string }[]> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('creators')
        .select('slug')
        .eq('is_published', true);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ slug: string | null }>;
      return rows
        .filter((r): r is { slug: string } => !!r.slug)
        .map((r) => ({ slug: r.slug }));
    } catch {
      // 兜底
    }
  }
  return mock.CREATORS.map((c) => ({ slug: c.slug }));
}

/** 根据创作者 id 获取其发表的所有文章（按发布时间倒序） */
export async function getArticlesByCreator(
  creatorId: string,
  creatorName?: string,
): Promise<ArticleWithAuthor[]> {
  if (isDbReady()) {
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from('v_articles_with_author')
        .select('*')
        .eq('author_id', creatorId)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data as ArticleWithAuthor[]) ?? [];
    } catch (e) {
      console.warn('[data] getArticlesByCreator DB failed, fallback to mock:', e);
    }
  }
  // mock 兜底：mock articles 没有 author_id 字段，用 author 字符串匹配创作者名
  const items = mock.ARTICLES.filter(
    (a) => creatorName && a.author === creatorName,
  );
  return items.map(toArticleView);
}

/* ============================================
 * 推荐算法（首页轮播用）
 *
 * 策略：每日稳定轮换
 *   - 合并 learn 文章 + library 章节
 *   - 用「当日日期（UTC）」作为种子 → 同一用户同一天看到相同推荐
 *   - 同一作者只取最新一篇
 *   - 按发布时间倒序遍历，确保最新内容优先露出
 * ============================================ */

export interface RecommendedItem {
  /** 唯一 ID（用于 React key） */
  id: string;
  /** 类型：learn 文章 / library 章节 */
  type: 'article' | 'chapter';
  /** 文章 / 章节标题 */
  title: string;
  /** 副标题或一句话摘要 */
  subtitle: string | null;
  /** 作者名 */
  authorName: string;
  /** 跳转 URL */
  href: string;
  /** 发布时间 ISO */
  publishedAt: string;
  /** 阅读时长（分钟） */
  readingMinutes: number;
  /** 章节序号（仅 chapter） */
  chapterIndex?: number;
}

/** 简单稳定哈希：把字符串映射到 0-1 */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** 用当天日期生成稳定种子（保证同一天轮换相同推荐） */
function todaySeed(): number {
  const d = new Date();
  const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  return hash01(key);
}

/** 简易 Fisher–Yates 洗牌（用稳定 seed） */
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = Math.floor(seed * 1e9);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getRecommendedArticles(
  limit = 3,
): Promise<RecommendedItem[]> {
  // 1. 拉取所有候选（articles + chapters）
  const [articles, chapters] = await Promise.all([
    getArticles(),
    getChapters(),
  ]);

  // 2. 统一形态
  const pool: RecommendedItem[] = [
    ...articles.map((a) => ({
      id: `article-${a.id}`,
      type: 'article' as const,
      title: a.title,
      subtitle: a.subtitle,
      authorName: a.author_name ?? '匿名',
      href: `/learn/${a.category}/${a.slug}`,
      publishedAt: a.published_at,
      readingMinutes: a.reading_minutes,
    })),
    ...chapters.map((c) => ({
      id: `chapter-${c.id}`,
      type: 'chapter' as const,
      title: c.title,
      subtitle: c.subtitle,
      authorName: c.author_name ?? '寂光阿阇梨',
      href: `/library/${c.slug}`,
      publishedAt: c.published_at,
      readingMinutes: c.reading_minutes,
      chapterIndex: c.chapter_index,
    })),
  ];

  // 3. 按发布时间倒序
  pool.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  // 4. 同一作者只取最新 1 篇
  const seen = new Set<string>();
  const dedup: RecommendedItem[] = [];
  for (const item of pool) {
    if (seen.has(item.authorName)) continue;
    seen.add(item.authorName);
    dedup.push(item);
    if (dedup.length >= limit * 2) break; // 留 2x 候选用洗牌
  }

  // 5. 洗牌 + 截取
  const seed = todaySeed();
  return shuffle(dedup, seed).slice(0, limit);
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
    // 升维三：AI 引擎化字段（mock 占位值，生产由 Dify 生成）
    ai_summary: a.aiSummary,
    ai_tags: a.aiTags,
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
