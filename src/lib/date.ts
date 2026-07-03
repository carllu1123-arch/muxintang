/**
 * 牧心堂 · 日期工具
 *
 * 集中处理所有日期格式化逻辑
 * - 安全处理：null / undefined / 非法字符串 / Invalid Date → 空字符串
 * - 统一格式：YYYY-MM-DD（不含时间，避免时区混乱）
 *
 * 为什么不用 new Date(x).toLocaleDateString()：
 *   - 不同 locale 输出不一致（'2026/6/3' vs '2026-06-03'）
 *   - 服务端 / 客户端 SSR 序列化时可能产生 hydration mismatch
 *   - 非法日期会输出 "Invalid Date"（用户反馈的 bug）
 *
 * 为什么用 date-fns 而不是原生：
 *   - 已在 package.json（与 lunar-javascript / framer-motion 等并排）
 *   - 体积小（按需 tree-shake）
 *   - isValid() 显式校验比原生简单
 */

import { format, isValid } from 'date-fns';

/**
 * 安全格式化为 YYYY-MM-DD
 *
 * @param input - ISO 字符串 / Date / 时间戳 / null
 * @returns 'YYYY-MM-DD' 或 空字符串
 *
 * @example
 *   formatYmd('2026-07-03')          → '2026-07-03'
 *   formatYmd(new Date())            → '2026-07-03'
 *   formatYmd(null)                  → ''
 *   formatYmd('not a date')          → ''
 *   formatYmd('')                    → ''
 */
export function formatYmd(
  input: string | number | Date | null | undefined,
): string {
  if (input == null || input === '') return '';
  const d = input instanceof Date ? input : new Date(input);
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
}

/**
 * 格式化日期；为空时显示「近期」（不显空字符串）
 *
 * 用于卡片列表：宁可显示"近期"也不要空着
 *
 * @param input - 同 formatYmd
 * @returns 'YYYY-MM-DD' 或 '近期'
 */
export function formatYmdOrRecent(
  input: string | number | Date | null | undefined,
): string {
  return formatYmd(input) || '近期';
}

/**
 * 中文短日期：MM月DD日
 *
 * 用 date-fns `MM月dd日` 模式（v4 严格区分大小写，D 是 day-of-year，d 才是 day-of-month）
 *
 * @param input - 同 formatYmd
 * @returns 'MM月DD日' 或 '近期'（兜底）
 *
 * @example
 *   formatChineseShortDate('2026-07-03')  → '07月03日'
 *   formatChineseShortDate(null)           → '近期'
 *   formatChineseShortDate('garbage')      → '近期'
 */
export function formatChineseShortDate(
  input: string | number | Date | null | undefined,
): string {
  if (input == null || input === '') return '近期';
  const d = input instanceof Date ? input : new Date(input);
  if (!isValid(d)) return '近期';
  return format(d, 'MM月dd日');
}

/**
 * 中文短日期，破折号兜底版
 *
 * 区别：有效日期 → 'MM月DD日'；无效/缺失 → '——'（更适合紧凑卡片）
 *
 * @example
 *   formatChineseShortOrDash(null)         → '——'
 */
export function formatChineseShortOrDash(
  input: string | number | Date | null | undefined,
): string {
  if (input == null || input === '') return '——';
  const d = input instanceof Date ? input : new Date(input);
  if (!isValid(d)) return '——';
  return format(d, 'MM月dd日');
}

/**
 * 相对时间（如「3 天前」）
 *
 * @param input - 同 formatYmd
 * @returns 相对时间字符串
 *
 * @example
 *   timeAgo(new Date(Date.now() - 60_000))  → '1 分钟前'
 *   timeAgo(null)                           → ''
 */
export function timeAgo(
  input: string | number | Date | null | undefined,
): string {
  if (input == null || input === '') return '';
  const d = input instanceof Date ? input : new Date(input);
  if (!isValid(d)) return '';

  const diff = Date.now() - d.getTime();
  if (diff < 0) return '刚刚';

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚刚';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;

  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;

  const day = Math.floor(h / 24);
  if (day < 30) return `${day} 天前`;

  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon} 个月前`;

  const yr = Math.floor(mon / 12);
  return `${yr} 年前`;
}
