'use client';

/**
 * 牧心堂 · 姓名心解（Name）
 *
 * 流程：
 *   1. 输入 姓 / 名 / 可选出生日期
 *   2. 若有生辰：调用 bazi-engine 算日主五行 → 注入 AI
 *   3. AI 流式输出字形结构 / 音律平仄 / 五行偏性 / 阿阇梨改运建议
 *
 * 风格：黑底金边 / 磨砂玻璃
 *
 * 隐私：
 *   - 全程客户端处理，姓名不会写入 Supabase
 *   - AI 仅接收姓 + 名 + 出生年月日（无时辰也可） + 日主五行
 */

import { useRef, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import {
  calculateBazi,
  validateBaziInput,
  type BaziInput,
  type BaziOutput,
} from '@/lib/bazi-engine';

interface FormState {
  surname: string;
  given: string;
  birthDate: string; // YYYY-MM-DD
  hasBirth: boolean;
}

const EMPTY_FORM: FormState = {
  surname: '',
  given: '',
  birthDate: '',
  hasBirth: false,
};

const SYSTEM_PROMPT =
  '你精通传统汉字音律与五行密码。' +
  '请根据用户的姓名（姓 + 名）和其八字日主五行，解析：' +
  '(1) 字形结构（左右 / 上下 / 包围 / 会意）；' +
  '(2) 音律平仄（上声 / 去声 / 阴平 / 阳平 / 入声，组合是否抑扬有致）；' +
  '(3) 八字五行偏性（结合用户日主，看名字中是否补其所缺）；' +
  '(4) 名字对人生轨迹的潜在文化影响（学业 / 事业 / 婚恋 / 健康）；' +
  '(5) 最后给出一条阿阇梨的改运建议（如改名 / 印章 / 配饰 / 修行）。' +
  '语气慈悲、具体、可操作；不超过 500 字。';

/** 极简汉字五行查询（笔画派，本地兜底） */
const WUXING_BY_STROKE: Record<number, string> = {
  1: '木', 2: '木', 3: '火', 4: '火', 5: '土',
  6: '土', 7: '金', 8: '金', 9: '水', 10: '水',
};
/** 常用偏旁五行（部首派） */
const RADICAL_WUXING: Array<{ re: RegExp; tag: string }> = [
  { re: /[木林森杉松柏桐桂栋楷椿榕榆槿]/, tag: '木' },
  { re: /[火炎焱灼烈煌焕炜炀烨]/, tag: '火' },
  { re: /[水土圭圻坤城域培墉增墨]/, tag: '土' },
  { re: /[金钊钰钧铭锦锐锋铮]/, tag: '金' },
  { re: /[水江河湖海渊涵潇澄澜]/, tag: '水' },
];

function charCountFallback(ch: string): number {
  if (!ch) return 0;
  // 简化：汉字一律 1 笔画作占位（实际应由康熙字典查）
  return ch.charCodeAt(0) % 10 || 1;
}

function charWuXing(ch: string): string {
  if (!ch) return '—';
  for (const r of RADICAL_WUXING) {
    if (r.re.test(ch)) return r.tag;
  }
  const strokes = charCountFallback(ch);
  return WUXING_BY_STROKE[strokes] ?? '土';
}

function buildLocalNameProfile(
  surname: string,
  given: string,
  bazi: BaziOutput | null,
) {
  const chars = Array.from(given);
  const givenTags = chars.map((c) => ({ char: c, tag: charWuXing(c) }));
  const surnameTag = charWuXing(surname || '');

  const dayMasterElement = bazi?.dayMasterElement ?? null;

  // 简单建议：名字缺什么 vs 日主所喜
  const elements = ['金', '木', '水', '火', '土'];
  const have = new Set([surnameTag, ...givenTags.map((g) => g.tag)].filter((t) => t !== '—'));
  const miss = elements.filter((e) => !have.has(e));

  return { givenTags, surnameTag, dayMasterElement, miss };
}

function buildFallback(
  form: FormState,
  bazi: BaziOutput | null,
): string {
  const prof = buildLocalNameProfile(form.surname, form.given, bazi);
  const lines: string[] = [];
  lines.push(`【字形】姓「${form.surname}」（${prof.surnameTag}），名「${form.given}」（${prof.givenTags.map((g) => `${g.char}·${g.tag}`).join('、') || '未填'}）。`);
  if (bazi) {
    lines.push(`【日主】${bazi.dayMaster}（${bazi.dayMasterElement}），四柱 ${bazi.yearPillar} ${bazi.monthPillar} ${bazi.dayPillar} ${bazi.hourPillar}。`);
  }
  lines.push(`【五行】名字自带：${[prof.surnameTag, ...prof.givenTags.map((g) => g.tag)].filter((t) => t !== '—').join('、')}；`);
  lines.push(`【缺项】${prof.miss.join('、') || '五行齐备'}。`);
  lines.push('');
  lines.push('【改运建议】');
  if (bazi?.dayMasterElement === '木' && prof.miss.includes('水')) {
    lines.push('日主属木，名字中缺水；可在案头置一杯清水，常观想"水生木"之意，助文思与流通。');
  } else if (bazi?.dayMasterElement === '火' && prof.miss.includes('木')) {
    lines.push('日主属火，名字中缺木；可佩戴檀木小件或家居东南摆一盆小型绿植，养木助火。');
  } else if (bazi?.dayMasterElement === '土' && prof.miss.includes('火')) {
    lines.push('日主属土，名字中缺火；可在南墙挂一幅暖色画作或一盏红色盐灯，振火生土。');
  } else if (bazi?.dayMasterElement === '金' && prof.miss.includes('土')) {
    lines.push('日主属金，名字中缺土；可佩戴黄玉或陶瓷小印，安土生金。');
  } else if (bazi?.dayMasterElement === '水' && prof.miss.includes('金')) {
    lines.push('日主属水，名字中缺金；可佩戴银色小扣或金属小铃，金生丽水。');
  } else {
    lines.push('五行较均衡，建议每日清晨诵"嗡嘛呢叭咪吽"六字大明咒 108 息，安住本心。');
  }
  return lines.join('\n');
}

export default function NamePage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    setTouched(true);
    setAiError(null);
    setFormError(null);

    if (!form.surname.trim() || !form.given.trim()) {
      setFormError('请填写完整的姓与名。');
      return;
    }

    // 可选生辰 → 算八字
    let localBazi: BaziOutput | null = null;
    if (form.hasBirth && form.birthDate) {
      const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(form.birthDate);
      if (!m) {
        setFormError('出生日期格式应为 YYYY-MM-DD。');
        return;
      }
      const input: BaziInput = {
        year: Number(m[1]),
        month: Number(m[2]),
        day: Number(m[3]),
        hour: 12, // 未填时默认正午
      };
      if (!validateBaziInput(input)) {
        setFormError('出生日期超出可计算范围（1900-2100）。');
        return;
      }
      localBazi = calculateBazi(input);
    } else {
      localBazi = null;
    }

    // 取消上一次
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSubmitted(true);
    setLoading(true);
    setAiText('');

    const localProfile = buildLocalNameProfile(
      form.surname.trim(),
      form.given.trim(),
      localBazi,
    );
    const fallback = buildFallback(form, localBazi);

    const ctx = {
      surname: form.surname.trim(),
      given: form.given.trim(),
      fullName: form.surname.trim() + form.given.trim(),
      charCount: Array.from(form.given).length,
      surnameTag: localProfile.surnameTag,
      givenTags: localProfile.givenTags,
      dayMasterElement: localBazi?.dayMasterElement ?? null,
      dayMaster: localBazi?.dayMaster ?? null,
      pillars: localBazi
        ? `${localBazi.yearPillar} ${localBazi.monthPillar} ${localBazi.dayPillar} ${localBazi.hourPillar}`
        : null,
    };

    const query = `请解析以下姓名：姓「${ctx.surname}」、名「${ctx.given}」${
      localBazi ? `（日主 ${ctx.dayMaster}，五行 ${ctx.dayMasterElement}）` : '（未提供生辰）'
    }。`;

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
      setLoading(false);
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    setForm(EMPTY_FORM);
    setAiText('');
    setAiError(null);
    setSubmitted(false);
    setLoading(false);
    setTouched(false);
    setFormError(null);
  }

  return (
    <div className="flex flex-col gap-8 py-6 md:gap-12 md:py-12">
      <PageHeader
        eyebrow="TOOL · NAME"
        title="姓名心解"
        subtitle="一字藏玄机，听名字的回响。"
        back={{ href: '/tools', label: '智测工具' }}
      />

      {/* 输入表单 */}
      <section
        aria-label="姓名表单"
        className="rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-md md:p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">
              姓
            </span>
            <input
              type="text"
              value={form.surname}
              onChange={(e) => setField('surname', e.target.value)}
              maxLength={4}
              placeholder="如：林"
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70
                         px-3 py-2.5 text-base text-foreground
                         placeholder:text-foreground/30
                         focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">
              名
            </span>
            <input
              type="text"
              value={form.given}
              onChange={(e) => setField('given', e.target.value)}
              maxLength={4}
              placeholder="如：知行"
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70
                         px-3 py-2.5 text-base text-foreground
                         placeholder:text-foreground/30
                         focus:border-primary focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={form.hasBirth}
              onChange={(e) => setField('hasBirth', e.target.checked)}
              className="h-4 w-4 rounded border-primary/40 bg-background/70
                         text-primary focus:ring-primary"
            />
            携带生辰（推荐 · 让 AI 结合八字五行）
          </label>
          {form.hasBirth && (
            <label className="mt-3 block">
              <span className="block text-[10px] tracking-wider text-foreground/60">
                出生日期（公历）
              </span>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => setField('birthDate', e.target.value)}
                min="1900-01-01"
                max="2100-12-31"
                className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70
                           px-3 py-2.5 text-base text-foreground
                           focus:border-primary focus:outline-none"
              />
            </label>
          )}
        </div>
      </section>

      <section className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 rounded-lg bg-primary px-4 py-3 font-serif text-base text-background
                     transition hover:bg-primary/90
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '阿阇梨开示中…' : '解名'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-primary/30 px-4 py-3 text-sm text-foreground/80
                     transition hover:border-primary hover:text-primary"
        >
          重置
        </button>
      </section>

      {touched && formError && (
        <p className="text-center text-sm text-accent">{formError}</p>
      )}

      {/* AI 解读 */}
      {submitted && (
        <section
          aria-label="姓名解读"
          className="rounded-2xl border border-primary/30 bg-black/60 p-6 backdrop-blur-md md:p-8"
        >
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-foreground/40">
                NAME · INTERPRETATION
              </p>
              <h3 className="font-serif text-2xl text-primary md:text-3xl">
                {form.surname}
                {form.given}
                <span className="ml-3 text-base font-sans text-foreground/50">
                  · 名字解读
                </span>
              </h3>
            </div>
            <div className="text-[10px] tracking-[0.3em] text-foreground/40">
              {loading ? '阿阇梨开示中…' : '已出建议'}
            </div>
          </header>

          <div className="relative min-h-[160px] whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 md:text-base">
            {aiText || (loading ? '' : '（正在解析…）')}
            {loading && aiText.length === 0 && (
              <span
                aria-hidden
                className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-primary/80"
              />
            )}
            {loading && aiText.length > 0 && (
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
            · 名字是缘起的回响，修行在心不在字，请以正念为本 ·
          </p>
        </section>
      )}
    </div>
  );
}
