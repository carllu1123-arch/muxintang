/**
 * 牧心堂 · 阿阇梨后台数据加载
 *
 * 拉取首屏需要的两批数据：
 *   - pending 请奉订单
 *   - 全部未精选评论
 *
 * 设计要点：
 *   - 使用 service_role 客户端（createClient）绕过 RLS，
 *     这样不需要每个用户都给 SELECT ALL 权限
 *   - 角色校验由 page.tsx 在 server 端完成（session.role）
 *   - 失败兜底：返回空数组 + 标记 unconfigured
 */

import 'server-only';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { isSupabaseAuthConfigured } from '@/lib/session';

export interface AcharyaOrder {
  id: string;
  productType: 'scroll' | 'bracelet' | 'sachet';
  recipient: string;
  blessingMessage: string | null;
  status:
    | 'pending'
    | 'blessing'
    | 'blessed'
    | 'shipped'
    | 'completed'
    | 'cancelled';
  createdAt: string;
}

export interface AcharyaComment {
  id: string;
  chapterSlug: string;
  authorName: string;
  authorRole: 'reader' | 'acharya' | 'admin';
  body: string;
  readingTag: string | null;
  isFeatured: boolean;
  createdAt: string;
}

export interface AcharyaData {
  orders: AcharyaOrder[];
  comments: AcharyaComment[];
  unconfigured: boolean;
}

const EMPTY: AcharyaData = {
  orders: [],
  comments: [],
  unconfigured: true,
};

export async function loadAcharyaData(): Promise<AcharyaData> {
  if (!isSupabaseAuthConfigured() || !isSupabaseConfigured()) {
    return EMPTY;
  }

  try {
    const sb = createClient();
    const [ordersRes, commentsRes] = await Promise.allSettled([
       
      (sb.from('auspicious_orders') as any)
        .select(
          'id, product_type, recipient, blessing_message, status, created_at',
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50),
       
      (sb.from('chapter_comments') as any)
        .select(
          'id, chapter_slug, author_name, author_role, body, reading_tag, is_featured, created_at',
        )
        .eq('is_featured', false)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const orders: AcharyaOrder[] =
      ordersRes.status === 'fulfilled' && ordersRes.value?.data
        ? (ordersRes.value.data as Record<string, unknown>[]).map((r) => ({
            id: r.id as string,
            productType: r.product_type as 'scroll' | 'bracelet' | 'sachet',
            recipient: r.recipient as string,
            blessingMessage: (r.blessing_message as string | null) ?? null,
            status: r.status as AcharyaOrder['status'],
            createdAt: r.created_at as string,
          }))
        : [];

    const comments: AcharyaComment[] =
      commentsRes.status === 'fulfilled' && commentsRes.value?.data
        ? (commentsRes.value.data as Record<string, unknown>[]).map((r) => ({
            id: r.id as string,
            chapterSlug: r.chapter_slug as string,
            authorName: r.author_name as string,
            authorRole: r.author_role as 'reader' | 'acharya' | 'admin',
            body: r.body as string,
            readingTag: (r.reading_tag as string | null) ?? null,
            isFeatured: (r.is_featured as boolean) ?? false,
            createdAt: r.created_at as string,
          }))
        : [];

    return { orders, comments, unconfigured: false };
  } catch (e) {
    console.warn('[acharya] loadAcharyaData failed:', e);
    return EMPTY;
  }
}
