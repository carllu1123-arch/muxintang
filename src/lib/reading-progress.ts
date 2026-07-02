/**
 * 牧心堂 · 行者故事 · 阅读进度记忆
 *
 * 用 localStorage 记录用户最近一次阅读的章节 + 段落位置。
 * 下次进入 /library 时，LibraryTabs 顶部会用金字提示「读到《第X卷·钟》第 3 段，继续阅读」。
 *
 * 存储格式：JSON.stringify(LastRead)
 * 存储键：muxintang:last-read（项目内统一前缀）
 *
 * 注意：
 *   - 仅在浏览器端使用，SSR 时所有方法返回 null / 静默
 *   - 写入失败（隐私模式 / 配额满）静默吞掉，不影响阅读
 *   - 段落索引从 0 开始，但展示给用户时 +1（"第 3 段"对应 paraIdx=2）
 */

export interface LastRead {
  /** 章节 slug */
  slug: string;
  /** 章节标题，如 "钟" */
  title: string;
  /** 卷号（短篇为 null） */
  chapterIndex: number | null;
  /** 故事类型 */
  storyType: 'serial' | 'short';
  /** 段落索引（0-based） */
  paragraphIdx: number;
  /** 段落总数（用于百分比展示） */
  paragraphCount: number;
  /** 更新时间 ISO */
  updatedAt: string;
}

const KEY = 'muxintang:last-read';

/** 写入阅读进度 */
export function saveProgress(p: LastRead): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 隐私模式 / 配额满 → 静默 */
  }
}

/** 读取最近一次阅读进度 */
export function getProgress(): LastRead | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LastRead;
    // 基本字段校验
    if (
      typeof p?.slug !== 'string' ||
      typeof p?.title !== 'string' ||
      typeof p?.paragraphIdx !== 'number'
    ) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

/** 清除阅读进度（暂未用到，预留） */
export function clearProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 静默 */
  }
}

/**
 * 生成展示用标题，如：
 *   - serial: "第3卷·钟"
 *   - short:  "短篇·月下茶"
 */
export function formatLastReadTitle(p: LastRead): string {
  if (p.storyType === 'short' || p.chapterIndex == null) {
    return `短篇·${p.title}`;
  }
  return `第${p.chapterIndex}卷·${p.title}`;
}

/**
 * 生成展示用段落标签，如 "第 3 段"（paraIdx 0-based → +1）
 */
export function formatParagraphLabel(p: LastRead): string {
  return `第 ${p.paragraphIdx + 1} 段`;
}
