import { CATEGORIES, getArticles } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';
import { LearnCard } from './LearnCard';

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
          return <LearnCard key={c.id} category={c} count={count} />;
        })}
      </section>
    </div>
  );
}
