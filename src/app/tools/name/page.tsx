'use client';

/**
 * 牧心堂 · 姓名智取（Name Wizard）
 *
 * 三大场景：
 *   1. 宝宝取名 —— 姓氏 / 出生日期 / 性别 / 风格
 *   2. 公司取名 —— 行业 / 注册地 / 核心产品 / 字数
 *   3. 个人·企业改名 —— 现用名 / 生辰(个人) / 企业信息(企业) / 改名缘由 / 风格
 *
 * 流程：
 *   1. 提交 → POST /api/dify（流式 NDJSON），提示词要求 AI 返回 4 个候选 JSON
 *   2. 解析失败 / Dify 未配置 → 走本地兜底名（按风格 + 五行匹配）
 *   3. 渲染 4 张黑金磨砂卡：候选名 / 五行 / 评分 / 寓意
 *   4. 单卡底部 "🙏 阿阇梨心解" → POST /api/dify（action=explain）流式展开 300 字深度解读
 *
 * 设计原则：
 *   - isLoading 分级：genLoading（生成）/ expLoading[index]（逐名心解），互不阻塞
 *   - 每个心解用独立 AbortController，支持 cancel
 *   - 全程不写库，姓名不进 Supabase
 */

import { useRef, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ReportPaywall } from '@/components/ReportPaywall';

/* ============ 1. 类型定义 ============ */

type TabKey = 'baby' | 'company' | 'rename';
type RenameMode = 'person' | 'enterprise';

interface BabyForm {
  surname: string;
  birthDate: string;
  gender: '男' | '女' | '';
  style: string;
}

interface CompanyForm {
  industry: string;
  region: string;
  product: string;
  length: '2' | '3' | '4';
}

interface RenameForm {
  currentName: string;
  birthDate: string;        // 仅个人
  companyInfo: string;      // 仅企业
  reason: string;
  style: string;
  mode: RenameMode;
}

interface NameCandidate {
  name: string;
  element: string;
  score: number;
  reason: string;
}

/** /api/user 返回的 user 形状（最小化：仅取 tier 字段） */
interface UserTierPayload {
  user?: {
    tier?: string;
  } | null;
}

/* ============ 2. 常量：风格 / 五行 / Tab 标签 ============ */

const TABS: Array<{ key: TabKey; label: string; sub: string }> = [
  { key: 'baby', label: '宝宝取名', sub: 'BABY' },
  { key: 'company', label: '公司取名', sub: 'BRAND' },
  { key: 'rename', label: '改名', sub: 'RENAME' },
];

const BABY_STYLES = ['文雅', '大气', '现代', '古典'];
const RENAME_STYLES = ['文雅', '大气', '现代', '古典', '吉祥', '国际'];
const LENGTH_OPTIONS: Array<CompanyForm['length']> = ['2', '3', '4'];
const WUXING_LIST = ['金', '木', '水', '火', '土'] as const;
type WuXing = (typeof WUXING_LIST)[number];

/* ============ 3. 本地兜底名池（按风格 / 元素聚合） ============ */

const NAME_POOL: Record<string, Record<WuXing, string[]>> = {
  // 风格键名沿用上方 STYLE 数组的中文名
  文雅: {
    金: ['锦初', '钰晗', '珺书', '铭心'],
    木: ['知言', '林书', '知行', '芸安'],
    水: ['清言', '澜溪', '澈澄', '涵之'],
    火: ['昭明', '焕昭', '晗昕', '炜言'],
    土: ['培允', '墨书', '垚安', '培之'],
  },
  大气: {
    金: ['钧瀚', '铮宇', '锋翊', '锦澜'],
    木: ['柏舟', '松砚', '栋之', '楷临'],
    水: ['澜舟', '澄宇', '泽临', '渊行'],
    火: ['炜坤', '炀朗', '昭衍', '焕之'],
    土: ['培坤', '城砚', '垚之', '垣安'],
  },
  现代: {
    金: ['亦珩', '瑞书', '钧一', '钰衡'],
    木: ['一帆', '予初', '林一', '知予'],
    水: ['予澄', '澈予', '一澜', '澜一'],
    火: ['一昭', '予晗', '炜予', '昭一'],
    土: ['予安', '培一', '垚予', '垣予'],
  },
  古典: {
    金: ['珩之', '珺之', '铭之', '钰之'],
    木: ['知之', '林之', '芸之', '楷之'],
    水: ['涵之', '澜之', '清之', '澈之'],
    火: ['昭之', '炜之', '晗之', '焕之'],
    土: ['培之', '垚之', '墨之', '城之'],
  },
  科技: {
    金: ['锐衡', '钧衡', '锋衡', '锴衡'],
    木: ['启森', '柏启', '楷启', '栋启'],
    水: ['启澜', '启澄', '启渊', '启澈'],
    火: ['启昭', '启晖', '启焕', '启炜'],
    土: ['启培', '启垚', '启城', '启垣'],
  },
  国际: {
    金: ['珩一', '钰岚', '钧岚', '瑞岚'],
    木: ['柏岚', '楷岚', '知岚', '林岚'],
    水: ['澜岚', '澈岚', '涵岚', '泽岚'],
    火: ['昭岚', '炜岚', '晗岚', '焕岚'],
    土: ['培岚', '城岚', '垚岚', '墨岚'],
  },
  吉祥: {
    金: ['瑞安', '珺安', '铭安', '钰安'],
    木: ['知安', '林安', '芸安', '楷安'],
    水: ['涵安', '清安', '澈安', '澜安'],
    火: ['昭安', '晗安', '炜安', '焕安'],
    土: ['培安', '垚安', '城安', '墨安'],
  },
};

