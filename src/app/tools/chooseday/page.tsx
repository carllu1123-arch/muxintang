'use client';

/**
 * 牧心堂 · 择日智选（Choose Day / 黄历）
 *
 * 流程：
 *   1. 用户选日期（input type="date"）
 *   2. 点击"查询" → 调 lookupAlmanac() 取当日黄历（deterministic 占位）
 *   3. 展示：干支日 + 五行值日 + 冲煞
 *   4. 宜/忌 双栏对照
 *   5. 12 时辰吉凶（grid-cols-1 md:grid-cols-2 gap-4）
 *
 * 风格：黑底金边 / 磨砂玻璃 / 与 BaziChat 视觉一致
 */

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import {
  lookupAlmanac,
  WUXING_COLOR,
  FORTUNE_BG,
  type AlmanacDay,
} from '@/lib/almanac';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ChooseDayPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [result, setResult] = useState<AlmanacDay | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleQuery() {
    if (!date) return;
    setLoading(true);
    try {
      const r = await lookupAlmanac(date);
      setResult(r);
    } catch (e) {
      console.warn('[chooseday] lookupAlmanac failed:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 py-6 md:gap-12 md:py-12">
      <PageHeader
        eyebrow="TOOL · CHOOSEDAY"
        title="择日智选"
        subtitle="选一日黄道，察天时之宜忌。"
        back={{ href: '/tools', label: '智测工具' }}
      />

      {/* ============ 查询区 ============ */}
      <section
        aria-label="日期查询"
        className="rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-md md:p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
          <label className="flex-1">
            <span className="block text-xs tracking-wider text-foreground/60">
              选个日子
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-primary/25 bg-background/70
                         px-3 py-2.5 text-base text-foreground
                         focus:border-primary focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleQuery()}
            disabled={!date || loading}
            className="rounded-lg bg-primary px-6 py-2.5 font-serif text-base text-background
                       transition hover:bg-primary/90
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '查询中…' : '查询'}
          </button>
        </div>
        <p className="mt-3 text-[11px] tracking-wider text-foreground/40">
          · 数据源：Supabase `calendar_dates` 表（空时自动回落到本地占位）·
        </p>
      </section>

      {/* ============ 结果区 ============ */}
      {result && (
        <>
          {/* 干支日 + 五行值日 + 冲煞 */}
          <section
            aria-label="日柱概览"
            className="rounded-2xl border border-primary/30 bg-muted/40 p-5 backdrop-blur-md md:p-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-foreground/40">
                  DAILY · ALMANAC
                </p>
                <h2 className="mt-1 font-serif text-2xl text-primary md:text-3xl">
                  {date} · {result.ganzhiDay}
                </h2>
                <p className="mt-1 text-sm text-foreground/70">
                  {result.clash} · 值日五行{' '}
                  <span className={`font-serif ${WUXING_COLOR[result.wuXing]}`}>
                    {result.wuXing}
                  </span>
                </p>
              </div>
              <div className="text-[10px] tracking-[0.3em] text-foreground/40 md:text-right">
                {result.placeholder ? 'PLACEHOLDER · 种子哈希' : 'PRODUCTION · 真本黄历'}
              </div>
            </div>
          </section>

          {/* 宜 / 忌 双栏 */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <YiJiCard
              tone="yi"
              title="宜"
              subtitle="SUITABLE"
              items={result.yi}
            />
            <YiJiCard
              tone="ji"
              title="忌"
              subtitle="AVOID"
              items={result.ji}
            />
          </section>

          {/* 12 时辰吉凶 */}
          <section
            aria-label="十二时辰"
            className="rounded-2xl border border-primary/30 bg-muted/40 p-5 backdrop-blur-md md:p-6"
          >
            <header className="mb-4 flex items-baseline justify-between">
              <h3 className="font-serif text-lg text-foreground md:text-xl">
                十二时辰 · 吉凶
              </h3>
              <span className="text-[10px] tracking-[0.3em] text-foreground/40">
                12 HOURS
              </span>
            </header>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {result.hours.map((h) => (
                <article
                  key={h.zhi}
                  className={`flex flex-col gap-2 rounded-xl border p-4 ${FORTUNE_BG[h.fortune]}`}
                >
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-serif text-base text-foreground">
                      {h.name}
                      <span className="ml-2 text-xs text-foreground/60">
                        {h.range}
                      </span>
                    </h4>
                    <span
                      className={`text-xs tracking-wider ${
                        h.fortune === '吉'
                          ? 'text-primary'
                          : h.fortune === '凶'
                          ? 'text-accent'
                          : 'text-foreground/50'
                      }`}
                    >
                      {h.fortune}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-foreground/60">
                      宜：<span className="text-foreground/85">{h.yi.join('、')}</span>
                    </span>
                    {h.ji.length > 0 && (
                      <span className="text-foreground/60">
                        忌：<span className="text-foreground/85">{h.ji.join('、')}</span>
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {!result && (
        <p className="text-center text-sm text-foreground/50">
          请选择日期并点击「查询」。
        </p>
      )}
    </div>
  );
}

/* ============ 宜 / 忌 卡片 ============ */

function YiJiCard({
  tone,
  title,
  subtitle,
  items,
}: {
  tone: 'yi' | 'ji';
  title: string;
  subtitle: string;
  items: string[];
}) {
  const isYi = tone === 'yi';
  return (
    <article
      className={`rounded-2xl border p-5 backdrop-blur-md md:p-6
                  ${
                    isYi
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-accent/40 bg-accent/5'
                  }`}
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h3
          className={`font-serif text-2xl md:text-3xl ${
            isYi ? 'text-primary' : 'text-accent'
          }`}
        >
          {title}
        </h3>
        <span className="text-[10px] tracking-[0.3em] text-foreground/40">
          {subtitle}
        </span>
      </header>
      <ul className="flex flex-wrap gap-2">
        {items.map((it) => (
          <li
            key={it}
            className={`rounded-full border px-3 py-1 text-sm
                        ${
                          isYi
                            ? 'border-primary/30 bg-background/50 text-foreground/85'
                            : 'border-accent/30 bg-background/50 text-foreground/85'
                        }`}
          >
            {it}
          </li>
        ))}
      </ul>
    </article>
  );
}
