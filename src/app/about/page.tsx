/**
 * 牧心堂 · 阿阇梨法脉介绍页 (/about)
 *
 * 信任基石页面：明确"我们是谁、为什么信任我们"
 *
 * 三区块（黑金磨砂卡片）：
 *   1. 法脉源流 — 从唐密祖师到李居明大师、再到大师姐的金色时间线
 *   2. 阿阇梨本怀 — 牧心堂初心与大师姐修行体感的短文
 *   3. 结缘指引 — 引导链接到 /tools/bazi
 *
 * 视觉：bg-gradient-to-b from-black to-primary/5，营造"踏入密宗坛城"的过渡感
 */

import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '法脉源 · 牧心堂',
  description: '唐密传承 · 李居明嫡传 — 从祖师到大师姐的法脉源流',
};

/* ============ 法脉源流数据 ============ */
const LINEAGE = [
  {
    era: '开元四年 · 716',
    name: '善无畏三藏',
    desc: '中天竺高僧，携梵策入唐，译《大日经》于长安。唐密胎藏界肇始。',
  },
  {
    era: '天宝二年 · 743',
    name: '金刚智三藏',
    desc: '南天竺密宗大师，传《金刚顶经》。与善无畏共开唐密"两部大法"。',
  },
  {
    era: '天宝至大历',
    name: '不空三藏',
    desc: '师承金刚智，灌顶六帝，译经百余部。唐密集大成者，与善无畏、金刚智并称"开元三大士"。',
  },
  {
    era: '大历至永贞',
    name: '惠果阿阇梨',
    desc: '青龙寺灌顶道场主，"两部秘教并受"。日僧空海为其嫡传，唐密法灯由此东渡。',
  },
  {
    era: '延历二十三年 · 804',
    name: '空海大师',
    desc: '入唐求法于青龙寺，归日本创真言宗（东密）。著《辨显密二教论》，立"即身成佛"义。',
  },
  {
    era: '千载潜传',
    name: '法灯不灭',
    desc: '会昌法难后，唐密于汉地铁流潜传；东密于日本法脉不绝，回照中土。',
  },
  {
    era: '当代',
    name: '李居明大师',
    desc: '融通显密，以密法应今机。开示"密法为现代生命解码之钥"，法脉回流中土。',
  },
  {
    era: '今',
    name: '寂光阿阇梨',
    desc: '牧心堂根本上师。承李居明大师法脉，以"修行即生活"为本怀，接引现代善信。',
  },
];

/* ============ 阿阇梨本怀文案 ============ */
const VOW_PARAGRAPHS = [
  '牧心堂非寺院，亦非学会。它是一处给现代人以心灵歇脚的所在。',
  '大师姐寂光阿阇梨出家三十余年，深知现代人不在深山，而在写字楼、地铁、失眠的夜里。她常说："修行不是离开生活，是更稳地走进生活。"',
  '唐密的智慧，不是让你变成另一个人，而是让你认出本来那个自己——那个在所有念头之下、所有情绪之后，从未动摇过的觉知。',
  '我们不卖命理，不贩焦虑。只愿以一脉相承的法，为你在喧闹中找一个轴心。',
];

