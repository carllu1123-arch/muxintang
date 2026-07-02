import Link from 'next/link';
import { getChapters } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '行者文丛 · 牧心堂',
  description: '在故事里走一段自己的路',
};

export default async function LibraryIndex() {
  const chapters = await getChapters();

  return (
    <div className="flex flex-col gap-12 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="LIBRARY"
        title="行者文丛"
        subtitle="长篇连载 · 短篇精读"
      />

      <section className="flex flex-col gap-3">
        {chapters.map((ch) => (
          <Link
            key={ch.slug}
            href={`/library/${ch.slug}`}
            className="group flex flex-col gap-1 rounded-xl
                       border border-border bg-muted/40 p-4
                       transition hover:border-primary/50 hover:bg-muted
                       md:flex-row md:items-center md:gap-6 md:p-5"
          >
            <span className="font-serif text-sm text-primary/80 md:w-20 md:text-base">
              第{ch.chapter_index}卷
            </span>
            <div className="flex-1">
              <h3 className="font-serif text-lg text-foreground md:text-xl">
                {ch.title}
              </h3>
              {ch.subtitle && (
                <p className="mt-1 text-sm text-foreground/60">{ch.subtitle}</p>
              )}
            </div>
            <span className="text-xs tracking-wider text-foreground/50 md:w-24 md:text-right">
              {ch.reading_minutes} 分钟
            </span>
          </Link>
        ))}
      </section>

      <p className="text-xs text-foreground/40">
        · 每周四更新一卷；非会员可读最近 3 卷，往期内容需会员 ·
      </p>
    </div>
  );
}
