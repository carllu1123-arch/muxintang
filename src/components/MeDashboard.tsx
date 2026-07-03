'use client';

/**
 * 牧心堂 · 个人中心"数字道场"· 卡片矩阵
 *
 * 4 张核心卡片：
 *   1. 晨音卡片      — 今日阿阇梨晨音（已听/未听 + 试听）
 *   2. 进度卡片      — localStorage 阅读进度（从 lib/reading-progress.ts 读）
 *   3. 吉祥馆卡片    — 用户的最近请奉订单（来自 /api/me/summary）
 *   4. 灵感卡片      — 用户的最近书摘批注（来自 /api/me/summary）
 *
 * 数据源：
 *   - /api/me/summary（最新订单 + 最新批注 + 命盘快照）
 *   - lib/reading-progress.ts（localStorage，仅客户端）
 *   - lib/practice.ts（晨音收听状态，监听 muxintang:practice）
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getProgress,
  formatLastReadTitle,
  formatParagraphLabel,
  type LastRead,
} from '@/lib/reading-progress';
import { getPractice, type DailyPractice } from '@/lib/practice';
import type { MeSummary } from '@/app/api/me/summary/route';

interface MeDashboardProps {
  initialSummary: MeSummary;
  /** 用户昵称（用于"道友"称谓） */
  displayName: string;
}

const PRODUCT_LABEL: Record<'scroll' | 'bracelet' | 'sachet', string> = {
  scroll: '手书经卷',
  bracelet: '菩提念珠',
  sachet: '祈福香囊',
};

function productLabel(p: 'scroll' | 'bracelet' | 'sachet' | null | undefined): string {
  if (!p) return '请奉';
  return PRODUCT_LABEL[p] ?? '请奉';
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待开光',
  blessed: '已开光',
  shipped: '已寄出',
  completed: '已结缘',
  cancelled: '已取消',
};

function statusLabel(s: string | null | undefined): string {
  if (!s) return '—';
  return STATUS_LABEL[s] ?? s;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  const mon = Math.floor(d / 30);
  return `${mon} 个月前`;
}

export function MeDashboard({ initialSummary, displayName }: MeDashboardProps) {
  const [summary, setSummary] = useState<MeSummary>(initialSummary);
  const [progress, setProgress] = useState<LastRead | null>(null);
  const [practice, setPractice] = useState<DailyPractice | null>(null);

  // 客户端：localStorage 阅读进度
  useEffect(() => {
    setProgress(getProgress());
    function onStorage(e: StorageEvent) {
      if (e.key === 'muxintang:last-read') setProgress(getProgress());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 客户端：今日修行打卡（晨音 / 画册）
  useEffect(() => {
    setPractice(getPractice());
    function onPractice() {
      setPractice(getPractice());
    }
    window.addEventListener('muxintang:practice', onPractice);
    return () => window.removeEventListener('muxintang:practice', onPractice);
  }, []);

  // 客户端：每 30s 静默刷新 /api/me/summary（订单/批注可能由他处产生）
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch('/api/me/summary', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as MeSummary;
        if (!cancelled) setSummary(data);
      } catch {
        /* 静默 */
      }
    }
    const t = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* 1. 晨音卡片 */}
      <MorningVoiceCard
        audioListened={practice?.audioListened ?? false}
        audioAt={practice?.audioAt}
        displayName={displayName}
      />

      {/* 2. 阅读进度卡片 */}
      <ProgressCard progress={progress} />

      {/* 3. 吉祥馆 · 请奉记录 */}
      <AuspiciousOrderCard summary={summary} />

      {/* 4. 灵感 · 最近批注 */}
      <AnnotationCard summary={summary} />
    </div>
  );
}

/* ============ 子卡片 ============ */

