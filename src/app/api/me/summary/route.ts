/**
 * 牧心堂 · /api/me/summary
 *
 * 个人中心"数字道场"数据汇总端点。
 *
 * 一次返回：
 *   - latestAnnotation: 用户最新一条书摘批注
 *   - latestOrder:      用户最新一条请奉订单（如有）
 *   - memorySnapshot:   用户的命盘特征快照（来自 user_memories / key='bazi_profile'）
 *   - annotationCount:  累计批注条数
 *   - orderCount:       累计订单条数
 *
 * 全部失败兜底：未登录 / 未配置 / 异常 → 对应字段返回 null，不影响其它字段。
 */

import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getAuthClient, isSupabaseAuthConfigured } from '@/lib/session';
import { readMemory, MEMORY_KEYS } from '@/lib/memory';
import type { Json } from '@/types/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface MeSummary {
  latestAnnotation: {
    id: string;
    chapterSlug: string;
    paragraphIdx: number;
    selectedText: string;
    note: string;
    authorName: string;
    createdAt: string;
  } | null;
  latestOrder: {
    id: string;
    productType: 'scroll' | 'bracelet' | 'sachet';
    recipient: string;
    blessingMessage: string | null;
    status: 'pending' | 'blessed' | 'shipped' | 'completed' | 'cancelled';
    createdAt: string;
  } | null;
  memorySnapshot: Json | null;
  annotationCount: number;
  orderCount: number;
}

const EMPTY: MeSummary = {
  latestAnnotation: null,
  latestOrder: null,
  memorySnapshot: null,
  annotationCount: 0,
  orderCount: 0,
};

export async function GET() {
  if (!isSupabaseAuthConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(EMPTY);
  }

  // 1) 鉴权
  const sb = await getAuthClient();
  if (!sb) {
    return NextResponse.json(EMPTY);
  }
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json(EMPTY);
  }
  const userId = userData.user.id;

  // 2) 三个独立查询（任意失败不影响其它）
  const sbAdmin = createClient();
  const [annotationResult, orderResult, memory] = await Promise.allSettled([
     
    (sbAdmin.from('chapter_annotations') as any)
      .select('id, chapter_slug, paragraph_idx, selected_text, note, author_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
     
    (sbAdmin.from('auspicious_orders') as any)
      .select('id, product_type, recipient, blessing_message, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    readMemory(userId, MEMORY_KEYS.BAZI_PROFILE),
  ]);

  // 3) 解析 + 兜底
  const latestAnnotation =
    annotationResult.status === 'fulfilled' && annotationResult.value?.data
      ? (() => {
          const r = annotationResult.value.data as Record<string, unknown>;
          return {
            id: r.id as string,
            chapterSlug: r.chapter_slug as string,
            paragraphIdx: r.paragraph_idx as number,
            selectedText: r.selected_text as string,
            note: r.note as string,
            authorName: r.author_name as string,
            createdAt: r.created_at as string,
          };
        })()
      : null;

  const latestOrder =
    orderResult.status === 'fulfilled' && orderResult.value?.data
      ? (() => {
          const r = orderResult.value.data as Record<string, unknown>;
          return {
            id: r.id as string,
            productType: r.product_type as 'scroll' | 'bracelet' | 'sachet',
            recipient: r.recipient as string,
            blessingMessage: (r.blessing_message as string | null) ?? null,
            status: r.status as
              | 'pending'
              | 'blessed'
              | 'shipped'
              | 'completed'
              | 'cancelled',
            createdAt: r.created_at as string,
          };
        })()
      : null;

  // memory: listMemories/readMemory 返回 Json | null，再被 allSettled 包裹
  const memorySnapshot: Json | null =
    memory.status === 'fulfilled' ? memory.value : null;

  // 4) 累计计数（独立一次轻量查询，失败取 0）
  let annotationCount = 0;
  let orderCount = 0;
  try {
     
    const ac = await (sbAdmin.from('chapter_annotations') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    annotationCount = ac?.count ?? 0;
  } catch {
    /* 静默 */
  }
  try {
     
    const oc = await (sbAdmin.from('auspicious_orders') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    orderCount = oc?.count ?? 0;
  } catch {
    /* 静默 */
  }

  return NextResponse.json({
    latestAnnotation,
    latestOrder,
    memorySnapshot: memorySnapshot && typeof memorySnapshot === 'object' ? memorySnapshot : null,
    annotationCount,
    orderCount,
  } satisfies MeSummary);
}
