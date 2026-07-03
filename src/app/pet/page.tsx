import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '爱宠屋 · 牧心堂',
  description: '相伴一程 · 护佑一生 — 宠物取名、配饰、饮食、超度',
};

/**
 * 牧心堂 · 爱宠屋 · 首页
 *
 * 四大服务线入口：
 *   🐾 宠物取名 → /pet/naming    AI 智取灵宠佳名
 *   🎀 宠物配饰 → /pet/accessories  如法加持 · 福泽爱宠（筹备中）
 *   🍲 宠物饮食 → /pet/diet       五行食补 · 顺应天时（筹备中）
 *   🙏 宠物超度 → /pet/liberation  诵经回向 · 送别有情
 *
 * 设计：移动单列 / 平板双列；卡片含玄学图标（emoji）、标题、描述、CTA。
 */

interface ServiceCard {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  cta: string;
  /** 筹备中：渲染角标 + 灰阶 */
  comingSoon?: boolean;
  /** 高亮：第一个推荐服务 */
  featured?: boolean;
}

const SERVICES: ServiceCard[] = [
  {
    href: '/pet/naming',
    emoji: '🐾',
    title: '宠物取名',
    desc: '定音律 · 查五行 · 智取灵宠佳名',
    cta: '开始取名',
    featured: true,
  },
  {
    href: '/pet/accessories',
    emoji: '🎀',
    title: '宠物配饰',
    desc: '如法加持 · 福泽爱宠',
    cta: '敬请期待',
    comingSoon: true,
  },
  {
    href: '/pet/diet',
    emoji: '🍲',
    title: '宠物饮食',
    desc: '五行食补 · 顺应天时',
    cta: '敬请期待',
    comingSoon: true,
  },
  {
    href: '/pet/liberation',
    emoji: '🙏',
    title: '宠物超度',
    desc: '诵经回向 · 送别有情',
    cta: '请奉登记',
  },
];

export default function PetHomePage() {
  return (
    <div className="flex flex-col gap-6 py-6 md:gap-10 md:py-12">
      <PageHeader
        eyebrow="PET"
        title="爱宠屋"
        subtitle="相伴一程 · 护佑一生"
      />

      {/* 引导短句 */}
      <p className="max-w-2xl text-sm leading-relaxed text-foreground/60 md:text-base">
        牠是家里的孩子，是一段缘的陪伴。
        这里汇集四条善信专属服务 — 从
        <span className="mx-1 text-primary">取名</span>
        到
        <span className="mx-1 text-primary">送别</span>
        ，皆以慈悲为本。
      </p>

      {/* 四大服务卡片 */}
      <section
        aria-label="宠物服务入口"
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {SERVICES.map((s) => (
          <ServiceCardItem key={s.href} card={s} />
        ))}
      </section>

      <p className="text-center text-[10px] tracking-wider text-foreground/30">
        · 一切供养，以心诚为要；阿阇梨代为回向，但求众生离苦 ·
      </p>
    </div>
  );
}

/* ============ 子组件：单张大卡片 ============ */

function ServiceCardItem({ card }: { card: ServiceCard }) {
  const isAvailable = !card.comingSoon;
  const isFeatured = !!card.featured;

  // 内容容器：可点击的 Link 或占位 div
  const Inner = (
    <div
      className={[
        'group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl',
        'border p-5 backdrop-blur-md transition md:p-6',
        isAvailable
          ? isFeatured
            ? 'border-primary/50 bg-gradient-to-br from-primary/10 via-black/60 to-black hover:border-primary hover:shadow-[0_0_30px_-10px_rgba(212,175,55,0.5)]'
            : 'border-primary/30 bg-black/60 hover:border-primary/60 hover:shadow-[0_0_24px_-12px_rgba(212,175,55,0.4)]'
          : 'border-border/50 bg-muted/30 opacity-70',
      ].join(' ')}
    >
      {/* 角标：推荐 / 筹备中 */}
      {isFeatured && (
        <span className="absolute right-3 top-3 rounded-full border border-primary/60 bg-primary/15 px-2.5 py-0.5 text-[10px] tracking-wider text-primary">
          推荐
        </span>
      )}
      {card.comingSoon && (
        <span className="absolute right-3 top-3 rounded-full border border-foreground/30 bg-foreground/5 px-2.5 py-0.5 text-[10px] tracking-wider text-foreground/50">
          筹备中
        </span>
      )}

      {/* 玄学图标 */}
      <div
        aria-hidden
        className={[
          'grid h-14 w-14 place-items-center rounded-2xl',
          'border text-2xl md:text-3xl',
          isAvailable
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-foreground/20 bg-foreground/5 text-foreground/40',
        ].join(' ')}
      >
        {card.emoji}
      </div>

      {/* 标题 + 描述 */}
      <h2 className="font-serif text-lg text-foreground md:text-xl">
        {card.title}
      </h2>
      <p className="flex-1 text-sm leading-relaxed text-foreground/65 md:text-base">
        {card.desc}
      </p>

      {/* CTA */}
      <div
        className={[
          'mt-1 inline-flex items-center gap-1.5 text-xs tracking-wider md:text-sm',
          isAvailable
            ? 'text-primary transition group-hover:gap-2.5'
            : 'text-foreground/40',
        ].join(' ')}
      >
        {isAvailable && (
          <span aria-hidden>✦</span>
        )}
        <span>{card.cta}</span>
        {isAvailable && (
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            →
          </span>
        )}
      </div>
    </div>
  );

  if (!isAvailable) {
    return <div className="block">{Inner}</div>;
  }
  return (
    <Link href={card.href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-2xl">
      {Inner}
    </Link>
  );
}
