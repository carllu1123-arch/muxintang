'use client';

/**
 * 牧心堂 · 情缘合盘（Match）
 *
 * 流程：
 *   1. 双方各填公历生辰 + 性别（用户侧自动从 user_profiles 预填）
 *   2. 提交 → 后端用 bazi-engine.calculateBazi() 硬算两份
 *   3. 展示：两张并排的「五行档案」卡（四柱 + 日主 + 五行条）
 *   4. 输出：合盘解读（本地规则 + AI 阿阇梨流式润色）
 *
 * 风格：黑底金边 / 磨砂玻璃 / 与其他工具一致
 *
 * 数据来源：
 *   - 硬算：lunar-javascript 库（bazi-engine 中已验证）
 *   - 合盘规则：src/lib/match.ts（本地兜底）
 *   - AI 解读：POST /api/dify 流式（失败时回退到 match.passages）
 *   - 用户档案：GET /api/user 自动预填第一位道友的生辰
 */

import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ReportPaywall } from '@/components/ReportPaywall';
import {
  calculateBazi,
  validateBaziInput,
  type BaziInput,
  type BaziOutput,
} from '@/lib/bazi-engine';
import { analyzeMatch, type MatchResult } from '@/lib/match';

interface PersonForm {
  year: string;
  month: string;
  day: string;
  hour: string;
  gender: '男' | '女';
}

interface PersonData {
  form: PersonForm;
  bazi?: BaziOutput;
  error?: string;
}

const EMPTY_FORM: PersonForm = {
  year: '',
  month: '',
  day: '',
  hour: '',
  gender: '男',
};

const AJARI_SYSTEM_PROMPT =
  '你是牧心堂的阿阇梨。请根据双方的生辰八字和合盘分数，生成一段 300-500 字的情感开示。内容包含：双方能量场的互补点、生活中需要注意的摩擦点、以及一条具体的修行建议。使用温暖、慈悲的语气，不评判吉凶，只讲业力成长。';

interface UserProfile {
  id: string;
  displayName: string;
  birthDate: string | null;
  birthHour: number | null;
  gender: '男' | '女' | null;
  /** /api/user 返回的便捷订阅标记：tier !== 'free' */
  subscribed: boolean;
}

/**
 * 把一段中文文本按"句末标点（。！？以及全/半角）"切句。
 * 返回每个完整句子的数组（不含分隔符），最后一段若未到句末则忽略。
 */
function splitSentences(text: string): string[] {
  if (!text) return [];
  // 用零宽占位符保留分隔符位置，再 split
  const re = /([。！？!?\.]+)/g;
  const buf: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length;
    const seg = text.slice(last, end);
    if (seg.trim()) buf.push(seg);
    last = end;
  }
  return buf;
}

/** 取前 N 句（按标点切），不足 N 句返回原文 */
function truncateToSentences(text: string, n: number): string {
  const sents = splitSentences(text);
  if (sents.length <= n) return text;
  return sents.slice(0, n).join('');
}

