/**
 * 牧心堂 · 密解专栏 · 分类页
 *
 * 路由：/learn/[category]
 * 作用：展示该分类下的所有文章
 *
 * 数据流：
 *   1) getCategoryById(category) → 404 if not in CATEGORIES 白名单
 *   2) getArticles(category) → 仅返回该分类文章
 *   3) generateStaticParams → 预渲染 4 个分类（lifecode / habitat / name / teacher）
 *
 * 安全：
 *   - category 必须在 CATEGORIES 白名单（防注入）
 *   - generateStaticParams 限定 4 个值，dynamicParams=false 直接 404
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, getArticles } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';
import { LearnCard } from '../LearnCard';
import { ArticleListItem } from './ArticleListItem';

export const dynamic = 'force-static';
export const dynamicParams = false; // 不在白名单的 category → 404
export const revalidate = 3600;

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.id));

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) return { title: '未找到 · 牧心堂' };
  return {
    title: `${cat.title} · 密解专栏 · 牧心堂`,
    description: cat.desc,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!VALID_CATEGORIES.has(category)) notFound();
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) notFound(); // 类型守卫

  const articles = await getArticles(category);

  return (
    <div className="flex flex-col gap-12 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow={cat.sub.toUpperCase()}
        title={cat.title}
        subtitle={cat.desc}
        back={{ href: '/learn', label: '密解专栏' }}
      />

      {/* 简介卡 */}
      <section
        className="rounded-2xl border border-primary/30 bg-black/60 p-6
                   shadow-[0_0_60px_-30px_rgba(212,175,55,0.45)]
                   backdrop-blur-md md:p-8"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full
                       border border-primary/40 bg-background
                       font-serif text-3xl text-primary"
          >
            {cat.glyph}
          </span>
          <p className="text-sm leading-relaxed text-foreground/75 md:text-base">
            {cat.desc}
          </p>
        </div>
      </section>

      {/* 文章列表 */}
      {articles.length === 0 ? (
        <section
          className="rounded-2xl border border-dashed border-primary/20
                     bg-black/40 p-8 text-center text-foreground/60 md:p-12"
        >
          <p className="font-serif text-base text-foreground/70">
            此分类下尚无文章，敬请期待。
          </p>
          <Link
            href="/learn"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            ‹ 返回密解专栏
          </Link>
        </section>
      ) : (
        <section
          aria-label={`${cat.title}文章列表`}
          className="flex flex-col gap-3"
        >
          <p className="text-[10px] tracking-[0.3em] text-foreground/40">
            ARTICLES · {articles.length} 篇
          </p>
          <ul className="flex flex-col gap-3">
            {articles.map((a) => (
              <ArticleListItem key={a.id} article={a} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
