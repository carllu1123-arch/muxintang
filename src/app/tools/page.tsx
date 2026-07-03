'use client';

/**
 * 牧心堂 · 智测工具入口页
 *
 * 工具矩阵（按会员门槛分组 + id 筛选）：
 *
 *   【免费智测 🪷】2 个：chooseday / trend
 *   【会员专属 💎】4 个：bazi / match / name / habitat
 *
 * 视觉（对齐第9张图精确布局）：
 *   - 区块 A · 免费智测（粉点小标 + 灰金角标）：
 *     网格：grid-cols-1 md:grid-cols-2 gap-4
 *     标题：text-sm text-primary/60 + w-1.5 h-1.5 rounded-full bg-pink-400/60
 *   - 区块 B · 会员专属（💎 金色小标 + ⚡ 会员角标）：
 *     网格：grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4
 *     标题：text-sm text-primary + <span className="text-xs">💎</span>
 *   - 黑底金边 / 磨砂玻璃 / framer-motion hover 上浮
 *   - 右上角角标：免费 / ⚡会员 区分门槛
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { BaziModal } from '@/components/BaziModal';

interface ToolCard {
  /** 工具 id（用于分组筛选） */
  id: 'chooseday' | 'trend' | 'bazi' | 'match' | 'name' | 'habitat';
  title: string;
  sub: string;
  desc: string;
  glyph: string;
  /** true = 模态，string = 跳转链接 */
  href?: string;
  modal?: 'bazi';
  /** 视觉副色 */
  accent: 'primary' | 'accent' | 'mixed';
  /** 会员门槛 */
  tier: 'free' | 'member';
}

const TOOLS: ToolCard[] = [
  /* ===== 免费智测（2 个） ===== */
  {
    id: 'chooseday',
    title: '择日智选',
    sub: 'Choose Day',
    desc: '按日期察天时之宜忌。',
    glyph: '◐',
    href: '/tools/chooseday',
    accent: 'mixed',
    tier: 'free',
  },
  {
    id: 'trend',
    title: '流年大势',
    sub: 'Annual',
    desc: '观流年起伏，知进退取舍。',
    glyph: '↻',
    href: '/tools/trend',
    accent: 'accent',
    tier: 'free',
  },

  /* ===== 会员专属（4 个） ===== */
  {
    id: 'bazi',
    title: '生命代码',
    sub: 'Bazi',
    desc: '按生辰解码你的人生注脚。',
    glyph: '☷',
    modal: 'bazi',
    accent: 'primary',
    tier: 'member',
  },
  {
    id: 'match',
    title: '情缘合盘',
    sub: 'Match',
    desc: '二人八字相照，察缘之深浅。',
    glyph: '☯',
    href: '/tools/match',
    accent: 'accent',
    tier: 'member',
  },
  {
    id: 'name',
    title: '姓名智取',
    sub: 'Name',
    desc: '听音律 · 查五行 · 得阿阇梨心解。',
    glyph: '✒',
    href: '/tools/name',
    accent: 'primary',
    tier: 'member',
  },
  {
    id: 'habitat',
    title: '家居环境',
    sub: 'Habitat',
    desc: '识居家气，调五行平衡。',
    glyph: '⛩',
    href: '/tools/habitat',
    accent: 'mixed',
    tier: 'member',
  },
];

/** id 集合，方便筛选 */
const FREE_IDS = ['chooseday', 'trend'] as const;
const MEMBER_IDS = ['bazi', 'match', 'name', 'habitat'] as const;

const FREE_TOOLS = TOOLS.filter((t) => (FREE_IDS as readonly string[]).includes(t.id));
const MEMBER_TOOLS = TOOLS.filter((t) => (MEMBER_IDS as readonly string[]).includes(t.id));

const ACCENT_STYLES: Record<ToolCard['accent'], { border: string; text: string; shadow: string }> = {
  primary: {
    border: 'border-primary/30 hover:border-primary',
    text: 'text-primary/80 group-hover:text-primary',
    shadow: 'hover:shadow-[0_0_40px_-15px_rgba(212,175,55,0.5)]',
  },
  accent: {
    border: 'border-accent/30 hover:border-accent',
    text: 'text-accent/80 group-hover:text-accent',
    shadow: 'hover:shadow-[0_0_40px_-15px_rgba(194,48,32,0.5)]',
  },
  mixed: {
    border: 'border-primary/25 hover:border-primary/60',
    text: 'text-primary/80 group-hover:text-primary',
    shadow: 'hover:shadow-[0_0_40px_-15px_rgba(212,175,55,0.4)]',
  },
};

