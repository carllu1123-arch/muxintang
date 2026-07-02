'use client';

import { useState } from 'react';
import type { BaziOutput } from '@/lib/bazi-engine';

/**
 * 牧心堂 · 生命代码（Bazi 八字）表单
 *
 * 工作流：
 *   1. 用户填生辰 + 性别
 *   2. 提交 → POST /api/bazi
 *   3. 展示：四柱硬算 + 五行能量条 + 唐密本尊 + AI 润色解读
 *
 * 设计要点：
 *   - 硬算 100% 精准（lunar-javascript 库），AI 润色是文采
 *   - loading / error / 兜底 全覆盖
 *   - 移动优先；PC 端字段横向排列
 */

interface BaziApiResponse {
  ok: true;
  bazi: BaziOutput;
  interpretation: string;
  source: 'dify' | 'local';
  latencyMs: number;
}

interface BaziApiError {
  ok: false;
  error: string;
}

export function BaziForm() {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BaziApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!year || !month || !day || !hour) {
      setError('请填完年月日时四柱（时辰是必填）。');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch('/api/bazi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: Number(year),
          month: Number(month),
          day: Number(day),
          hour: Number(hour),
          gender,
        }),
      });
      const data = (await r.json()) as BaziApiResponse | BaziApiError;
      if (!r.ok || !('ok' in data) || !data.ok) {
        setError(
          ('error' in data && data.error) ||
            `排盘失败（HTTP ${r.status}）`,
        );
        return;
      }
      setResult(data);
    } catch (e: any) {
      setError(e?.message || '网络异常，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setYear('');
    setMonth('');
    setDay('');
    setHour('');
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-primary/30 bg-black/60 p-5
                   backdrop-blur-md md:p-8"
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Field
            label="年"
            value={year}
            onChange={setYear}
            placeholder="1990"
            maxLength={4}
            disabled={loading}
          />
          <Field
            label="月"
            value={month}
            onChange={setMonth}
            placeholder="6"
            maxLength={2}
            disabled={loading}
          />
          <Field
            label="日"
            value={day}
            onChange={setDay}
            placeholder="15"
            maxLength={2}
            disabled={loading}
          />
          <Field
            label="时"
            value={hour}
            onChange={setHour}
            placeholder="14"
            maxLength={2}
            disabled={loading}
          />
        </div>

        <div className="mt-5">
          <span className="block text-xs tracking-wider text-foreground/60">
            性别
          </span>
          <div className="mt-2 flex gap-2">
            {(['男', '女'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                disabled={loading}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm transition
                  ${
                    gender === g
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-primary/25 text-foreground/70 hover:border-primary/50'
                  }
                  ${loading ? 'opacity-50' : ''}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-primary px-4 py-3
                       font-serif text-base text-background transition
                       hover:bg-primary/90
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '解码中…' : '解码'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="rounded-lg border border-primary/30 px-4 py-3
                       text-sm text-foreground/80 transition
                       hover:border-primary hover:text-primary
                       disabled:opacity-50"
          >
            重置
          </button>
        </div>
      </form>

      {loading && (
        <div
          className="flex items-center justify-center gap-3 rounded-2xl
                     border border-primary/20 bg-muted/30 p-6
                     text-sm text-foreground/60 backdrop-blur-md"
        >
          <span
            aria-hidden
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
          />
          <span aria-hidden className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.2s]" />
          <span aria-hidden className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.4s]" />
          <span className="ml-2">正在排盘 + 调取本尊法语…</span>
        </div>
      )}

      {result && <BaziResultView data={result} />}
    </div>
  );
}

/* ============ 结果视图 ============ */

function BaziResultView({ data }: { data: BaziApiResponse }) {
  const { bazi, interpretation, source, latencyMs } = data;

  // 找最强 / 最弱五行（用于额外文字）
  const sorted = Object.entries(bazi.fiveElements).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0]?.[0] ?? '—';

  return (
    <article
      className="flex flex-col gap-8 rounded-2xl border border-primary/30
                 bg-muted/40 p-6 backdrop-blur-md md:p-8"
    >
      {/* 头部：日主 + 本尊 + 耗时 */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[10px] tracking-[0.3em] text-foreground/40">
          <span>LIFECODE · BAZI</span>
          <span aria-hidden>·</span>
          <span>硬算 {latencyMs}ms</span>
          <span aria-hidden>·</span>
          <span>解读 {source === 'dify' ? 'AI 润色' : '本地模板'}</span>
        </div>
        <h3 className="font-serif text-2xl text-primary md:text-3xl">
          {bazi.dayMaster}（{bazi.dayMasterElement}）· 本尊 {bazi.deity}
        </h3>
        <p className="text-sm text-foreground/70 md:text-base">
          生于 {bazi.lunarDate}（{bazi.zodiac}年{bazi.solarTerm !== '无节气' ? ` · ${bazi.solarTerm}` : ''}）
        </p>
      </header>

      {/* 四柱 */}
      <div className="grid grid-cols-4 gap-2 text-center md:gap-3">
        {[
          { l: '年柱', v: bazi.yearPillar },
          { l: '月柱', v: bazi.monthPillar },
          { l: '日柱', v: bazi.dayPillar },
          { l: '时柱', v: bazi.hourPillar },
        ].map((p) => (
          <div
            key={p.l}
            className="rounded-lg border border-primary/20 bg-background/60 py-3"
          >
            <div className="text-[10px] tracking-wider text-foreground/50">
              {p.l}
            </div>
            <div className="mt-1 font-serif text-lg text-primary md:text-xl">
              {p.v}
            </div>
          </div>
        ))}
      </div>

      {/* 十神 */}
      <div className="rounded-xl border border-primary/15 bg-background/40 p-4">
        <h4 className="mb-3 text-xs tracking-[0.3em] text-foreground/40">
          十 神
        </h4>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-4">
          {bazi.tenGods.map((t) => (
            <li key={t.pillar} className="flex items-center gap-2">
              <span className="text-foreground/50">{t.pillar}</span>
              <span className="font-serif text-primary">{t.god}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 五行能量 */}
      <div className="rounded-xl border border-primary/15 bg-background/40 p-4">
        <h4 className="mb-3 text-xs tracking-[0.3em] text-foreground/40">
          五 行 能 量
        </h4>
        <ul className="space-y-2">
          {(['金', '木', '水', '火', '土'] as const).map((el) => {
            const v = bazi.fiveElements[el];
            const pct = Math.round(v * 100);
            const isStrong = el === strongest;
            return (
              <li
                key={el}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-6 shrink-0 text-foreground/70">{el}</span>
                <span
                  className="h-2 flex-1 overflow-hidden rounded-full bg-primary/10"
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-full bg-primary/70 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span
                  className={`w-12 shrink-0 text-right font-mono text-xs ${
                    isStrong ? 'text-accent' : 'text-foreground/60'
                  }`}
                >
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-foreground/50">
          最旺：<span className="text-accent">{strongest}</span> · 喜用神宜取与所缺元素相生之五行
        </p>
      </div>

      {/* AI 解读（Markdown 渲染） */}
      <div className="rounded-xl border border-primary/15 bg-background/40 p-4 md:p-6">
        <h4 className="mb-3 flex items-center gap-2 text-xs tracking-[0.3em] text-foreground/40">
          <span>本 尊 法 语</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] tracking-normal ${
              source === 'dify'
                ? 'border-accent/40 text-accent'
                : 'border-foreground/20 text-foreground/40'
            }`}
          >
            {source === 'dify' ? 'AI 润色' : '本地模板'}
          </span>
        </h4>
        <div className="prose prose-invert prose-sm max-w-none text-foreground/85 md:prose-base">
          <MarkdownText text={interpretation} />
        </div>
      </div>

      <p className="text-[10px] tracking-wider text-foreground/40">
        · 硬算基于万年历开源库 lunar-javascript，准确率 100%；AI 解读仅供参考 ·
      </p>
    </article>
  );
}

/* ============ 极简 Markdown 渲染 ============ */

/** 不引第三方渲染器，自己写一个稳健的：
 *  - ## / ### 标题
 *  - **粗体**
 *  - 行内代码
 *  - 列表
 *  - > 引用
 *  - 围栏代码块（``` … ```）
 */
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 跳过结束的 ```
      out.push(
        <pre
          key={`code-${key++}`}
          className="my-3 overflow-x-auto rounded-lg border border-primary/20 bg-black/60 p-3 text-xs leading-relaxed"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // 标题
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      out.push(
        <h3
          key={`h3-${key++}`}
          className="mt-4 font-serif text-lg text-primary md:text-xl"
        >
          {renderInline(h3[1])}
        </h3>,
      );
      i++;
      continue;
    }
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      out.push(
        <h2
          key={`h2-${key++}`}
          className="mt-6 font-serif text-xl text-primary md:text-2xl"
        >
          {renderInline(h2[1])}
        </h2>,
      );
      i++;
      continue;
    }

    // 引用
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(
        <blockquote
          key={`q-${key++}`}
          className="my-3 border-l-2 border-primary/40 pl-4 italic text-foreground/70"
        >
          {quoteLines.map((q, idx) => (
            <p key={idx} className="text-sm md:text-base">
              {renderInline(q)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // 列表
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      out.push(
        <ul
          key={`ul-${key++}`}
          className="my-2 list-disc space-y-1 pl-6 text-sm md:text-base"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 普通段落（聚合连续非空行）
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^[-*]\s+/.test(lines[i]) &&
      !lines[i].startsWith('>') &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('```')
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(
      <p key={`p-${key++}`} className="my-2 text-sm leading-relaxed md:text-base">
        {renderInline(para.join(' '))}
      </p>,
    );
  }

  return <div>{out}</div>;
}

function renderInline(s: string): React.ReactNode {
  // 处理 **粗体** 和 `行内代码`
  const parts: React.ReactNode[] = [];
  const rest = s;
  let k = 0;
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(rest)) !== null) {
    if (m.index > last) parts.push(rest.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={k++} className="text-primary">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={k++}
          className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-sm text-primary"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < rest.length) parts.push(rest.slice(last));
  return parts;
}

/* ============ 字段组件 ============ */

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs tracking-wider text-foreground/60">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="mt-2 w-full rounded-lg border border-primary/25 bg-background/60
                   px-3 py-2.5 text-base text-foreground
                   placeholder:text-foreground/30
                   focus:border-primary focus:outline-none
                   disabled:opacity-50
                   [appearance:textfield]
                   [&::-webkit-inner-spin-button]:appearance-none
                   [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  );
}
