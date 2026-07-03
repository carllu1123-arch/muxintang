/**
 * 牧心堂 · 当前用户 API（客户端可读）
 *
 * GET /api/user
 *
 * 用途：
 *   - 客户端组件在 mount 时拉一次，判断：
 *       · 是否登录（user 不为 null）
 *       · 是否已订阅（tier !== 'free'）
 *       · 是否有生辰档案（birthDate / birthHour / gender）
 *
 * 响应：
 *   200 {
 *     user: {
 *       id, displayName, email, avatarUrl,
 *       tier,                    // 'free' | 'monthly' | 'yearly' | 'lifetime'
 *       tierExpiresAt,
 *       subscribed: boolean,     // 便捷字段：tier !== 'free'
 *       birthDate, birthHour, gender,
 *       role,                    // 'reader' | 'acharya' | 'admin'
 *       credits,                 // 藏经阁积分余额
 *       wallpaperMonth,          // 当月免费额度所属月份 'YYYY-MM'
 *       wallpaperUsed            // 当月已用免费壁纸次数
 *     } | null
 *   }
 *   503 { user: null, reason: 'unconfigured' }  // Supabase 未配置
 *
 * 缓存：no-store（用户档案随时变）
 *
 * 安全：
 *   - 通过 RLS 限制 user 只能查自己（user_id = auth.uid()）
 *   - 不会泄漏其他用户数据
 */

import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase-server';
import { getAuthClient, isSupabaseAuthConfigured } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseAuthConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(
      { user: null, reason: 'unconfigured' },
      { status: 200 },
    );
  }

  try {
    const sb = await getAuthClient();
    if (!sb) return NextResponse.json({ user: null });

    const { data: userData } = await sb.auth.getUser();
    if (!userData?.user) return NextResponse.json({ user: null });

    // 读 profile（含订阅 tier + role）
     
    const { data: profile } = await (sb.from('user_profiles') as any)
      .select(
        'display_name, avatar_url, tier, tier_expires_at, birth_date, birth_hour, gender, role, credits, wallpaper_month, wallpaper_used',
      )
      .eq('id', userData.user.id)
      .maybeSingle();

    const tier = (profile?.tier as string) ?? 'free';
    const expiresAt = (profile?.tier_expires_at as string | null) ?? null;

    // 检查是否过期（lifetime 永不过期）
    let effectiveTier = tier;
    if (
      expiresAt &&
      new Date(expiresAt) < new Date() &&
      tier !== 'lifetime'
    ) {
      effectiveTier = 'free';
    }

    return NextResponse.json({
      user: {
        id: userData.user.id,
        email: userData.user.email ?? '',
        displayName:
          profile?.display_name ||
          userData.user.user_metadata?.display_name ||
          userData.user.email?.split('@')[0] ||
          '道友',
        avatarUrl: profile?.avatar_url ?? null,
        tier: effectiveTier,
        tierExpiresAt: expiresAt,
        subscribed: effectiveTier !== 'free',
        birthDate: profile?.birth_date ?? null,
        birthHour: profile?.birth_hour ?? null,
        gender: profile?.gender ?? null,
        role: (profile?.role as string) ?? 'reader',
        credits: (profile?.credits as number) ?? 0,
        wallpaperMonth: (profile?.wallpaper_month as string | null) ?? null,
        wallpaperUsed: (profile?.wallpaper_used as number) ?? 0,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { user: null, error: (e as Error).message },
      { status: 200 },
    );
  }
}