export default function ToolsIndex() {
  const [showBaziModal, setShowBaziModal] = useState(false);

  return (
    <div className="flex flex-col gap-12 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="TOOLS"
        title="智测工具"
        subtitle="六大维度，看见自己的本然频率"
      />

      {/* ===== 第一行 · 免费智测 🪷 ===== */}
      <section aria-label="免费智测" className="flex flex-col">
        <div className="mb-4 flex items-center gap-2 text-sm text-primary/60">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-400/60" />
          免费智测
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FREE_TOOLS.map((t) => (
            <ToolGridItem
              key={t.id}
              t={t}
              onOpenBazi={() => setShowBaziModal(true)}
            />
          ))}
        </div>
      </section>

      {/* ===== 第二行 · 会员专属 💎 ===== */}
      <section aria-label="会员专属" className="flex flex-col">
        <div className="mb-4 flex items-center gap-2 text-sm text-primary">
          <span className="text-xs">💎</span>
          会员专属 · 深度解读
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {MEMBER_TOOLS.map((t) => (
            <ToolGridItem
              key={t.id}
              t={t}
              onOpenBazi={() => setShowBaziModal(true)}
            />
          ))}
        </div>
      </section>

      <BaziModal open={showBaziModal} onClose={() => setShowBaziModal(false)} />
    </div>
  );
}

/* ============ 内部工具：framer-motion 包裹的 next/link ============ */

/**
 * JSX 不支持直接写 `motion(Link)`，必须先 const 出来再用。
 * 抽出到模块顶层避免每次渲染重建。
 */
const MotionCardLink = motion(Link);

/* ============ 单卡片渲染 ============ */
function ToolGridItem({
  t,
  onOpenBazi,
}: {
  t: ToolCard;
  onOpenBazi: () => void;
}) {
  const style = ACCENT_STYLES[t.accent];

  // 角标：免费 → 灰金小条；会员 → 金色 ⚡
  const badge =
    t.tier === 'free' ? (
      <span className="absolute top-3 right-3 text-[10px] text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full">
        免费
      </span>
    ) : (
      <span className="absolute top-3 right-3 text-[10px] text-primary bg-primary/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
        <span className="text-[10px]">⚡</span>会员
      </span>
    );

  const inner = (
    <div
      className={`relative flex h-full w-full flex-col gap-3 rounded-2xl border bg-muted/40 p-5
                  transition md:p-6 ${style.border} ${style.shadow}`}
    >
      {/* 右上角角标 */}
      {badge}

      <div className="flex items-center justify-between">
        <span aria-hidden className={`text-3xl transition ${style.text}`}>
          {t.glyph}
        </span>
        <span className="text-[10px] tracking-[0.3em] text-foreground/40">
          {t.sub.toUpperCase()}
        </span>
      </div>
      <h2 className="font-serif text-xl text-foreground md:text-2xl">
        {t.title}
      </h2>
      <p className="text-sm leading-relaxed text-foreground/70">{t.desc}</p>
      <div className="mt-auto">
        <span className={`text-xs tracking-wider transition ${style.text}`}>
          开始 ›
        </span>
      </div>
    </div>
  );

  // framer-motion 共享 hover 效果：上浮 4px + 金色发光阴影
  const hoverProps = {
    whileHover: {
      y: -4,
      boxShadow: '0 0 16px rgba(212,175,55,0.3)',
      transition: { duration: 0.2, ease: 'easeOut' as const },
    },
    whileTap: { y: -2, transition: { duration: 0.1 } },
  };

  if (t.modal === 'bazi') {
    return (
      <motion.button
        type="button"
        onClick={onOpenBazi}
        aria-label={`打开 ${t.title} AI 对话`}
        className="group block w-full rounded-2xl text-left"
        {...hoverProps}
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <MotionCardLink
      href={t.href!}
      aria-label={`前往 ${t.title}`}
      className="group block w-full rounded-2xl"
      {...hoverProps}
    >
      {inner}
    </MotionCardLink>
  );
}