/* ============ 4. 系统提示词 ============ */

const NAME_GEN_SYSTEM_PROMPT = `你是牧心堂的阿阇梨，擅长传统汉字命名学（音律、五行、字形、文意）。
请根据用户提供的场景信息，输出 4 个候选名字。

【硬性要求】
- 严格只输出一个合法 JSON 数组，不要任何前言、解释、Markdown 代码块、注释
- JSON 结构（必须完全匹配）：
  [
    { "name": "二字中文名（不含姓）", "element": "金|木|水|火|土", "score": 0-100 的整数, "reason": "20-50 字的简短寓意，兼顾音律/五行/文化" },
    ...共 4 项
  ]
- 4 个名字必须差异化（音律、字形、风格各异），不能雷同
- "name" 只含名字本身（不含姓氏），2 字为宜
- "element" 是该名字整体的五行偏性
- "reason" 要像师父开示，温暖、具体、可感
- "score" 反映与用户需求的契合度（80+ 为优，60-80 为中，<60 不推荐但仍可给出）`;

const EXPLAIN_SYSTEM_PROMPT = `你是牧心堂的阿阇梨。请以慈悲、温暖、如师父对弟子的口吻，深度解读「{{name}}」这个名字（约 300 字）。
内容须包含：
1. 音律平仄（声调组合是否抑扬有致）
2. 字形结构（左右 / 上下 / 包围 / 会意）
3. 五行补益（结合用户场景 / 生辰，看名字补什么、调什么）
4. 对命运 / 事业 / 情感的能量影响
5. 一条具体可操作的开示或修行建议

语气要求：
- 不用"AI"、"模型"等冷冰词汇
- 不用"综上所述"、"总而言之"等公文腔
- 像深夜师父递茶时讲的一段话`;

const MAX_EXPLAIN_CHARS = 600;

/* ============ 6. 工具函数 ============ */

/** 从流式累积文本中尽力提取 JSON 数组（兼容 Dify 多余前后缀） */
function tryExtractJsonArray(text: string): NameCandidate[] | null {
  if (!text) return null;
  // 去掉 markdown 代码块围栏
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  // 截取第一个 [ 到最后一个 ] 之间
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    const arr = JSON.parse(slice);
    if (!Array.isArray(arr)) return null;
    const normalized: NameCandidate[] = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const element = typeof item.element === 'string' ? item.element.trim() : '';
      const score = typeof item.score === 'number' ? Math.round(item.score) : Number(item.score) || 0;
      const reason = typeof item.reason === 'string' ? item.reason.trim() : '';
      if (!name) continue;
      normalized.push({
        name: name.slice(0, 4),
        element: WUXING_LIST.includes(element as WuXing) ? element : '—',
        score: Math.max(0, Math.min(100, score)),
        reason: reason.slice(0, 120) || '音律和顺，五行相生，寓意深远。',
      });
      if (normalized.length >= 4) break;
    }
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

