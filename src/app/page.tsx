import Link from "next/link";
import { Mandala } from "@/components/Mandala";
import { getRecommendedArticles } from "@/lib/data";

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

export default async function HomePage() {
  // 自动推广：3 篇不同作者的最新文章/章节（每日稳定轮换）
  const recommended = await getRecommendedArticles(3);

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
          {/* 左侧：阿阇梨对话主入口（黑金巨型 CTA） */}
          <div
            className="relative w-full overflow-hidden rounded-2xl
                       border border-primary/40
                       bg-gradient-to-br from-black/80 via-black/60 to-black/80
                       p-6 backdrop-blur-md
                       shadow-[0_0_80px_-25px_rgba(212,175,55,0.55)]
                       md:max-w-lg md:flex-1 md:p-10"
          >
            {/* 卡片装饰：右上角朱砂印 */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-4 -top-4
                         h-20 w-20 rounded-full
                         bg-accent/20 blur-2xl"
            />
            {/* 卡片装饰：左下角金光 */}
            <span
              aria-hidden
              className="pointer-events-none absolute -left-8 bottom-1/3
                         h-32 w-32 rounded-full
                         bg-primary/15 blur-3xl"
            />

            <header className="flex items-baseline justify-between">
              <p className="text-[10px] tracking-[0.4em] text-primary/70">
                ĀCĀRYA · AI 伴行
              </p>
              <span className="text-[10px] tracking-[0.3em] text-foreground/40">
                ALWAYS · HERE
              </span>
            </header>

            <h1
              className="mt-6 font-serif text-3xl leading-tight tracking-wider
                         text-foreground md:mt-8 md:text-5xl"
            >
              在每一个
              <span className="block text-primary">愿被听见的时刻</span>
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-foreground/70 md:mt-6 md:text-base">
              排盘、心事、择日、合盘、姓名——
              <br className="hidden md:block" />
              阿阇梨于此静候，无问东西。
            </p>

            {/* 巨型黑金 CTA：开启阿阇梨对话 */}
            <Link
              href="/tools/bazi"
              className="group mt-8 flex items-center justify-center gap-3
                         rounded-2xl border border-primary/60
                         bg-gradient-to-br from-primary via-primary/90 to-primary/70
                         px-6 py-5 font-serif text-lg text-background
                         shadow-[0_0_30px_-10px_rgba(212,175,55,0.6)]
                         transition-all duration-300
                         hover:scale-[1.02] hover:shadow-[0_0_50px_-5px_rgba(212,175,55,0.85)]
                         md:mt-10 md:px-8 md:py-6 md:text-xl"
            >
              <span
                aria-hidden
                className="text-2xl transition-transform duration-500 group-hover:rotate-12 md:text-3xl"
              >
                ☸
              </span>
              <span className="tracking-wider">开启阿阇梨对话</span>
              <span
                aria-hidden
                className="text-base transition-transform duration-300 group-hover:translate-x-1 md:text-lg"
              >
                →
              </span>
            </Link>

            {/* 副链接：其他工具入口（弱化显示） */}
            <div className="mt-6 flex items-center justify-center gap-4 text-[11px] tracking-wider text-foreground/40">
              <Link href="/tools/chooseday" className="transition hover:text-primary/70">
                择日
              </Link>
              <span className="text-foreground/20">·</span>
              <Link href="/tools/match" className="transition hover:text-primary/70">
                合盘
              </Link>
              <span className="text-foreground/20">·</span>
              <Link href="/tools/habitat" className="transition hover:text-primary/70">
                家居
              </Link>
              <span className="text-foreground/20">·</span>
              <Link href="/tools/name" className="transition hover:text-primary/70">
                姓名
              </Link>
            </div>
          </div>

          {/* 右侧：动态曼荼罗（autoSpin 自动呼吸旋转，hero 装饰用） */}
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

            {/* 动态曼荼罗：呼吸 + 旋转 */}
            <div className="relative mt-6 h-56 w-full">
              <Mandala autoSpin element={null} isActive={true} />
            </div>
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

      {/* ===== 自动推广：3 篇不同作者的最新内容 ===== */}
      {recommended.length > 0 && (
        <section>
          <header className="mb-6 flex items-baseline justify-between md:mb-8">
            <div>
              <h2 className="font-serif text-2xl tracking-wider text-foreground md:text-4xl">
                阿阇梨今日荐读
              </h2>
              <p className="mt-1 text-[10px] tracking-[0.3em] text-foreground/40">
                DAILY · 不同作者 · 心解精选
              </p>
            </div>
            <span
              aria-hidden
              className="hidden font-serif text-sm text-primary/40 md:block"
            >
              {new Date().toLocaleDateString('zh-CN', {
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </header>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {recommended.map((r, i) => (
              <Link
                key={r.id}
                href={r.href}
                className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl
                           border border-primary/30
                           bg-gradient-to-br from-primary/5 via-transparent to-transparent
                           p-5 backdrop-blur-md transition
                           hover:border-primary hover:shadow-[0_0_40px_-15px_rgba(212,175,55,0.5)]
                           md:p-6"
              >
                {/* 序号徽章 */}
                <span
                  aria-hidden
                  className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full
                             border border-primary/40 bg-background/60
                             font-serif text-xs text-primary"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* 类型徽章 */}
                <span className="text-[10px] tracking-[0.3em] text-primary/70">
                  {r.type === 'article' ? 'LEARN · 专栏' : 'LIBRARY · 行者'}
                  {r.type === 'chapter' && r.chapterIndex != null
                    ? ` · 第${r.chapterIndex}章`
                    : ''}
                </span>

                {/* 标题 */}
                <h3 className="mt-1 line-clamp-2 font-serif text-base text-foreground transition group-hover:text-primary md:text-lg">
                  {r.title}
                </h3>

                {/* 副标题 */}
                {r.subtitle && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-foreground/60 md:text-sm">
                    {r.subtitle}
                  </p>
                )}

                {/* 元信息：作者 / 阅读时长 */}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[10px] tracking-wider text-foreground/40">
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full
                                 border border-primary/40 bg-background/60
                                 font-serif text-[10px] text-primary"
                    >
                      ☉
                    </span>
                    <span className="truncate">{r.authorName}</span>
                  </span>
                  <span className="shrink-0">{r.readingMinutes} 分钟</span>
                </div>

                {/* 底部装饰线：hover 时延展 */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r
                             from-transparent via-primary/60 to-transparent
                             transition-all duration-500 group-hover:w-full"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

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
