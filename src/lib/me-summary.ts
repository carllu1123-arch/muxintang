/**
 * 牧心堂 · /me 页面 server-side 汇总加载
 *
 * 把 /me 需要的全部数据（最新批注、最新订单、命盘快照、累计计数）
 * 在服务端一次性查完，注入到 client component 的 initialSummary。
 *
 * 关键设计：
 *   - 未登录 / 未配置 / 任何异常 → 返回 EMPTY（前端正常渲染骨架）
 *   - 三个独立查询走 Promise.allSettled，任意失败不影响其它
 *   - 不写 cookie 也不发响应头，单纯给 page 内部用
 */

import 'server-only';
import { getAuthClient, isSupabaseAuthConfigured } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/supabase';
import { readMemory, MEMORY_KEYS } from '@/lib/memory';
import { createClient } from '@/lib/supabase-server';
import type { Json } from '@/types/supabase';
import type { MeSummary } from '@/app/api/me/summary/route';

const EMPTY: MeSummary = {
  latestAnnotation: null,
  latestOrder: null,
  memorySnapshot: null,
  annotationCount: 0,
  orderCount: 0,
};

export async function loadMeSummary(): Promise<MeSummary> {
  if (!isSupabaseAuthConfigured() || !isSupabaseConfigured()) return EMPTY;

  try {
    const sb = await getAuthClient();
    if (!sb) return EMPTY;
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return EMPTY;
    const userId = u.user.id;

    const sbAdmin = createClient();
    const [annRes, ordRes, memoryRes] = await Promise.allSettled([
       
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

    // memory: readMemory 返回 Json | null，被 allSettled 包裹后需要 unwrap
    const memory: Json | null =
      memoryRes.status === 'fulfilled' ? memoryRes.value : null;

    const latestAnnotation =
      annRes.status === 'fulfilled' && annRes.value?.data
        ? (() => {
            const r = annRes.value.data as Record<string, unknown>;
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
      ordRes.status === 'fulfilled' && ordRes.value?.data
        ? (() => {
            const r = ordRes.value.data as Record<string, unknown>;
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

    return {
      latestAnnotation,
      latestOrder,
      memorySnapshot: memory && typeof memory === 'object' ? memory : null,
      annotationCount,
      orderCount,
    };
  } catch (e) {
    console.warn('[me] loadMeSummary failed:', e);
    return EMPTY;
  }
}
