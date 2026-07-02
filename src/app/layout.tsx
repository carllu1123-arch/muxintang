import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SearchPortal } from "@/components/SearchPortal";
import { PointsBadge } from "@/components/PointsBadge";

export const metadata: Metadata = {
  title: "牧心堂 · 灵性修学与生命智测",
  description: "生命代码、家居环境、姓名心解——以东方智慧解现代人心。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B0B0B",
};

const PC_NAV = [
  { label: "智测工具", href: "/tools" },
  { label: "密解专栏", href: "/learn" },
  { label: "行者故事", href: "/library" },
  { label: "灵性研学", href: "/study" },
  { label: "吉祥馆", href: "/auspicious" },
  { label: "关于", href: "/about" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-screen bg-background text-foreground">
        {/* 外层容器：移动端单列 480 居中，PC 端放宽 */}
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 md:max-w-6xl md:px-6">
          {/* 顶部导航（sticky） */}
          <header
            className="sticky top-0 z-40 -mx-4 md:mx-0
                       bg-background/85 backdrop-blur-lg
                       border-b border-primary/15
                       px-4 md:px-0"
          >
            <nav className="flex h-14 items-center justify-between md:h-16">
              {/* Logo */}
              <Link
                href="/"
                className="flex items-center gap-2 text-foreground"
              >
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-full
                             border border-primary/60 text-primary
                             font-serif text-base leading-none"
                >
                  牧
                </span>
                <span className="font-serif text-lg tracking-widest md:text-xl">
                  牧心堂
                </span>
              </Link>

              {/* 移动端：登录按钮（导航折叠） */}
              <Link
                href="/login"
                className="rounded-full border border-primary/60 px-4 py-1
                           text-sm text-primary transition
                           hover:bg-primary hover:text-background md:hidden"
              >
                登录
              </Link>

              {/* PC 端：完整菜单 */}
              <ul className="hidden items-center gap-8 md:flex">
                {PC_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm tracking-wider text-foreground/80
                                 transition hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <SearchPortal variant="pc" />
                </li>
                <li>
                  <PointsBadge variant="pc" />
                </li>
                <li>
                  <Link
                    href="/login"
                    className="rounded-full border border-primary/70 px-4 py-1.5
                               text-sm text-primary transition
                               hover:bg-primary hover:text-background"
                  >
                    登录
                  </Link>
                </li>
              </ul>
            </nav>
          </header>

          {/* 主内容：移动端预留底部 Tab 高度，PC 端无底部 Tab */}
          <main className="flex-1 pb-24 md:pb-0">{children}</main>
        </div>

        {/* 移动端底部 Tab 导航（fixed bottom-0） */}
        <MobileBottomNav />
      </body>
    </html>
  );
}