/** 简易稳定哈希：把字符串映射到 0-1 */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** 风格 / 五行 → 候选名（本地兜底） */
function buildFallbackNames(
  style: string,
  surnameOrSeed: string,
): NameCandidate[] {
  const pool = NAME_POOL[style] ?? NAME_POOL['文雅'];
  const seed = hash01(surnameOrSeed + style);
  // 用 seed 选起始元素，循环 5 个元素各取 1 个，得到 4 个（最后一个重复一个）
  const startIdx = Math.floor(seed * WUXING_LIST.length);
  const order: WuXing[] = [];
  for (let i = 0; i < 4; i++) {
    order.push(WUXING_LIST[(startIdx + i) % WUXING_LIST.length] as WuXing);
  }
  // 候选理由池
  const reasons: Record<WuXing, string[]> = {
    金: ['金声玉振，格局清朗', '金相玉质，主信而有征', '金主决断，宜守正出奇'],
    木: ['木德仁慈，生机盎然', '木性条达，利文思与成长', '木秀于林，藏风聚气'],
    水: ['水利万物而不争', '水主智，流通而灵澈', '水汽氤氲，润下生财'],
    火: ['火德文明，光明而温暖', '火主礼，照临而有序', '火性炎上，宜文明之象'],
    土: ['土厚德载，安稳如山', '土主信，承载而有度', '土养万物，居中以和'],
  };
  const names: NameCandidate[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 4; i++) {
    const el = order[i];
    const candidates = pool[el];
    // 按 seed + i 选一个不重复的
    const pick = candidates[(Math.floor((seed * 1000) + i * 7)) % candidates.length];
    let name = pick;
    let guard = 0;
    while (used.has(name) && guard < 8) {
      name = candidates[(candidates.indexOf(name) + 1) % candidates.length];
      guard++;
    }
    used.add(name);
    const score = 86 - i * 3 + Math.floor(seed * 5);
    const reason = reasons[el][i % reasons[el].length];
    names.push({
      name,
      element: el,
      score: Math.max(60, Math.min(96, score)),
      reason,
    });
  }
  return names;
}

/** 心解的本地兜底（按名字 + 元素） */
function buildFallbackExplanation(
  name: string,
  element: string,
  birthContext: string,
): string {
  const head = `「${name}」二字，${element}性温润。`;
  const tone = '音律上：上声起、阳平收，平仄相间，读来有出尘之致。';
  const shape = '字形结构：左右相辅，疏密有度，落笔如山间行止。';
  const wuxing = birthContext
    ? `五行上：结合${birthContext}，此名补${element}之清气，调候得宜。`
    : `五行上：此名主${element}，如春日草木舒展，利于文思与内观。`;
  const impact = '能量上：可助心性沉稳、思路清晰，长远利于学业与事业之积淀。';
  const advice = '开示：每日清晨诵"嗡"字音 108 息，安住本心，名字之力方能久长。';
  return [head, tone, shape, wuxing, impact, advice].join('\n\n');
}

/* ============ 6. 主组件 ============ */

const EMPTY_BABY: BabyForm = { surname: '', birthDate: '', gender: '男', style: '文雅' };
const EMPTY_COMPANY: CompanyForm = { industry: '', region: '', product: '', length: '2' };
const EMPTY_RENAME: RenameForm = {
  currentName: '',
  birthDate: '',
  companyInfo: '',
  reason: '',
  style: '文雅',
  mode: 'person',
};

