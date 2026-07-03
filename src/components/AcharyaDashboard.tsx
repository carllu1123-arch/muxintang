'use client';

/**
 * 牧心堂 · 阿阇梨批阅桌（交互主体）
 *
 * 两个核心模块：
 *   1. 吉祥馆请奉订单
 *      - 黑金列表展示 pending 订单
 *      - 下拉切换 status：pending → blessing（加持中）→ blessed → shipped → completed
 *      - PATCH /api/auspicious/order
 *   2. 行者故事未精选评论
 *      - 列表展示 is_featured=false 的评论
 *      - ⭐ 设为精选按钮 → PATCH /api/library/comment { is_featured: true }
 *
 * 极简设计：直接沿用全局黑金磨砂卡片，无额外装饰。
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  type AcharyaOrder,
  type AcharyaComment,
} from '@/lib/acharya-data';
import { AcharyaStats } from '@/components/AcharyaStats';

type OrderStatus = AcharyaOrder['status'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待处理',
  blessing: '加持中',
  blessed: '已开光',
  shipped: '已寄出',
  completed: '已结缘',
  cancelled: '已取消',
};

const STATUS_NEXT: Array<{ value: OrderStatus; label: string }> = [
  { value: 'blessing', label: '加持中' },
  { value: 'blessed', label: '已开光' },
  { value: 'shipped', label: '已寄出' },
  { value: 'completed', label: '已结缘' },
  { value: 'cancelled', label: '取消' },
];

const PRODUCT_LABEL: Record<AcharyaOrder['productType'], string> = {
  scroll: '手书经卷',
  bracelet: '菩提念珠',
  sachet: '祈福香囊',
};

const PRODUCT_GLYPH: Record<AcharyaOrder['productType'], string> = {
  scroll: '❡',
  bracelet: '◉',
  sachet: '✿',
};

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export interface AcharyaDashboardProps {
  displayName: string;
  role: 'acharya' | 'admin';
  initialOrders: AcharyaOrder[];
  initialComments: AcharyaComment[];
}

export function AcharyaDashboard({
  displayName,
  role,
  initialOrders,
  initialComments,
}: AcharyaDashboardProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* 问候条 */}
      <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-sm text-foreground/80">
          {displayName} 阿阇梨 · 当前角色
          <span className="ml-2 inline-block rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
            {role === 'admin' ? '管理员' : '阿阇梨'}
          </span>
        </p>
        <p className="text-xs text-foreground/50">
          待处理请奉 <span className="text-primary">{initialOrders.length}</span> · 待精选
          <span className="ml-1 text-primary">{initialComments.length}</span>
        </p>
      </div>

      {/* 模块 1：吉祥馆请奉订单 */}
      <OrdersModule initialOrders={initialOrders} />

      {/* 模块 2：行者故事未精选评论 */}
      <CommentsModule initialComments={initialComments} />

      {/* 模块 3：运营数据看板（埋点聚合） */}
      <AcharyaStats />
    </div>
  );
}

/* ============ 模块 1：请奉订单 ============ */

