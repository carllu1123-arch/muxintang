'use client';

/**
 * 牧心堂 · 密解专栏 · 文章列表项
 *
 * 黑金磨砂卡片 + framer-motion hover 上浮
 * - 标题 + 摘要 + 阅读时长
 * - 点击跳到文章详情页
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ArticleWithAuthor } from '@/types/supabase';

const MotionLink = motion(Link);

export function ArticleListItem({ article }: { article: ArticleWithAuthor }) {
  const href = `/learn/${article.category}/${article.slug}`;

  return (
    <li>
      <MotionLink
        href={href}
        aria-label={`阅读 ${article.title}`}
        className="group flex items-center gap-4 rounded-2xl
                   border border-primary/25 bg-black/60 p-4
                   backdrop-blur-md transition hover:border-primary/60
                   md:p-5"
        whileHover={{
          x: 4,
          boxShadow: '0 0 20px -10px rgba(212,175,55,0.4)',
          transition: { duration: 0.2, ease: 'easeOut' },
        }}
        whileTap={{ x: 2, transition: { duration: 0.1 } }}
      >
        {/* 大字封面字符 */}
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-xl
                     border border-primary/30 bg-background
                     font-serif text-2xl text-primary
                     transition group-hover:text-primary
                     md:h-16 md:w-16 md:text-3xl"
        >
          {article.cover_glyph ?? '✦'}
        </span>

        {/* 主体 */}
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-base text-foreground md:text-lg">
            {article.title}
          </h3>
          {article.subtitle && (
            <p className="mt-0.5 line-clamp-1 text-[12px] text-foreground/55 md:text-sm">
              {article.subtitle}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] tracking-wider text-foreground/40">
            {article.author_name && <span>{article.author_name}</span>}
            <span>· {article.reading_minutes} 分钟</span>
            {article.is_free ? (
              <span className="rounded-full border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-primary/80">
                免费
              </span>
            ) : (
              <span className="rounded-full border border-accent/30 bg-accent/5 px-1.5 py-0.5 text-accent/80">
                ⚡ 会员
              </span>
            )}
          </div>
        </div>

        <span
          aria-hidden
          className="shrink-0 text-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary"
        >
          →
        </span>
      </MotionLink>
    </li>
  );
}
