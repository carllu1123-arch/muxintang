import { notFound } from 'next/navigation';
import { getCurrentSession, isSupabaseAuthConfigured } from '@/lib/session';
import { PageHeader } from '@/components/PageHeader';
import { AcharyaDashboard } from '@/components/AcharyaDashboard';
import { loadAcharyaData } from '@/lib/acharya-data';

export const metadata = {
  title: '阿阇梨后台 · 牧心堂',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 阿阇梨管理后台
 *
 * 角色守卫（服务端）：
 *   - 未登录 → notFound()（用户视角：404）
 *   - 已登录但 role !== 'acharya' && role !== 'admin' → notFound()
 *   - 角色匹配 → 渲染后台
 *
 * 为什么不直接 403？
 *   隐藏后台路径（404）是更安全的"最小暴露"原则，
 *   攻击者无法通过 403 探测出"这个路径真实存在"。
 */
export default async function AcharyaDashboardPage() {
  if (!isSupabaseAuthConfigured()) {
    // 未配置 Supabase → 直接 404，避免在 demo 站点上暴露入口
    notFound();
  }

  const session = await getCurrentSession();
  if (!session) notFound();

  // session 当前未暴露 role（lib/session.ts），所以直接再查一次 profile.role
  // 也可以扩展 session，这里选最小改动路径
  const userRole = await loadUserRole(session.userId);
  if (userRole !== 'acharya' && userRole !== 'admin') {
    notFound();
  }

  // 拉取首屏数据
  const data = await loadAcharyaData();

  return (
    <div className="flex flex-col gap-8 py-6 md:gap-10 md:py-12">
      <PageHeader
        eyebrow="ACHARYA · CONSOLE"
        title="阿阇梨批阅桌"
        subtitle="吉祥馆请奉 · 行者故事精选 · 都在这里"
      />

      <AcharyaDashboard
        displayName={session.displayName}
        role={userRole}
        initialOrders={data.orders}
        initialComments={data.comments}
      />
    </div>
  );
}

/** 单查一次 role（避免拉整张 profile） */
async function loadUserRole(userId: string): Promise<string> {
  try {
    const { getAuthClient } = await import('@/lib/session');
    const sb = await getAuthClient();
    if (!sb) return 'reader';
     
    const { data } = await (sb.from('user_profiles') as any)
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    return (data?.role as string) ?? 'reader';
  } catch {
    return 'reader';
  }
}
