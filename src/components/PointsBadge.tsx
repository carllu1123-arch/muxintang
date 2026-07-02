'use client';

/**
 * 牧心堂 · 积分徽章（藏经阁积分可视化）
 *
 * 在导航栏头像/我的 Tab 附近显示 "⚡ 120"。
 * - 未登录时返回 null（不占位）
 * - 加载中显示 "⚡ …"
 * - 通过 usePoints hook 自动轮询 + 监听全局事件刷新
 *
 * 用法：
 *   <PointsBadge variant="pc" />     // PC 端，稍大
 *   <PointsBadge variant="mobile" /> // 移动端，更紧凑
 */

import { usePoints } from '@/lib/usePoints';

interface PointsBadgeProps {
  variant?: 'pc' | 'mobile';
}

export function PointsBadge({ variant = 'pc' }: PointsBadgeProps) {
  const { credits, loading, loggedIn } = usePoints();

  if (!loggedIn) return null;

  const sizeCls =
    variant === 'mobile'
      ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
      : 'text-xs px-2 py-0.5 gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full border border-primary/40
                  bg-primary/10 font-medium text-primary ${sizeCls}`}
      title="藏经阁积分"
      aria-label={`藏经阁积分 ${credits}`}
    >
      <span aria-hidden className="leading-none">
        ⚡
      </span>
      <span className="tabular-nums">{loading ? '…' : credits}</span>
    </span>
  );
}

export default PointsBadge;
