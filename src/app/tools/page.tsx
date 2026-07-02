'use client';

/**
 * 牧心堂 · 智测工具入口页
 *
 * 工具矩阵（六大维度）：
 *   1. 生命代码 / BAZI        → 模态弹窗（BaziChat 流式 AI）
 *   2. 择日智选 / CHOOSE DAY  → /tools/chooseday
 *   3. 情缘合盘 / MATCH       → /tools/match
 *   4. 家居环境 / HABITAT     → /tools/habitat
 *   5. 姓名心解 / NAME        → /tools/name
 *   6. 流年大势 / ANNUAL      → /tools/trend
 *
 * 视觉风格：
 *   - 黑底金边 / 磨砂玻璃 / hover 变亮 + 金色阴影
 *   - 6 卡：移动端单列 / 平板 2 列 / PC 端 3 列
 */

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { BaziModal } from '@/components/BaziModal';

interface ToolCard {
  title: string;
  sub: string;
  desc: string;
  glyph: string;
  /** true = 模态，string = 跳转链接 */
  href?: string;
  modal?: 'bazi';
  /** 视觉副色 */
  accent: 'primary' | 'accent' | 'mixed';
}

const TOOLS: ToolCard[] = [
  {
    title: '生命代码',
    sub: 'Bazi',
    desc: '按生辰解码你的人生注脚。',
    glyph: '☷',
    modal: 'bazi',
    accent: 'primary',
  },
  {
    title: '择日智选',
    sub: 'Choose Day',
    desc: '按日期察天时之宜忌。',
    glyph: '◐',
    href: '/tools/chooseday',
    accent: 'mixed',
  },
  {
    title: '情缘合盘',
    sub: 'Match',
    desc: '二人八字相照，察缘之深浅。',
    glyph: '☯',
    href: '/tools/match',
    accent: 'accent',
  },
  {
    title: '家居环境',
    sub: 'Habitat',
    desc: '识居家气，调五行平衡。',
    glyph: '⛩',
    href: '/tools/habitat',
    accent: 'mixed',
  },
  {
    title: '姓名心解',
    sub: 'Name',
    desc: '一字藏玄机，听名字的回响。',
    glyph: '✒',
    href: '/tools/name',
    accent: 'primary',
  },
  {
    title: '流年大势',
    sub: 'Annual',
    desc: '观流年起伏，知进退取舍。',
    glyph: '↻',
    href: '/tools/trend',
    accent: 'accent',
  },
];

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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const style = ACCENT_STYLES[t.accent];
          const inner = (
            <div
              className={`flex h-full flex-col gap-3 rounded-2xl border bg-muted/40 p-5
                          transition md:p-6 ${style.border} ${style.shadow}`}
            >
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
              <p className="text-sm leading-relaxed text-foreground/70">
                {t.desc}
              </p>
              <div className="mt-auto">
                <span
                  className={`text-xs tracking-wider transition ${style.text}`}
                >
                  开始 ›
                </span>
              </div>
            </div>
          );

          if (t.modal === 'bazi') {
            return (
              <button
                key={t.title}
                type="button"
                onClick={() => setShowBaziModal(true)}
                aria-label={`打开 ${t.title} AI 对话`}
                className="group block text-left"
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={t.title}
              href={t.href!}
              className="group block"
              aria-label={`前往 ${t.title}`}
            >
              {inner}
            </Link>
          );
        })}
      </section>

      <BaziModal open={showBaziModal} onClose={() => setShowBaziModal(false)} />
    </div>
  );
}
