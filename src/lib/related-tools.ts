/**
 * 牧心堂 · 文章 → 工具 反向推荐映射
 *
 * 根据文章 category 推荐相关的智测工具，形成「学（Learn）⇄ 测（Tools）」双向闭环。
 *
 * 映射规则：
 *   lifecode → /tools/bazi       （生命代码：按生辰解码）
 *   habitat  → /tools/habitat    （家居环境：十问堪舆）
 *   name     → /tools/name       （姓名心解：五行音律）
 *   teacher  → /tools/match + /tools/bazi  （阿阇梨开示 → 合盘 + 排盘，2 个入口）
 *
 * 用法（Server Component 内同步调用）：
 *   import { getRelatedTools } from '@/lib/related-tools';
 *   const tools = getRelatedTools(article.category);
 */

export interface RelatedTool {
  /** 工具路由，如 '/tools/bazi' */
  href: string;
  /** 工具名称，如 '生命代码' */
  title: string;
  /** 一句话描述 */
  desc: string;
  /** 视觉标识（与 /tools 入口卡片 glyph 对齐） */
  glyph: string;
}

/** category → 相关工具列表（1-2 个） */
const CATEGORY_TO_TOOLS: Record<string, RelatedTool[]> = {
  lifecode: [
    {
      href: '/tools/bazi',
      title: '生命代码',
      desc: '按阳历生辰解码本然频率，阿阇梨在线开示。',
      glyph: '☷',
    },
  ],
  habitat: [
    {
      href: '/tools/habitat',
      title: '家居环境',
      desc: '十问堪舆，AI 即时给出调候建议与种子字调和法。',
      glyph: '◉',
    },
  ],
  name: [
    {
      href: '/tools/name',
      title: '姓名心解',
      desc: '姓 + 名 + 生辰，解读名字的五行音律与文化回向。',
      glyph: '✎',
    },
  ],
  teacher: [
    {
      href: '/tools/match',
      title: '情缘合盘',
      desc: '二人八字相照，察缘之深浅，阿阇梨开示业力成长。',
      glyph: '☯',
    },
    {
      href: '/tools/bazi',
      title: '生命代码',
      desc: '按阳历生辰解码本然频率，阿阇梨在线开示。',
      glyph: '☷',
    },
  ],
};

/** 兜底：未知 category 默认推荐生命代码 */
const DEFAULT_TOOLS: RelatedTool[] = CATEGORY_TO_TOOLS.lifecode;

/**
 * 根据文章 category 获取相关工具推荐
 * @param category 文章分类 id（lifecode / habitat / name / teacher）
 * @returns 1-2 个工具入口（未匹配时返回 lifecode/bazi）
 */
export function getRelatedTools(category: string): RelatedTool[] {
  return CATEGORY_TO_TOOLS[category] ?? DEFAULT_TOOLS;
}
