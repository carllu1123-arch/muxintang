/**
 * 牧心堂 · AI 长期记忆（user_memories）读写助手
 *
 * 用途：
 *   - /api/bazi 在排盘后异步写回用户的命盘特征
 *   - /api/dify 在注入 system_prompt 前读取最近一条记忆
 *   - 其他场景（合盘、问询）可按需扩展 key
 *
 * 关键设计：
 *   - writeMemory / readMemory 都是「supabase 未配置就静默返回」的兜底模式
 *   - 写入走 upsert（onConflict: user_id,key），自然支持"覆盖式"记忆
 *   - 读取按 key 过滤 + 按 updated_at desc 拿最近一条
 *   - 不写敏感信息（生辰本身已存 user_profiles；这里只存命盘特征/偏好/事实）
 *
 * 数据示例（key='bazi_profile'）：
 *   {
 *     pillars: { year, month, day, hour },
 *     dayMaster: '丙',
 *     dayMasterElement: '火',
 *     fiveElements: { '金': 0.1, '木': 0.2, '水': 0.15, '火': 0.4, '土': 0.15 },
 *     weakestElement: '金',
 *     deity: '大日如来',
 *     lastReadingAt: '2026-07-03T...',
 *   }
 */

import 'server-only';
import { createClient } from '@/lib/supabase-server';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Json } from '@/types/supabase';

/** 记忆 key 命名空间（统一前缀，避免与其他 key 冲突） */
export const MEMORY_KEYS = {
  BAZI_PROFILE: 'bazi_profile',
  MATCH_PROFILE: 'match_profile',
  PREFS: 'prefs',
} as const;

export type MemoryKey = (typeof MEMORY_KEYS)[keyof typeof MEMORY_KEYS];

/** 读取单条记忆；未登录 / 未配置 / 出错都返回 null（不抛） */
export async function readMemory(
  userId: string,
  key: MemoryKey | string,
): Promise<Json | null> {
  if (!isSupabaseConfigured()) return null;
  if (!userId) return null;
  try {
    const sb = createClient();
     
    const { data, error } = await (sb.from('user_memories') as any)
      .select('content, updated_at')
      .eq('user_id', userId)
      .eq('key', key)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[memory] read failed:', error.message);
      return null;
    }
    return (data?.content as Json) ?? null;
  } catch (e) {
    console.warn('[memory] read exception:', e);
    return null;
  }
}

/** 列出某 user 的所有记忆 key → 最近 content（按 updated_at desc） */
export async function listMemories(
  userId: string,
): Promise<Array<{ key: string; content: Json; updatedAt: string }>> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const sb = createClient();
     
    const { data, error } = await (sb.from('user_memories') as any)
      .select('key, content, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('[memory] list failed:', error.message);
      return [];
    }
    return (data ?? []).map((r: { key: string; content: Json; updated_at: string }) => ({
      key: r.key,
      content: r.content,
      updatedAt: r.updated_at,
    }));
  } catch (e) {
    console.warn('[memory] list exception:', e);
    return [];
  }
}

/** 写入/覆盖一条记忆；upsert 语义：同一 (user_id, key) 总是被替换为最新 */
export async function writeMemory(
  userId: string,
  key: MemoryKey | string,
  content: Json,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'unconfigured' };
  }
  if (!userId) {
    return { ok: false, error: 'no_user' };
  }
  try {
    const sb = createClient();
     
    const { error } = await (sb.from('user_memories') as any).upsert(
      {
        user_id: userId,
        key,
        content,
      },
      { onConflict: 'user_id,key' },
    );
    if (error) {
      console.warn(`[memory] write failed (key=${key}):`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn(`[memory] write exception (key=${key}):`, e);
    return { ok: false, error: String(e) };
  }
}

/**
 * 把"记忆库"格式化成可注入 system_prompt 的中文背景段。
 * 优先按 key 顺序：bazi_profile → match_profile → prefs。
 * 没有记忆时返回空字符串。
 */
export function memoriesToSystemPrompt(
  memories: Array<{ key: string; content: Json }>,
): string {
  if (!memories.length) return '';
  const lines: string[] = ['【道友长期记忆（阿阇梨记得的）】'];
  for (const m of memories) {
    const intro = MEMORY_INTRO[m.key] ?? '· 备注';
    const body = formatMemoryBody(m.key, m.content);
    if (body) lines.push(`${intro}：${body}`);
  }
  if (lines.length <= 1) return '';
  lines.push('请结合道友的长期特性，给予更贴心、更连贯的开示。');
  return lines.join('\n');
}

const MEMORY_INTRO: Record<string, string> = {
  bazi_profile: '道友上次的命盘特征',
  match_profile: '道友的合盘偏好',
  prefs: '道友偏好',
};

function formatMemoryBody(key: string, content: Json): string {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return '';
  const c = content as Record<string, unknown>;
  if (key === 'bazi_profile') {
    const dm = c.dayMaster ? `${c.dayMaster}（${c.dayMasterElement ?? ''}）` : '';
    const pillars = c.pillars && typeof c.pillars === 'object'
      ? Object.values(c.pillars as Record<string, string>).join(' ')
      : '';
    const weakest = c.weakestElement ? `最弱五行：${c.weakestElement}` : '';
    const deity = c.deity ? `本尊：${c.deity}` : '';
    return [dm, pillars, weakest, deity].filter(Boolean).join(' · ');
  }
  // 通用：把 content 序列化成简短 key=value
  return Object.entries(c)
    .slice(0, 4)
    .map(([k, v]) => `${k}=${typeof v === 'string' || typeof v === 'number' ? v : JSON.stringify(v)}`)
    .join(' · ');
}
