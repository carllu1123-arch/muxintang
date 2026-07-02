import { JOURNAL_ENTRIES } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '灵性研学 · 牧心堂',
  description: '同修的随笔、打卡、问答、分享',
};

const TYPE_STYLES: Record<string, string> = {
  打卡: 'border-primary/40 text-primary bg-primary/10',
  随笔: 'border-foreground/30 text-foreground/80 bg-foreground/5',
  问答: 'border-accent/40 text-accent bg-accent/10',
  分享: 'border-primary/30 text-primary/80 bg-primary/5',
};

export default function StudyPage() {
  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="STUDY"
        title="灵性研学"
        subtitle="同修的日常 · 相互映照的修行"
      />

      <section className="flex flex-col gap-4">
        {JOURNAL_ENTRIES.map((e) => (
          <article
            key={e.id}
            className="rounded-2xl border border-border bg-muted/40 p-5
                       transition hover:border-primary/40
                       md:p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-serif text-base text-foreground md:text-lg">
                  {e.author}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] tracking-wider
                              ${TYPE_STYLES[e.type] ?? ''}`}
                >
                  {e.type}
                </span>
              </div>
              <span className="text-[10px] text-foreground/40">
                {e.publishedAt}
              </span>
            </div>

            <h2 className="mt-3 font-serif text-lg text-foreground md:text-xl">
              {e.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70 md:text-base">
              {e.excerpt}
            </p>

            <div className="mt-4 flex items-center gap-4 text-xs text-foreground/50">
              <span>♥ {e.likes}</span>
              <span>💬 {e.comments}</span>
            </div>
          </article>
        ))}
      </section>

      <p className="text-xs text-foreground/40">
        · 登录后可发帖；非会员可读但不可互动 ·
      </p>
    </div>
  );
}
