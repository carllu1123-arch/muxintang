import Link from "next/link";

/**
 * 智测工具入口
 * - 生命代码：按出生年月日解读生命轨迹
 * - 家居环境：方位 + 户型 + 出生信息综合
 * - 姓名心解：汉字五行 + 音律场 + 字形结构
 */
const TOOLS = [
  {
    title: "生命代码",
    desc: "出生 · 看见你的本然频率",
    href: "/tools/lifecode",
    glyph: "☷",
  },
  {
    title: "家居环境",
    desc: "户型 · 调和人居与气场",
    href: "/tools/house",
    glyph: "◉",
  },
  {
    title: "姓名心解",
    desc: "汉字 · 听见名字的回声",
    href: "/tools/name",
    glyph: "✎",
  },
] as const;

/**
 * 四大学修专栏
 */
const COLUMNS = [
  {
    title: "生命格局",
    sub: "Lifecode",
    desc: "从八字到数字命理，识自己。",
    href: "/learn/lifecode",
  },
  {
    title: "家居环境",
    sub: "Habitat",
    desc: "风水堪舆与现代居住的和解。",
    href: "/learn/habitat",
  },
  {
    title: "姓名心解",
    sub: "Namenoma",
    desc: "一个字，便是一生的回向。",
    href: "/learn/name",
  },
  {
    title: "阿阇梨开示",
    sub: "Ācārya",
    desc: "根本上师的当机法语。",
    href: "/learn/teacher",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10 pt-6 md:pt-10">
      {/* ===== Hero 区 ===== */}
      <section className="flex flex-col gap-6 md:flex-row md:items-stretch">
        {/* 左侧：智测工具卡片（磨砂玻璃黑底 + 金边） */}
        <div
          className="relative overflow-hidden rounded-2xl
                     border border-primary/35
                     bg-muted/60 p-6 backdrop-blur-md
                     shadow-[0_0_60px_-30px_rgba(212,175,55,0.45)]
                     md:flex-1"
        >
          {/* 卡片装饰：右上角朱砂印 */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-4
                       h-20 w-20 rounded-full
                       bg-accent/15 blur-2xl"
          />

          <header className="flex items-baseline justify-between">
            <h1 className="font-serif text-2xl tracking-wider text-primary md:text-3xl">
              智测工具
            </h1>
            <span className="text-[10px] tracking-[0.3em] text-foreground/40">
              WISDOM · TOOLS
            </span>
          </header>

          <p className="mt-2 text-sm text-foreground/70">
            三分钟，看见自己的本然频率。
          </p>

          {/* 三个输入入口（移动端 flex-col，PC 端并排） */}
          <ul className="mt-6 flex flex-col gap-3 md:flex-row">
            {TOOLS.map((t) => (
              <li key={t.href} className="md:flex-1">
                <Link
                  href={t.href}
                  className="group flex h-full flex-col gap-2
                             rounded-xl border border-primary/25
                             bg-background/60 p-4 transition
                             hover:border-primary hover:bg-primary/5"
                >
                  <span
                    aria-hidden
                    className="text-2xl text-primary/80 transition group-hover:text-primary"
                  >
                    {t.glyph}
                  </span>
                  <span className="font-serif text-base text-foreground">
                    {t.title}
                  </span>
                  <span className="text-xs leading-relaxed text-foreground/60">
                    {t.desc}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-[11px] tracking-wider text-foreground/40">
            · 输入即生成，结果仅作修行参考 ·
          </p>
        </div>

        {/* 右侧：装饰性占位区（仅 PC 端） */}
        <aside
          className="relative hidden overflow-hidden rounded-2xl
                     border border-primary/20
                     bg-gradient-to-br from-muted via-background to-muted
                     p-8 md:flex md:w-96 md:flex-col md:justify-between"
        >
          <div>
            <p className="font-serif text-lg leading-relaxed text-primary/90">
              「静坐，然后问自己：
              <br />
              我真的在过想要的生活吗？」
            </p>
            <p className="mt-3 text-xs tracking-wider text-foreground/50">
              —— 牧心堂 · 开篇偈
            </p>
          </div>

          {/* 装饰元素：同心圆 + 朱砂点 */}
          <div className="relative mt-8 h-44 w-full">
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative h-44 w-44">
                <span className="absolute inset-0 rounded-full border border-primary/25" />
                <span className="absolute inset-4 rounded-full border border-primary/30" />
                <span className="absolute inset-10 rounded-full border border-primary/40" />
                <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* ===== 四大学修专栏 ===== */}
      <section>
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-xl tracking-wider text-foreground md:text-2xl">
            四大学修
          </h2>
          <Link
            href="/learn"
            className="text-xs tracking-wider text-primary/80 transition hover:text-primary"
          >
            全部 ›
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col gap-2 rounded-xl
                         border border-border bg-muted/50 p-5
                         transition hover:border-primary/60 hover:bg-muted"
            >
              <span className="text-[10px] tracking-[0.3em] text-primary/70">
                {c.sub.toUpperCase()}
              </span>
              <span className="font-serif text-lg text-foreground">
                {c.title}
              </span>
              <span className="text-xs leading-relaxed text-foreground/60">
                {c.desc}
              </span>
              <span
                aria-hidden
                className="mt-2 h-px w-0 bg-primary/60 transition-all group-hover:w-12"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
