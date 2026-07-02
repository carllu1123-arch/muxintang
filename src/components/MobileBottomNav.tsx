import Link from "next/link";

/**
 * MobileBottomNav
 *
 * 牧心堂 · 移动端专属底部 Tab 导航
 * - PC 端（≥ 768px）由 `md:hidden` 隐藏
 * - 黑金朱砂配色，与全局主题一致
 * - 包含 iOS 安全区适配（safe-area-bottom）
 */
const TABS = [
  { label: "首页", href: "/", glyph: "⌂" },
  { label: "四学", href: "/learn", glyph: "✦" },
  { label: "文丛", href: "/library", glyph: "❡" },
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
        {TABS.map((tab) => (
          <li key={tab.href} className="flex-1">
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
          </li>
        ))}
      </ul>
    </nav>
  );
}