export default function NameToolPage() {
  /* ----- 状态 ----- */
  const [tab, setTab] = useState<TabKey>('baby');
  const [baby, setBaby] = useState<BabyForm>(EMPTY_BABY);
  const [company, setCompany] = useState<CompanyForm>(EMPTY_COMPANY);
  const [rename, setRename] = useState<RenameForm>(EMPTY_RENAME);
  const [formError, setFormError] = useState<string | null>(null);

  // 生成结果
  const [names, setNames] = useState<NameCandidate[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSource, setGenSource] = useState<'dify' | 'local' | null>(null);

  // 逐名心解
  const [expanded, setExpanded] = useState<number | null>(null);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [expLoading, setExpLoading] = useState<Record<number, boolean>>({});
  const [expError, setExpError] = useState<Record<number, string | null>>({});
  const [expSource, setExpSource] = useState<Record<number, 'dify' | 'local'>>({});

  // 付费墙：哪张卡片被拦截
  const [showPaywallFor, setShowPaywallFor] = useState<number | null>(null);

  const genAbortRef = useRef<AbortController | null>(null);
  const expAbortRef = useRef<Record<number, AbortController | null>>({});

  // 复制到剪贴板（防抖：复制后 1.5s 内显示 ✓）
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copyToClipboard(text: string, idx: number) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // 兼容老浏览器
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
      console.warn('[name] copy failed:', e);
    }
  }

  /* ----- 表单切换辅助 ----- */
  const setBabyField = <K extends keyof BabyForm>(k: K, v: BabyForm[K]) =>
    setBaby((p) => ({ ...p, [k]: v }));
  const setCompanyField = <K extends keyof CompanyForm>(k: K, v: CompanyForm[K]) =>
    setCompany((p) => ({ ...p, [k]: v }));
  const setRenameField = <K extends keyof RenameForm>(k: K, v: RenameForm[K]) =>
    setRename((p) => ({ ...p, [k]: v }));

  /* ----- 表单校验 ----- */
  function validate(): { ok: boolean; payload: Record<string, unknown> } {
    if (tab === 'baby') {
      if (!baby.surname.trim()) {
        setFormError('请填写宝宝姓氏。');
        return { ok: false, payload: {} };
      }
      return {
        ok: true,
        payload: {
          scenario: 'baby',
          surname: baby.surname.trim(),
          birthDate: baby.birthDate || null,
          gender: baby.gender || '未填',
          style: baby.style,
        },
      };
    }
    if (tab === 'company') {
      if (!company.industry.trim() || !company.product.trim()) {
        setFormError('请填写行业属性与核心产品。');
        return { ok: false, payload: {} };
      }
      return {
        ok: true,
        payload: {
          scenario: 'company',
          industry: company.industry.trim(),
          region: company.region.trim() || '未填',
          product: company.product.trim(),
          length: company.length,
          style: '现代', // 公司名无独立风格
        },
      };
    }
    // rename
    if (!rename.currentName.trim()) {
      setFormError('请填写现用名。');
      return { ok: false, payload: {} };
    }
    if (rename.mode === 'person' && !rename.birthDate) {
      setFormError('个人改名请补充出生日期，以便五行匹配。');
      return { ok: false, payload: {} };
    }
    if (rename.mode === 'enterprise' && !rename.companyInfo.trim()) {
      setFormError('企业改名请补充企业注册信息。');
      return { ok: false, payload: {} };
    }
    return {
      ok: true,
      payload: {
        scenario: 'rename',
        mode: rename.mode,
        currentName: rename.currentName.trim(),
        birthDate: rename.mode === 'person' ? rename.birthDate : null,
        companyInfo: rename.mode === 'enterprise' ? rename.companyInfo.trim() : null,
        reason: rename.reason.trim() || '未填',
        style: rename.style,
      },
    };
  }

  /* ----- 7. 生成候选名字 ----- */
  async function handleGenerateNames() {
    setFormError(null);
    setGenError(null);
    const v = validate();
    if (!v.ok) return;

    // 取消上一次
    genAbortRef.current?.abort();
    const ctrl = new AbortController();
    genAbortRef.current = ctrl;

    setGenLoading(true);
    setNames([]);
    setExpanded(null);
    setExplanations({});
    setExpError({});
    setExpLoading({});
    setGenSource(null);

    const payload = v.payload;
    const seedForFallback =
      `${payload.scenario}-${(payload.surname as string) ?? (payload.currentName as string) ?? ''}-${payload.style}`;

    const query =
      payload.scenario === 'baby'
        ? `请为宝宝${payload.surname}（性别${payload.gender}，出生${(payload.birthDate as string) || '未填'}，期望风格${payload.style}）起 4 个候选名。`
        : payload.scenario === 'company'
          ? `请为${payload.industry}行业（产品：${payload.product}，注册地：${payload.region}）取 ${payload.length} 字公司名，4 个候选。`
          : `请为${payload.mode === 'person' ? `个人 ${payload.currentName}` : `企业 ${payload.currentName}`}（缘由：${payload.reason}）改 4 个候选名，风格 ${payload.style}。`;

    // 兜底 JSON
    const fallbackNames = buildFallbackNames(
      (payload.style as string) || '文雅',
      seedForFallback,
    );
    const fallback = JSON.stringify(fallbackNames);

    try {
      const res = await fetch('/api/dify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: NAME_GEN_SYSTEM_PROMPT,
          query,
          context: payload,
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
            // 流式期间尝试解析
            const parsed = tryExtractJsonArray(accumulated);
            if (parsed) {
              setNames(parsed);
            }
          } else if (ev.type === 'end') {
            const parsed = tryExtractJsonArray(accumulated);
            if (parsed && parsed.length > 0) {
              setNames(parsed);
              setGenSource(ev.source === 'dify' ? 'dify' : 'local');
            } else {
              // AI 返回的不是 JSON → 用兜底
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

  /* ----- 8. 心解（流式） ----- */
  async function handleExplain(idx: number, candidate: NameCandidate) {
    // 关闭其他展开 + 清掉旧的付费墙
    setExpanded(idx);
    setShowPaywallFor(null);

    // 已展开且已加载过内容 → 直接展示，不再走付费墙 / API
    // （用户再次点击"阿阇梨心解"只是想看已有的内容）
    if (explanations[idx] || expLoading[idx]) {
      return;
    }

    /* ============ 前置鉴权（核心） ============ */

    // 调用 /api/user 判断会员身份。
    // 网络异常时静默回退为 isMember=true，避免老用户被误拦截。
    let isMember = true;
    try {
      const res = await fetch('/api/user', { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as UserTierPayload;
      const tier = data.user?.tier;
      isMember = tier === 'monthly' || tier === 'yearly';
    } catch {
      // 网络失败：保守放行（isMember 保持 true）
      isMember = true;
    }

    // 分支 A：非会员 → 拦截 + 展示付费墙
    if (!isMember) {
      setShowPaywallFor(idx);
      return;
    }

    // 分支 B：会员 → 走原有流式逻辑
    // 准备数据
    const payload = tab === 'baby'
      ? {
          scenario: 'baby',
          surname: baby.surname,
          birthDate: baby.birthDate,
          gender: baby.gender,
          style: baby.style,
        }
      : tab === 'company'
        ? {
            scenario: 'company',
            industry: company.industry,
            product: company.product,
            length: company.length,
          }
        : {
            scenario: 'rename',
            mode: rename.mode,
            currentName: rename.currentName,
            birthDate: rename.mode === 'person' ? rename.birthDate : rename.companyInfo,
            reason: rename.reason,
            style: rename.style,
          };

    const birthContext = tab === 'baby'
      ? `宝宝生辰 ${baby.birthDate || '未填'}，性别 ${baby.gender}`
      : tab === 'rename' && rename.mode === 'person'
        ? `生辰 ${rename.birthDate}`
        : tab === 'rename'
          ? `企业信息 ${rename.companyInfo}`
          : `行业 ${company.industry}`;

    const fallbackText = buildFallbackExplanation(candidate.name, candidate.element, birthContext);

    const query = `请深度解读名字「${candidate.name}」（五行 ${candidate.element}，寓意 ${candidate.reason}）。
用户场景：${birthContext}。
请用约 300 字、阿阇梨口吻输出。`;

    // 中止该 idx 上一次的请求
    expAbortRef.current[idx]?.abort();
    const ctrl = new AbortController();
    expAbortRef.current[idx] = ctrl;

    setExpLoading((p) => ({ ...p, [idx]: true }));
    setExpError((p) => ({ ...p, [idx]: null }));
    setExplanations((p) => ({ ...p, [idx]: '' }));

    try {
      const res = await fetch('/api/dify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: EXPLAIN_SYSTEM_PROMPT.replace('{{name}}', candidate.name),
          query,
          context: { ...payload, action: 'explain', name: candidate.name, element: candidate.element },
          fallback: fallbackText,
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
            if (accumulated.length > MAX_EXPLAIN_CHARS) {
              accumulated = accumulated.slice(0, MAX_EXPLAIN_CHARS);
            }
            setExplanations((p) => ({ ...p, [idx]: accumulated }));
          } else if (ev.type === 'end') {
            setExpSource((p) => ({ ...p, [idx]: ev.source === 'dify' ? 'dify' : 'local' }));
            if (!accumulated) {
              setExplanations((p) => ({ ...p, [idx]: fallbackText }));
              setExpSource((p) => ({ ...p, [idx]: 'local' }));
            }
          } else if (ev.type === 'error') {
            throw new Error(ev.error || '流式错误');
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      const msg = (e as { message?: string })?.message || 'AI 暂未在线。';
      setExpError((p) => ({ ...p, [idx]: msg }));
      setExplanations((p) => ({ ...p, [idx]: fallbackText }));
      setExpSource((p) => ({ ...p, [idx]: 'local' }));
    } finally {
      setExpLoading((p) => ({ ...p, [idx]: false }));
    }
  }

  /* ----- 9. 重置 ----- */
  function handleReset() {
    genAbortRef.current?.abort();
    Object.values(expAbortRef.current).forEach((c) => c?.abort());
    if (tab === 'baby') setBaby(EMPTY_BABY);
    if (tab === 'company') setCompany(EMPTY_COMPANY);
    if (tab === 'rename') setRename(EMPTY_RENAME);
    setNames([]);
    setExpanded(null);
    setExplanations({});
    setExpLoading({});
    setExpError({});
    setExpSource({});
    setFormError(null);
    setGenError(null);
    setGenSource(null);
  }

  /* ----- 10. 渲染 ----- */
  return (
    <div className="flex flex-col gap-8 py-6 md:gap-12 md:py-12">
      <PageHeader
        eyebrow="NAME"
        title="姓名智取"
        subtitle="听音律 · 查五行 · 得阿阇梨心解"
        back={{ href: '/tools', label: '智测工具' }}
      />

      {/* ===== Tab 切换 ===== */}
      <div
        role="tablist"
        aria-label="场景切换"
        className="flex w-full overflow-hidden rounded-2xl border border-primary/30 bg-black/60 backdrop-blur-md"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (genLoading || Object.values(expLoading).some(Boolean)) return;
                setTab(t.key);
                handleReset();
              }}
              className={`flex-1 px-3 py-3 text-center transition md:px-4 md:py-4
                          ${active
                            ? 'bg-primary/15 text-primary'
                            : 'text-foreground/60 hover:bg-primary/5 hover:text-foreground/80'}`}
            >
              <div className="text-[9px] tracking-[0.3em] md:text-[10px]">
                {t.sub}
              </div>
              <div className="mt-1 font-serif text-sm md:text-base">
                {t.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== 表单区 ===== */}
      <section
        aria-label="姓名表单"
        className="rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-md md:p-6"
      >
        {tab === 'baby' && (
          <BabyFormView
            value={baby}
            onChange={setBabyField}
            disabled={genLoading}
          />
        )}
        {tab === 'company' && (
          <CompanyFormView
            value={company}
            onChange={setCompanyField}
            disabled={genLoading}
          />
        )}
        {tab === 'rename' && (
          <RenameFormView
            value={rename}
            onChange={setRenameField}
            disabled={genLoading}
          />
        )}

        {formError && (
          <p className="mt-3 text-sm text-accent">· {formError} ·</p>
        )}

        {/* CTA 按钮 */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={handleGenerateNames}
            disabled={genLoading}
            className="group relative flex-1 overflow-hidden rounded-2xl
                       border border-primary/60 bg-gradient-to-br from-primary via-primary/90 to-primary/70
                       px-6 py-4 font-serif text-base text-background
                       shadow-[0_0_30px_-10px_rgba(212,175,55,0.6)]
                       transition hover:shadow-[0_0_50px_-5px_rgba(212,175,55,0.85)]
                       disabled:cursor-not-allowed disabled:opacity-60
                       md:flex-none md:px-10"
          >
            <span aria-hidden className="mr-2">🤖</span>
            {genLoading ? '阿阇梨寻名中…' : 'AI智取名字'}
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
        <section aria-label="候选名字" className="flex flex-col gap-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-3">
              <h2 className="font-serif text-xl text-foreground md:text-2xl">
                候选名字
              </h2>
              <span className="text-[10px] tracking-[0.3em] text-foreground/40">
                {genSource === 'dify' ? 'AI · 阿阇梨推名' : '本地 · 五行匹配'}
              </span>
            </div>
            {/* 重新推算：不动表单，直接调一次接口 */}
            <button
              type="button"
              onClick={handleGenerateNames}
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
                expanded={expanded === i}
                loading={!!expLoading[i]}
                text={explanations[i] || ''}
                error={expError[i] ?? null}
                source={expSource[i] ?? null}
                onToggle={() =>
                  setExpanded((cur) => (cur === i ? null : i))
                }
                onExplain={() => handleExplain(i, c)}
                onCopy={() => copyToClipboard(c.name, i)}
                copied={copiedIdx === i}
                disabled={genLoading}
                paywall={showPaywallFor === i}
                onDismissPaywall={() => setShowPaywallFor(null)}
              />
            ))}
          </div>

          {/* 结果区下方：重置按钮（清空所有结果 + 中止在途请求） */}
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={handleReset}
              disabled={genLoading}
              className="rounded-xl border border-primary/30 bg-black/40 px-6 py-2.5
                         text-xs tracking-[0.3em] text-foreground/60 transition
                         hover:border-primary hover:text-primary
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              ✕ 清空结果 / 重置表单
            </button>
          </div>
        </section>
      )}

      <p className="mt-2 text-center text-[10px] tracking-wider text-foreground/30">
        · 名字是缘起的回响，修行在心不在字，请以正念为本 ·
      </p>
    </div>
  );
}

