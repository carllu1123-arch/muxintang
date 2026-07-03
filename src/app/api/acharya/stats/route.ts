/**
 * 牧心堂 · 阿阇梨后台 · 运营数据看板聚合
 *
 * GET /api/acharya/stats
 *
 * 用途：聚合 analytics_events 表的 3 类关键指标，供阿阇梨后台展示
 *   - paywallCount       : paywall_triggered  付费墙拦截次数
 *   - aiCount            : ai_explanation_called  AI 阿阇梨调用次数
 *   - pdfCount           : pdf_downloaded   PDF 画册下载次数
 *
 * 鉴权（轻量）：
 *   - 必须已登录
 *   - role in ('acharya', 'admin')   → 返回真实数据
 *   - 其他情况（未配置 / 未登录 / 角色不够）→ 返回 mock 数据（前端仍可渲染）
 *
 * 数据流：
 *   1) 拿当前 session
 *   2) 查 user_profiles.role
 *   3) 角色匹配 → 用 service_role 聚合 analytics_events
 *   4) 任一步失败 → 兜底 mock（paywall: 23, ai: 47, pdf: 12）
 *
 * 性能：
 *   - 三次独立 count()，可并行
 *   - 单次 ~50ms（带索引），可接受
 *   - 大流量下可加 Redis 缓存（5 分钟）
 */

import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getAuthClient, isSupabaseAuthConfigured } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StatsResponse {
  ok: true;
  paywallCount: number;
  aiCount: number;
  pdfCount: number;
  mock: boolean;             // true = 返回兜底 mock，false = 真实数据
  reason?: 'unconfigured' | 'unauthenticated' | 'unauthorized' | 'db_error';
  generatedAt: string;
}

const MOCK_STATS: Pick<StatsResponse, 'paywallCount' | 'aiCount' | 'pdfCount'> = {
  paywallCount: 23,
  aiCount: 47,
  pdfCount: 12,
};

function mockResponse(reason: StatsResponse['reason']): StatsResponse {
  return {
    ok: true,
    ...MOCK_STATS,
    mock: true,
    reason,
    generatedAt: new Date().toISOString(),
  };
}

async function countEvents(sb: ReturnType<typeof createClient>, eventName: string): Promise<number> {
  try {
    const { count, error } = await (sb.from('analytics_events') as any)
      .select('*', { count: 'exact', head: true })
      .eq('event', eventName);
    if (error) {
      console.warn(`[stats] count ${eventName} failed:`, error.message);
      return 0;
    }
    return typeof count === 'number' ? count : 0;
  } catch (e) {
    console.warn(`[stats] count ${eventName} exception:`, (e as Error).message);
    return 0;
  }
}

export async function GET() {
  /* 1) Supabase 未配置 → mock */
  if (!isSupabaseConfigured() || !isSupabaseAuthConfigured()) {
    return NextResponse.json(mockResponse('unconfigured'));
  }

  /* 2) 鉴权 */
  let userId: string | null = null;
  try {
    const auth = await getAuthClient();
    if (!auth) return NextResponse.json(mockResponse('unconfigured'));
    const { data: userData } = await auth.auth.getUser();
    if (!userData?.user) {
      return NextResponse.json(mockResponse('unauthenticated'));
    }
    userId = userData.user.id;
  } catch {
    return NextResponse.json(mockResponse('unauthenticated'));
  }

  /* 3) 查角色 */
  let role: string = 'reader';
  try {
    const sb = createClient();
    const { data: profile } = await (sb.from('user_profiles') as any)
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    role = (profile?.role as string) ?? 'reader';
  } catch {
    role = 'reader';
  }

  if (role !== 'acharya' && role !== 'admin') {
    // 角色不够：仍返回 mock（前端不报错，体验上展示"占位数据"）
    return NextResponse.json(mockResponse('unauthorized'));
  }

  /* 4) 角色匹配 → 真实聚合（并行 3 次 count） */
  try {
    const sb = createClient();
    const [paywallCount, aiCount, pdfCount] = await Promise.all([
      countEvents(sb, 'paywall_triggered'),
      countEvents(sb, 'ai_explanation_called'),
      countEvents(sb, 'pdf_downloaded'),
    ]);

    return NextResponse.json({
      ok: true,
      paywallCount,
      aiCount,
      pdfCount,
      mock: false,
      generatedAt: new Date().toISOString(),
    } satisfies StatsResponse);
  } catch (e) {
    console.warn('[stats] aggregate failed, fallback to mock:', (e as Error).message);
    return NextResponse.json(mockResponse('db_error'));
  }
}
