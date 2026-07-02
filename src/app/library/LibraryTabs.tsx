'use client';

/**
 * 牧心堂 · 行者故事 · Tab 筛选 + 分区展示
 *
 * - 顶部「继续阅读」提示卡：从 localStorage 读最近一次阅读进度（如有）
 * - 顶部 Tab：连载中 / 短篇精选（useState 控制）
 * - 上方区域：长篇连载（列表样式，显示卷号）
 * - 下方区域：短篇精选（网格布局，2 列）
 *
 * 数据由 Server Component 传入，本组件仅负责交互与渲染。
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { NovelWithAuthor } from '@/types/supabase';
import {
  getProgress,
  formatLastReadTitle,
  formatParagraphLabel,
  type LastRead,
} from '@/lib/reading-progress';

type Tab = 'serial' | 'short';

interface LibraryTabsProps {
  chapters: NovelWithAuthor[];
}

export function LibraryTabs({ chapters }: LibraryTabsProps) {
  const [tab, setTab] = useState<Tab>('serial');
  const [lastRead, setLastRead] = useState<LastRead | null>(null);

  // mount 时读 localStorage 阅读进度
  useEffect(() => {
    setLastRead(getProgress());
  }, []);

  const serials = chapters.filter((c) => c.story_type === 'serial');
  const shorts = chapters.filter((c) => c.story_type === 'short');

  // 继续阅读的章节是否仍存在于当前章节列表中
  const lastReadExists =
    lastRead && chapters.some((c) => c.slug === lastRead.slug);

  return (
    <>
      {/* ============ 继续阅读提示卡（金字） ============ */}
      {lastRead && lastReadExists && (
        <Link
          href={`/library/${lastRead.slug}#para-${lastRead.paragraphIdx}`}
          className="group mb-6 flex items-center gap-3 rounded-xl
                     border border-accent/40 bg-gradient-to-r from-accent/10 via-primary/5 to-transparent
                     p-4 transition hover:border-accent hover:from-accent/20
                     md:mb-8 md:p-5"
        >
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                       border border-accent/40 bg-background/60
                       font-serif text-accent"
          >
            ❡
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.3em] text-accent/80">
              CONTINUE · 继续阅读
            </p>
            <p className="mt-0.5 truncate font-serif text-sm text-foreground md:text-base">
              读到《{formatLastReadTitle(lastRead)}》
              <span className="text-accent">
                {' '}
                {formatParagraphLabel(lastRead)}
              </span>
            </p>
          </div>
          <span
            className="shrink-0 font-serif text-xs text-accent transition group-hover:translate-x-1"
            aria-hidden
          >
            →
          </span>
        </Link>
      )}
      {/* ============ Tab 筛选栏 ============ */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('serial')}
          className={`flex-1 rounded-lg border px-4 py-2.5 font-serif text-sm transition
                      ${
                        tab === 'serial'
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-primary/25 bg-background/40 text-foreground/70 hover:border-primary/50 hover:text-foreground'
                      }`}
        >
          <span aria-hidden className="mr-1.5">📖</span>
          连载中
          <span className="ml-1.5 text-[10px] tracking-wider opacity-60">
            ({serials.length})
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('short')}
          className={`flex-1 rounded-lg border px-4 py-2.5 font-serif text-sm transition
                      ${
                        tab === 'short'
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-primary/25 bg-background/40 text-foreground/70 hover:border-primary/50 hover:text-foreground'
                      }`}
        >
          <span aria-hidden className="mr-1.5">✦</span>
          短篇精选
          <span className="ml-1.5 text-[10px] tracking-wider opacity-60">
            ({shorts.length})
          </span>
        </button>
      </div>

      {/* ============ 上方：长篇连载 ============ */}
      {tab === 'serial' && (
        <section
          aria-label="长篇连载"
          className="rounded-2xl border border-primary/20
                     bg-gradient-to-br from-primary/5 via-transparent to-transparent
                     p-5 backdrop-blur-md md:p-8"
        >
          <header className="mb-4">
            <p className="text-[10px] tracking-[0.3em] text-primary/60">
              SERIAL · 长篇连载
            </p>
            <h2 className="mt-1 font-serif text-lg text-foreground md:text-xl">
              山中纪事 · 连载中
            </h2>
          </header>

          <ul className="flex flex-col gap-3">
            {serials.map((ch) => (
              <li key={ch.slug}>
                <Link
                  href={`/library/${ch.slug}`}
                  className="group flex flex-col gap-1 rounded-xl
                             border border-border bg-muted/40 p-4
                             transition hover:border-primary/50 hover:bg-muted
                             md:flex-row md:items-center md:gap-6 md:p-5"
                >
                  <span className="font-serif text-sm text-primary/80 md:w-20 md:text-base">
                    第{ch.chapter_index}卷
                  </span>
                  <div className="flex-1">
                    <h3 className="font-serif text-lg text-foreground md:text-xl">
                      {ch.title}
                    </h3>
                    {ch.subtitle && (
                      <p className="mt-1 text-sm text-foreground/60">
                        {ch.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="text-xs tracking-wider text-foreground/50 md:w-24 md:text-right">
                    {ch.reading_minutes} 分钟
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ 下方：短篇精选 ============ */}
      {tab === 'short' && (
        <section
          aria-label="短篇精选"
          className="rounded-2xl border border-primary/20
                     bg-gradient-to-br from-primary/5 via-transparent to-transparent
                     p-5 backdrop-blur-md md:p-8"
        >
          <header className="mb-4">
            <p className="text-[10px] tracking-[0.3em] text-primary/60">
              SHORT · 短篇精选
            </p>
            <h2 className="mt-1 font-serif text-lg text-foreground md:text-xl">
              短篇 · 如露如电
            </h2>
          </header>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {shorts.map((ch) => (
              <Link
                key={ch.slug}
                href={`/library/${ch.slug}`}
                className="group flex flex-col gap-2 rounded-xl
                           border border-primary/20 bg-black/40 p-5
                           transition hover:border-primary/60 hover:bg-primary/5"
              >
                <span
                  aria-hidden
                  className="font-serif text-2xl text-primary/60 transition group-hover:text-primary"
                >
                  ❡
                </span>
                <h3 className="font-serif text-base text-foreground transition group-hover:text-primary md:text-lg">
                  {ch.title}
                </h3>
                {ch.subtitle && (
                  <p className="text-xs leading-relaxed text-foreground/60 md:text-sm">
                    {ch.subtitle}
                  </p>
                )}
                <p className="mt-1 text-[10px] tracking-wider text-foreground/40">
                  {ch.reading_minutes} 分钟 · 短篇
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default LibraryTabs;
