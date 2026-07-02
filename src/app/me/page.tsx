import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/session';
import { isSupabaseAuthConfigured } from '@/lib/session';

export const metadata = {
  title: '个人中心 · 牧心堂',
};

// 订阅 tier → 展示文案 + 配色
const TIER_META = {
  free: { label: '免费道友', color: 'border-foreground/30 text-foreground/70' },
  monthly: { label: '月度会员', color: 'border-primary/40 text-primary' },
  yearly: { label: '年度会员', color: 'border-accent/40 text-accent' },
  lifetime: { label: '终身同修', color: 'border-accent/40 text-accent' },
} as const;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default async function MePage() {
  const session = await getCurrentSession();
  const authReady = isSupabaseAuthConfigured();

  // 未登录：显示引导
  if (!session) {
    return (
      <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
        <PageHeader eyebrow="PROFILE" title="个人中心" />

        <section
          className="flex flex-col items-center gap-5 rounded-2xl
                     border border-primary/30 bg-black/60 p-8
                     text-center backdrop-blur-md md:p-12"
        >
          <span aria-hidden className="font-serif text-5xl text-primary">
            ☯
          </span>
          <h2 className="font-serif text-2xl text-foreground md:text-3xl">
            请先登录
          </h2>
          <p className="max-w-md text-sm text-foreground/70 md:text-base">
            {authReady
              ? '登录后可查看会员状态、订单记录、修行打卡。'
              : '个人中心依赖 Supabase Auth；当前 .env.local 未配置。'}
          </p>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-primary px-6 py-3
                         font-serif text-base text-background transition
                         hover:bg-primary/90"
            >
              登录 / 注册
            </Link>
            {!authReady && (
              <p className="text-[10px] tracking-wider text-foreground/40">
                · 需在 .env.local 中填入 NEXT_PUBLIC_SUPABASE_URL ·
              </p>
            )}
          </div>
        </section>
      </div>
    );
  }

  const tierMeta = TIER_META[session.tier] ?? TIER_META.free;
  const leftDays = daysUntil(session.tierExpiresAt);
  const isPaid = session.tier !== 'free';

  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader eyebrow="PROFILE" title="个人中心" />

      {/* 资料卡 */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-primary/30
                   bg-black/60 p-5 backdrop-blur-md md:flex-row md:items-center
                   md:gap-6 md:p-6"
      >
        <div
          className="grid h-16 w-16 place-items-center rounded-full
                     border border-primary/40 bg-background/60
                     font-serif text-2xl text-primary md:h-20 md:w-20"
        >
          {session.displayName.slice(0, 1)}
        </div>
        <div className="flex-1">
          <h2 className="font-serif text-xl text-foreground md:text-2xl">
            {session.displayName}
          </h2>
          <p className="text-xs text-foreground/60 md:text-sm">
            {session.email}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border bg-muted/40 px-3 py-0.5 text-xs ${tierMeta.color}`}
            >
              {tierMeta.label}
            </span>
            {isPaid && session.tierExpiresAt && (
              <span className="text-xs text-foreground/50">
                到期：{formatDate(session.tierExpiresAt)}
                {leftDays !== null && leftDays <= 30 && (
                  <span className="ml-1 text-accent">
                    （剩 {leftDays} 天）
                  </span>
                )}
              </span>
            )}
            {!isPaid && (
              <span className="text-xs text-foreground/50">
                升级会员可解锁全部深度报告
              </span>
            )}
          </div>
        </div>
        <Link
          href="/pricing"
          className="rounded-lg border border-primary/40 px-4 py-2
                     text-sm text-primary transition
                     hover:bg-primary hover:text-background md:self-start"
        >
          {isPaid ? '续费 / 升级' : '立即开通'}
        </Link>
      </section>

      {/* 数据统计 */}
      <section className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { l: '积分', v: session.credits, u: '分' },
          { l: '修行', v: session.practiceDays, u: '天' },
          { l: '订阅', v: isPaid ? '已开通' : '免费', u: '' },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-xl border border-border bg-muted/40 p-4 text-center"
          >
            <div className="font-serif text-2xl text-primary md:text-3xl">
              {s.v}
            </div>
            <div className="mt-1 text-xs text-foreground/60">
              {s.l}
              {s.u && `（${s.u}）`}
            </div>
          </div>
        ))}
      </section>

      {/* 订阅详情 */}
      {isPaid && (
        <section
          className="rounded-2xl border border-accent/30 bg-accent/5 p-5 md:p-6"
        >
          <h3 className="mb-3 font-serif text-lg text-foreground md:text-xl">
            会员权益
          </h3>
          <ul className="space-y-2 text-sm text-foreground/80 md:text-base">
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              解锁全部深度报告与阿阇梨开示
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              阿阇梨在线答疑（年度会员 4 次/月）
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              灵性研学社区发帖 + 修行打卡
            </li>
          </ul>
        </section>
      )}

      {/* 说明 */}
      <p className="text-xs text-foreground/40">
        · 订单记录由 Polar 支付提供；如需查询历史订单请联系客服 ·
      </p>
    </div>
  );
}
