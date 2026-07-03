import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SearchPortal } from "@/components/SearchPortal";
import { PointsBadge } from "@/components/PointsBadge";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { FloatingAcharya } from "@/components/FloatingAcharya";
import PageTransition from "@/components/PageTransition";
import { NavActive } from "@/components/NavActive";

export const metadata: Metadata = {
  title: "牧心堂 · 灵性修学与生命智测",
  description: "生命代码、家居环境、姓名智取——以东方智慧解现代人心。",
  applicationName: "牧心堂",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "牧心堂",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B0B0B",
};

/**
 * 牧心堂 · 主导航（结构树 · 黑金生产态 · 三栏式）
 *
 * 顶部导航划分为 左 / 中 / 右 三栏（PC 专属，PC ≥ 768px）：
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  [Logo 牧心堂]  智测AI·吉祥·爱宠·密法·故事·智创·法脉  [🔍 ⭐ 登录] │
 *   └──────────────────────────────────────────────────────────────────┘
 *     ← 左栏（auto） →   ← 中栏（flex-1 · 7 项菜单）→   ← 右栏（auto · 操作区）→
 *
 * 7 项菜单（顺序固定，结构树决定）：
 *   1. 智测AI    →  /tools        2+4 核心漏斗（择日/流年 免费；生命代码/情缘/姓名/家居 会员）
 *   2. 吉祥馆    →  /auspicious   AI 零成本壁纸生成 + 阿阇梨定制请奉表单
 *   3. 爱宠屋    →  /pet          宠物取名 / 配饰 / 饮食 / 超度 四条服务线
 *   4. 密法灵学  →  /channel      /learn（密解专栏）上 / /study（灵性研学）下 双栏聚合
 *   5. 行者故事  →  /library      沉浸阅读 + 划线批注 + 阿阇梨精选评论
 *   6. 智创师    →  /creators     师兄师姐静态展示橱窗
 *   7. 法脉源    →  /about        牧心堂的源流（法脉时间线 + 阿阇梨本怀）
 *
 * 「首页」不占顶部菜单：
 *   - 用户随时点 Logo 回首页（Logo 也是个 Link）
 *   - 移动端底部 Tab 第一项就是首页
 *
 * 移动端底部 Tab 仍为 5 项：道场 / 智测 / 专栏(/learn) / 故事 / 我的
 *   详见 components/MobileBottomNav.tsx
 *
 * 认证 / 定价 / 个人中心 三个路由不在顶部主导航出现：
 *   - /login, /register, /pricing → 右栏「登录」按钮 + 登录页内交叉链
 *   - /me                         → 移动端底部 Tab「我的」；PC 端从积分徽章点入
 *
 * 后台 · 运营支撑层（不在公共导航中出现）：
 *   - /dashboard/acharya  顶部「阿阇梨」徽章点击进入（已登录且角色匹配时）
 *   - /api/cron/daily-digest  由 Vercel Cron 触发，前端无入口
 */
const PC_NAV = [
  { label: "智测AI",   href: "/tools" },
  { label: "吉祥馆",   href: "/auspicious" },
  { label: "爱宠屋",   href: "/pet" },
  { label: "密法灵学", href: "/channel" },
  { label: "行者故事", href: "/library" },
  { label: "智创师",   href: "/creators" },
  { label: "法脉源",   href: "/about" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-screen bg-background text-foreground">
        {/* 外层容器：移动端单列 480 居中，PC 端放宽 */}
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 md:max-w-6xl md:px-6">
          {/* === 顶部导航（sticky · 玻璃磨砂） === */}
          <header
            className="sticky top-0 z-50 -mx-4 md:mx-0
                       bg-background/80 backdrop-blur-md
                       border-b border-primary/10
                       transition-colors duration-300
                       px-4 md:px-0"
          >
            <nav className="flex h-16 items-center justify-between">
              {/* === 左栏 · Logo（点击回首页，替代移除的「首页」菜单） === */}
              <Link
                href="/"
                className="flex items-center gap-2 text-foreground"
                aria-label="返回首页"
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

              {/* === 移动端折叠：仅显示「登录」按钮（替代中间菜单 + 右栏） === */}
              <Link
                href="/login"
                className="rounded-full border border-primary/60 px-4 py-1
                           text-sm text-primary transition
                           hover:bg-primary hover:text-background md:hidden"
              >
                登录
              </Link>

              {/* === 中栏 · 8 个菜单项（PC 专属，flex-1 居中） === */}
              <ul className="hidden flex-1 items-center justify-center gap-6 md:flex">
                {PC_NAV.map((item) => (
                  <li key={item.href}>
                    <NavActive
                      href={item.href}
                      className="inline-block pb-1
                                 border-b-2 border-transparent
                                 text-sm tracking-wider
                                 text-primary/60
                                 transition-all duration-300
                                 hover:text-primary/80
                                 hover:border-primary/30"
                      activeClassName="!text-primary !border-primary
                                       [text-shadow:0_0_10px_rgba(212,175,55,0.55)]"
                    >
                      {item.label}
                    </NavActive>
                  </li>
                ))}
              </ul>

              {/* === 右栏 · 搜索 + 积分 + 登录（PC 专属） ===
                  顺序严格：SearchPortal → PointsBadge → 登录按钮
                  搜索必须放右栏，**不能**紧贴 Logo */}
              <div className="hidden items-center gap-4 md:flex">
                <SearchPortal variant="pc" />
                <PointsBadge variant="pc" />
                <Link
                  href="/login"
                  className="rounded-full border border-primary/70 px-4 py-1.5
                             text-sm text-primary transition
                             hover:bg-primary hover:text-background"
                >
                  登录
                </Link>
              </div>
            </nav>
          </header>

          {/* 主内容：移动端预留底部 Tab 高度，PC 端无底部 Tab */}
          <main className="flex-1 pb-24 md:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* 移动端底部 Tab 导航（fixed bottom-0） */}
        <MobileBottomNav />

        {/* 全局浮动阿阇梨入口（任何页面可一键唤起 AI 对话） */}
        <FloatingAcharya />

        {/* PWA Service Worker 注册（仅 production 生效） */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
