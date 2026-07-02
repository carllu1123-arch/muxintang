import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllChapterPaths, getChapter, getChapters } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';

export async function generateStaticParams() {
  return getAllChapterPaths();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ch = await getChapter(slug);
  return {
    title: ch ? `${ch.title} · 牧心堂` : '未找到 · 牧心堂',
  };
}

function splitBody(body: string): string[] {
  return body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [ch, all] = await Promise.all([getChapter(slug), getChapters()]);
  if (!ch) notFound();

  const idx = all.findIndex((c) => c.slug === slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  const paragraphs = splitBody(ch.body);

  return (
    <article className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow={`CHAPTER · ${ch.chapter_index}`}
        title={ch.title}
        subtitle={ch.subtitle ?? undefined}
        back={{ href: '/library', label: '行者文丛' }}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tracking-wider text-foreground/50">
        {ch.author_name && <span>作者：{ch.author_name}</span>}
        {ch.author_name && <span aria-hidden>·</span>}
        <span>发布：{new Date(ch.published_at).toLocaleDateString('zh-CN')}</span>
        <span aria-hidden>·</span>
        <span>阅读：{ch.reading_minutes} 分钟</span>
      </div>

      <div className="flex flex-col gap-5 md:gap-6">
        {paragraphs.map((p, i) => (
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

      <nav className="flex items-center justify-between gap-4 border-t border-primary/15 pt-6">
        {prev ? (
          <Link
            href={`/library/${prev.slug}`}
            className="flex flex-col gap-0.5 text-sm text-foreground/70 transition hover:text-primary"
          >
            <span className="text-[10px] tracking-wider text-foreground/40">
              上一卷
            </span>
            <span className="font-serif">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/library/${next.slug}`}
            className="flex flex-col items-end gap-0.5 text-sm text-foreground/70 transition hover:text-primary"
          >
            <span className="text-[10px] tracking-wider text-foreground/40">
              下一卷
            </span>
            <span className="font-serif">{next.title}</span>
          </Link>
        ) : (
          <span className="text-xs text-foreground/40">已是最新一卷</span>
        )}
      </nav>
    </article>
  );
}
