/**
 * 牧心堂 · Polar 支付客户端（服务端专用）
 *
 * Polar 是国内/海外通用的 Stripe 替代品，支持人民币结算、Webhook 回调。
 * 文档：https://docs.polar.sh/api-reference
 *
 * 用途：
 *   1. 校验 webhook 签名（防伪造）
 *   2. 解析事件 → 落库到 subscriptions / profiles
 *
 * 环境变量：
 *   POLAR_WEBHOOK_SECRET   用于校验请求签名（HMAC-SHA256）
 *   POLAR_API_KEY          服务端 API key（查询订单详情用，可选）
 *   POLAR_ORGANIZATION_ID  Polar 组织 ID（用于校验 event 来源，可选）
 *
 * Polar 事件类型（只关心我们用得到的）：
 *   checkout.created       用户开始结账
 *   checkout.updated       结账状态变化
 *   order.created          订单生成（一次性购买）
 *   order.paid             订单已支付
 *   subscription.created   订阅创建
 *   subscription.updated   订阅变更
 *   subscription.canceled  订阅取消
 *   subscription.revoked   订阅作废（未付款/退款）
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const POLAR_API = 'https://api.polar.sh';

function getSecret(): string | undefined {
  return process.env.POLAR_WEBHOOK_SECRET;
}

function getApiKey(): string | undefined {
  return process.env.POLAR_API_KEY;
}

export function isPolarConfigured(): boolean {
  return Boolean(getSecret());
}

/* ============ 签名校验 ============ */

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

/**
 * 校验 Polar webhook 签名
 *  - 头：polar-signature: t=<unix_ts>,v1=<hex_sig>
 *  - 待签字符串：<unix_ts>.<rawBody>
 *  - 算法：HMAC-SHA256(secret)
 *
 * Polar 文档：https://docs.polar.sh/api-reference/webhooks/verify
 */
export function verifyPolarSignature(
  rawBody: string,
  header: string | null,
  secret = getSecret(),
  now = Math.floor(Date.now() / 1000),
): VerifyResult {
  if (!secret) return { ok: false, reason: 'POLAR_WEBHOOK_SECRET 未配置' };
  if (!header) return { ok: false, reason: '缺少 polar-signature 头' };

  const parts = header.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const ts = parts['t'];
  const sig = parts['v1'];
  if (!ts || !sig) return { ok: false, reason: '签名头格式错误' };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: '时间戳非法' };

  // 5 分钟时间窗（防重放）
  if (Math.abs(now - tsNum) > 300) {
    return { ok: false, reason: '签名时间戳超出允许范围' };
  }

  const expected = createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`)
    .digest('hex');

  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return { ok: false, reason: '签名长度不匹配' };
    return timingSafeEqual(a, b)
      ? { ok: true }
      : { ok: false, reason: '签名不匹配' };
  } catch {
    return { ok: false, reason: '签名解析失败' };
  }
}

/* ============ 事件类型定义（仅用到字段） ============ */

export interface PolarEvent {
  type: string;
  data: unknown;
  created_at?: string;
}

export interface PolarSubscription {
  id: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | string;
  customer_id?: string;
  product_id?: string;
  amount?: number;
  currency?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  started_at?: string;
  canceled_at?: string | null;
  customer?: { id: string; email?: string; external_id?: string };
  product?: { id: string; name?: string };
  metadata?: Record<string, string>;
}

export interface PolarOrder {
  id: string;
  status: 'pending' | 'paid' | 'refunded' | 'partially_refunded' | string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  customer_id?: string;
  product_id?: string;
  subscription_id?: string | null;
  customer?: { id: string; email?: string; external_id?: string };
  product?: { id: string; name?: string };
  metadata?: Record<string, string>;
}

/* ============ 事件分类工具 ============ */

/** 从事件中提取用户 ID（由 checkout 端在 metadata 传入） */
export function extractUserId(event: PolarEvent): string | null {
  // event.data 在外部被定义为 unknown，转一下
  const data = event.data as Record<string, any> | null | undefined;
  if (!data) return null;
  const meta = (data.metadata ?? {}) as Record<string, string>;
  return meta.user_id || meta.userId || data.customer?.external_id || null;
}

/** 从 product_id 反推 tier */
export function tierFromProductId(productId: string | undefined): 'monthly' | 'yearly' | 'lifetime' | null {
  if (!productId) return null;
  if (productId.includes('yearly') || productId.includes('year') || productId.includes('annual'))
    return 'yearly';
  if (productId.includes('lifetime') || productId.includes('forever')) return 'lifetime';
  if (productId.includes('monthly') || productId.includes('month')) return 'monthly';
  return null;
}

/** 事件是否属于"需要更新订阅状态"的一类 */
export function isSubOrOrderEvent(type: string): boolean {
  return (
    type.startsWith('subscription.') ||
    type === 'order.paid' ||
    type === 'order.created'
  );
}

/* ============ 服务端 API 查询（可选） ============ */

/** 用 API key 查询订单详情（兜底用，Polar webhook 推送的内容已经够用） */
export async function fetchPolarOrder(orderId: string): Promise<PolarOrder | null> {
  if (!getApiKey()) return null;
  try {
    const r = await fetch(`${POLAR_API}/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${getApiKey()}` },
    });
    if (!r.ok) return null;
    return (await r.json()) as PolarOrder;
  } catch {
    return null;
  }
}
