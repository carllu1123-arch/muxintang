'use client';

/**
 * 牧心堂 · 全局搜索入口（PC + 移动端共用）
 *
 * 设计：
 *   - 触发按钮：variant='pc' 渲染"搜索"文字按钮；variant='mobile' 渲染纯图标
 *   - 点击后唤起全屏黑金磨砂模态框
 *   - 模态框内 input + fuse.js 实时模糊匹配
 *   - 搜索范围：ARTICLES（专栏）+ CHAPTERS（行者故事）+ TOOLS（智测工具）
 *   - 结果按类型分组渲染，点击跳转后自动关闭
 *
 * 交互：
 *   - ESC 关闭
 *   - 打开时自动聚焦 input + 锁定 body 滚动
 *   - 空查询时显示热门入口（工具直链）
 *   - 无结果时显示提示
 *
 * 依赖：fuse.js（客户端模糊搜索，无后端）
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { ARTICLES, CHAPTERS, CATEGORIES } from '@/lib/mock-data';

interface SearchEntry {
  type: 'article' | 'chapter' | 'tool';
  title: string;
  subtitle: string;
  href: string;
  glyph: string;
  categoryLabel: string;
}

/* ============ 智测工具索引（与 page.tsx TOOLS 对齐 + 3 个隐藏工具） ============ */
const TOOLS: SearchEntry[] = [
  {
    type: 'tool',
    title: '生命代码',
    subtitle: '按生辰解码你的人生注脚',
    href: '/tools/bazi',
    glyph: '☷',
    categoryLabel: '智测工具',
  },
  {
    type: 'tool',
    title: '家居环境',
    subtitle: '识居家气，调五行平衡',
    href: '/tools/habitat',
    glyph: '◉',
    categoryLabel: '智测工具',
  },
  {
    type: 'tool',
    title: '姓名心解',
    subtitle: '一字藏玄机，听名字的回响',
    href: '/tools/name',
    glyph: '✎',
    categoryLabel: '智测工具',
  },
  {
    type: 'tool',
    title: '情缘合盘',
    subtitle: '二人八字相照，察缘之深浅',
    href: '/tools/match',
    glyph: '☯',
    categoryLabel: '智测工具',
  },
  {
    type: 'tool',
    title: '择日智选',
    subtitle: '选一日黄道，察天时之宜忌',
    href: '/tools/chooseday',
    glyph: '◐',
    categoryLabel: '智测工具',
  },
  {
    type: 'tool',
    title: '流年大势',
    subtitle: '观流年起伏，知进退取舍',
    href: '/tools/trend',
    glyph: '☰',
    categoryLabel: '智测工具',
  },
];

/** 构建统一搜索索引 */
function buildIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [...TOOLS];

  for (const a of ARTICLES) {
    const cat = CATEGORIES.find((c) => c.id === a.category);
    entries.push({
      type: 'article',
      title: a.title,
      subtitle: a.subtitle,
      href: `/learn/${a.category}/${a.slug}`,
      glyph: cat?.glyph ?? '◈',
      categoryLabel: cat?.title ?? '专栏',
    });
  }

  for (const ch of CHAPTERS) {
    entries.push({
      type: 'chapter',
      title: ch.title,
      subtitle: ch.subtitle,
      href: `/library/${ch.slug}`,
      glyph: '❡',
      categoryLabel: ch.storyType === 'short' ? '短篇精选' : `第${ch.number}卷`,
    });
  }

  return entries;
}

/* ============ 类型标签 ============ */
const TYPE_META: Record<
  SearchEntry['type'],
  { label: string; tone: string }
> = {
  tool: { label: '工具', tone: 'text-primary border-primary/40' },
  article: { label: '专栏', tone: 'text-foreground/70 border-foreground/25' },
  chapter: { label: '故事', tone: 'text-accent border-accent/40' },
};

interface SearchPortalProps {
  variant: 'pc' | 'mobile';
}

