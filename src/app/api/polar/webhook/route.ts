/**
 * 牧心堂 · Polar 支付 Webhook
 *
 * POST /api/polar/webhook
 *
 * 工作流：
 *   1. 读取 raw body（必须按原文做签名校验）
 *   2. HMAC-SHA256 验签
 *   3. 解析事件 → 落库到 user_subscriptions / user_profiles
 *   4. 返回 200 OK
 *
 * 重要：
 *   - 验签失败必须返回 401，绝不更新 DB
 *   - raw body 必须在转换前先缓存到变量
 *   - 重复事件通过 polar_id 去重
 *
 * Polar 文档：https://docs.polar.sh/api-reference/webhooks/endpoint
 */

import { NextRequest } from 'next/server';
import {
  verifyPolarSignature,
  isPolarConfigured,
  isSubOrOrderEvent,
  extractUserId,
  tierFromProductId,
  type PolarEvent,
  type PolarSubscription,
  type PolarOrder,
} from '@/lib/polar';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Polar 重试机制：必须 5xx 或超时才算失败
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1) 拿 raw body
  const rawBody = await req.text();
  const sigHeader = req.headers.get('polar-signature');

  // 2) 验签
  if (!isPolarConfigured()) {
    console.warn('[webhook/polar] POLAR_WEBHOOK_SECRET 未配置，拒绝请求');
    return Response.json({ ok: false, error: 'webhook 未启用' }, { status: 503 });
  }
  const verify = verifyPolarSignature(rawBody, sigHeader);
  if (!verify.ok) {
    console.warn('[webhook/polar] 签名校验失败:', verify.reason);
    return Response.json({ ok: false, error: verify.reason }, { status: 401 });
  }

  // 3) 解析事件
  let event: PolarEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ ok: false, error: 'JSON 解析失败' }, { status: 400 });
  }
  if (!event?.type) {
    return Response.json({ ok: false, error: '事件缺少 type 字段' }, { status: 400 });
  }

  console.log(`[webhook/polar] received event: ${event.type}`);

  // 4) 分发处理
  try {
    if (isSubOrOrderEvent(event.type)) {
      await handleSubOrOrder(event);
    } else {
      // 其他事件：暂不处理，仅记录
      console.log(`[webhook/polar] unhandled event type: ${event.type}`);
    }
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('[webhook/polar] handler error:', e);
    // 返回 5xx 让 Polar 重试
    return Response.json(
      { ok: false, error: e?.message || 'handler error' },
      { status: 500 },
    );
  }
}

/* ============ 事件分发 ============ */

async function handleSubOrOrder(event: PolarEvent) {
  if (!isSupabaseConfigured()) {
    console.warn('[webhook/polar] Supabase 未配置，跳过落库');
    return;
  }
  const sb = createServerClient();

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated':
      await handleSubscription(sb, event.data as PolarSubscription);
      break;
    case 'subscription.canceled':
    case 'subscription.revoked':
      await handleSubscriptionCanceled(sb, event.data as PolarSubscription);
      break;
    case 'order.paid':
    case 'order.created':
      await handleOrder(sb, event.data as PolarOrder, event.type);
      break;
    default:
      console.log(`[webhook/polar] ignore ${event.type}`);
  }
}

/* ============ 订阅处理 ============ */

async function handleSubscription(
  sb: ReturnType<typeof createServerClient>,
  sub: PolarSubscription,
) {
  const userId = sub.customer?.external_id || extractUserId({ type: '', data: sub });
  if (!userId) {
    console.warn('[webhook/polar] subscription 无 user_id，跳过');
    return;
  }

  const tier = tierFromProductId(sub.product_id) ?? 'monthly';
  const status = sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'past_due';
  const periodEnd = sub.current_period_end ?? null;

  // 1) upsert subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: subErr } = await (sb.from('user_subscriptions') as any)
    .upsert(
      {
        user_id: userId,
        polar_id: sub.id,
        polar_customer: sub.customer_id ?? null,
        polar_product: sub.product_id ?? null,
        tier,
        status,
        amount_cents: sub.amount ?? null,
        currency: sub.currency ?? 'CNY',
        started_at: sub.started_at ?? new Date().toISOString(),
        current_period_start: sub.current_period_start ?? new Date().toISOString(),
        current_period_end: periodEnd ?? new Date(Date.now() + 30 * 86400_000).toISOString(),
        canceled_at: sub.canceled_at ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'polar_id' },
    );
  if (subErr) {
    console.error('[webhook/polar] user_subscriptions upsert failed:', subErr);
    throw new Error(`user_subscriptions upsert: ${(subErr as any).message}`);
  }

  // 2) 同步更新 user_profiles.tier
  if (status === 'active') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profErr } = await (sb.from('user_profiles') as any)
      .update({
        tier,
        tier_expires_at: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (profErr) {
      console.error('[webhook/polar] user_profiles update failed:', profErr);
      throw new Error(`user_profiles update: ${(profErr as any).message}`);
    }
  }

  console.log(
    `[webhook/polar] subscription ${sub.id} → user ${userId}, tier=${tier}, status=${status}`,
  );
}

async function handleSubscriptionCanceled(
  sb: ReturnType<typeof createServerClient>,
  sub: PolarSubscription,
) {
  const userId = sub.customer?.external_id || extractUserId({ type: '', data: sub });
  if (!userId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: subErr } = await (sb.from('user_subscriptions') as any)
    .update({
      status: 'canceled',
      canceled_at: sub.canceled_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('polar_id', sub.id);
  if (subErr) {
    throw new Error(`user_subscriptions cancel: ${(subErr as any).message}`);
  }

  // 立刻把 profile 降回 free
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profErr } = await (sb.from('user_profiles') as any)
    .update({
      tier: 'free',
      tier_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (profErr) {
    throw new Error(`user_profiles downgrade: ${(profErr as any).message}`);
  }
  console.log(`[webhook/polar] subscription ${sub.id} canceled → user ${userId} → free`);
}

/* ============ 订单处理（一次性购买，如单本故事） ============ */

async function handleOrder(
  sb: ReturnType<typeof createServerClient>,
  order: PolarOrder,
  type: string,
) {
  const userId = order.customer?.external_id || extractUserId({ type: '', data: order });
  if (!userId) {
    console.log(`[webhook/polar] order ${order.id} 无 user_id（可能未登录购买，跳过）`);
    return;
  }

  // 订单已支付 → 给用户加 credits（积分）
  if (type === 'order.paid' && order.status === 'paid') {
    const credits = Math.floor((order.amount ?? 0) / 100); // 1 元 = 1 积分
    if (credits > 0) {
      const { error } = await sb.rpc('increment_credits', {
        p_user_id: userId,
        p_delta: credits,
      } as any);
      if (error) {
        // rpc 失败时回退到读 + 写
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cur } = await (sb.from('user_profiles') as any)
          .select('credits')
          .eq('id', userId)
          .maybeSingle();
        const newCredits = ((cur as any)?.credits ?? 0) + credits;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sb.from('user_profiles') as any)
          .update({ credits: newCredits, updated_at: new Date().toISOString() })
          .eq('id', userId);
      }
      console.log(`[webhook/polar] order ${order.id} paid → user ${userId} +${credits} 积分`);
    }
  }
}

/* ============ 健康检查 ============ */

export async function GET() {
  return Response.json({
    ok: true,
    service: 'polar-webhook',
    polar_configured: isPolarConfigured(),
    supabase_configured: isSupabaseConfigured(),
    timestamp: new Date().toISOString(),
  });
}