function MorningVoiceCard({
  audioListened,
  audioAt,
  displayName,
}: {
  audioListened: boolean;
  audioAt: number | undefined;
  displayName: string;
}) {
  return (
    <article
      aria-label="今日晨音"
      className="relative overflow-hidden rounded-2xl border border-primary/30
                 bg-gradient-to-br from-primary/10 via-black/60 to-black p-5
                 backdrop-blur-md md:p-6"
    >
      <header className="mb-3 flex items-center justify-between">
        <p className="text-[10px] tracking-[0.3em] text-foreground/40">
          MORNING · VOICE
        </p>
        {audioListened ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border
                       border-primary/50 bg-primary/10 px-2.5 py-0.5
                       text-[10px] tracking-wider text-primary"
          >
            ✦ 已收听
          </span>
        ) : (
          <span className="text-[10px] tracking-wider text-foreground/40">
            未收听
          </span>
        )}
      </header>

      <h3 className="font-serif text-lg text-foreground md:text-xl">
        今日阿阇梨晨音
      </h3>
      <p className="mt-1 text-[11px] text-foreground/55">
        {audioListened && audioAt
          ? `今日已开示 · ${timeAgo(new Date(audioAt).toISOString())}`
          : `${displayName}，今日尚未闻法`}
      </p>

      <Link
        href="/me#morning-voice"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg
                   border border-primary/40 bg-primary/5 px-4 py-2
                   text-xs text-primary transition
                   hover:bg-primary/15"
      >
        {audioListened ? '重闻今日晨音 →' : '立即闻法 →'}
      </Link>
    </article>
  );
}

