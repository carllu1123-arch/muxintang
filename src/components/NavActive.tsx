'use client';

/**
 * 牧心堂 · 导航激活态高亮组件
 *
 * 用途：包装 next/link，根据当前 pathname 自动切换样式
 *  - 父组件传入 baseClassName（默认样式）+ activeClassName（激活样式）
 *  - 客户端组件（用 usePathname 必须 'use client'）
 *
 * 匹配规则：
 *  - href === '/'              → 仅当 pathname 恰好是 '/' 时高亮
 *  - href !== '/'              → pathname 以 href 起头即高亮
 *    （如 href='/learn'  → '/learn/lifecode' 也会高亮）
 *  - 这样设计是为了让 `/learn/lifecode/...` 仍能激活顶部"密解专栏"
 *
 * 视觉：
 *  - 默认：text-foreground/80 hover:text-primary（由父组件传入）
 *  - 激活：activeClassName（由父组件传入）
 *
 * 不影响 a11y：额外加 aria-current="page" 让屏幕阅读器识别
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface NavActiveProps {
  href: string;
  className?: string;
  activeClassName: string;
  children: ReactNode;
}

export function NavActive({
  href,
  className = '',
  activeClassName,
  children,
}: NavActiveProps) {
  const pathname = usePathname() ?? '/';

  const isActive =
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`);

  const finalClass = isActive
    ? `${className} ${activeClassName}`.trim()
    : className;

  return (
    <Link
      href={href}
      className={finalClass}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
