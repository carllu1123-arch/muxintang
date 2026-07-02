/**
 * 牧心堂 · 老黄历（择日）数据
 *
 * 数据源优先级（2026 升级）：
 *   1. Supabase `calendar_dates` 表（真实数据）→ 若有该日数据则返回
 *   2. 静态 hash 占位实现（lib/almanac.ts 内置）→ 永远可用
 *
 * 前端 `lookupAlmanac(dateISO)` 接口签名不变，但已升级为 async。
 *
 * 包含：
 *   - 12 常用「宜」事项（占位词表）
 *   - 12 常用「忌」事项（占位词表）
 *   - 12 时辰吉凶（占位固定表）
 *
 * 不引第三方，零业务依赖；Supabase 通过全局 proxy 客户端调用。
 */

import { supabase } from './supabase';

export const YI_ITEMS = [
  '祭祀', '祈福', '出行', '修造', '动土', '安葬',
  '嫁娶', '纳采', '开业', '入宅', '求财', '赴任',
] as const;

export const JI_ITEMS = [
  '嫁娶', '开市', '动土', '安葬', '入宅', '作灶',
  '出行', '移徙', '破土', '竖柱', '词讼', '掘井',
] as const;

export interface HourSlot {
  /** 子 / 丑 / 寅 ... */
  zhi: string;
  /** 时辰名（含时间段） */
  name: string;
  /** 23:00-01:00 之类 */
  range: string;
  /** 宜简短（最多 2 条） */
  yi: string[];
  /** 忌简短（最多 1 条） */
  ji: string[];
  /** 吉凶等级：吉 / 平 / 凶 */
  fortune: '吉' | '平' | '凶';
}

const HOURS: HourSlot[] = [
  { zhi: '子', name: '子时', range: '23:00–01:00', yi: ['安睡', '冥想'], ji: ['远行'], fortune: '平' },
  { zhi: '丑', name: '丑时', range: '01:00–03:00', yi: ['安睡'], ji: ['决断'], fortune: '平' },
  { zhi: '寅', name: '寅时', range: '03:00–05:00', yi: ['起床', '诵经'], ji: ['动土'], fortune: '吉' },
  { zhi: '卯', name: '卯时', range: '05:00–07:00', yi: ['出行', '学习'], ji: ['安葬'], fortune: '吉' },
  { zhi: '辰', name: '辰时', range: '07:00–09:00', yi: ['开业', '签约'], ji: ['诉讼'], fortune: '吉' },
  { zhi: '巳', name: '巳时', range: '09:00–11:00', yi: ['会友', '求财'], ji: ['婚嫁'], fortune: '吉' },
  { zhi: '午', name: '午时', range: '11:00–13:00', yi: ['祭祀', '祈福'], ji: ['动土'], fortune: '吉' },
  { zhi: '未', name: '未时', range: '13:00–15:00', yi: ['纳采', '嫁娶'], ji: ['远行'], fortune: '吉' },
  { zhi: '申', name: '申时', range: '15:00–17:00', yi: ['修造', '动土'], ji: ['开业'], fortune: '平' },
  { zhi: '酉', name: '酉时', range: '17:00–19:00', yi: ['归家', '安歇'], ji: ['诉讼'], fortune: '平' },
  { zhi: '戌', name: '戌时', range: '19:00–21:00', yi: ['安葬', '祭祀'], ji: ['开业'], fortune: '凶' },
  { zhi: '亥', name: '亥时', range: '21:00–23:00', yi: ['安睡', '冥想'], ji: ['决断'], fortune: '平' },
];

export interface AlmanacDay {
  /** 干支日（如 "甲子"） */
  ganzhiDay: string;
  /** 生肖冲煞（如 "冲鼠煞北"） */
  clash: string;
  /** 五行值日 */
  wuXing: '金' | '木' | '水' | '火' | '土';
  /** 宜事项 */
  yi: string[];
  /** 忌事项 */
  ji: string[];
  /** 12 时辰吉凶 */
  hours: HourSlot[];
  /** 是否为占位（true = 静态 hash 兜底；false = 来自真实数据库） */
  placeholder: boolean;
  /** 数据源（debug 用） */
  source: 'supabase' | 'local-hash' | 'local-default';
}

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const ELEMENT_FOR_DAY = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'] as const;

