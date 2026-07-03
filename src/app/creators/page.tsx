import Link from 'next/link';
import { getCreators } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '智创师 · 牧心堂',
  description: '阿阇梨与研究员团队',
};

export default async function CreatorsPage() {
  const creators = await getCreators();

  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="CREATORS"
        title="智创师"
        subtitle="把古老智慧翻译进现代生活的同行者"
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {creators.map((c) => (
          <Link
            key={c.id}
            href={`/creators/${c.slug}`}
            className="group flex flex-col gap-4 rounded-2xl
                       border border-primary/30 bg-background p-6
                       shadow-md transition hover:border-primary
                       hover:shadow-[0_0_30px_-15px_rgba(212,175,55,0.5)]
                       md:p-7"
          >
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full
                           border-2 border-primary/40 bg-background
                           font-serif text-3xl text-primary
                           transition group-hover:scale-105
                           group-hover:border-primary group-hover:shadow-[0_0_20px_-5px_rgba(166,124,82,0.4)]"
              >
                {c.avatar_glyph}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-xl text-foreground md:text-2xl">
                  {c.name}
                </h2>
                {(c.honor || c.lineage) && (
                  <p className="mt-0.5 text-xs tracking-wider text-primary/70">
                    {[c.honor, c.lineage].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <span
                aria-hidden
                className="text-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary"
              >
                →
              </span>
            </div>

            <p className="text-sm leading-relaxed text-foreground/75 md:text-base">
              {c.bio}
            </p>

            {c.specialties.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-2">
                {c.specialties.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-primary/25 bg-background/60
                               px-3 py-0.5 text-xs text-foreground/70"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}

            <span className="mt-1 text-[10px] tracking-wider text-foreground/40 transition group-hover:text-primary/80">
              · 进入主页 →
            </span>
          </Link>
        ))}
      </section>

      <p className="text-xs text-foreground/40">
        · 个人主页与一对一咨询功能，敬请期待 ·
      </p>
    </div>
  );
}