/* ============ 11. 三个表单子视图 ============ */

interface FormViewProps<V> {
  value: V;
  onChange: <K extends keyof V>(k: K, v: V[K]) => void;
  disabled?: boolean;
}

function BabyFormView({ value, onChange, disabled }: FormViewProps<BabyForm>) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className="block">
        <span className="block text-[10px] tracking-wider text-foreground/60">姓氏</span>
        <input
          type="text"
          value={value.surname}
          maxLength={4}
          disabled={disabled}
          onChange={(e) => onChange('surname', e.target.value)}
          placeholder="如：林"
          className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
        />
      </label>
      <label className="block">
        <span className="block text-[10px] tracking-wider text-foreground/60">出生日期（公历）</span>
        <input
          type="date"
          value={value.birthDate}
          disabled={disabled}
          onChange={(e) => onChange('birthDate', e.target.value)}
          min="1900-01-01"
          max="2100-12-31"
          className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        />
      </label>
      <label className="block">
        <span className="block text-[10px] tracking-wider text-foreground/60">性别</span>
        <select
          value={value.gender}
          disabled={disabled}
          onChange={(e) => onChange('gender', e.target.value as BabyForm['gender'])}
          className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        >
          <option value="男">男</option>
          <option value="女">女</option>
          <option value="">未填</option>
        </select>
      </label>
      <label className="block">
        <span className="block text-[10px] tracking-wider text-foreground/60">期望风格</span>
        <select
          value={value.style}
          disabled={disabled}
          onChange={(e) => onChange('style', e.target.value)}
          className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        >
          {BABY_STYLES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CompanyFormView({ value, onChange, disabled }: FormViewProps<CompanyForm>) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className="block">
        <span className="block text-[10px] tracking-wider text-foreground/60">行业属性</span>
        <input
          type="text"
          value={value.industry}
          maxLength={20}
          disabled={disabled}
          onChange={(e) => onChange('industry', e.target.value)}
          placeholder="如：文创 / SaaS / 餐饮"
          className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
        />
      </label>
      <label className="block">
        <span className="block text-[10px] tracking-wider text-foreground/60">注册地</span>
        <input
          type="text"
          value={value.region}
          maxLength={20}
          disabled={disabled}
          onChange={(e) => onChange('region', e.target.value)}
          placeholder="如：杭州"
          className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
        />
      </label>
      <label className="block md:col-span-2">
        <span className="block text-[10px] tracking-wider text-foreground/60">核心产品 / 服务</span>
        <input
          type="text"
          value={value.product}
          maxLength={40}
          disabled={disabled}
          onChange={(e) => onChange('product', e.target.value)}
          placeholder="如：手作茶器 / 智能客服"
          className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
        />
      </label>
      <label className="block md:col-span-2">
        <span className="block text-[10px] tracking-wider text-foreground/60">期望字数</span>
        <div className="mt-1 flex gap-2">
          {LENGTH_OPTIONS.map((l) => {
            const active = value.length === l;
            return (
              <button
                key={l}
                type="button"
                disabled={disabled}
                onClick={() => onChange('length', l)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm transition
                            ${active
                              ? 'border-primary/70 bg-primary/15 text-primary'
                              : 'border-primary/25 bg-background/70 text-foreground/70 hover:border-primary/50'}
                            disabled:opacity-50`}
              >
                {l} 字
              </button>
            );
          })}
        </div>
      </label>
    </div>
  );
}

function RenameFormView({ value, onChange, disabled }: FormViewProps<RenameForm>) {
  return (
    <div className="flex flex-col gap-4">
      {/* 个人 / 企业 子模式切换 */}
      <div className="flex w-full overflow-hidden rounded-xl border border-primary/25 bg-background/40">
        {(['person', 'enterprise'] as RenameMode[]).map((m) => {
          const active = value.mode === m;
          const label = m === 'person' ? '个人改名' : '企业改名';
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => onChange('mode', m)}
              className={`flex-1 px-3 py-2 text-sm transition
                          ${active
                            ? 'bg-primary/15 text-primary'
                            : 'text-foreground/60 hover:text-foreground/80'}
                          disabled:opacity-50`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="block text-[10px] tracking-wider text-foreground/60">现用名</span>
          <input
            type="text"
            value={value.currentName}
            maxLength={20}
            disabled={disabled}
            onChange={(e) => onChange('currentName', e.target.value)}
            placeholder={value.mode === 'person' ? '如：张三' : '如：沐心科技'}
            className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
          />
        </label>

        {value.mode === 'person' ? (
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">出生日期（公历）</span>
            <input
              type="date"
              value={value.birthDate}
              disabled={disabled}
              onChange={(e) => onChange('birthDate', e.target.value)}
              min="1900-01-01"
              max="2100-12-31"
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </label>
        ) : (
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">企业注册信息</span>
            <input
              type="text"
              value={value.companyInfo}
              maxLength={40}
              disabled={disabled}
              onChange={(e) => onChange('companyInfo', e.target.value)}
              placeholder="如：2021 年杭州成立，主营 AI 工具"
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </label>
        )}

        <label className="block md:col-span-2">
          <span className="block text-[10px] tracking-wider text-foreground/60">改名原因</span>
          <textarea
            value={value.reason}
            rows={3}
            maxLength={200}
            disabled={disabled}
            onChange={(e) => onChange('reason', e.target.value)}
            placeholder="如：原名与命格金寒、不利事业；新名希望补木火之气"
            className="mt-1 w-full resize-none rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="block text-[10px] tracking-wider text-foreground/60">期望风格</span>
          <select
            value={value.style}
            disabled={disabled}
            onChange={(e) => onChange('style', e.target.value)}
            className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          >
            {RENAME_STYLES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/* ============ 12. 单个候选名卡片 ============ */

const ELEMENT_COLOR: Record<string, string> = {
  金: 'text-slate-100',
  木: 'text-emerald-300',
  水: 'text-cyan-300',
  火: 'text-orange-300',
  土: 'text-amber-300',
};

interface NameCardProps {
  candidate: NameCandidate;
  expanded: boolean;
  loading: boolean;
  text: string;
  error: string | null;
  source: 'dify' | 'local' | null;
  onToggle: () => void;
  onExplain: () => void;
  onCopy: () => void;
  copied: boolean;
  disabled: boolean;
  /** true 时表示该卡片被付费墙拦截，渲染 ReportPaywall */
  paywall: boolean;
  /** 关闭付费墙回调 */
  onDismissPaywall: () => void;
}

function NameCard({
  candidate,
  expanded,
  loading,
  text,
  error,
  source,
  onToggle,
  onExplain,
  onCopy,
  copied,
  disabled,
  paywall,
  onDismissPaywall,
}: NameCardProps) {
  const elColor = ELEMENT_COLOR[candidate.element] ?? 'text-foreground/70';

  return (
    <>
      <article
        className="relative flex flex-col gap-3 overflow-hidden rounded-2xl
                   border border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent
                   p-5 backdrop-blur-md transition hover:border-primary/60 md:p-6"
    >
      {/* 顶部：名字 + 五行 + 评分 */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div className="font-serif text-3xl text-foreground md:text-4xl">
              {candidate.name}
            </div>
            {/* 复制按钮：极简小图标，复制成功时变 ✓ 1.5s */}
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
            <span aria-hidden className="text-foreground/20">·</span>
            <span className="text-foreground/50">
              评分 {candidate.score}
            </span>
          </div>
        </div>
        <div className="text-right text-[10px] tracking-[0.3em] text-foreground/30">
          {String(candidate.score).padStart(3, '0')}
        </div>
      </header>

      {/* 寓意 */}
      <p className="text-sm leading-relaxed text-foreground/75">
        {candidate.reason}
      </p>

      {/* 心解按钮 */}
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          onExplain();
          if (!expanded) onToggle();
        }}
        disabled={disabled || loading}
        className="self-start rounded-lg border border-primary/40 bg-background/40
                   px-3 py-1.5 text-xs tracking-wider text-primary transition
                   hover:border-primary hover:bg-primary/10
                   disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden className="mr-1">🙏</span>
        {loading ? '心解展开中…' : '阿阇梨心解'}
      </button>

      {/* 展开区：流式心解 */}
      {expanded && (
        <div
          className="relative mt-2 rounded-xl border border-primary/20 bg-black/40 p-4
                     text-sm leading-relaxed text-foreground/90 md:text-[15px]"
        >
          {text ? (
            <div className="whitespace-pre-wrap">
              {text}
              {loading && (
                <span
                  aria-hidden
                  className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-primary/80"
                />
              )}
            </div>
          ) : loading ? (
            <span className="text-foreground/40">阿阇梨静思中…</span>
          ) : (
            <span className="text-foreground/40">（等待心解…）</span>
          )}

          {error && !loading && (
            <p className="mt-2 text-xs text-accent">
              · AI 暂未回应（{error}），已用本地解读 ·
            </p>
          )}

          {source && !loading && text && (
            <p className="mt-2 text-[10px] tracking-wider text-foreground/30">
              {source === 'dify' ? 'AI · 阿阇梨亲解' : '本地 · 五行对照'}
            </p>
          )}

          {/* 金色阿阇梨印章 */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-2 grid h-7 w-7 place-items-center
                       rounded-full border border-primary/40 bg-background/60
                       font-serif text-xs text-primary shadow-[0_0_10px_-2px_rgba(212,175,55,0.5)]"
          >
            ☸
          </span>
        </div>
      )}

      {/* 付费墙：未订阅时，在卡片下方展开 ReportPaywall */}
      </article>

      {paywall && (
        <div className="relative">
          <ReportPaywall
            tierRequired="yearly"
            categoryTitle={`姓名 · ${candidate.name}`}
            description="阿阇梨深度心解为年度会员专属权益，请订阅后解锁完整开示。"
          />
          <button
            type="button"
            onClick={onDismissPaywall}
            aria-label="关闭付费墙"
            className="absolute right-3 top-3 z-10 rounded-md p-1
                       text-foreground/60 transition
                       hover:bg-primary/10 hover:text-primary"
          >
            <span aria-hidden className="text-base leading-none">×</span>
          </button>
        </div>
      )}
    </>
  );
}
