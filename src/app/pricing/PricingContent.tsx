'use client';

import { useEffect, useState } from 'react';
import { PLANS } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';

interface CurrentUser {
  id: string;
  tier: 'free' | 'monthly' | 'yearly' | 'lifetime' | string;
  subscribed: boolean;
  displayName?: string;
  credits?: number;
  tierExpiresAt?: string | null;
}

/**
 * 牧心堂 · 会员定价页
 *
 * - 顶部"💎 自由模式"金色横幅：仅在已登录但未订阅时显示
 *   （未登录时让用户正常浏览定价方案即可，不要打断）
 * - 三档套餐 + 常见问题
 */
export function PricingContent() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/user', { cache: 'no-store' });
        if (!r.ok) {
          if (!cancelled) setUser(null);
          return;
        }
        const data = (await r.json()) as { user: CurrentUser | null };
        if (!cancelled) setUser(data.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 仅在"已登录 + 未订阅 + 用户未手动关闭"时显示
  const showFreeBanner = !!user && !user.subscribed && !bannerDismissed;

  return (
    <div className="flex flex-col gap-10 py-6 md:gap-14 md:py-12">
      <PageHeader
        eyebrow="PRICING"
        title="会员定价"
        subtitle="选择一个适合你的修行节奏"
      />

      {/* ===== 顶部免费模式提示横幅（仅未订阅用户可见） ===== */}
      {showFreeBanner && (
        <section
          role="status"
          aria-live="polite"
          className="relative flex items-start gap-3 overflow-hidden rounded-2xl
                     border border-primary/40 bg-gradient-to-r
                     from-primary/15 via-primary/10 to-primary/5
                     p-4 shadow-[0_0_30px_-15px_rgba(212,175,55,0.5)]
                     md:items-center md:gap-4 md:p-5"
        >
          {/* 装饰金光 */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-20 w-20
                       rounded-full bg-primary/25 blur-2xl"
          />

          {/* 图标 */}
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                       border border-primary/40 bg-background/60
                       font-serif text-base text-primary md:h-10 md:w-10 md:text-lg"
          >
            💎
          </span>

          {/* 文案 */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground md:text-base">
              💎 您当前处于
              <span className="mx-1 text-primary">免费模式</span>
              ，升级后即可解锁：
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/65 md:text-sm">
              生命代码 · 情缘合盘 · 姓名智取 等深度 AI 解读 + 阿阇梨级内容
            </p>
          </div>

          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="关闭横幅"
            className="shrink-0 rounded-md p-1 text-foreground/50 transition
                       hover:bg-primary/10 hover:text-primary"
          >
            <span aria-hidden className="text-base leading-none">×</span>
          </button>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {PLANS.map((p) => (
          <article
            key={p.id}
            className={`relative flex flex-col gap-4 rounded-2xl border p-5
                       transition md:p-6
                       ${
                         p.highlight
                           ? 'border-primary bg-primary/5 shadow-[0_0_60px_-30px_rgba(212,175,55,0.45)]'
                           : 'border-border bg-muted/40 hover:border-primary/40'
                       }`}
          >
            {p.highlight && (
              <span
                className="absolute -top-3 left-5 rounded-full border border-primary
                           bg-background px-3 py-0.5 text-[10px] tracking-wider text-primary"
              >
                推荐
              </span>
            )}

            <header>
              <h2 className="font-serif text-xl text-foreground md:text-2xl">
                {p.name}
              </h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-serif text-3xl text-primary md:text-4xl">
                  {p.price === 0 ? '免费' : `¥${p.price}`}
                </span>
                {p.price > 0 && (
                  <span className="text-sm text-foreground/60">
                    / {p.period}
                  </span>
                )}
              </div>
            </header>

            <ul className="flex flex-col gap-2 text-sm text-foreground/80 md:text-base">
              {p.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={`mt-auto rounded-lg px-4 py-2.5 text-sm transition
                ${
                  p.highlight
                    ? 'bg-primary text-background hover:bg-primary/90'
                    : 'border border-primary/40 text-primary hover:bg-primary/10'
                }`}
            >
              {p.price === 0 ? '当前方案' : '立即开通'}
            </button>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-muted/30 p-5 md:p-6">
        <h3 className="font-serif text-lg text-foreground md:text-xl">
          常见问题
        </h3>
        <dl className="mt-4 space-y-3 text-sm text-foreground/80">
          <div>
            <dt className="text-foreground">会员可以随时取消吗？</dt>
            <dd className="mt-1 text-foreground/65">
              可以。在「个人中心 → 订单记录」中可关闭自动续费，已支付的部分仍然有效到期。
            </dd>
          </div>
          <div>
            <dt className="text-foreground">付费后多久能访问全部内容？</dt>
            <dd className="mt-1 text-foreground/65">
              支付成功立即生效，无需等待。
            </dd>
          </div>
          <div>
            <dt className="text-foreground">学生有优惠吗？</dt>
            <dd className="mt-1 text-foreground/65">
              学生年度会员 5 折。请联系阿阇梨助理申请，需提供学信网截图。
            </dd>
          </div>
        </dl>
      </section>

      <p className="text-xs text-foreground/40">
        · 当前为占位展示，待接入支付与会员系统 ·
      </p>
    </div>
  );
}
