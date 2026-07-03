'use client';

/**
 * 牧心堂 · 爱宠屋 · 宠物取名 AI 工具
 *
 * 流程（沿用 /tools/name 的逻辑但简化）：
 *   1. 表单：宠物种类 / 主人期望 / 性别
 *   2. 提交 → POST /api/dify（流式 NDJSON）
 *   3. AI 输出 4 个候选名（JSON：{ name, element, reason }）
 *   4. Dify 未配置 / 失败 → 走本地宠物名词库兜底
 *   5. 渲染 4 张候选名卡片
 *
 * 设计原则：
 *   - 单一表单，无 Tab 切换（宠物只有"取名"一个场景）
 *   - 全程不写库，候选名不进 Supabase
 *   - 移动优先：单列；平板/PC：双列
 */

import { useRef, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';

/* ============ 类型 ============ */

type PetKind = '猫' | '狗' | '兔' | '仓鼠' | '乌龟' | '鸟' | '其他';
type PetHope = '健康' | '乖巧' | '活泼' | '富贵' | '长寿' | '聪慧';
type PetGender = '公' | '母' | '' | '未知';

interface PetForm {
  kind: PetKind;
  hope: PetHope;
  gender: PetGender;
}

interface PetNameCandidate {
  name: string;
  element: string;
  reason: string;
}

/* ============ 常量 ============ */

const PET_KINDS: PetKind[] = ['猫', '狗', '兔', '仓鼠', '乌龟', '鸟', '其他'];
const PET_HOPES: PetHope[] = ['健康', '乖巧', '活泼', '富贵', '长寿', '聪慧'];
const WUXING_LIST = ['金', '木', '水', '火', '土'] as const;
type WuXing = (typeof WUXING_LIST)[number];

const ELEMENT_COLOR: Record<string, string> = {
  金: 'text-slate-100',
  木: 'text-emerald-300',
  水: 'text-cyan-300',
  火: 'text-orange-300',
  土: 'text-amber-300',
};

/* ============ 系统提示词 ============ */

const PET_NAMING_SYSTEM_PROMPT = `你是牧心堂的阿阇梨，擅长传统汉字命名学（音律、五行、字形、文意），专精宠物取名。
请根据用户提供的宠物信息，输出 4 个候选名字。

【硬性要求】
- 严格只输出一个合法 JSON 数组，不要任何前言、解释、Markdown 代码块、注释
- JSON 结构（必须完全匹配）：
  [
    { "name": "宠物名（1-3 个汉字）", "element": "金|木|水|火|土", "reason": "20-50 字的简短寓意，兼顾音律/五行/宠物性格" },
    ...共 4 项
  ]
- 4 个名字必须差异化（音律、字形、风格各异），不能雷同
- "name" 只含名字本身（不冠以种类），2 字为宜
- "element" 是该名字整体的五行偏性
- "reason" 要像师父对弟子讲的话，温暖、具体、可感
- 名字要适合宠物气质：灵动、可呼唤、不拗口

【五行对应示例（仅作参考）】
- 猫：木（柔）/ 水（灵动）/ 火（活泼）
- 狗：土（忠）/ 金（勇）/ 木（温）
- 兔：木（灵）/ 水（柔）/ 金（捷）
- 仓鼠：木（萌）/ 土（稳）/ 金（机敏）
- 乌龟：水（长流）/ 土（厚）/ 金（坚）
- 鸟：火（翔）/ 木（栖）/ 金（啼）`;

/* ============ 本地兜底名池 ============ */

/**
 * 按 宠物种类 + 期望 → 五行 → 候选名
 * 名字风格上：
 *   - 猫：偏轻盈（叠字/水/木）
 *   - 狗：偏沉稳（土/金）
 *   - 兔：偏灵动（木/水）
 *   - 仓鼠：偏萌趣（叠字/木）
 *   - 乌龟：偏厚重（土/水）
 *   - 鸟：偏高昂（火/金）
 */
const PET_NAME_POOL: Record<PetKind, Record<WuXing, string[]>> = {
  猫: {
    金: ['铃铃', '铛铛', '银雪', '明珠'],
    木: ['柚柚', '杉杉', '茉茉', '棉棉'],
    水: ['澜澜', '澈澈', '漪漪', '墨墨'],
    火: ['暖暖', '昭昭', '烁烁', '彤彤'],
    土: ['圆圆', '墩墩', '豆豆', '糯糯'],
  },
  狗: {
    金: ['铮铮', '啸天', '铮宝', '锦官'],
    木: ['棕棕', '榕榕', '杉宝', '松子'],
    水: ['汪汪', '潮潮', '海宝', '清清'],
    火: ['旺旺', '昭宝', '闪闪', '腾腾'],
    土: ['墩墩', '土土', '福福', '安安'],
  },
  兔: {
    金: ['跳跳', '银耳', '铃铛', '金箔'],
    木: ['棉棉', '萝萝', '茉茉', '杉耳'],
    水: ['溪溪', '澈澈', '清清', '涟涟'],
    火: ['腾腾', '暖暖', '彤彤', '闪闪'],
    土: ['团子', '豆豆', '糯糯', '墩墩'],
  },
  仓鼠: {
    金: ['金豆', '钱钱', '银豆', '铛铛'],
    木: ['松子', '棉棉', '杉杉', '果果'],
    水: ['团子', '汤圆', '水水', '露露'],
    火: ['暖暖', '红枣', '彤彤', '烁烁'],
    土: ['豆豆', '薯薯', '泥泥', '团子'],
  },
  乌龟: {
    金: ['金甲', '铮甲', '石铁', '锦壳'],
    木: ['青苔', '树年', '杉年', '长青'],
    水: ['沧沧', '澈澈', '渊渊', '长流'],
    火: ['昭昭', '暖泉', '守阳', '暖阳'],
    土: ['厚厚', '磐石', '安安', '岁岁'],
  },
  鸟: {
    金: ['啾啾', '铃音', '啼鸣', '银歌'],
    木: ['枝枝', '栖栖', '榆榆', '桐桐'],
    水: ['清啾', '涟啾', '啼泉', '澈啾'],
    火: ['朝朝', '彤羽', '曦曦', '鸣鸣'],
    土: ['福福', '安安', '土土', '稳稳'],
  },
  其他: {
    金: ['铃铃', '铛铛', '明明', '镜镜'],
    木: ['森森', '棉棉', '杉杉', '茉茉'],
    水: ['澜澜', '澈澈', '清清', '涟涟'],
    火: ['暖暖', '昭昭', '闪闪', '彤彤'],
    土: ['圆圆', '墩墩', '豆豆', '安安'],
  },
};

/** 期望 → 推荐五行（用于本地兜底时挑元素） */
const HOPE_ELEMENT: Record<PetHope, WuXing> = {
  健康: '木',
  乖巧: '土',
  活泼: '火',
  富贵: '金',
  长寿: '水',
  聪慧: '水',
};

/* ============ 工具函数 ============ */

/** 从流式累积文本中提取 JSON 数组（与 /tools/name 同源） */
function tryExtractJsonArray(text: string): PetNameCandidate[] | null {
  if (!text) return null;
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    const arr = JSON.parse(slice);
    if (!Array.isArray(arr)) return null;
    const normalized: PetNameCandidate[] = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const element = typeof item.element === 'string' ? item.element.trim() : '';
      const reason = typeof item.reason === 'string' ? item.reason.trim() : '';
      if (!name) continue;
      normalized.push({
        name: name.slice(0, 6),
        element: WUXING_LIST.includes(element as WuXing) ? element : '—',
        reason: reason.slice(0, 120) || '音律和顺，五行相生，寓意灵动。',
      });
      if (normalized.length >= 4) break;
    }
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

/** 简单稳定 hash */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** 本地兜底：按 kind + hope 产出 4 个候选 */
function buildFallbackNames(form: PetForm): PetNameCandidate[] {
  const pool = PET_NAME_POOL[form.kind] ?? PET_NAME_POOL['其他'];
  const seed = hash01(`${form.kind}-${form.hope}-${form.gender}`);
  const reasons: Record<WuXing, string[]> = {
    金: ['金声玉振，警觉而敏捷', '金主果断，宠性坚毅', '金相玉质，机灵敏锐'],
    木: ['木德仁慈，生机勃勃', '木性条达，宜亲近人', '木秀于林，温柔可人'],
    水: ['水利万物而不争', '水主智，流通而灵澈', '水汽氤氲，柔顺有灵'],
    火: ['火德文明，光明而温暖', '火主礼，热情而爽朗', '火性炎上，活泼灵动'],
    土: ['土厚德载，安稳如山', '土主信，稳重而贴心', '土养万物，居中以和'],
  };
  // 按 seed 旋转五行顺序，让 4 个名字覆盖更多元素
  const startIdx = Math.floor(seed * WUXING_LIST.length);
  const order: WuXing[] = [];
  for (let i = 0; i < 4; i++) {
    order.push(WUXING_LIST[(startIdx + i) % WUXING_LIST.length] as WuXing);
  }

  // 主元素 = 期望对应的元素（如果有）
  const primaryElement = HOPE_ELEMENT[form.hope];

  const names: PetNameCandidate[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 4; i++) {
    let el = order[i];
    // 第 1 个用主元素，提升契合度
    if (i === 0 && primaryElement) el = primaryElement;
    const candidates = pool[el];
    const pick = candidates[Math.floor((seed * 1000 + i * 11)) % candidates.length];
    let name = pick;
    let guard = 0;
    while (used.has(name) && guard < 8) {
      name = candidates[(candidates.indexOf(name) + 1) % candidates.length];
      guard++;
    }
    used.add(name);
    const reason = reasons[el][i % reasons[el].length];
    names.push({
      name,
      element: el,
      reason,
    });
  }
  return names;
}

/* ============ 主组件 ============ */

const EMPTY_FORM: PetForm = {
  kind: '猫',
  hope: '健康',
  gender: '公',
};

export default function PetNamingPage() {
  const [form, setForm] = useState<PetForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // 生成结果
  const [names, setNames] = useState<PetNameCandidate[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSource, setGenSource] = useState<'dify' | 'local' | null>(null);

  // 复制
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const genAbortRef = useRef<AbortController | null>(null);

  function setField<K extends keyof PetForm>(k: K, v: PetForm[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function copyToClipboard(text: string, idx: number) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedIdx(idx);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedIdx(null), 1500);
    } catch (e) {
      console.warn('[pet-naming] copy failed:', e);
    }
  }

  function handleReset() {
    genAbortRef.current?.abort();
    setForm(EMPTY_FORM);
    setNames([]);
    setFormError(null);
    setGenError(null);
    setGenSource(null);
  }

  async function handleGenerate() {
    setFormError(null);
    setGenError(null);

    // 取消上一次
    genAbortRef.current?.abort();
    const ctrl = new AbortController();
    genAbortRef.current = ctrl;

    setGenLoading(true);
    setNames([]);
    setGenSource(null);

    const query = `请为一只${form.kind}（${form.gender || '未填性别'}，主人期望：${form.hope}）起 4 个候选名字。`;
    const context = {
      scenario: 'pet',
      kind: form.kind,
      hope: form.hope,
      gender: form.gender || '未填',
    };

    // 兜底
    const fallbackNames = buildFallbackNames(form);
    const fallback = JSON.stringify(fallbackNames);

    try {
      const res = await fetch('/api/dify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: PET_NAMING_SYSTEM_PROMPT,
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
            const parsed = tryExtractJsonArray(accumulated);
            if (parsed) setNames(parsed);
          } else if (ev.type === 'end') {
            const parsed = tryExtractJsonArray(accumulated);
            if (parsed && parsed.length > 0) {
              setNames(parsed);
              setGenSource(ev.source === 'dify' ? 'dify' : 'local');
            } else {
              setNames(fallbackNames);
              setGenSource('local');
            }
          } else if (ev.type === 'error') {
            throw new Error(ev.error || '流式错误');
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      const msg = (e as { message?: string })?.message || 'AI 暂未在线。';
      setGenError(msg);
      setNames(fallbackNames);
      setGenSource('local');
    } finally {
      setGenLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6 md:gap-10 md:py-12">
      <PageHeader
        eyebrow="PET · NAMING"
        title="宠物取名"
        subtitle="定音律 · 查五行 · 智取灵宠佳名"
        back={{ href: '/pet', label: '爱宠屋' }}
      />

      {/* ===== 表单区 ===== */}
      <section
        aria-label="宠物信息表单"
        className="rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-md md:p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* 宠物种类 */}
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">
              宠物种类
            </span>
            <select
              value={form.kind}
              disabled={genLoading}
              onChange={(e) => setField('kind', e.target.value as PetKind)}
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            >
              {PET_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>

          {/* 主人期望 */}
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">
              主人期望
            </span>
            <select
              value={form.hope}
              disabled={genLoading}
              onChange={(e) => setField('hope', e.target.value as PetHope)}
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            >
              {PET_HOPES.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>

          {/* 性别 */}
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">
              性别
            </span>
            <select
              value={form.gender}
              disabled={genLoading}
              onChange={(e) => setField('gender', e.target.value as PetGender)}
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            >
              <option value="公">公</option>
              <option value="母">母</option>
              <option value="">未填</option>
              <option value="未知">未知</option>
            </select>
          </label>
        </div>

        {formError && (
          <p className="mt-3 text-sm text-accent">· {formError} ·</p>
        )}

        {/* CTA 按钮 */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={genLoading}
            className="group relative flex-1 overflow-hidden rounded-2xl
                       border border-primary/60 bg-gradient-to-br from-primary via-primary/90 to-primary/70
                       px-6 py-4 font-serif text-base text-background
                       shadow-[0_0_30px_-10px_rgba(212,175,55,0.6)]
                       transition hover:shadow-[0_0_50px_-5px_rgba(212,175,55,0.85)]
                       disabled:cursor-not-allowed disabled:opacity-60
                       md:flex-none md:px-10"
          >
            <span aria-hidden className="mr-2">🐾</span>
            {genLoading ? '阿阇梨寻名中…' : 'AI智取宠物名'}
            <span
              aria-hidden
              className="ml-2 transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={genLoading}
            className="rounded-lg border border-primary/30 px-5 py-3 text-sm
                       text-foreground/70 transition hover:border-primary hover:text-primary
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            重置
          </button>
        </div>
        {genError && !genLoading && (
          <p className="mt-3 text-xs text-accent">· 阿阇梨暂时离线（{genError}），已显示本地推荐 ·</p>
        )}
      </section>

      {/* ===== 结果区 ===== */}
      {names.length > 0 && (
        <section aria-label="候选宠物名" className="flex flex-col gap-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-3">
              <h2 className="font-serif text-xl text-foreground md:text-2xl">
                候选名字
              </h2>
              <span className="text-[10px] tracking-[0.3em] text-foreground/40">
                {genSource === 'dify' ? 'AI · 阿阇梨推名' : '本地 · 五行匹配'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={genLoading}
              className="rounded-lg border border-primary/30 bg-background/40 px-3 py-1.5
                         text-xs tracking-wider text-primary transition
                         hover:border-primary hover:bg-primary/10
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {genLoading ? '寻名中…' : '↻ 再取一批'}
            </button>
          </header>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {names.map((c, i) => (
              <NameCard
                key={`${c.name}-${i}`}
                candidate={c}
                onCopy={() => copyToClipboard(c.name, i)}
                copied={copiedIdx === i}
                disabled={genLoading}
              />
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-[10px] tracking-wider text-foreground/30">
        · 名字是缘起的回响，请以心相待 ·
      </p>
    </div>
  );
}

/* ============ 候选名卡片 ============ */

function NameCard({
  candidate,
  onCopy,
  copied,
  disabled,
}: {
  candidate: PetNameCandidate;
  onCopy: () => void;
  copied: boolean;
  disabled: boolean;
}) {
  const elColor = ELEMENT_COLOR[candidate.element] ?? 'text-foreground/70';
  return (
    <article
      className="relative flex flex-col gap-3 overflow-hidden rounded-2xl
                 border border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent
                 p-5 backdrop-blur-md transition hover:border-primary/60 md:p-6"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div className="font-serif text-3xl text-foreground md:text-4xl">
              {candidate.name}
            </div>
            <button
              type="button"
              onClick={onCopy}
              disabled={disabled}
              aria-label={copied ? '已复制' : `复制名字 ${candidate.name}`}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md
                         border border-primary/30 bg-background/40 text-foreground/60 transition
                         hover:border-primary hover:text-primary
                         disabled:opacity-50"
            >
              {copied ? (
                <span aria-hidden className="text-primary">✓</span>
              ) : (
                <span aria-hidden className="text-[10px]">⧉</span>
              )}
            </button>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className={`font-serif ${elColor}`}>
              五行 · {candidate.element}
            </span>
          </div>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-foreground/75">
        {candidate.reason}
      </p>
    </article>
  );
}
