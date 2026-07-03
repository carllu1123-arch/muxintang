'use client';

import { useEffect, useState } from 'react';

/**
 * 牧心堂 · 阿阇梨后台 · 运营数据看板
 *
 * 3 张统计卡片：
 *   🚧 付费墙拦截次数   (event = 'paywall_triggered')
 *   🤖 AI 阿阇梨调用次数 (event = 'ai_explanation_called')
 *   📄 PDF 画册下载次数  (event = 'pdf_downloaded')
 *
 * 数据源：GET /api/acharya/stats
 *   - 接口失败 / 未配置 / 角色不够 → 返回 mock 兜底（mock: true）
 *   - 卡片顶部展示 "数据来源" 标签：实时 / 占位
 *
 * 视觉：黑金磨砂卡片，与现有后台风格统一
 *   bg-black/60 backdrop-blur-md border border-primary/30 rounded-xl p-6
 */

interface StatsResponse {
  ok: true;
  paywallCount: number;
  aiCount: number;
  pdfCount: number;
  mock: boolean;
  reason?: string;
  generatedAt: string;
}

const CARD_BASE =
  'flex flex-col gap-3 rounded-xl border border-primary/30 ' +
  'bg-black/60 backdrop-blur-md p-6 transition ' +
  'hover:border-primary hover:shadow-[0_0_30px_-15px_rgba(212,175,55,0.5)]';

export function AcharyaStats() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/acharya/stats', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as StatsResponse;
        if (cancelled) return;
        setData(json);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        setLoading(false);
      }
    }
    load();
    // 60s 自动刷新（后台运营数据不需要秒级实时）
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <section
      aria-label="运营数据看板"
      className="flex flex-col gap-3"
    >
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-foreground/40">
            OPS · STATS
          </p>
          <h2 className="mt-1 font-serif text-lg text-foreground md:text-xl">
            运营数据看板
          </h2>
        </div>
        {data && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] tracking-wider
                       ${data.mock
                         ? 'border border-foreground/20 bg-foreground/5 text-foreground/50'
                         : 'border border-primary/40 bg-primary/10 text-primary'}`}
            title={data.reason ? `reason: ${data.reason}` : '实时数据'}
          >
            {data.mock ? '· 占位数据' : '✦ 实时数据'}
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          glyph="🚧"
          label="付费墙拦截次数"
          eventName="paywall_triggered"
          value={data?.paywallCount ?? null}
          loading={loading}
        />
        <StatCard
          glyph="🤖"
          label="AI 阿阇梨调用次数"
          eventName="ai_explanation_called"
          value={data?.aiCount ?? null}
          loading={loading}
        />
        <StatCard
          glyph="📄"
          label="PDF 画册下载次数"
          eventName="pdf_downloaded"
          value={data?.pdfCount ?? null}
          loading={loading}
        />
      </div>

      {error && (
        <p className="text-[11px] text-foreground/45">
          ⚠️ 看板接口异常：{error}
        </p>
      )}
      {data && (
        <p className="text-[10px] tracking-wider text-foreground/35">
          · 最后更新：{new Date(data.generatedAt).toLocaleString('zh-CN', { hour12: false })}
        </p>
      )}
    </section>
  );
}

function StatCard({
  glyph,
  label,
  eventName,
  value,
  loading,
}: {
  glyph: string;
  label: string;
  eventName: string;
  value: number | null;
  loading: boolean;
}) {
  return (
    <div className={CARD_BASE}>
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-xl leading-none">
          {glyph}
        </span>
        <p className="text-[10px] tracking-[0.3em] text-foreground/40">
          {label}
        </p>
      </div>
      <div className="flex items-baseline gap-1">
        {loading || value === null ? (
          <span className="font-serif text-3xl text-foreground/30 md:text-4xl">
            —
          </span>
        ) : (
          <span className="font-serif text-3xl text-primary md:text-4xl">
            {value.toLocaleString('zh-CN')}
          </span>
        )}
        <span className="ml-1 text-[10px] tracking-wider text-foreground/40">
          次
        </span>
      </div>
      <p className="text-[10px] tracking-wider text-foreground/30">
        event: {eventName}
      </p>
    </div>
  );
}
