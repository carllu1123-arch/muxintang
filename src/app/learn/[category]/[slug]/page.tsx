import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  CATEGORIES,
  getAllArticlePaths,
  getArticle,
  getArticles,
} from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';
import { ReportPaywall } from '@/components/ReportPaywall';
import { ArticleTTS } from '@/components/ArticleTTS';
import { getCurrentSession, canAccess } from '@/lib/session';
import { getRelatedTools } from '@/lib/related-tools';

/* ============ 静态预渲染所有 (category, slug) 组合 ============ */
export async function generateStaticParams() {
  return getAllArticlePaths();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const article = await getArticle(category, slug);
  return {
    title: article ? `${article.title} · 牧心堂` : '未找到 · 牧心堂',
  };
}

function splitBody(body: string): string[] {
  // 段落以双换行分隔
  return body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const [article, allArticles, session] = await Promise.all([
    getArticle(category, slug),
    getArticles(category),
    getCurrentSession(),
  ]);
  const cat = CATEGORIES.find((c) => c.id === category);

  if (!article || !cat) {
    notFound();
  }

  // 付费墙逻辑：未登录 + 付费内容 → 锁定
  // 订阅判断：canAccess() 已封装 tier 排序
  const userHasAccess = canAccess(
    session,
    (article.tier_required ?? 'free') as 'free' | 'monthly' | 'yearly',
  );

  const paragraphs = splitBody(article.body);
  // 付费墙：截断前 60% 段落作为预览
  const previewCount = Math.max(1, Math.floor(paragraphs.length * 0.6));
  const preview = paragraphs.slice(0, previewCount);
  const locked = paragraphs.slice(previewCount);
  const isLocked = !article.is_free && locked.length > 0 && !userHasAccess;

  // 反向推荐：根据文章 category 推荐相关智测工具（学 → 测 闭环）
  const relatedTools = getRelatedTools(category);

  return (
    <article className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow={`${cat.sub.toUpperCase()} · ${cat.title}`}
        title={article.title}
        subtitle={article.subtitle ?? undefined}
        back={{ href: `/learn/${category}`, label: cat.title }}
      />

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tracking-wider text-foreground/50">
        {article.author_name && <span>作者：{article.author_name}</span>}
        {article.author_name && <span aria-hidden>·</span>}
        <span>发布：{new Date(article.published_at).toLocaleDateString('zh-CN')}</span>
        <span aria-hidden>·</span>
        <span>阅读：{article.reading_minutes} 分钟</span>
        {!article.is_free && (
          <>
            <span aria-hidden>·</span>
            <span
              className={`rounded-full border px-2 py-0.5 ${
                userHasAccess
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-accent/40 bg-accent/10 text-accent'
              }`}
            >
              {userHasAccess
                ? `已解锁 · ${article.tier_required === 'monthly' ? '月度会员' : '年度会员'}`
                : `${article.tier_required === 'monthly' ? '月度会员' : '年度会员'}专享`}
            </span>
          </>
        )}
      </div>

      {/* 阿阇梨朗读（TTS） */}
      <ArticleTTS title={article.title} body={article.body} />

      {/* 正文预览 */}
      <div className="flex flex-col gap-5 md:gap-6">
        {preview.map((p, i) => (
          <p
            key={`p-${i}`}
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

      {/* 付费墙 */}
      {isLocked && (
        <ReportPaywall
          tierRequired={article.tier_required as 'monthly' | 'yearly'}
          categoryTitle={cat.title}
        />
      )}

      {/* 非付费时显示完整剩余内容 */}
      {!isLocked && locked.length > 0 && (
        <div className="flex flex-col gap-5 md:gap-6">
          {locked.map((p, i) => (
            <p
              key={`l-${i}`}
              className="text-base leading-loose text-foreground/85 md:text-lg"
            >
              {p}
            </p>
          ))}
        </div>
      )}

      {/* ============ 反向推荐：文章 → 智测工具（学 ⇄ 测 闭环） ============ */}
      {relatedTools.length > 0 && (
        <section
          aria-label="推荐智测工具"
          className="rounded-2xl border border-primary/30
                     bg-gradient-to-br from-primary/5 via-transparent to-transparent
                     p-5 backdrop-blur-md md:p-6"
        >
          <header className="mb-4 flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full
                         border border-primary/40 bg-background/60
                         font-serif text-base text-primary"
            >
              ☯
            </span>
            <div className="flex-1">
              <p className="font-serif text-sm text-foreground md:text-base">
                阅读完这篇文章，不妨到
                <span className="text-primary">【智测工具】</span>
                实际测一下您的格局。
              </p>
              <p className="mt-1 text-[10px] tracking-[0.2em] text-foreground/40">
                LEARN → TOOLS · 学以致用
              </p>
            </div>
          </header>

          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {relatedTools.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="group flex items-center gap-3 rounded-xl
                             border border-primary/20 bg-black/40 p-4
                             transition hover:border-primary/60 hover:bg-primary/5"
                >
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg
                               border border-primary/40 bg-background/60
                               font-serif text-lg text-primary"
                  >
                    {t.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm text-foreground transition group-hover:text-primary md:text-base">
                      {t.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-foreground/60">
                      {t.desc}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="text-foreground/30 transition group-hover:text-primary"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 分割线 */}
      <div className="flex items-center gap-4 text-primary/40">
        <span className="h-px flex-1 bg-primary/20" />
        <span aria-hidden>◈</span>
        <span className="h-px flex-1 bg-primary/20" />
      </div>

      {/* 相关文章 */}
      {allArticles.length > 1 && (
        <section>
          <h2 className="mb-4 font-serif text-xl text-foreground md:text-2xl">
            相关阅读
          </h2>
          <ul className="flex flex-col gap-2">
            {allArticles
              .filter((r) => r.slug !== slug)
              .slice(0, 4)
              .map((r) => (
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
                      {new Date(r.published_at).toLocaleDateString('zh-CN')} · {r.reading_minutes} 分钟
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