export function SearchPortal({ variant }: SearchPortalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // fuse 实例（仅构建一次）
  const fuse = useMemo(() => {
    return new Fuse(buildIndex(), {
      keys: [
        { name: 'title', weight: 0.6 },
        { name: 'subtitle', weight: 0.3 },
        { name: 'categoryLabel', weight: 0.1 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }, []);

  // 搜索结果（最多 12 条）
  const results = useMemo<SearchEntry[]>(() => {
    const q = query.trim();
    if (!q) return [];
    return fuse.search(q).slice(0, 12).map((r) => r.item);
  }, [query, fuse]);

  // 打开时聚焦 input + 锁定滚动 + ESC 关闭
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => inputRef.current?.focus());
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
     
  }, [open]);

  function handleClose() {
    setOpen(false);
    setQuery('');
  }

  /* ============ 触发按钮 ============ */
  const trigger =
    variant === 'pc' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="搜索"
        className="flex items-center gap-1.5 rounded-full
                   border border-primary/40 px-3 py-1.5
                   text-xs text-foreground/70 transition
                   hover:border-primary hover:text-primary"
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span className="tracking-wider">搜索</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="搜索"
        className="flex flex-col items-center gap-0.5 py-2
                   text-foreground/70 transition active:text-primary"
      >
        <SearchIcon className="h-5 w-5" />
        <span className="text-[11px] tracking-wider">搜索</span>
      </button>
    );

  return (
    <>
      {trigger}

      {/* ============ 全屏搜索模态框 ============ */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="牧心搜索"
          className="fixed inset-0 z-50 flex flex-col
                     bg-background/95 backdrop-blur-xl"
          onClick={handleClose}
        >
          {/* 顶部搜索栏 */}
          <div
            className="border-b border-primary/20 px-4 py-4 md:px-6 md:py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3">
              <SearchIcon className="h-5 w-5 shrink-0 text-primary/60" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索专栏、故事、工具…"
                className="flex-1 bg-transparent text-base text-foreground
                           placeholder:text-foreground/30
                           focus:outline-none md:text-lg"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-primary/30
                           px-2.5 py-1 text-[10px] tracking-wider text-foreground/50
                           transition hover:border-primary hover:text-primary"
              >
                ESC
              </button>
            </div>
          </div>

          {/* 结果区 */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto max-w-2xl">
              {/* 空查询：显示热门工具入口 */}
              {!query.trim() && (
                <div>
                  <p className="mb-3 text-[10px] tracking-[0.3em] text-primary/50">
                    HOT · 热门入口
                  </p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
                    {TOOLS.map((t) => (
                      <Link
                        key={t.href}
                        href={t.href}
                        onClick={handleClose}
                        className="group flex items-center gap-2 rounded-lg
                                   border border-primary/20 bg-black/40 px-3 py-2.5
                                   transition hover:border-primary/50 hover:bg-primary/5"
                      >
                        <span
                          aria-hidden
                          className="font-serif text-lg text-primary/70 transition group-hover:text-primary"
                        >
                          {t.glyph}
                        </span>
                        <span className="truncate font-serif text-sm text-foreground">
                          {t.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 有查询：显示搜索结果 */}
              {query.trim() && results.length === 0 && (
                <div className="py-16 text-center">
                  <p className="font-serif text-lg text-foreground/60">
                    未寻得与「{query.trim()}」相应的内容
                  </p>
                  <p className="mt-2 text-xs text-foreground/40">
                    试试更简短的关键词，或直接浏览上方热门入口
                  </p>
                </div>
              )}

              {query.trim() && results.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {results.map((r, i) => {
                    const meta = TYPE_META[r.type];
                    return (
                      <li key={`${r.href}-${i}`}>
                        <Link
                          href={r.href}
                          onClick={handleClose}
                          className="group flex items-start gap-3 rounded-lg
                                     border border-primary/15 bg-black/30 px-4 py-3
                                     transition hover:border-primary/50 hover:bg-primary/5"
                        >
                          <span
                            aria-hidden
                            className="mt-0.5 font-serif text-xl text-primary/70 transition group-hover:text-primary"
                          >
                            {r.glyph}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-serif text-sm text-foreground transition group-hover:text-primary md:text-base">
                                {r.title}
                              </h3>
                              <span
                                className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] tracking-wider ${meta.tone}`}
                              >
                                {meta.label}
                              </span>
                            </div>
                            {r.subtitle && (
                              <p className="mt-0.5 truncate text-xs text-foreground/55">
                                {r.subtitle}
                              </p>
                            )}
                            <p className="mt-0.5 text-[10px] tracking-wider text-foreground/40">
                              {r.categoryLabel}
                            </p>
                          </div>
                          <span
                            aria-hidden
                            className="mt-1 shrink-0 text-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary"
                          >
                            →
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============ 搜索图标 ============ */
function SearchIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default SearchPortal;