/** FNV-1a 32-bit hash：把日期字符串转成稳定的 0..2^32-1 整数 */
function hashDate(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 选 k 个元素（不重复） */
function pickN<T>(pool: readonly T[], k: number, seed: number): T[] {
  const idx: number[] = [];
  const taken = new Set<number>();
  let s = seed;
  while (idx.length < k && idx.length < pool.length) {
    s = (s * 1103515245 + 12345) >>> 0;
    const i = s % pool.length;
    if (!taken.has(i)) {
      taken.add(i);
      idx.push(i);
    }
  }
  return idx.map((i) => pool[i]);
}

/* ============ 占位实现（兜底） ============ */

function computeGanzhiFromEpoch(dateISO: string): {
  ganzhiDay: string;
  wuXing: '金' | '木' | '水' | '火' | '土';
  clash: string;
} {
  const [y, m, d] = dateISO.split('-').map(Number);
  const epochDays = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  const ganIdx = ((epochDays % 10) + 10) % 10;
  const zhiIdx = ((epochDays % 12) + 12) % 12;
  return {
    ganzhiDay: `${GAN[ganIdx]}${ZHI[zhiIdx]}`,
    wuXing: ELEMENT_FOR_DAY[ganIdx],
    clash: `冲${ZODIAC[zhiIdx]}煞${zhiIdx % 2 === 0 ? '北' : '南'}`,
  };
}

/**
 * 本地 hash 占位实现（兜底）。
 *   - 干支 / 冲煞 / 五行值日：按日期偏移计算
 *   - 宜 / 忌：从词表按 hash 抽样
 *   - 12 时辰：固定表
 */
function lookupAlmanacLocal(dateISO: string): AlmanacDay {
  const seed = hashDate(dateISO);
  const { ganzhiDay, wuXing, clash } = computeGanzhiFromEpoch(dateISO);

  return {
    ganzhiDay,
    clash,
    wuXing,
    yi: pickN(YI_ITEMS, 4 + (seed % 2), seed),
    ji: pickN(JI_ITEMS, 4 + ((seed >>> 4) % 2), seed >>> 4),
    hours: HOURS,
    placeholder: true,
    source: 'local-hash',
  };
}

/* ============ 真实数据库查询 ============ */

interface CalendarDateRow {
  date: string;
  lunar_day: string | null;
  ganzhi_day: string | null;
  clash: string | null;
  xing: '金' | '木' | '水' | '火' | '土' | null;
  suitable: string[];
  unsuitable: string[];
  hours: HourSlot[];
}

/**
 * 从 Supabase calendar_dates 表取某日数据。
 * 返回 null 时表示该日不在库里（前端走本地兜底）。
 */
async function lookupAlmanacFromDB(dateISO: string): Promise<AlmanacDay | null> {
  try {
    // 修正 dateISO → "YYYY-MM-DD"（supabase 期望）
    const dateOnly = dateISO.slice(0, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('calendar_dates') as any)
      .select('date, lunar_day, ganzhi_day, clash, xing, suitable, unsuitable, hours')
      .eq('date', dateOnly)
      .maybeSingle();

    if (error) {
      console.warn('[almanac] supabase query failed:', error.message);
      return null;
    }
    if (!data) return null;

    const row = data as CalendarDateRow;
    const { ganzhiDay, wuXing, clash } = computeGanzhiFromEpoch(dateOnly);

    return {
      ganzhiDay: row.ganzhi_day ?? ganzhiDay,
      clash: row.clash ?? clash,
      wuXing: row.xing ?? wuXing,
      yi: row.suitable ?? [],
      ji: row.unsuitable ?? [],
      hours: Array.isArray(row.hours) && row.hours.length > 0 ? row.hours : HOURS,
      placeholder: false,
      source: 'supabase',
    };
  } catch (e) {
    // 网络异常 / JSON 解析失败 / 未配置等
    console.warn('[almanac] supabase unavailable, fallback to local:', e);
    return null;
  }
}

/* ============ 公共入口 ============ */

/**
 * 查询某日黄历。
 *   - 优先查 Supabase `calendar_dates`
 *   - 失败 / 未配置 / 该日无数据 → 回落到 hash 占位
 *
 * 返回 Promise<AlmanacDay>，永远不抛错。
 */
export async function lookupAlmanac(dateISO: string): Promise<AlmanacDay> {
  const db = await lookupAlmanacFromDB(dateISO);
  if (db) return db;
  return lookupAlmanacLocal(dateISO);
}

/* ============ 同步版（兼容 SSR / 静态导出） ============ */

/**
 * 同步版：仅使用本地占位实现。
 * 用于 SSR 渲染时预填充 / fallback，以及测试场景。
 */
export function lookupAlmanacSync(dateISO: string): AlmanacDay {
  return lookupAlmanacLocal(dateISO);
}

/* ============ 视觉辅助 ============ */

/** 干支配色（视觉用） */
export const WUXING_COLOR: Record<AlmanacDay['wuXing'], string> = {
  金: 'text-slate-100',
  木: 'text-emerald-300',
  水: 'text-cyan-300',
  火: 'text-orange-300',
  土: 'text-amber-300',
};

export const FORTUNE_BG: Record<HourSlot['fortune'], string> = {
  吉: 'border-primary/40 bg-primary/10',
  平: 'border-foreground/15 bg-muted/30',
  凶: 'border-accent/40 bg-accent/10',
};
