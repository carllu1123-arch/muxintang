import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '智测工具 · 牧心堂',
  description: '生命代码、家居环境、姓名心解',
};

const TOOLS = [
  {
    title: '生命代码',
    sub: 'Bazi',
    desc: '按生辰解码你的人生注脚。',
    href: '/tools/bazi',
    glyph: '☷',
    enabled: true,
  },
  {
    title: '家居环境',
    sub: 'Habitat',
    desc: '户型 + 朝向 + 出生信息综合诊断。',
    href: '/tools/house',
    glyph: '◉',
    enabled: false,
  },
  {
    title: '姓名心解',
    sub: 'Namenoma',
    desc: '形音义 + 五行 + 字源。',
    href: '/tools/name',
    glyph: '✎',
    enabled: false,
  },
];

export default function ToolsIndex() {
  return (
    <div className="flex flex-col gap-12 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="TOOLS"
        title="智测工具"
        subtitle="三分钟，看见自己的本然频率"
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {TOOLS.map((t) => {
          const Card = (
            <div
              className={`flex h-full flex-col gap-3 rounded-2xl border p-5
                         transition md:p-6
                         ${
                           t.enabled
                             ? 'border-primary/30 bg-muted/40 hover:border-primary/60'
                             : 'border-border bg-muted/20'
                         }`}
            >
              <div className="flex items-center justify-between">
                <span
                  aria-hidden
                  className={`text-3xl ${t.enabled ? 'text-primary/80' : 'text-foreground/30'}`}
                >
                  {t.glyph}
                </span>
                <span className="text-[10px] tracking-[0.3em] text-foreground/40">
                  {t.sub.toUpperCase()}
                </span>
              </div>
              <h2 className="font-serif text-xl text-foreground md:text-2xl">
                {t.title}
              </h2>
              <p className="text-sm leading-relaxed text-foreground/70">
                {t.desc}
              </p>
              <div className="mt-auto">
                {t.enabled ? (
                  <span className="text-xs tracking-wider text-primary/80">
                    开始 ›
                  </span>
                ) : (
                  <span className="text-xs tracking-wider text-foreground/40">
                    敬请期待
                  </span>
                )}
              </div>
            </div>
          );

          return t.enabled ? (
            <Link key={t.href} href={t.href} className="block">
              {Card}
            </Link>
          ) : (
            <div key={t.href} className="block cursor-not-allowed">
              {Card}
            </div>
          );
        })}
      </section>
    </div>
  );
}
