import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '个人中心 · 牧心堂',
};

// 占位用户
const MOCK_USER = {
  name: '清和同修',
  email: 'qinghe@muxintang.local',
  level: '月度会员',
  expireDate: '2026-09-12',
  joinDate: '2025-12-01',
  stats: { articles: 23, journals: 142, likes: 856 },
};

const MOCK_ORDERS = [
  {
    id: 'M-2026-001',
    type: '月度会员',
    amount: 38,
    date: '2026-06-12',
    status: '已完成',
  },
  {
    id: 'M-2025-007',
    type: '文丛单本',
    amount: 18,
    date: '2025-12-28',
    status: '已完成',
  },
  {
    id: 'M-2025-002',
    type: '线下共修',
    amount: 88,
    date: '2025-12-01',
    status: '已完成',
  },
];

export default function MePage() {
  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader eyebrow="PROFILE" title="个人中心" />

      {/* 资料卡 */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-primary/30
                   bg-black/60 p-5 backdrop-blur-md md:flex-row md:items-center
                   md:gap-6 md:p-6"
      >
        <div
          className="grid h-16 w-16 place-items-center rounded-full
                     border border-primary/40 bg-background/60
                     font-serif text-2xl text-primary md:h-20 md:w-20"
        >
          清
        </div>
        <div className="flex-1">
          <h2 className="font-serif text-xl text-foreground md:text-2xl">
            {MOCK_USER.name}
          </h2>
          <p className="text-xs text-foreground/60 md:text-sm">
            {MOCK_USER.email}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs text-primary">
              {MOCK_USER.level}
            </span>
            <span className="text-xs text-foreground/50">
              到期：{MOCK_USER.expireDate}
            </span>
          </div>
        </div>
        <Link
          href="/pricing"
          className="rounded-lg border border-primary/40 px-4 py-2
                     text-sm text-primary transition
                     hover:bg-primary hover:text-background md:self-start"
        >
          续费 / 升级
        </Link>
      </section>

      {/* 数据统计 */}
      <section className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { l: '已读', v: MOCK_USER.stats.articles, u: '篇' },
          { l: '打卡', v: MOCK_USER.stats.journals, u: '天' },
          { l: '被赞', v: MOCK_USER.stats.likes, u: '次' },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-xl border border-border bg-muted/40 p-4 text-center"
          >
            <div className="font-serif text-2xl text-primary md:text-3xl">
              {s.v}
            </div>
            <div className="mt-1 text-xs text-foreground/60">
              {s.l}（{s.u}）
            </div>
          </div>
        ))}
      </section>

      {/* 订单记录 */}
      <section>
        <h3 className="mb-3 font-serif text-lg text-foreground md:mb-4 md:text-xl">
          订单记录
        </h3>
        <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
          <ul className="divide-y divide-border">
            {MOCK_ORDERS.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between p-3 md:p-4"
              >
                <div>
                  <p className="text-sm text-foreground md:text-base">
                    {o.type}
                  </p>
                  <p className="mt-0.5 text-[10px] text-foreground/50">
                    {o.id} · {o.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-base text-primary md:text-lg">
                    ¥{o.amount}
                  </p>
                  <p className="text-[10px] text-foreground/50">{o.status}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-xs text-foreground/40">
        · 资料、订单均为占位数据，待 Supabase 实装后接入真实账户 ·
      </p>
    </div>
  );
}
