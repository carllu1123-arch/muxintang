/**
 * 牧心堂 · 服务端会话助手
 *
 * 用于在 Server Components / Route Handlers 里：
 *   1. 读取当前登录用户
 *   2. 读取当前用户的 profile（含订阅 tier）
 *   3. 判断某 tier_required 内容是否可访问
 *
 * 与 supabase-server.ts 的区别：
 *   - supabase-server 用 service_role，绕过 RLS；用于 webhook / 后台任务
 *   - 本文件用 anon key + cookies，模拟用户身份；用于页面渲染
 *
 * 标准 Next.js + Supabase SSR 模式（@supabase/ssr）
 */

import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database, UserTier } from '@/types/supabase';
import { canAccessTier } from '@/types/supabase';

function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/**
 * 在 Server Component / Route Handler 内创建一次性的 Supabase 客户端。
 * 注意：每个请求都必须新建一个 client，绝不能跨请求共享。
 */
export async function getAuthClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // 在 Server Component 里 setAll 会抛错（只读），middleware 才会成功写入
          // 静默即可
        }
      },
    },
  });
}

export interface CurrentSession {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  tier: UserTier;
  tierExpiresAt: string | null;
  credits: number;
  practiceDays: number;
}

/** 获取当前登录用户的完整 session 信息（未登录返回 null） */
export async function getCurrentSession(): Promise<CurrentSession | null> {
  const sb = await getAuthClient();
  if (!sb) return null;

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) return null;
  const user = userData.user;

  // 读 profile（可能尚未创建）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (sb.from('profiles') as any)
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = profile as any;

  // 检查 tier 是否过期，过期则降级为 free（但不写库，由 webhook 取消时写）
  let tier: UserTier = (p?.tier as UserTier) ?? 'free';
  const expiresAt = p?.tier_expires_at ?? null;
  if (expiresAt && new Date(expiresAt) < new Date() && tier !== 'lifetime') {
    tier = 'free';
  }

  return {
    userId: user.id,
    email: user.email ?? '',
    displayName:
      p?.display_name ||
      (user.user_metadata?.display_name as string) ||
      user.email?.split('@')[0] ||
      '道友',
    avatarUrl: p?.avatar_url ?? null,
    tier,
    tierExpiresAt: expiresAt,
    credits: p?.credits ?? 0,
    practiceDays: p?.practice_days ?? 0,
  };
}

/** 是否能访问某 tier 限制的内容（结合 session） */
export function canAccess(
  session: CurrentSession | null,
  required: 'free' | 'monthly' | 'yearly',
): boolean {
  const tier = session?.tier ?? 'free';
  return canAccessTier(tier, required);
}
