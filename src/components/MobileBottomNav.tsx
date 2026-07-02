import Link from "next/link";
import { SearchPortal } from "@/components/SearchPortal";
import { PointsBadge } from "@/components/PointsBadge";

/**
 * MobileBottomNav
 *
 * 牧心堂 · 移动端专属底部 Tab 导航
 * - PC 端（≥ 768px）由 `md:hidden` 隐藏
 * - 黑金朱砂配色，与全局主题一致
 * - 包含 iOS 安全区适配（safe-area-bottom）
 * - 第 2 位为搜索入口（SearchPortal client component）
 * - "我的" Tab 右上角显示积分徽章（PointsBadge，登录后可见）
 *
 * Tab 顺序：首页 / 搜索 / 密解 / 故事 / 研习 / 我的
 */
const TABS = [
  { label: "首页", href: "/", glyph: "⌂" },
  { label: "密解", href: "/learn", glyph: "✦" },
  { label: "故事", href: "/library", glyph: "❡" },
  { label: "研习", href: "/study", glyph: "◈" },
  { label: "我的", href: "/me", glyph: "☯" },
] as const;

export function MobileBottomNav({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="主导航"
      className={`fixed inset-x-0 bottom-0 z-50 md:hidden
                  bg-black/90 backdrop-blur-lg
                  border-t border-primary/20
                  safe-area-bottom ${className}`}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {/* 首页 */}
        <li className="flex-1">
          <Link
            href="/"
            className="flex flex-col items-center gap-0.5 py-2
                       text-foreground/70 transition
                       active:text-primary"
          >
            <span aria-hidden className="text-lg leading-none">
              ⌂
            </span>
            <span className="text-[11px] tracking-wider">首页</span>
          </Link>
        </li>
        {/* 搜索入口（client component，唤起 SearchModal） */}
        <li className="flex-1">
          <SearchPortal variant="mobile" />
        </li>
        {/* 其余导航 */}
        {TABS.slice(1).map((tab) => (
          <li key={tab.href} className="relative flex-1">
            <Link
              href={tab.href}
              className="flex flex-col items-center gap-0.5 py-2
                         text-foreground/70 transition
                         active:text-primary"
            >
              <span aria-hidden className="text-lg leading-none">
                {tab.glyph}
              </span>
              <span className="text-[11px] tracking-wider">
                {tab.label}
              </span>
            </Link>
            {/* "我的" Tab 右上角积分徽章（登录后可见） */}
            {tab.label === "我的" && (
              <span className="pointer-events-none absolute right-1 top-1">
                <PointsBadge variant="mobile" />
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
