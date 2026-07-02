'use client';

import { useState } from 'react';
import { BAZI_SAMPLES, type BaziSample } from '@/lib/mock-data';

/**
 * 牧心堂 · 生命代码（Bazi 八字）表单
 *
 * 设计要点：
 * - 纯前端交互，提交后从 BAZI_SAMPLES 随机抽一条 Mock 结果
 * - 移动优先；PC 端字段横向排列
 * - 输入校验：年月日时缺一不可
 */
export function BaziForm() {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [result, setResult] = useState<BaziSample | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!year || !month || !day || !hour) {
      setError('请填完年月日时四柱（时辰是必填）。');
      return;
    }
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const h = Number(hour);
    if (Number.isNaN(y) || y < 1900 || y > 2100) {
      setError('年份应在 1900-2100 之间。');
      return;
    }
    if (Number.isNaN(m) || m < 1 || m > 12) {
      setError('月份应在 1-12 之间。');
      return;
    }
    if (Number.isNaN(d) || d < 1 || d > 31) {
      setError('日期应在 1-31 之间。');
      return;
    }
    if (Number.isNaN(h) || h < 0 || h > 23) {
      setError('时辰应在 0-23 之间。');
      return;
    }

    // 简单哈希挑选一条 mock 命例（让同一生辰有稳定结果）
    const seed = (y * 10000 + m * 100 + d + h) % BAZI_SAMPLES.length;
    setResult(BAZI_SAMPLES[seed]);
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
          />
          <Field
            label="月"
            value={month}
            onChange={setMonth}
            placeholder="6"
            maxLength={2}
          />
          <Field
            label="日"
            value={day}
            onChange={setDay}
            placeholder="15"
            maxLength={2}
          />
          <Field
            label="时"
            value={hour}
            onChange={setHour}
            placeholder="14"
            maxLength={2}
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
                className={`flex-1 rounded-lg border px-4 py-2 text-sm transition
                  ${
                    gender === g
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-primary/25 text-foreground/70 hover:border-primary/50'
                  }`}
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
            className="flex-1 rounded-lg bg-primary px-4 py-3
                       font-serif text-base text-background transition
                       hover:bg-primary/90"
          >
            解码
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-primary/30 px-4 py-3
                       text-sm text-foreground/80 transition
                       hover:border-primary hover:text-primary"
          >
            重置
          </button>
        </div>
      </form>

      {result && (
        <article
          className="rounded-2xl border border-primary/30 bg-muted/40 p-6
                     backdrop-blur-md md:p-8"
        >
          <header>
            <h3 className="font-serif text-xl text-primary md:text-2xl">
              {result.element} · 命盘速览
            </h3>
            <p className="mt-1 text-[10px] tracking-[0.3em] text-foreground/40">
              LIFECODE · QUICK-READ
            </p>
          </header>

          <div className="mt-6 grid grid-cols-4 gap-2 text-center md:gap-3">
            {[
              { l: '年柱', v: result.yearPillar },
              { l: '月柱', v: result.monthPillar },
              { l: '日柱', v: result.dayPillar },
              { l: '时柱', v: result.hourPillar },
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

          <div className="mt-6 space-y-3 text-sm leading-relaxed text-foreground/85 md:text-base">
            <p>
              <span className="text-primary">【格局】</span>
              {result.summary}
            </p>
            <p>
              <span className="text-accent">【修行建议】</span>
              {result.suggestion}
            </p>
          </div>

          <p className="mt-6 text-[10px] tracking-wider text-foreground/40">
            · 此结果为示例展示，正式解读请升级至会员 ·
          </p>
        </article>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength?: number;
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
        className="mt-2 w-full rounded-lg border border-primary/25 bg-background/60
                   px-3 py-2.5 text-base text-foreground
                   placeholder:text-foreground/30
                   focus:border-primary focus:outline-none
                   [appearance:textfield]
                   [&::-webkit-inner-spin-button]:appearance-none
                   [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  );
}