export default function AboutPage() {
  return (
    <div
      className="flex flex-col gap-12 py-6 md:gap-20 md:py-12
                 bg-gradient-to-b from-black via-background to-primary/5"
    >
      <PageHeader
        eyebrow="ABOUT"
        title="阿阇梨法脉"
        subtitle="唐密传承 · 李居明嫡传"
      />

      {/* ============ 区块 1：法脉源流 ============ */}
      <section
        aria-label="法脉源流"
        className="rounded-2xl border border-primary/20
                   bg-gradient-to-br from-primary/5 via-transparent to-transparent
                   p-6 backdrop-blur-md md:p-10"
      >
        <header className="mb-6 md:mb-8">
          <p className="text-[10px] tracking-[0.3em] text-primary/60">
            LINEAGE · 法脉源流
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground md:text-3xl">
            从青龙寺到牧心堂
          </h2>
          <p className="mt-2 text-sm text-foreground/60 md:text-base">
            一脉相承，千载不灭 — 自唐密祖师至当代大师姐
          </p>
        </header>

        {/* 金色时间线 */}
        <ol className="relative border-l border-primary/30 pl-6 md:pl-10">
          {LINEAGE.map((node, i) => (
            <li key={i} className="relative mb-8 last:mb-0 md:mb-10">
              {/* 时间线圆点 */}
              <span
                className="absolute -left-[31px] top-1 grid h-4 w-4 place-items-center rounded-full
                           border border-primary/60 bg-background md:-left-[42px] md:h-5 md:w-5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary md:h-2 md:w-2" />
              </span>
              {/* 当前法脉节点高亮（最后一个 = 大师姐） */}
              {i === LINEAGE.length - 1 && (
                <span
                  className="absolute -left-[35px] top-0 h-6 w-6 animate-pulse rounded-full
                             border border-accent/50 bg-accent/10
                             md:-left-[48px] md:h-7 md:w-7"
                  aria-hidden
                />
              )}
              <p className="text-[10px] tracking-[0.2em] text-primary/60 md:text-xs">
                {node.era}
              </p>
              <h3
                className={`mt-1 font-serif text-lg md:text-xl ${
                  i === LINEAGE.length - 1
                    ? 'text-accent'
                    : 'text-foreground'
                }`}
              >
                {node.name}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/65 md:text-base">
                {node.desc}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ============ 区块 2：阿阇梨本怀 ============ */}
      <section
        aria-label="阿阇梨本怀"
        className="rounded-2xl border border-primary/20
                   bg-gradient-to-br from-primary/5 via-transparent to-transparent
                   p-6 backdrop-blur-md md:p-10"
      >
        <header className="mb-6 md:mb-8">
          <p className="text-[10px] tracking-[0.3em] text-primary/60">
            VOW · 阿阇梨本怀
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground md:text-3xl">
            牧心堂的初心
          </h2>
        </header>

        <div className="flex flex-col gap-4 md:gap-5">
          {VOW_PARAGRAPHS.map((p, i) => (
            <p
              key={i}
              className="text-sm leading-loose text-foreground/80 md:text-base md:leading-loose"
            >
              {p}
            </p>
          ))}
        </div>

        {/* 大师姐署名 */}
        <div className="mt-6 flex items-center gap-3 md:mt-8">
          <span
            aria-hidden
            className="grid h-10 w-10 place-items-center rounded-full
                       border border-accent/40 bg-background/60 font-serif text-accent"
          >
            ☀
          </span>
          <div>
            <p className="font-serif text-sm text-foreground">寂光阿阇梨</p>
            <p className="text-[10px] tracking-wider text-foreground/50">
              牧心堂根本上师 · 唐密东密传承
            </p>
          </div>
        </div>
      </section>

      {/* ============ 区块 3：结缘指引 ============ */}
      <section
        aria-label="结缘指引"
        className="relative overflow-hidden rounded-2xl
                   border border-accent/30
                   bg-gradient-to-br from-accent/10 via-primary/5 to-transparent
                   p-8 text-center backdrop-blur-md md:p-14"
      >
        {/* 背景坛城装饰 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #d4af37 0%, transparent 60%)',
          }}
        />
        <div className="relative">
          <p className="text-[10px] tracking-[0.4em] text-accent/80">
            INVITATION · 结缘指引
          </p>
          <p className="mx-auto mt-4 max-w-xl font-serif text-xl leading-relaxed text-foreground md:text-2xl md:leading-relaxed">
            若你在这世间有所困顿，
            <br />
            不如走入牧心堂，
            <br />
            <span className="text-accent">测一测你的本然频率</span>
          </p>
          <Link
            href="/tools/bazi"
            className="mt-6 inline-flex items-center gap-2 rounded-full
                       border border-accent bg-accent/10 px-6 py-3
                       font-serif text-sm text-accent transition
                       hover:bg-accent hover:text-background md:mt-8 md:text-base"
          >
            <span aria-hidden>☷</span>
            走入生命代码
            <span aria-hidden className="ml-1">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
