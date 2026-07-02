import Link from 'next/link';
import { CATEGORIES, getArticles } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '密解专栏 · 牧心堂',
  description: '生命格局 / 家居环境 / 姓名心解 / 阿阇梨开示',
};

export default async function LearnIndex() {
  const articles = await getArticles();

  return (
    <div className="flex flex-col gap-12 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="LEARN"
        title="密解专栏"
        subtitle="显真言 · 合五行 · 破无明"
      />

      {/* 四个专栏入口 */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {CATEGORIES.map((c) => {
          const count = articles.filter((a) => a.category === c.id).length;
          return (
            <Link
              key={c.id}
              href={c.href}
              className="group flex flex-col gap-3 rounded-2xl
                         border border-primary/25 bg-muted/40 p-5
                         transition hover:border-primary/60 hover:bg-muted
                         md:p-6"
            >
              <div className="flex items-center justify-between">
                <span
                  aria-hidden
                  className="text-3xl text-primary/80 transition group-hover:text-primary"
                >
                  {c.glyph}
                </span>
                <span className="text-[10px] tracking-[0.3em] text-foreground/40">
                  {c.sub.toUpperCase()}
                </span>
              </div>
              <h2 className="font-serif text-2xl text-foreground">
                {c.title}
              </h2>
              <p className="text-sm leading-relaxed text-foreground/70">
                {c.desc}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-foreground/50">
                <span>{count} 篇文章</span>
                <span className="text-primary/70 transition group-hover:text-primary">
                  进入 ›
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
