import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { MorningVoice } from '@/components/MorningVoice';
import { DailyPracticeCard } from '@/components/DailyPracticeCard';
import { MeDashboard } from '@/components/MeDashboard';
import { getCurrentSession, isSupabaseAuthConfigured } from '@/lib/session';
import { loadMeSummary } from '@/lib/me-summary';

export const metadata = {
  title: '个人道场 · 牧心堂',
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

/**
 * 银色种子字（avatar 占位）
 * - 用"卍"（万字符）做基础符号
 * - 截取用户昵称首字做内嵌主字
 */
function AvatarGlyph({ name }: { name: string }) {
  const initial = name.slice(0, 1) || '友';
  return (
    <div className="relative grid h-16 w-16 place-items-center md:h-20 md:w-20">
      {/* 外圈：银色 seed 字符光晕 */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full border border-foreground/30
                   bg-gradient-to-br from-foreground/15 to-background
                   shadow-[0_0_24px_-4px_rgba(192,192,200,0.25)]"
      />
      <span
        aria-hidden
        className="absolute inset-2 rounded-full border border-dashed
                   border-foreground/15 opacity-50"
      />
      <span className="relative font-serif text-2xl text-foreground/85 md:text-3xl">
        {initial}
      </span>
    </div>
  );
}

export default async function MePage() {
  const session = await getCurrentSession();
  const authReady = isSupabaseAuthConfigured();
  const summary = await loadMeSummary();

  // 未登录：显示引导（保持原体验）
  if (!session) {
    return (
      <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
        <PageHeader eyebrow="DIGITAL · ALTAR" title="个人数字道场" />

        <section
          className="flex flex-col items-center gap-5 rounded-2xl
                     border border-primary/30 bg-black/60 p-8
                     text-center backdrop-blur-md md:p-12"
        >
          <span aria-hidden className="font-serif text-5xl text-primary">
            ☯
          </span>
          <h2 className="font-serif text-2xl text-foreground md:text-3xl">
            请先入道场
          </h2>
          <p className="max-w-md text-sm text-foreground/70 md:text-base">
            {authReady
              ? '登录后可进入个人数字道场，查看修行进度、订单、命盘记忆。'
              : '个人道场依赖 Supabase Auth；当前 .env.local 未配置。'}
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

  // 命盘特征快照（来自 user_memories / bazi_profile）
  const mem = summary.memorySnapshot as
    | {
        dayMaster?: string;
        dayMasterElement?: string;
        weakestElement?: string;
        deity?: string;
        lastReadingAt?: string;
      }
    | null;

  return (
    <div className="flex flex-col gap-8 py-6 md:gap-10 md:py-12">
      <PageHeader eyebrow="DIGITAL · ALTAR" title="个人数字道场" />

      {/* 顶部：个人信息 + 积分 + 会员徽章 */}
      <section
        aria-label="个人资料"
        className="relative overflow-hidden rounded-2xl border border-primary/30
                   bg-gradient-to-br from-primary/5 via-black/60 to-black
                   p-5 backdrop-blur-md md:p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <AvatarGlyph name={session.displayName} />

          <div className="flex-1">
            <h2 className="font-serif text-xl text-foreground md:text-2xl">
              {session.displayName}
              <span className="ml-2 text-sm font-sans text-foreground/45">
                · 道友
              </span>
            </h2>
            <p className="text-xs text-foreground/60 md:text-sm">
              {session.email}
            </p>

            {/* 命盘特征（如有） */}
            {mem?.dayMaster && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-foreground/65">
                <span aria-hidden>✦</span>
                <span>
                  {mem.dayMaster}
                  {mem.dayMasterElement ? `（${mem.dayMasterElement}）` : ''}
                  {mem.weakestElement ? ` · 最弱：${mem.weakestElement}` : ''}
                  {mem.deity ? ` · 本尊：${mem.deity}` : ''}
                </span>
              </p>
            )}

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
                    <span className="ml-1 text-accent">（剩 {leftDays} 天）</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* 右上角：⚡ 积分 + 会员快捷入口 */}
          <div className="flex flex-row items-center gap-3 md:flex-col md:items-end md:gap-2 md:self-start">
            <span
              className="inline-flex items-center gap-1.5 rounded-full
                         border border-primary/40 bg-primary/10 px-3 py-1
                         font-serif text-sm text-primary"
              title="藏经阁积分"
            >
              <span aria-hidden>⚡</span>
              {session.credits}
            </span>
            <Link
              href="/pricing"
              className="rounded-lg border border-primary/40 px-3 py-1.5
                         text-xs text-primary transition
                         hover:bg-primary hover:text-background"
            >
              {isPaid ? '续费 / 升级' : '立即开通'}
            </Link>
          </div>
        </div>
      </section>

      {/* 主卡片矩阵：4 张 */}
      <MeDashboard initialSummary={summary} displayName={session.displayName} />

      {/* 晨音组件（id 锚点，给卡片"立即闻法"跳转） */}
      <section id="morning-voice" className="scroll-mt-20">
        <MorningVoice displayName={session.displayName} />
      </section>

      {/* 今日修行日课卡（晨音 + 画册 = 今日精进徽章） */}
      <DailyPracticeCard />

      {/* 底部 CTA：金色横幅 */}
      <Link
        href="/tools/bazi"
        className="group relative block overflow-hidden rounded-2xl
                   border border-primary/50 bg-gradient-to-br
                   from-primary/15 via-primary/5 to-black p-6 text-center
                   shadow-[0_0_32px_-8px_rgba(212,175,55,0.4)]
                   backdrop-blur-md transition
                   hover:border-primary/80 hover:from-primary/25 md:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30
                     [background:radial-gradient(ellipse_at_center,rgba(212,175,55,0.4),transparent_60%)]"
        />
        <p className="text-[10px] tracking-[0.4em] text-primary/80">
          DAILY · ZEN · PRACTICE
        </p>
        <h3 className="mt-2 font-serif text-2xl text-primary md:text-3xl">
          开启今日禅定 →
        </h3>
        <p className="mx-auto mt-2 max-w-md text-[11px] text-foreground/65">
          每日 3 分钟，排盘自省；让阿阇梨陪你&ldquo;记得&rdquo;自己
        </p>
      </Link>

      {/* 会员权益（付费用户保留说明） */}
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
    </div>
  );
}
