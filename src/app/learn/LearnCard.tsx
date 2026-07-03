'use client';

/**
 * 牧心堂 · 密解专栏 · 卡片（客户端组件）
 *
 * 与 server component (page.tsx) 分离的原因：
 *   - framer-motion 的 whileHover 需要 'use client'
 *   - server component 持有 getArticles() 的 async 上下文
 *
 * Hover 效果：
 *   - 上浮 4px（y: -4）
 *   - 金色发光阴影 box-shadow: 0 0 16px rgba(212,175,55,0.3)
 *   - duration 200ms ease-out
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { CategoryMeta } from '@/lib/data';

/** JSX 不支持直接写 motion(Link)，必须先 const */
const MotionLearnLink = motion(Link);

interface LearnCardProps {
  category: CategoryMeta;
  count: number;
}

export function LearnCard({ category, count }: LearnCardProps) {
  return (
    <MotionLearnLink
      href={category.href}
      className="group flex flex-col gap-3 rounded-2xl
                 border border-primary/25 bg-muted/40 p-5
                 transition hover:border-primary/60 hover:bg-muted
                 md:p-6"
      aria-label={`进入 ${category.title}`}
      whileHover={{
        y: -4,
        boxShadow: '0 0 16px rgba(212,175,55,0.3)',
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      whileTap={{ y: -2, transition: { duration: 0.1 } }}
    >
      <div className="flex items-center justify-between">
        <span
          aria-hidden
          className="text-3xl text-primary/80 transition group-hover:text-primary"
        >
          {category.glyph}
        </span>
        <span className="text-[10px] tracking-[0.3em] text-foreground/40">
          {category.sub.toUpperCase()}
        </span>
      </div>
      <h2 className="font-serif text-2xl text-foreground">
        {category.title}
      </h2>
      <p className="text-sm leading-relaxed text-foreground/70">
        {category.desc}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs text-foreground/50">
        <span>{count} 篇文章</span>
        <span className="text-primary/70 transition group-hover:text-primary">
          进入 ›
        </span>
      </div>
    </MotionLearnLink>
  );
}