export default function MatchPage() {
  const [a, setA] = useState<PersonData>({ form: { ...EMPTY_FORM } });
  const [b, setB] = useState<PersonData>({ form: { ...EMPTY_FORM, gender: '女' } });
  const [result, setResult] = useState<MatchResult | null>(null);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  /** AI 流式文本（覆盖 match.passages 之外的"阿阇梨开示"区） */
  const [aiText, setAiText] = useState<string>('');
  const [aiSource, setAiSource] = useState<'dify' | 'local' | 'echo' | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  /** 已从 /api/user 预填 */
  const [prefilled, setPrefilled] = useState(false);
  const [profileName, setProfileName] = useState<string>('');
  /** 当前用户（含订阅标记）；未登录时为 null */
  const [user, setUser] = useState<UserProfile | null>(null);
  /** 付费墙是否已触发（非订阅用户流到第 3 句时点亮） */
  const [paywallTriggered, setPaywallTriggered] = useState(false);

  const aiAbortRef = useRef<AbortController | null>(null);

  /* ============ 指令三-c：自动从 /api/user 预填第一位 ============ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/user', { cache: 'no-store' });
        if (!r.ok) return;
        const { user } = (await r.json()) as { user: UserProfile | null };
        if (cancelled || !user) return;
        setUser(user);
        setProfileName(user.displayName || '道友');
        // 仅当输入框为空时才覆盖
        setA((prev) => {
          if (prev.form.year || prev.form.month || prev.form.day) return prev;
          const bd = user.birthDate;
          if (!bd) return prev;
          const [y, m, d] = bd.split('-');
          return {
            ...prev,
            form: {
              ...prev.form,
              year: y ?? prev.form.year,
              month: m ? String(Number(m)) : prev.form.month,
              day: d ? String(Number(d)) : prev.form.day,
              hour:
                user.birthHour !== null && user.birthHour !== undefined
                  ? String(user.birthHour)
                  : prev.form.hour,
              gender: user.gender ?? prev.form.gender,
            },
          };
        });
        setPrefilled(true);
      } catch {
        /* 未登录 / Supabase 未配置 → 静默 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setField(
    who: 'a' | 'b',
    field: keyof PersonForm,
    value: string,
  ) {
    const upd = who === 'a' ? setA : setB;
    upd((prev) => ({ ...prev, form: { ...prev.form, [field]: value } }));
  }

  function handleSubmit() {
    setTouched(true);
    setResult(null);
    setAiText('');
    setAiSource(null);
    setAiError(null);
    setPaywallTriggered(false);

    const aInput = readForm(a.form);
    const bInput = readForm(b.form);
    if (!aInput || !bInput) {
      const aErr = aInput ? undefined : validateForm(a.form);
      const bErr = bInput ? undefined : validateForm(b.form);
      setA((p) => ({ ...p, error: aErr }));
      setB((p) => ({ ...p, error: bErr }));
      return;
    }

    const aBazi = calculateBazi(aInput);
    const bBazi = calculateBazi(bInput);
    setA({ form: a.form, bazi: aBazi });
    setB({ form: b.form, bazi: bBazi });

    const mr = analyzeMatch(aBazi, bBazi);
    setResult(mr);

    // 指令一：触发 AI 阿阇梨解读
    void requestAjariInterpretation(
      aInput,
      aBazi,
      bInput,
      bBazi,
      mr,
      user?.subscribed === true,
    );
  }

  async function requestAjariInterpretation(
    aInput: BaziInput,
    aBazi: BaziOutput,
    bInput: BaziInput,
    bBazi: BaziOutput,
    mr: MatchResult,
    /** 是否已订阅（true → 不截断，完整输出） */
    isSubscribed: boolean,
  ) {
    // 取消上一次（如有）
    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;

    setLoading(true);
    setAiError(null);

    const query =
      `请根据以下合盘数据生成 300-500 字情感开示：\n` +
      `【您】${aInput.year}年${aInput.month}月${aInput.day}日 ${aInput.hour}时（${aInput.gender ?? '未填'}）` +
      `日主 ${aBazi.dayMaster}(${aBazi.dayMasterElement})，` +
      `四柱 ${aBazi.yearPillar} ${aBazi.monthPillar} ${aBazi.dayPillar} ${aBazi.hourPillar}；\n` +
      `【伴侣】${bInput.year}年${bInput.month}月${bInput.day}日 ${bInput.hour}时（${bInput.gender ?? '未填'}）` +
      `日主 ${bBazi.dayMaster}(${bBazi.dayMasterElement})，` +
      `四柱 ${bBazi.yearPillar} ${bBazi.monthPillar} ${bBazi.dayPillar} ${bBazi.hourPillar}；\n` +
      `日主关系：${mr.relation}（${mr.relationDesc}）；互补度 ${mr.complement}%；等级 ${mr.level}。`;

    const context = {
      person1: {
        gender: aInput.gender ?? null,
        pillars: `${aBazi.yearPillar} ${aBazi.monthPillar} ${aBazi.dayPillar} ${aBazi.hourPillar}`,
        dayMaster: aBazi.dayMaster,
        element: aBazi.dayMasterElement,
        fiveElements: aBazi.fiveElements,
      },
      person2: {
        gender: bInput.gender ?? null,
        pillars: `${bBazi.yearPillar} ${bBazi.monthPillar} ${bBazi.dayPillar} ${bBazi.hourPillar}`,
        dayMaster: bBazi.dayMaster,
        element: bBazi.dayMasterElement,
        fiveElements: bBazi.fiveElements,
      },
      score: mr.complement,
      relation: mr.relation,
      level: mr.level,
      elementDelta: mr.elementDelta,
    };

    const fallback = mr.passages.join('\n\n');

    try {
      const res = await fetch('/api/dify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: AJARI_SYSTEM_PROMPT,
          query,
          context,
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
          let ev: { type: string; data?: string; error?: string; source?: 'dify' | 'local' | 'echo' };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === 'chunk' && typeof ev.data === 'string') {
            accumulated += ev.data;
            // 付费墙：非订阅用户，AI 流到第 3 句即停止，触发付费墙
            if (!isSubscribed) {
              const sents = splitSentences(accumulated);
              if (sents.length >= 3) {
                const truncated = truncateToSentences(accumulated, 3);
                setAiText(truncated);
                setPaywallTriggered(true);
                setAiSource(ev.source ?? 'dify');
                setLoading(false);
                // 主动 cancel reader + 终止 AbortController，避免后台继续推流
                try {
                  aiAbortRef.current?.abort();
                  await reader.cancel();
                } catch {
                  /* 静默 */
                }
                return;
              }
            }
            setAiText(accumulated);
          } else if (ev.type === 'end' && ev.source) {
            setAiSource(ev.source);
          } else if (ev.type === 'error') {
            throw new Error(ev.error || '流式错误');
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      const msg = (e as { message?: string })?.message || '阿阇梨暂未在线。';
      setAiError(msg);
      // 降级：直接显示本地 passages
      setAiText(fallback);
      setAiSource('local');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    aiAbortRef.current?.abort();
    setA({ form: { ...EMPTY_FORM } });
    setB({ form: { ...EMPTY_FORM, gender: '女' } });
    setResult(null);
    setAiText('');
    setAiSource(null);
    setAiError(null);
    setLoading(false);
    setTouched(false);
  }

  return (
    <div className="flex flex-col gap-8 py-6 md:gap-12 md:py-12">
      <PageHeader
        eyebrow="TOOL · MATCH"
        title="情缘合盘"
        subtitle="二人八字相照，察缘之深浅。"
        back={{ href: '/tools', label: '智测工具' }}
      />

      {/* ============ 输入区 ============ */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <PersonInputCard
          who="您"
          data={a}
          onChange={(f, v) => setField('a', f, v)}
          prefilled={prefilled}
          profileName={profileName}
        />
        <PersonInputCard
          who="伴侣"
          data={b}
          onChange={(f, v) => setField('b', f, v)}
          prefilled={false}
          profileName=""
        />
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
          {loading ? '阿阇梨开示中…' : '合盘'}
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

      {/* ============ 结果区 ============ */}
      {touched && !result && (
        <p className="text-center text-sm text-accent">
          请补全两份生辰信息（年月日时为必填）。
        </p>
      )}

      {result && a.bazi && b.bazi && (
        <>
          {/* 双栏五行档案 */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <BaziCard
              label="您"
              form={a.form}
              bazi={a.bazi}
              role="a"
            />
            <BaziCard
              label="伴侣"
              form={b.form}
              bazi={b.bazi}
              role="b"
            />
          </section>

          {/* 解读区 */}
          <section
            aria-label="合盘解读"
            className="rounded-2xl border border-primary/30 bg-muted/40 p-6 backdrop-blur-md md:p-8"
          >
            <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-foreground/40">
                  MATCH · COMPATIBILITY
                </p>
                <h3 className="font-serif text-2xl text-foreground md:text-3xl">
                  合盘解读
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span
                  className={`rounded-full border px-3 py-1 tracking-wider ${
                    result.level === '上等'
                      ? 'border-primary bg-primary/10 text-primary'
                      : result.level === '中等'
                      ? 'border-foreground/30 bg-muted/40 text-foreground/80'
                      : 'border-accent bg-accent/10 text-accent'
                  }`}
                >
                  {result.level}
                </span>
                <span className="rounded-full border border-primary/30 bg-background/40 px-3 py-1 text-foreground/80">
                  日主 · {result.relation}
                </span>
                <span className="rounded-full border border-primary/30 bg-background/40 px-3 py-1 text-foreground/80">
                  互补度 · {result.complement}%
                </span>
              </div>
            </header>

            <div className="space-y-3 text-sm leading-relaxed text-foreground/85 md:text-base">
              {result.passages.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* 五行差值可视化 */}
            <div className="mt-6">
              <h4 className="mb-3 text-xs tracking-[0.3em] text-foreground/40">
                五 行 差 值（您 − 伴侣）
              </h4>
              <ul className="space-y-2">
                {(['金', '木', '水', '火', '土'] as const).map((k) => {
                  const d = result.elementDelta[k];
                  const pct = Math.round(Math.abs(d) * 100);
                  return (
                    <li
                      key={k}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-6 shrink-0 text-foreground/70">
                        {k}
                      </span>
                      <div className="relative h-2 flex-1 overflow-visible rounded-full bg-muted/40">
                        <div className="absolute left-1/2 top-0 h-full w-px bg-foreground/20" />
                        <span
                          className={`absolute top-1/2 h-2 -translate-y-1/2 rounded-full ${
                            d >= 0 ? 'bg-primary' : 'bg-accent'
                          }`}
                          style={{
                            left: d >= 0 ? '50%' : `${50 - pct / 2}%`,
                            width: `${Math.max(2, pct / 2)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`w-14 shrink-0 text-right font-mono text-xs ${
                          d >= 0 ? 'text-primary' : 'text-accent'
                        }`}
                      >
                        {d >= 0 ? '+' : ''}
                        {(d * 100).toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] tracking-wider text-foreground/40">
                · 中线左侧（朱砂）= 伴侣多，右侧（金）= 您多 ·
              </p>
            </div>
          </section>

          {/* 阿阇梨开示区（AI 流式） */}
          <section
            aria-label="阿阇梨开示"
            className="rounded-2xl border border-primary/40 bg-black/60 p-6 backdrop-blur-md md:p-8"
          >
            <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-foreground/40">
                  AJARI · DHARMA TALK
                </p>
                <h3 className="font-serif text-2xl text-primary md:text-3xl">
                  阿阇梨开示
                </h3>
              </div>
              <div className="text-[10px] tracking-[0.3em] text-foreground/40 md:text-right">
                {loading && '阿阇梨开示中…'}
                {!loading && aiSource === 'dify' && 'AI 润色 · 流式'}
                {!loading && aiSource === 'local' && '本地模板 · 兜底'}
                {!loading && aiSource === 'echo' && 'Echo · 暂未配置 Dify'}
              </div>
            </header>

            <div
              className={`relative whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 md:text-base ${
                paywallTriggered ? 'max-h-32 overflow-hidden' : 'min-h-[160px]'
              }`}
            >
              {aiText || (loading ? '' : '（合盘已生成，请稍候开示…）')}
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

            {/* 付费墙：非订阅用户在第 3 句后触发（指令一） */}
            {paywallTriggered && (
              <div className="mt-6">
                <ReportPaywall
                  tierRequired="yearly"
                  categoryTitle="情缘合盘"
                  description="前 3 句为 AI 预览，阿阇梨完整情感开示与修行建议，请订阅【年度会员】后查看。"
                />
              </div>
            )}

            {aiError && !paywallTriggered && (
              <p className="mt-3 text-xs text-accent">
                · 阿阇梨暂未在线（{aiError}），已显示本地解读 ·
              </p>
            )}

            {!paywallTriggered && (
              <p className="mt-4 text-[10px] tracking-wider text-foreground/30">
                · 此开示仅供参考，缘起性空，请以自身正念为本 ·
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ============ 双方输入卡 ============ */

function PersonInputCard({
  who,
  data,
  onChange,
  prefilled,
  profileName,
}: {
  who: string;
  data: PersonData;
  onChange: (field: keyof PersonForm, value: string) => void;
  prefilled: boolean;
  profileName: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-md md:p-6
                  ${
                    data.error
                      ? 'border-accent/50 bg-accent/5'
                      : 'border-primary/30 bg-black/60'
                  }`}
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="font-serif text-lg text-foreground md:text-xl">
          {who}的生辰
        </h3>
        <span className="text-[10px] tracking-[0.3em] text-foreground/40">
          {who === '您' ? 'YOU' : 'PARTNER'}
        </span>
      </header>
      {prefilled && who === '您' && (
        <p className="mb-2 text-[11px] tracking-wider text-primary/70">
          * 已为您自动填入{profileName ? `${profileName}的` : '您的'}生辰。
        </p>
      )}
      <div className="grid grid-cols-4 gap-2">
        <Field label="年" value={data.form.year} onChange={(v) => onChange('year', v)} placeholder="1990" />
        <Field label="月" value={data.form.month} onChange={(v) => onChange('month', v)} placeholder="6" />
        <Field label="日" value={data.form.day} onChange={(v) => onChange('day', v)} placeholder="15" />
        <Field label="时" value={data.form.hour} onChange={(v) => onChange('hour', v)} placeholder="14" />
      </div>
      <div className="mt-3 flex gap-2">
        {(['男', '女'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange('gender', g)}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-sm transition
                        ${
                          data.form.gender === g
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-primary/25 text-foreground/70 hover:border-primary/50'
                        }`}
          >
            {g}
          </button>
        ))}
      </div>
      {data.error && (
        <p className="mt-2 text-xs text-accent">{data.error}</p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-wider text-foreground/60">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70
                   px-2 py-2 text-base text-foreground
                   placeholder:text-foreground/30
                   focus:border-primary focus:outline-none
                   [appearance:textfield]
                   [&::-webkit-inner-spin-button]:appearance-none
                   [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  );
}

/* ============ 单方五行档案卡 ============ */

function BaziCard({
  label,
  form,
  bazi,
  role,
}: {
  label: string;
  form: PersonForm;
  bazi: BaziOutput;
  role: 'a' | 'b';
}) {
  return (
    <article
      className={`rounded-2xl border p-5 backdrop-blur-md md:p-6
                  ${
                    role === 'a'
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-accent/30 bg-accent/5'
                  }`}
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="font-serif text-lg text-foreground md:text-xl">
          {label} · {form.gender}
        </h3>
        <span className="text-[10px] tracking-[0.3em] text-foreground/40">
          {bazi.dayMaster}({bazi.dayMasterElement})
        </span>
      </header>

      {/* 四柱 */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { l: '年', v: bazi.yearPillar },
          { l: '月', v: bazi.monthPillar },
          { l: '日', v: bazi.dayPillar },
          { l: '时', v: bazi.hourPillar },
        ].map((p) => (
          <div
            key={p.l}
            className="rounded-lg border border-foreground/15 bg-background/60 py-2"
          >
            <div className="text-[10px] tracking-wider text-foreground/50">
              {p.l}
            </div>
            <div className="mt-0.5 font-serif text-base text-foreground md:text-lg">
              {p.v}
            </div>
          </div>
        ))}
      </div>

      {/* 五行 */}
      <div className="mt-4">
        <h4 className="mb-2 text-[10px] tracking-[0.3em] text-foreground/40">
          五 行
        </h4>
        <ul className="space-y-1.5">
          {(['金', '木', '水', '火', '土'] as const).map((el) => {
            const v = bazi.fiveElements[el];
            const pct = Math.round(v * 100);
            return (
              <li key={el} className="flex items-center gap-2 text-xs">
                <span className="w-5 shrink-0 text-foreground/70">{el}</span>
                <span
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10"
                  aria-hidden
                >
                  <span
                    className={`block h-full rounded-full ${
                      role === 'a' ? 'bg-primary/80' : 'bg-accent/80'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-foreground/60">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

/* ============ 工具：把表单字符串转成 BaziInput ============ */

function readForm(f: PersonForm): BaziInput | null {
  const y = Number(f.year);
  const m = Number(f.month);
  const d = Number(f.day);
  const h = Number(f.hour);
  if (!y || !m || !d || f.hour === '') return null;
  return { year: y, month: m, day: d, hour: h, gender: f.gender };
}

function validateForm(f: PersonForm): string {
  const input: Partial<BaziInput> = {
    year: Number(f.year) || undefined,
    month: Number(f.month) || undefined,
    day: Number(f.day) || undefined,
    hour: f.hour === '' ? undefined : Number(f.hour),
    gender: f.gender,
  };
  return validateBaziInput(input) ?? '请检查输入。';
}