function ProgressCard({ progress }: { progress: LastRead | null }) {
  if (!progress) {
    return (
      <article
        aria-label="阅读进度"
        className="rounded-2xl border border-foreground/15 bg-black/60 p-5
                   backdrop-blur-md md:p-6"
      >
        <p className="text-[10px] tracking-[0.3em] text-foreground/40">
          READING · PROGRESS
        </p>
        <h3 className="mt-1 font-serif text-lg text-foreground md:text-xl">
          尚未开启阅读
        </h3>
        <p className="mt-1 text-[11px] text-foreground/55">
          进入《行者故事》开始你的第一次精进
        </p>
        <Link
          href="/library"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg
                     border border-primary/40 bg-primary/5 px-4 py-2
                     text-xs text-primary transition hover:bg-primary/15"
        >
          前往故事库 →
        </Link>
      </article>
    );
  }

  const title = formatLastReadTitle(progress);
  const paraLabel = formatParagraphLabel(progress);
  const percent = Math.min(
    100,
    Math.round(((progress.paragraphIdx + 1) / Math.max(1, progress.paragraphCount)) * 100),
  );

  return (
    <article
      aria-label="阅读进度"
      className="rounded-2xl border border-primary/30 bg-black/60 p-5
                 backdrop-blur-md md:p-6"
    >
      <p className="text-[10px] tracking-[0.3em] text-foreground/40">
        READING · PROGRESS
      </p>
      <h3 className="mt-1 font-serif text-lg text-foreground md:text-xl">
        《{title}》
      </h3>
      <p className="mt-1 text-[11px] text-foreground/55">
        读到 <span className="text-primary">{paraLabel}</span> · {percent}%
      </p>

      {/* 进度条 */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary
                     transition-[width] duration-500"
          style={{ width: `${percent}%` }}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>

      <Link
        href={`/library/${progress.slug}#para-${progress.paragraphIdx}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg
                   border border-primary/40 bg-primary/5 px-4 py-2
                   text-xs text-primary transition hover:bg-primary/15"
      >
        继续阅读 →
      </Link>
    </article>
  );
}

function AuspiciousOrderCard({ summary }: { summary: MeSummary }) {
  const order = summary.latestOrder;
  if (!order) {
    return (
      <article
        aria-label="吉祥馆请奉"
        className="rounded-2xl border border-foreground/15 bg-black/60 p-5
                   backdrop-blur-md md:p-6"
      >
        <p className="text-[10px] tracking-[0.3em] text-foreground/40">
          AUSPICIOUS · HALL
        </p>
        <h3 className="mt-1 font-serif text-lg text-foreground md:text-xl">
          我的请奉
        </h3>
        <p className="mt-1 text-[11px] text-foreground/55">
          尚未结缘，吉祥馆中有手书经卷 / 念珠 / 香囊
        </p>
        <Link
          href="/auspicious"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg
                     border border-primary/40 bg-primary/5 px-4 py-2
                     text-xs text-primary transition hover:bg-primary/15"
        >
          前往吉祥馆 →
        </Link>
      </article>
    );
  }

  return (
    <article
      aria-label="吉祥馆请奉"
      className="rounded-2xl border border-accent/30 bg-accent/5 p-5
                 backdrop-blur-md md:p-6"
    >
      <header className="mb-2 flex items-center justify-between">
        <p className="text-[10px] tracking-[0.3em] text-foreground/40">
          AUSPICIOUS · HALL
        </p>
        <span
          className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5
                     text-[10px] tracking-wider text-accent"
        >
          {statusLabel(order.status)}
        </span>
      </header>
      <h3 className="font-serif text-lg text-foreground md:text-xl">
        {productLabel(order.productType)}
      </h3>
      <p className="mt-1 text-[11px] text-foreground/55">
        敬奉：<span className="text-foreground/75">{order.recipient}</span> · {timeAgo(order.createdAt)}
      </p>
      {order.blessingMessage && (
        <p className="mt-3 line-clamp-2 rounded-lg border border-foreground/10
                      bg-black/30 px-3 py-2 text-[11px] italic text-foreground/65">
          &ldquo;{order.blessingMessage}&rdquo;
        </p>
      )}
      <Link
        href="/auspicious"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg
                   border border-primary/40 bg-primary/5 px-4 py-2
                   text-xs text-primary transition hover:bg-primary/15"
      >
        查看全部请奉 · {summary.orderCount} →
      </Link>
    </article>
  );
}

function AnnotationCard({ summary }: { summary: MeSummary }) {
  const ann = summary.latestAnnotation;
  if (!ann) {
    return (
      <article
        aria-label="书摘灵感"
        className="rounded-2xl border border-foreground/15 bg-black/60 p-5
                   backdrop-blur-md md:p-6"
      >
        <p className="text-[10px] tracking-[0.3em] text-foreground/40">
          INSPIRATION
        </p>
        <h3 className="mt-1 font-serif text-lg text-foreground md:text-xl">
          尚未留下书摘
        </h3>
        <p className="mt-1 text-[11px] text-foreground/55">
          在《行者故事》选中一段文字，即可生成你的灵感卡
        </p>
        <Link
          href="/library"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg
                     border border-primary/40 bg-primary/5 px-4 py-2
                     text-xs text-primary transition hover:bg-primary/15"
        >
          前往故事库 →
        </Link>
      </article>
    );
  }

  return (
    <article
      aria-label="书摘灵感"
      className="rounded-2xl border border-primary/30 bg-black/60 p-5
                 backdrop-blur-md md:p-6"
    >
      <header className="mb-2 flex items-center justify-between">
        <p className="text-[10px] tracking-[0.3em] text-foreground/40">
          INSPIRATION
        </p>
        <span className="text-[10px] tracking-wider text-foreground/40">
          累计 {summary.annotationCount} 条
        </span>
      </header>
      <h3 className="font-serif text-base text-foreground/85 md:text-lg">
        你的最新灵感
      </h3>

      <p
        className="mt-3 line-clamp-2 rounded-lg border-l-2 border-primary/50
                   bg-primary/5 px-3 py-2 text-[12px] italic text-foreground/80"
      >
        &ldquo;{ann.selectedText}&rdquo;
      </p>
      <p className="mt-2 line-clamp-2 text-[11px] text-foreground/65">
        {ann.note}
      </p>

      <Link
        href={`/library/${ann.chapterSlug}#para-${ann.paragraphIdx}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg
                   border border-primary/40 bg-primary/5 px-4 py-2
                   text-xs text-primary transition hover:bg-primary/15"
      >
        回到原文 →
      </Link>
    </article>
  );
}
