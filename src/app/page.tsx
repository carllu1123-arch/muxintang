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
    href: "/tools/bazi",
    glyph: "☷",
  },
  {
    title: "家居环境",
    desc: "户型 · 调和人居与气场",
    href: "/tools/habitat",
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
 * 密解专栏
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
    // 区块间虚空感：移动 gap-12，PC 端 gap-20
    <div className="flex flex-col gap-12 pt-6 md:gap-20 md:pt-12">
      {/* ===== Hero 区（首屏 80vh，居中） ===== */}
      <section
        className="relative flex min-h-[80vh] flex-col justify-center
                   max-[389px]:scale-[0.9] max-[359px]:scale-[0.85]
                   max-[340px]:scale-[0.78] origin-top"
      >
        <div className="flex flex-col gap-8 md:flex-row md:gap-16 md:items-stretch">
          {/* 左侧：智测工具卡片（磨砂玻璃黑底 + 金边） */}
          <div
            className="relative w-full overflow-hidden rounded-2xl
                       border border-primary/30
                       bg-black/60 p-6 backdrop-blur-md
                       shadow-[0_0_60px_-30px_rgba(212,175,55,0.45)]
                       md:max-w-lg md:flex-1 md:p-8"
          >
            {/* 卡片装饰：右上角朱砂印 */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-4 -top-4
                         h-20 w-20 rounded-full
                         bg-accent/20 blur-2xl"
            />

            <header className="flex items-baseline justify-between">
              <h1
                className="font-serif text-3xl tracking-wider text-primary
                           md:text-5xl"
              >
                智测·生命代码
              </h1>
              <span className="text-[10px] tracking-[0.3em] text-foreground/40">
                WISDOM · TOOLS
              </span>
            </header>

            <p className="mt-3 text-sm text-foreground/70 md:mt-4 md:text-base">
              三分钟，看见自己的本然频率。
            </p>

            {/* 三个输入入口（移动端 flex-col，PC 端并排） */}
            <ul className="mt-6 flex flex-col gap-3 md:mt-8 md:flex-row md:gap-4">
              {TOOLS.map((t) => (
                <li key={t.href} className="md:flex-1">
                  <Link
                    href={t.href}
                    className="group flex h-full flex-col gap-2
                               rounded-xl border border-primary/25
                               bg-background/60 p-4 transition
                               hover:border-primary hover:bg-primary/5
                               md:p-5"
                  >
                    <span
                      aria-hidden
                      className="text-2xl text-primary/80 transition group-hover:text-primary md:text-3xl"
                    >
                      {t.glyph}
                    </span>
                    <span className="font-serif text-base text-foreground md:text-lg">
                      {t.title}
                    </span>
                    <span className="text-xs leading-relaxed text-foreground/60 md:text-sm">
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

          {/* 右侧：3D 曼荼罗占位（仅 PC 端，固定 400px 高度） */}
          <aside
            className="relative hidden h-[400px] overflow-hidden rounded-2xl
                       border border-primary/20
                       bg-gradient-to-br from-muted via-background to-muted
                       p-8 md:flex md:flex-1 md:flex-col md:justify-between"
          >
            <div>
              <p className="font-serif text-lg leading-relaxed text-primary/90 md:text-xl">
                「静坐，然后问自己：
                <br />
                我真的在过想要的生活吗？」
              </p>
              <p className="mt-3 text-xs tracking-wider text-foreground/50">
                —— 牧心堂 · 开篇偈
              </p>
            </div>

            {/* 装饰元素：同心圆 + 朱砂点（CSS-only 曼荼罗占位） */}
            <div className="relative mt-6 h-56 w-full">
              <div className="absolute inset-0 grid place-items-center">
                <div className="relative h-56 w-56">
                  <span className="absolute inset-0 animate-[spin_60s_linear_infinite] rounded-full border border-primary/20" />
                  <span className="absolute inset-3 animate-[spin_45s_linear_infinite_reverse] rounded-full border border-primary/30" />
                  <span className="absolute inset-7 animate-[spin_30s_linear_infinite] rounded-full border border-primary/40" />
                  <span className="absolute inset-12 rounded-full border border-primary/60" />
                  <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_20px_rgba(194,48,32,0.6)]" />
                  {/* 八个方位点 */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <span
                      key={deg}
                      aria-hidden
                      className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70"
                      style={{ transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-90px)` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[10px] tracking-[0.3em] text-foreground/30">
              TAIZŌKAI · MANDALA · PLACEHOLDER
            </p>
          </aside>
        </div>
      </section>

      {/* ===== 密解专栏 ===== */}
      <section>
        <header className="mb-6 flex items-baseline justify-between md:mb-8">
          <h2
            className="font-serif text-2xl tracking-wider text-foreground
                       md:text-4xl"
          >
            密解专栏
          </h2>
          <Link
            href="/learn"
            className="text-xs tracking-wider text-primary/80 transition hover:text-primary md:text-sm"
          >
            全部 ›
          </Link>
        </header>

        {/* 移动端 grid-cols-1，PC 端 md:grid-cols-2 lg:grid-cols-4；间距 4→6 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {COLUMNS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col gap-2 rounded-xl
                         border border-border bg-muted/50 p-5
                         transition hover:border-primary/60 hover:bg-muted
                         md:p-6"
            >
              <span className="text-[10px] tracking-[0.3em] text-primary/70">
                {c.sub.toUpperCase()}
              </span>
              <span className="font-serif text-lg text-foreground md:text-xl">
                {c.title}
              </span>
              <span className="text-xs leading-relaxed text-foreground/60 md:text-sm">
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

      {/* ===== 吉祥馆入口 ===== */}
      <section>
        <header className="mb-6 flex items-baseline justify-between md:mb-8">
          <h2
            className="font-serif text-2xl tracking-wider text-foreground
                       md:text-4xl"
          >
            吉祥馆
          </h2>
          <Link
            href="/auspicious"
            className="text-xs tracking-wider text-primary/80 transition hover:text-primary md:text-sm"
          >
            进入 ›
          </Link>
        </header>

        <Link
          href="/auspicious"
          className="group relative flex flex-col gap-3 overflow-hidden
                     rounded-2xl border border-primary/30
                     bg-gradient-to-br from-primary/10 via-transparent to-transparent
                     p-6 backdrop-blur-md transition
                     hover:border-primary hover:shadow-[0_0_60px_-25px_rgba(212,175,55,0.5)]
                     md:flex-row md:items-center md:gap-6 md:p-8"
        >
          {/* 装饰：右上角朱砂光晕 */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8
                       h-32 w-32 rounded-full bg-accent/20 blur-3xl"
          />
          <span
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full
                       border border-primary/40 bg-background/60
                       font-serif text-2xl text-primary md:h-16 md:w-16 md:text-3xl"
          >
            ☯
          </span>
          <div className="flex-1">
            <p className="text-[10px] tracking-[0.3em] text-primary/60">
              AUSPICIOUS · 结善缘 · 养心性
            </p>
            <h3 className="mt-1 font-serif text-lg text-foreground md:text-xl">
              数字壁纸 · 阿阇梨定制 · 法本流通
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-foreground/60 md:text-sm">
              AI 即时生成曼荼罗壁纸，阿阇梨定制请奉，经书免费结缘。
            </p>
          </div>
          <span
            aria-hidden
            className="text-foreground/30 transition group-hover:text-primary
                       md:self-end"
          >
            →
          </span>
        </Link>
      </section>
    </div>
  );
}
