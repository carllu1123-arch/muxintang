import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ARTICLES,
  CATEGORIES,
  findArticle,
  findCategory,
} from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';

/* ============ 静态预渲染所有 (category, slug) 组合 ============ */
export function generateStaticParams() {
  return ARTICLES.map((a) => ({
    category: a.category,
    slug: a.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const article = findArticle(category, slug);
  return {
    title: article ? `${article.title} · 牧心堂` : '未找到 · 牧心堂',
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const article = findArticle(category, slug);
  const cat = findCategory(category);

  if (!article || !cat) {
    notFound();
  }

  // 同专栏其他文章
  const related = ARTICLES.filter(
    (a) => a.category === category && a.slug !== slug,
  );

  return (
    <article className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow={`${cat.sub.toUpperCase()} · ${cat.title}`}
        title={article.title}
        subtitle={article.subtitle}
        back={{ href: `/learn/${category}`, label: cat.title }}
      />

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tracking-wider text-foreground/50">
        <span>作者：{article.author}</span>
        <span aria-hidden>·</span>
        <span>发布：{article.publishedAt}</span>
        <span aria-hidden>·</span>
        <span>阅读：{article.readingMinutes} 分钟</span>
      </div>

      {/* 正文 */}
      <div className="flex flex-col gap-5 md:gap-6">
        {article.body.map((p, i) => (
          <p
            key={i}
            className="text-base leading-loose text-foreground/85 md:text-lg
                       first-letter:font-serif first-letter:text-2xl
                       md:first-letter:text-3xl first-letter:text-primary/90
                       first-letter:mr-1 first-letter:float-left
                       first-letter:leading-none first-letter:mt-1"
          >
            {p}
          </p>
        ))}
      </div>

      {/* 分割线 */}
      <div className="flex items-center gap-4 text-primary/40">
        <span className="h-px flex-1 bg-primary/20" />
        <span aria-hidden>◈</span>
        <span className="h-px flex-1 bg-primary/20" />
      </div>

      {/* 相关文章 */}
      {related.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-xl text-foreground md:text-2xl">
            相关阅读
          </h2>
          <ul className="flex flex-col gap-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/learn/${r.category}/${r.slug}`}
                  className="flex flex-col gap-1 rounded-lg border border-border
                             bg-muted/30 p-4 transition
                             hover:border-primary/50 hover:bg-muted
                             md:flex-row md:items-center md:gap-6"
                >
                  <span className="font-serif text-base text-foreground md:text-lg">
                    {r.title}
                  </span>
                  <span className="text-xs text-foreground/50 md:ml-auto">
                    {r.publishedAt} · {r.readingMinutes} 分钟
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
