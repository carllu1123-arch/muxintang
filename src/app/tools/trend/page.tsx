'use client';

/**
 * 牧心堂 · 流年大势（Annual Trend）
 *
 * 流程：
 *   1. mount 时 fetch /api/user，读取已存的 birthDate / birthHour / gender
 *   2. 若无 → 黄色 Banner 引导用户去「生命代码」完成排盘
 *   3. 若有 → 用 bazi-engine 重算 → 调 /api/dify 生成 200 字年度运势
 *   4. 流式显示 + 渲染 ExportPdfButton（导流至"画册 + 朋友圈裂变"）
 *
 * 商业价值：
 *   - 这是把"排盘工具"用户转化为"留存/复访"用户的关键钩子
 *   - 每年 12 月 / 春节前后是流量高峰
 *
 * 隐私：
 *   - 仅读取当前用户自己的 user_profiles（RLS 保证）
 *   - 不写库
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ExportPdfButton } from '@/components/ExportPdfButton';
import {
  calculateBazi,
  validateBaziInput,
  type BaziOutput,
} from '@/lib/bazi-engine';

interface UserProfile {
  id: string;
  displayName: string;
  birthDate: string | null;
  birthHour: number | null;
  gender: '男' | '女' | null;
}

const SYSTEM_PROMPT =
  '你是一位精通唐密与八字命理的开示者。' +
  '请根据用户当年的小运（流年）、日主五行与四柱格局，' +
  '生成一份约 200 字的年度运势与修行指引，包含：' +
  '(1) 当年五行倾向（与日主的生克关系）；' +
  '(2) 方位建议（利北方/南方等）；' +
  '(3) 一个开运法门（种子字 / 持咒 / 方位 / 配饰任选其一）；' +
  '(4) 一条修行提醒。' +
  '语气慈悲、具体、可操作；不要使用耸动词汇。';

function buildFallback(
  birthDate: string,
  birthHour: number,
  year: number,
  bazi: BaziOutput,
): string {
  const lines: string[] = [];
  lines.push(`【${year} 年 · 流年指引】`);
  lines.push(
    `您日主 ${bazi.dayMaster}（${bazi.dayMasterElement}），四柱 ${bazi.yearPillar} ${bazi.monthPillar} ${bazi.dayPillar} ${bazi.hourPillar}。`,
  );
  lines.push('');
  lines.push(`【五行倾向】${year} 年流年气场与日主相生，${bazi.dayMasterElement} 气旺盛，宜顺势而动，避免过刚。`);
  lines.push('【方位建议】利居东或南，可多在清晨户外打坐迎朝阳。');
  lines.push('【开运法门】每日清晨面东持"嗡"字诀 21 息，可安神定志。');
  lines.push('【修行提醒】心若安住，处处皆是道场。');
  return lines.join('\n');
}

export default function TrendPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bazi, setBazi] = useState<BaziOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const resultRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ============ Step 1：读取用户档案 ============ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/user', { cache: 'no-store' });
        if (!r.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const { user } = (await r.json()) as { user: UserProfile | null };
        if (cancelled) return;
        setUser(user);

        if (user?.birthDate) {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(user.birthDate);
          if (m) {
            const input = {
              year: Number(m[1]),
              month: Number(m[2]),
              day: Number(m[3]),
              hour: user.birthHour ?? 12,
              gender: user.gender ?? undefined,
            };
            if (validateBaziInput(input)) {
              setBazi(calculateBazi(input));
            }
          }
        }
      } catch {
        /* Supabase 未配置 → 静默 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ============ Step 2：流年解读 ============ */
  async function handleGenerate() {
    if (!bazi) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSubmitted(true);
    setAiLoading(true);
    setAiError(null);
    setAiText('');

    const ctx = {
      year,
      dayMaster: bazi.dayMaster,
      dayMasterElement: bazi.dayMasterElement,
      pillars: `${bazi.yearPillar} ${bazi.monthPillar} ${bazi.dayPillar} ${bazi.hourPillar}`,
      nayin: bazi.nayin,
      zodiac: bazi.zodiac,
      fiveElements: bazi.fiveElements,
    };

    const fallback = buildFallback(
      user!.birthDate!,
      user!.birthHour ?? 12,
      year,
      bazi,
    );

    const query = `请为 ${year} 年流年给出指引。日主 ${ctx.dayMaster}（${ctx.dayMasterElement}），四柱 ${ctx.pillars}，生肖 ${ctx.zodiac}。`;

    try {
      const res = await fetch('/api/dify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: SYSTEM_PROMPT,
          query,
          context: ctx,
          fallback,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          let ev: { type: string; data?: string; error?: string };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === 'chunk' && typeof ev.data === 'string') {
            accumulated += ev.data;
            setAiText(accumulated);
          } else if (ev.type === 'error') {
            throw new Error(ev.error || '流式错误');
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      const msg = (e as { message?: string })?.message || 'AI 暂未在线。';
      setAiError(msg);
      setAiText(fallback);
    } finally {
      setAiLoading(false);
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    setAiText('');
    setAiError(null);
    setSubmitted(false);
    setAiLoading(false);
  }

  /* ============ Render ============ */
  return (
    <div className="flex flex-col gap-8 py-6 md:gap-12 md:py-12">
      <PageHeader
        eyebrow="TOOL · ANNUAL"
        title="流年大势"
        subtitle="观流年起伏，知进退取舍。"
        back={{ href: '/tools', label: '智测工具' }}
      />

      {/* ============ 未登录 / 无生辰 → 引导 Banner ============ */}
      {!loading && !bazi && (
        <section
          role="alert"
          className="rounded-2xl border-2 border-yellow-400/60 bg-yellow-300/10 p-6 backdrop-blur-md
                     md:p-8"
        >
          <header className="mb-3 flex items-center gap-3">
            <span aria-hidden className="text-2xl">☀️</span>
            <h3 className="font-serif text-xl text-yellow-200 md:text-2xl">
              请先完成【生命代码】排盘
            </h3>
          </header>
          <p className="text-sm leading-relaxed text-yellow-100/90 md:text-base">
            存入生辰档案后，才能解锁流年大势。
            <br />
            流年预测基于您独有的八字格局，没有档案则无法给出贴合您能量的开示。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-300/90 px-5 py-2.5
                         font-serif text-sm text-black transition hover:bg-yellow-300"
            >
              ☷ 前往「生命代码」排盘
            </Link>
            {!user && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-yellow-300/60
                           px-5 py-2.5 text-sm text-yellow-100 transition
                           hover:border-yellow-300 hover:text-yellow-200"
              >
                已是道友？登录
              </Link>
            )}
          </div>
          {!user && (
            <p className="mt-3 text-[10px] tracking-wider text-yellow-200/60">
              · 提示：个人中心依赖 Supabase Auth；如未配置 .env.local，请先在
              <Link href="/me" className="mx-1 underline">/me</Link>
              查看配置说明 ·
            </p>
          )}
        </section>
      )}

      {/* ============ 已存档案 → 一键流年 ============ */}
      {bazi && (
        <section
          aria-label="流年信息"
          className="rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-md md:p-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-foreground/40">
                ANNUAL · OVERVIEW
              </p>
              <h3 className="mt-1 font-serif text-xl text-foreground md:text-2xl">
                {user?.displayName ?? '道友'} · {year} 年流年
              </h3>
              <p className="mt-1 text-xs text-foreground/60 md:text-sm">
                日主 {bazi.dayMaster}（{bazi.dayMasterElement}）· 四柱{' '}
                {bazi.yearPillar} {bazi.monthPillar} {bazi.dayPillar} {bazi.hourPillar}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-foreground/60">
                年份
              </label>
              <input
                type="number"
                value={year}
                min={1900}
                max={2100}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setYear(v);
                }}
                className="w-24 rounded-lg border border-primary/25 bg-background/70
                           px-2 py-1.5 text-base text-foreground
                           focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={aiLoading}
              className="flex-1 rounded-lg bg-primary px-4 py-3 font-serif text-base text-background
                         transition hover:bg-primary/90
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiLoading ? '阿阇梨开示中…' : submitted ? '重新生成' : '生成流年指引'}
            </button>
            {submitted && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-primary/30 px-4 py-3 text-sm text-foreground/80
                           transition hover:border-primary hover:text-primary"
              >
                清空
              </button>
            )}
          </div>
        </section>
      )}

      {/* ============ AI 流年解读 ============ */}
      {submitted && bazi && (
        <section
          ref={resultRef}
          aria-label="流年开示"
          className="rounded-2xl border border-primary/30 bg-black/60 p-6 backdrop-blur-md md:p-8"
        >
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-foreground/40">
                ANNUAL · DHARMA TALK
              </p>
              <h3 className="font-serif text-2xl text-primary md:text-3xl">
                {year} 年 · 阿阇梨开示
              </h3>
            </div>
            <div className="text-[10px] tracking-[0.3em] text-foreground/40">
              {aiLoading ? '开示中…' : '已出指引'}
            </div>
          </header>

          <div className="relative min-h-[160px] whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 md:text-base">
            {aiText || (aiLoading ? '' : '（点击"生成流年指引"开始…）')}
            {aiLoading && aiText.length === 0 && (
              <span
                aria-hidden
                className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-primary/80"
              />
            )}
            {aiLoading && aiText.length > 0 && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-primary/80"
              />
            )}
          </div>

          {aiError && (
            <p className="mt-3 text-xs text-accent">
              · 阿阇梨暂未在线（{aiError}），已显示本地解读 ·
            </p>
          )}

          <p className="mt-4 text-[10px] tracking-wider text-foreground/30">
            · 流年起伏皆为缘起，修行在心不在运，请以正念为本 ·
          </p>
        </section>
      )}

      {/* ============ PDF 导出（仅在有结果时） ============ */}
      {submitted && aiText && bazi && (
        <section className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-foreground/50">
            {bazi
              ? `日主 ${bazi.dayMaster}（${bazi.dayMasterElement}）·  ${year} 年流年报告`
              : ''}
          </div>
          <ExportPdfButton
            resultRef={resultRef}
            filename={`${year}年流年大势_${bazi.dayMaster}-${bazi.dayMasterElement}`}
            recipient={user?.displayName ?? '道友'}
            shareQuote={aiText.slice(0, 100)}
            shareAttribution={`—— 牧心堂 · ${year} 流年`}
          />
        </section>
      )}
    </div>
  );
}
