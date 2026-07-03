import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '宠物饮食 · 牧心堂',
  description: '五行食补 · 顺应天时 — 筹备中',
};

export default function PetDietPage() {
  return (
    <div className="flex flex-col gap-6 py-6 md:gap-10 md:py-12">
      <PageHeader
        eyebrow="PET · DIET"
        title="宠物饮食"
        subtitle="五行食补 · 顺应天时"
        back={{ href: '/pet', label: '爱宠屋' }}
      />

      <section className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-primary/30 bg-muted/20 px-6 py-20 text-center">
        <span aria-hidden className="text-5xl">🍲</span>
        <h2 className="font-serif text-xl text-foreground md:text-2xl">
          即将开启
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-foreground/65 md:text-base">
          阿阇梨正在整理五行体质对应的日常食养与四季进建议，
          愿每一餐都是一次温柔的养护。
        </p>
        <p className="text-[10px] tracking-wider text-foreground/40">
          · 筹备中 · 上线时间另行公告 ·
        </p>

        <Link
          href="/pet"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full
                     border border-primary/50 bg-primary/10 px-5 py-2
                     text-sm text-primary transition hover:bg-primary/20"
        >
          <span aria-hidden>←</span>
          返回爱宠屋
        </Link>
      </section>
    </div>
  );
}
