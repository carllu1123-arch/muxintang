/**
 * 牧心堂 · 自然语言生辰解析器
 *
 * 目标：用户在聊天框里随手输入类似：
 *   "1990年6月15日 14时 男"
 *   "我是1990-6-15 14:00出生的，男性"
 *   "庚午年 农历四月十五 午时"
 *   "1990.06.15 14:00 男"
 * …能够稳定抽出 {year, month, day, hour, gender?}。
 *
 * 设计：纯正则，零依赖；优先匹配公历。
 *
 * 限制：
 *   - 不支持八字推算"出生时辰"（即没有八字输入的恢复功能）
 *   - 不处理农历输入（用户想输入农历时直接走八字 → 见后续支持）
 *   - 年份限制 1900-2100
 */

import type { BaziInput } from './bazi-engine';

const RE_YEAR = /(19\d{2}|20\d{2})\s*年?/;
const RE_YEAR_DASH = /\b(19\d{2}|20\d{2})[-\/.](0?[1-9]|1[0-2])[-\/.](0?[1-9]|[12]\d|3[01])\b/;
const RE_YEAR_CN = /(19\d{2}|20\d{2})\s*年\s*(0?[1-9]|1[0-2])\s*月\s*(0?[1-9]|[12]\d|3[01])\s*日?/;
const RE_HOUR_HM = /\b([01]?\d|2[0-3])\s*[时:：]\s*([0-5]?\d)?\b/;
const RE_HOUR_CN = /([子丑寅卯辰巳午未申酉戌亥])\s*时/; // 地支时辰
const RE_GENDER = /(男|女|男性|女性|先生|女士|公子|姑娘)/;

const DIZHI_HOUR: Record<string, number> = {
  子: 0, 丑: 2, 寅: 4, 卯: 6, 辰: 8, 巳: 10,
  午: 12, 未: 14, 申: 16, 酉: 18, 戌: 20, 亥: 22,
};

export interface ParseResult extends BaziInput {
  /** 是否包含明确性别 */
  hasGender: boolean;
}

/**
 * 从自然语言抽取生辰。返回 null 表示无法解析。
 */
export function parseBirthFromText(text: string): ParseResult | null {
  if (!text) return null;
  const t = text.trim();

  // 1) 抽取年/月/日（优先 CN 写法）
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  const cn = RE_YEAR_CN.exec(t);
  if (cn) {
    year = Number(cn[1]);
    month = Number(cn[2]);
    day = Number(cn[3]);
  } else {
    const dash = RE_YEAR_DASH.exec(t);
    if (dash) {
      year = Number(dash[1]);
      month = Number(dash[2]);
      day = Number(dash[3]);
    } else {
      const y = RE_YEAR.exec(t);
      if (y) {
        year = Number(y[1]);
        // 只知年 → 失败（必须至少有月日）
        return null;
      }
    }
  }

  if (!year || !month || !day) return null;

  // 2) 抽时辰（先 HH:mm，再中文地支）
  let hour: number | null = null;
  const hm = RE_HOUR_HM.exec(t);
  if (hm) {
    hour = Number(hm[1]);
  } else {
    const dz = RE_HOUR_CN.exec(t);
    if (dz) {
      hour = DIZHI_HOUR[dz[1]] ?? null;
    }
  }
  // 没抽到时，给个合理默认（中午 12:00）— 这是兜底，但前端会提示"时辰未指定"
  if (hour === null) hour = 12;

  // 3) 性别
  let gender: '男' | '女' | undefined;
  const g = RE_GENDER.exec(t);
  if (g) {
    if (g[1] === '女' || g[1] === '女性' || g[1] === '女士' || g[1] === '姑娘') {
      gender = '女';
    } else {
      gender = '男';
    }
  }

  return {
    year,
    month,
    day,
    hour,
    gender,
    hasGender: Boolean(gender),
  };
}
