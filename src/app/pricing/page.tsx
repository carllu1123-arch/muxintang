import { PLANS } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '会员定价 · 牧心堂',
};

export default function PricingPage() {
  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="PRICING"
        title="会员定价"
        subtitle="选择一个适合你的修行节奏"
      />

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
