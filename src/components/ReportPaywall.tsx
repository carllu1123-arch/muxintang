import Link from 'next/link';

interface ReportPaywallProps {
  tierRequired: 'monthly' | 'yearly';
  categoryTitle: string;
  /**
   * 自定义描述文案（如"前 3 句为 AI 预览，阿阇梨完整情感开示与修行建议，
   * 请订阅【年度会员】后查看。"）。不传则显示默认的"剩余段落数"提示。
   */
  description?: string;
  remainingParagraphs?: number; // 可选：剩余未读段落数
}

/**
 * 牧心堂 · 深度报告付费墙
 *
 * 视觉统一规则（指令强制）：
 *   border border-primary/30 bg-black/60 backdrop-blur-md rounded-xl p-6 text-center
 *
 * 用法：
 *   {isLocked && <ReportPaywall tierRequired="monthly" categoryTitle="生命格局" />}
 *
 * 设计：
 *   - 统一黑金磨砂卡片，所有付费墙使用同一基础类名
 *   - 移动优先；PC 端文字更舒展
 *   - 暂不读用户订阅状态，按"未付费"展示（订阅状态接入后会动态切换）
 */
export function ReportPaywall({
  tierRequired,
  categoryTitle,
  description,
  remainingParagraphs,
}: ReportPaywallProps) {
  const tierName = tierRequired === 'monthly' ? '月度会员' : '年度会员';
  const tierPrice = tierRequired === 'monthly' ? '¥38/月' : '¥388/年';
  const tierHighlight =
    tierRequired === 'yearly' ? '推荐 · 一年只需 ¥388，相当于 10 个月' : '';

  return (
    <section
      className="border border-primary/30 bg-black/60 backdrop-blur-md rounded-xl p-6 text-center"
      aria-label="付费内容"
    >
      <div className="flex flex-col items-center gap-4">
        {/* 装饰 */}
        <span aria-hidden className="font-serif text-4xl text-primary md:text-5xl">
          ☷
        </span>

        <header>
          <h3 className="font-serif text-xl text-foreground md:text-2xl">
            续读「{categoryTitle}」深度报告
          </h3>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-foreground/80 md:text-base">
              {description}
            </p>
          ) : (
            remainingParagraphs !== undefined && (
              <p className="mt-2 text-sm text-foreground/60 md:text-base">
                下方还有 {remainingParagraphs} 段属于
                <span className="text-accent"> {tierName} </span>
                内容
              </p>
            )
          )}
        </header>

        {/* 权益列表 */}
        <ul className="flex flex-col gap-2 text-left text-sm text-foreground/80 md:text-base">
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            完整解锁当前文章及所有同类深度报告
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            阿阇梨在线答疑（年度会员 4 次/月）
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            灵性研学社区发帖 + 修行打卡
          </li>
        </ul>

        {/* 定价 */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-2xl text-primary md:text-3xl">
              {tierPrice}
            </span>
          </div>
          {tierHighlight && (
            <p className="text-xs text-accent">{tierHighlight}</p>
          )}
        </div>

        {/* CTA */}
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Link
            href="/pricing"
            className="rounded-lg bg-primary px-6 py-2.5 text-center
                       font-serif text-base text-background transition
                       hover:bg-primary/90"
          >
            立即开通
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-primary/30 px-6 py-2.5 text-center
                       text-sm text-foreground/80 transition
                       hover:border-primary hover:text-primary"
          >
            已是会员？登录
          </Link>
        </div>

        <p className="text-[10px] tracking-wider text-foreground/40">
          · 随时取消 · 7 天无理由退款 ·
        </p>
      </div>
    </section>
  );
}
