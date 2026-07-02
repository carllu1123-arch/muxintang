import { getChapters } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';
import { LibraryTabs } from './LibraryTabs';

export const metadata = {
  title: '行者故事 · 牧心堂',
  description: '长篇连载 · 短篇精读',
};

export default async function LibraryIndex() {
  const chapters = await getChapters();

  return (
    <div className="flex flex-col gap-8 py-6 md:gap-12 md:py-12">
      <PageHeader
        eyebrow="LIBRARY"
        title="行者故事"
        subtitle="长篇连载 · 短篇精读"
      />

      <LibraryTabs chapters={chapters} />

      <p className="text-xs text-foreground/40">
        · 每周四更新一卷；非会员可读最近 3 卷，往期内容需会员 ·
      </p>
    </div>
  );
}
