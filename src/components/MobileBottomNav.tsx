"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PointsBadge } from "@/components/PointsBadge";

/**
 * MobileBottomNav
 *
 * 牧心堂 · 移动端专属底部 Tab 导航
 * - PC 端（≥ 768px）由 `md:hidden` 隐藏
 * - 黑金朱砂配色，与全局主题一致
 * - 包含 iOS 安全区适配（safe-area-bottom）
 *
 * 5 Tab 道场版（PC 顶部 7 项菜单的精简版）：
 *   1. 道场  →  /            首屏：Hero + 阿阇梨对话 CTA
 *   2. 智测  →  /tools       2+4 核心漏斗（择日/流年 免费；生命代码/情缘/姓名/家居 会员）
 *   3. 专栏  →  /learn       密解专栏（TTS + AI 摘要 + 付费墙）
 *                       — PC 端已被并入「密法灵学 → /channel」上栏
 *   4. 故事  →  /library     行者故事（沉浸阅读 + 划线批注）
 *   5. 我的  →  /me          数字道场（晨音 + 阅读 + 积分 + 订单）
 *
 * 注：吉祥馆 / 智创师 / 法脉源 / 爱宠屋 / 密法灵学 不占用底部 Tab，通过：
 *   - 首页 Hero CTA → 吉祥馆 / 爱宠屋
 *   - 密解专栏/行者故事内文链接 → 智创师 / 法脉源
 *   - 我的页内 6 宫格 → 智创师 / 吉祥馆
 *
 * 积分徽章：挂在「我的」Tab 右上角（用户更关心自己的积分）
 *
 * 【磨砂玻璃滚动效果】（与 PC 顶栏视觉一致）
 *   - 基础类对齐 PC 顶栏：bg-background/* + backdrop-blur-md + border-primary/10
 *   - 滚动感知：scrolled=false（顶部）→ bg-background/70（轻玻璃，让内容透出）
 *               scrolled=true（已滚动）→ bg-background/90（重玻璃，强化磨砂感）
 *   - 300ms 平滑过渡（transition-colors）
 *   - rAF 节流：避免 scroll 高频触发 setState
 *
 * 移动端地址栏自动隐藏：保留原行为（首次滚动时 scrollTo(1) 欺骗浏览器折叠）
 */

const TABS = [
  { label: "道场", href: "/",        glyph: "⌂" },
  { label: "智测", href: "/tools",   glyph: "◐" },
  { label: "专栏", href: "/learn",   glyph: "✦" },
  { label: "故事", href: "/library", glyph: "❡" },
  { label: "我的", href: "/me",      glyph: "☯" },
] as const;

/** 触发「重玻璃」的最少滚动距离（避免临界值抖动） */
const SCROLL_THRESHOLD = 8;

function isTabActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "/";

  /* ============ 1. 滚动状态：玻璃"轻↔重"切换 ============ */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767.98px)");
    if (!mql.matches) return;

    let rafId: number | null = null;

    const updateScrolled = () => {
      rafId = null;
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };

    const onScroll = () => {
      // rAF 节流：scroll 高频时，每帧最多 setState 一次
      if (rafId !== null) return;
      rafId = requestAnimationFrame(updateScrolled);
    };

    // 初始化一次（直接进入页面可能已滚到中间，避免 hydration 后闪烁）
    setScrolled(window.scrollY > SCROLL_THRESHOLD);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  /* ============ 2. 地址栏自动隐藏（保留原行为） ============ */
  const addressBarHiddenRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767.98px)");
    if (!mql.matches) return;

    const onFirstScroll = () => {
      if (addressBarHiddenRef.current) return;
      if (window.scrollY > 0) return; // 已离开顶部，不干预
      addressBarHiddenRef.current = true;
      // 同步触发一次 1px 滚动，骗浏览器折叠地址栏
      window.scrollTo({ top: 1, behavior: "auto" });
      // 摘除监听，后续不再触发
      window.removeEventListener("scroll", onFirstScroll);
    };
    window.addEventListener("scroll", onFirstScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onFirstScroll);
    };
  }, []);

  return (
    <nav
      aria-label="主导航"
      className={[
        // 定位 + PC 隐藏
        "fixed inset-x-0 bottom-0 z-50 md:hidden",
        // 玻璃 token（与 PC 顶栏对齐）
        "backdrop-blur-md",
        "border-t border-primary/10",
        "safe-area-bottom",
        "transition-colors duration-300",
        // 滚动感知：轻玻璃（顶部）↔ 重玻璃（已滚动）
        scrolled ? "bg-background/90" : "bg-background/70",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {TABS.map((tab) => {
          const active = isTabActive(tab.href, pathname);
          return (
            <li key={tab.href} className="relative flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 transition
                            ${active
                              ? "text-primary [text-shadow:0_0_10px_rgba(212,175,55,0.55)]"
                              : "text-foreground/70 active:text-primary"}`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {tab.glyph}
                </span>
                <span className="text-[11px] tracking-wider">
                  {tab.label}
                </span>
                {/* 激活态：金线指示 */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2
                               rounded-full bg-primary
                               shadow-[0_0_10px_rgba(212,175,55,0.7)]"
                  />
                )}
              </Link>
              {/* 「我的」Tab 右上角积分徽章（登录后可见） */}
              {tab.href === "/me" && (
                <span className="pointer-events-none absolute right-1 top-1">
                  <PointsBadge variant="mobile" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
