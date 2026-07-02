import Link from 'next/link';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
}

/**
 * 牧心堂 · 统一页面头
 * - eyebrow: 小字英文标签（如 LEARN / LIBRARY）
 * - title: 主标题（serif 字体，金色）
 * - subtitle: 副标题（一行释义）
 * - back: 可选返回链接
 */
export function PageHeader({ eyebrow, title, subtitle, back }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 md:gap-4">
      {back && (
        <Link
          href={back.href}
          className="self-start text-xs tracking-wider text-foreground/50 transition hover:text-primary"
        >
          ‹ 返回{back.label}
        </Link>
      )}
      <div>
        <p className="text-[10px] tracking-[0.4em] text-primary/60 md:text-xs">
          {eyebrow.toUpperCase()}
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-wider text-foreground md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-foreground/60 md:mt-3 md:text-base">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
