/**
 * 牧心堂 · 每日修行打卡（客户端 localStorage）
 *
 * 用途：
 *   - 跟踪用户"今日"是否完成了晨音收听 + PDF 下载
 *   - 供 /me 页面的"今日修行日课"卡片读取
 *   - 决定是否点亮"今日精进"徽章
 *
 * 设计：
 *   - 纯客户端，不污染服务端 / 数据库
 *   - 按日期切分 key（YYYY-MM-DD），新一天自动重置
 *   - 所有写入都用 try/catch 兜底（localStorage 不可用 / 隐私模式时静默）
 *
 * 安全：
 *   - 不写入 PII
 *   - 即使用户清除 localStorage，也只是丢掉徽章，不影响主流程
 */

const KEY_PREFIX = 'muxintang_practice_';
const MAX_AGE_DAYS = 7; // 保留最近 7 天，给未来"周报"留接口

export type PracticeKey = 'audioListened' | 'pdfDownloaded';

export interface DailyPractice {
  /** ISO 日期 YYYY-MM-DD */
  date: string;
  audioListened: boolean;
  audioAt?: number; // ms timestamp
  pdfDownloaded: boolean;
  pdfAt?: number;
}

/** 今日 key（YYYY-MM-DD，local time） */
export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 读取某天的打卡（默认今日） */
export function getPractice(date: string = todayKey()): DailyPractice {
  const empty: DailyPractice = {
    date,
    audioListened: false,
    pdfDownloaded: false,
  };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + date);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<DailyPractice>;
    return {
      date,
      audioListened: Boolean(parsed.audioListened),
      audioAt: typeof parsed.audioAt === 'number' ? parsed.audioAt : undefined,
      pdfDownloaded: Boolean(parsed.pdfDownloaded),
      pdfAt: typeof parsed.pdfAt === 'number' ? parsed.pdfAt : undefined,
    };
  } catch {
    return empty;
  }
}

/** 标记某项完成（幂等） */
export function markPractice(key: PracticeKey, date: string = todayKey()): void {
  if (typeof window === 'undefined') return;
  try {
    const cur = getPractice(date);
    if (cur[key]) return; // 已标记过，不再写
    const next: DailyPractice = {
      ...cur,
      [key]: true,
      [key === 'audioListened' ? 'audioAt' : 'pdfAt']: Date.now(),
    };
    window.localStorage.setItem(KEY_PREFIX + date, JSON.stringify(next));
    // 触发自定义事件，让 /me 卡片能立即刷新
    window.dispatchEvent(
      new CustomEvent('muxintang:practice', { detail: { date, key, value: true } }),
    );
    // 顺手清理 7 天前的旧 key
    cleanupOldKeys();
  } catch {
    /* 静默 */
  }
}

/** 今日是否双精进 */
export function isTodayComplete(): boolean {
  const p = getPractice();
  return p.audioListened && p.pdfDownloaded;
}

/** 清理 MAX_AGE_DAYS 天前的旧记录 */
function cleanupOldKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(KEY_PREFIX)) continue;
      const dateStr = k.slice(KEY_PREFIX.length);
      const t = Date.parse(dateStr);
      if (!Number.isNaN(t) && t < cutoff) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    /* 静默 */
  }
}
