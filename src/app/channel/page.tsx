import Link from 'next/link';
import { CATEGORIES, getArticles, getStudyPosts } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';
import { LearnCard } from '@/app/learn/LearnCard';
import { StudyContent } from '@/app/study/StudyContent';

export const metadata = {
  title: '密法灵学 · 牧心堂',
  description: '密解专栏 + 灵性研学 — 显密双运 · 自利利他',
};

export const dynamic = 'force-static';

/**
 * 牧心堂 · 密法灵学 · 聚合页（/channel）
 *
 * 设计：把 /learn（密解专栏）与 /study（灵性研学）合并为同一页的上下两栏
 *   ┌──────────────────────────────────────┐
 *   │  PageHeader：密法灵学                  │
 *   ├──────────────────────────────────────┤
 *   │  [上半] 密解专栏 · CATEGORIES 网格     │
 *   │           · 查看全部 → /learn          │
 *   ├─────────── 金色分隔线 ────────────────┤
 *   │  [下半] 灵性研学 · 分类 Tabs + 帖子流  │
 *   │           · 进入社区 → /study          │
 *   └──────────────────────────────────────┘
 *
 * 数据流：
 *   - 服务端 Promise.all 并行拉取 articles + studyPosts
 *   - 客户端容器 StudyContent 持有交互（Tab 切换 / 发布 / 模态）
 *   - 静态预渲染：dynamic = 'force-static' 避免 build 期间 Supabase 抖动
 *
 * 其他路由不变：
 *   - /learn 仍可用（移动端底部 Tab「专栏」指向）
 *   - /study 仍可用（直接 URL 访问）
 *   - 顶栏「密法灵学」统一从此处进入
 */
export default async function ChannelPage() {
  const [articles, studyPosts] = await Promise.all([
    getArticles(),
    getStudyPosts(),
  ]);

  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="CHANNEL"
        title="密法灵学"
        subtitle="显密双运 · 自利利他"
      />

      {/* ============ 上半 · 密解专栏 ============ */}
      <section
        aria-label="密解专栏"
        className="flex flex-col gap-5"
      >
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-xl text-foreground md:text-2xl">
              密解专栏
            </h2>
            <span className="text-[10px] tracking-[0.3em] text-foreground/40">
              LEARN
            </span>
          </div>
          <Link
            href="/learn"
            className="text-xs tracking-wider text-primary/70 transition hover:text-primary"
          >
            查看全部
            <span aria-hidden className="ml-1">→</span>
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {CATEGORIES.map((c) => {
            const count = articles.filter((a) => a.category === c.id).length;
            return <LearnCard key={c.id} category={c} count={count} />;
          })}
        </div>
      </section>

      {/* ============ 金色分隔线 ============ */}
      <div
        aria-hidden
        className="relative my-2 h-px md:my-4"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/40 bg-background font-serif text-xs text-primary">
          ☯
        </span>
      </div>

      {/* ============ 下半 · 灵性研学 ============ */}
      <section
        aria-label="灵性研学"
        className="flex flex-col gap-5"
      >
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-xl text-foreground md:text-2xl">
              灵性研学
            </h2>
            <span className="text-[10px] tracking-[0.3em] text-foreground/40">
              STUDY
            </span>
          </div>
          <Link
            href="/study"
            className="text-xs tracking-wider text-primary/70 transition hover:text-primary"
          >
            进入社区
            <span aria-hidden className="ml-1">→</span>
          </Link>
        </header>

        {/* StudyContent 自带标题 + Tabs + 列表 + 发布按钮 */}
        <StudyContent initialPosts={studyPosts} />
      </section>

      <p className="text-center text-[10px] tracking-wider text-foreground/30">
        · 显以解行，密以相应；愿见者得入，读者得悟 ·
      </p>
    </div>
  );
}