function OrdersModule({ initialOrders }: { initialOrders: AcharyaOrder[] }) {
  const [orders, setOrders] = useState<AcharyaOrder[]>(initialOrders);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const updateStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      if (busy[orderId]) return;
      setBusy((b) => ({ ...b, [orderId]: true }));
      try {
        const res = await fetch(`/api/auspicious/order?id=${orderId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          showToast(`更新失败：${data.error ?? res.statusText}`);
          return;
        }
        showToast(`已更新为「${STATUS_LABELS[status]}」`);
        // 移出 pending 列表（其它态不显示在批阅桌）
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } catch (e) {
        showToast(`网络错误：${(e as Error).message}`);
      } finally {
        setBusy((b) => ({ ...b, [orderId]: false }));
      }
    },
    [busy, showToast],
  );

  return (
    <section
      aria-label="吉祥馆请奉订单"
      className="rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-md md:p-6"
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-foreground/40">
            AUSPICIOUS · ORDERS
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground md:text-2xl">
            待处理请奉
          </h2>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs text-primary">
          {orders.length} 单
        </span>
      </header>

      {toast && (
        <p
          role="status"
          className="mb-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary"
        >
          {toast}
        </p>
      )}

      {orders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-foreground/15 bg-black/40 px-4 py-8 text-center text-sm text-foreground/55">
          ✦ 当前没有待处理的请奉
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              isBusy={!!busy[o.id]}
              onUpdate={(s) => updateStatus(o.id, s)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderRow({
  order,
  isBusy,
  onUpdate,
}: {
  order: AcharyaOrder;
  isBusy: boolean;
  onUpdate: (s: OrderStatus) => void;
}) {
  const [target, setTarget] = useState<OrderStatus>('blessing');

  return (
    <li className="rounded-xl border border-foreground/15 bg-black/40 p-4 transition hover:border-primary/30">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        {/* 图标 + 品类 */}
        <div className="flex items-center gap-3 md:flex-col md:items-center md:gap-1 md:pr-2">
          <span
            aria-hidden
            className="grid h-10 w-10 place-items-center rounded-full border border-primary/30 bg-primary/10 font-serif text-lg text-primary"
          >
            {PRODUCT_GLYPH[order.productType]}
          </span>
          <p className="text-xs text-foreground/65">{PRODUCT_LABEL[order.productType]}</p>
        </div>

        {/* 信息 */}
        <div className="flex-1">
          <p className="text-sm text-foreground">
            <span className="text-foreground/55">收件：</span>
            <span className="font-serif">{order.recipient}</span>
            <span className="ml-2 text-[10px] text-foreground/40">
              {timeAgo(order.createdAt)}
            </span>
          </p>
          {order.blessingMessage && (
            <p className="mt-1 line-clamp-2 rounded-md border-l-2 border-primary/40 bg-primary/5 px-3 py-1.5 text-[12px] italic text-foreground/80">
              &ldquo;{order.blessingMessage}&rdquo;
            </p>
          )}
        </div>

        {/* 状态切换 */}
        <div className="flex items-center gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as OrderStatus)}
            disabled={isBusy}
            className="rounded-lg border border-foreground/20 bg-black/60 px-3 py-1.5 text-xs text-foreground
                       focus:border-primary/50 focus:outline-none disabled:opacity-50"
          >
            {STATUS_NEXT.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onUpdate(target)}
            disabled={isBusy}
            className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs
                       text-primary transition hover:bg-primary hover:text-background
                       disabled:opacity-50"
          >
            {isBusy ? '处理中…' : '更新状态'}
          </button>
        </div>
      </div>
    </li>
  );
}

/* ============ 模块 2：未精选评论 ============ */

function CommentsModule({
  initialComments,
}: {
  initialComments: AcharyaComment[];
}) {
  const [comments, setComments] = useState<AcharyaComment[]>(initialComments);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const feature = useCallback(
    async (commentId: string) => {
      if (busy[commentId]) return;
      setBusy((b) => ({ ...b, [commentId]: true }));
      try {
        const res = await fetch(`/api/library/comment?id=${commentId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ is_featured: true }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          showToast(`精选失败：${data.error ?? res.statusText}`);
          return;
        }
        showToast('已置顶精选');
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch (e) {
        showToast(`网络错误：${(e as Error).message}`);
      } finally {
        setBusy((b) => ({ ...b, [commentId]: false }));
      }
    },
    [busy, showToast],
  );

  return (
    <section
      aria-label="未精选评论"
      className="rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-md md:p-6"
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-foreground/40">
            READER · VOICES
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground md:text-2xl">
            待精选留言
          </h2>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs text-primary">
          {comments.length} 条
        </span>
      </header>

      {toast && (
        <p
          role="status"
          className="mb-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary"
        >
          {toast}
        </p>
      )}

      {comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-foreground/15 bg-black/40 px-4 py-8 text-center text-sm text-foreground/55">
          ✦ 没有待精选的留言
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              isBusy={!!busy[c.id]}
              onFeature={() => feature(c.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentRow({
  comment,
  isBusy,
  onFeature,
}: {
  comment: AcharyaComment;
  isBusy: boolean;
  onFeature: () => void;
}) {
  const isAcharya = comment.authorRole === 'acharya' || comment.authorRole === 'admin';

  return (
    <li className="rounded-xl border border-foreground/15 bg-black/40 p-4 transition hover:border-primary/30">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/65">
            <span
              className={
                isAcharya
                  ? 'rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-accent'
                  : 'text-foreground/75'
              }
            >
              {comment.authorName}
              {isAcharya && '（阿阇梨）'}
            </span>
            <span className="text-foreground/35">·</span>
            <Link
              href={`/library/${comment.chapterSlug}`}
              className="text-primary/80 transition hover:text-primary"
            >
              {comment.chapterSlug}
            </Link>
            <span className="text-foreground/35">·</span>
            <span>{timeAgo(comment.createdAt)}</span>
          </div>

          {comment.readingTag && (
            <p className="mt-1 text-[10px] tracking-wider text-foreground/45">
              {comment.readingTag}
            </p>
          )}

          <p className="mt-2 line-clamp-3 text-sm text-foreground/85">
            {comment.body}
          </p>
        </div>

        <button
          type="button"
          onClick={onFeature}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10
                     px-3 py-1.5 text-xs text-primary transition
                     hover:bg-primary hover:text-background disabled:opacity-50
                     md:self-start"
        >
          <span aria-hidden>⭐</span>
          {isBusy ? '处理中…' : '设为精选'}
        </button>
      </div>
    </li>
  );
}
