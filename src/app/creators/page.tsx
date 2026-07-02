import { getCreators } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '创作者矩阵 · 牧心堂',
  description: '阿阇梨与研究员团队',
};

export default async function CreatorsPage() {
  const creators = await getCreators();

  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="CREATORS"
        title="创作者矩阵"
        subtitle="把古老智慧翻译进现代生活的同行者"
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {creators.map((c) => (
          <article
            key={c.id}
            className="flex flex-col gap-3 rounded-2xl
                       border border-primary/25 bg-muted/40 p-5
                       transition hover:border-primary/50
                       md:p-6"
          >
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="grid h-14 w-14 place-items-center rounded-full
                           border border-primary/40 bg-background/60
                           font-serif text-2xl text-primary"
              >
                {c.avatar_glyph}
              </span>
              <div>
                <h2 className="font-serif text-xl text-foreground md:text-2xl">
                  {c.name}
                </h2>
                {(c.honor || c.lineage) && (
                  <p className="text-xs tracking-wider text-primary/70">
                    {[c.honor, c.lineage].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>

            <p className="text-sm leading-relaxed text-foreground/75 md:text-base">
              {c.bio}
            </p>

            {c.specialties.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-2">
                {c.specialties.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-primary/25 bg-background/40
                               px-3 py-0.5 text-xs text-foreground/70"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      <p className="text-xs text-foreground/40">
        · 个人主页与一对一咨询功能，敬请期待 ·
      </p>
    </div>
  );
}
