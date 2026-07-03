/**
 * 牧心堂 · 吉祥馆 · 请奉登记 API
 *
 * POST   /api/auspicious/order              — 提交新请奉
 * PATCH  /api/auspicious/order?id=xxx       — 阿阇梨更新状态（仅 role='acharya'/'admin'）
 * GET    /api/auspicious/order              — 健康检查
 *
 * POST body:
 *   {
 *     product_type: 'scroll' | 'bracelet' | 'sachet',
 *     recipient: string,
 *     address: string,
 *     blessing_message?: string,
 *   }
 *
 * PATCH body:
 *   { status: 'pending' | 'blessing' | 'blessed' | 'shipped' | 'completed' | 'cancelled' }
 *
 * 数据流：
 *   1. POST 提交 → 写库 / mock
 *   2. PATCH 更新 → 鉴权角色 → 改 status
 *
 * 表结构（见 src/lib/supabase-migrations-auspicious.sql）：
 *   id (uuid), user_id (text), product_type (text), recipient (text),
 *   address (text), blessing_message (text), status (text), created_at (timestamptz)
 *
 * status 流转：
 *   pending → blessing（阿阇梨开始加持）
 *   blessing → blessed（开光完成）
 *   blessed  → shipped（已寄出）
 *   shipped  → completed（已结缘）
 *   任意态 → cancelled（取消）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getAuthClient } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProductType = 'scroll' | 'bracelet' | 'sachet';

const VALID_PRODUCTS: ProductType[] = ['scroll', 'bracelet', 'sachet'];

type OrderStatus =
  | 'pending'
  | 'blessing'
  | 'blessed'
  | 'shipped'
  | 'completed'
  | 'cancelled';

const VALID_STATUSES: OrderStatus[] = [
  'pending',
  'blessing',
  'blessed',
  'shipped',
  'completed',
  'cancelled',
];

export async function POST(req: NextRequest) {
  let body: {
    product_type?: unknown;
    recipient?: unknown;
    address?: unknown;
    blessing_message?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须为 JSON' }, { status: 400 });
  }

  // 字段校验
  const productType = body.product_type as ProductType;
  if (!VALID_PRODUCTS.includes(productType)) {
    return NextResponse.json({ error: '请奉品类无效' }, { status: 400 });
  }
  const recipient = typeof body.recipient === 'string' ? body.recipient.trim() : '';
  if (!recipient || recipient.length > 30) {
    return NextResponse.json({ error: '收件人姓名无效（1-30 字）' }, { status: 400 });
  }
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (!address || address.length > 200) {
    return NextResponse.json({ error: '收件地址无效（1-200 字）' }, { status: 400 });
  }
  const blessingMessage =
    typeof body.blessing_message === 'string' ? body.blessing_message.trim().slice(0, 300) : '';

  // 读取当前登录用户（未登录允许提交，user_id = null）
  let userId: string | null = null;
  try {
    const authClient = await getAuthClient();
    if (authClient) {
      const { data: userData } = await authClient.auth.getUser();
      if (userData?.user) userId = userData.user.id;
    }
  } catch {
    /* 未登录静默 */
  }

  // Supabase 未配置 → mock 成功
  if (!isSupabaseConfigured()) {
    console.log('[api/auspicious/order] mock mode: order recorded (not persisted)');
    return NextResponse.json({
      ok: true,
      id: `mock_${Date.now()}`,
      mock: true,
    });
  }

  // 写入 Supabase
  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('auspicious_orders')
      .insert({
        user_id: userId,
        product_type: productType,
        recipient,
        address,
        blessing_message: blessingMessage,
        status: 'pending',
      } as never)
      .select('id')
      .single();

    if (error) {
      console.error('[api/auspicious/order] insert failed:', error);
      return NextResponse.json({ error: '登记失败，请稍后重试' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (e) {
    console.error('[api/auspicious/order] unexpected:', e);
    return NextResponse.json({ error: '服务异常，请稍后重试' }, { status: 500 });
  }
}

/* ============ PATCH · 阿阇梨更新状态 ============ */
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少订单 id' }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须为 JSON' }, { status: 400 });
  }

  const status = body.status as OrderStatus;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: '订单状态无效' }, { status: 400 });
  }

  // 角色校验：仅 acharya / admin 可更新
  let userRole = 'reader';
  try {
    const authClient = await getAuthClient();
    if (authClient) {
      const { data: userData } = await authClient.auth.getUser();
      if (userData?.user) {
         
        const { data: profile } = await (authClient.from('user_profiles') as any)
          .select('role')
          .eq('id', userData.user.id)
          .maybeSingle();
         
        userRole = (profile as any)?.role ?? 'reader';
      }
    }
  } catch {
    /* 静默 */
  }

  if (userRole !== 'acharya' && userRole !== 'admin') {
    return NextResponse.json(
      { error: '仅阿阇梨可更新订单状态' },
      { status: 403 },
    );
  }

  // Supabase 未配置 → mock 成功（不真正写库，前端体验正常）
  if (!isSupabaseConfigured()) {
    console.log(
      `[api/auspicious/order] mock mode: order ${id} status → ${status}`,
    );
    return NextResponse.json({ ok: true, id, status, mock: true });
  }

  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('auspicious_orders')
      .update({ status, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/auspicious/order] update failed:', error);
      return NextResponse.json({ error: '更新失败，请稍后重试' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order: data });
  } catch (e) {
    console.error('[api/auspicious/order] update unexpected:', e);
    return NextResponse.json({ error: '服务异常' }, { status: 500 });
  }
}

/* ============ 健康检查 ============ */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'auspicious-order',
    supabase: isSupabaseConfigured(),
    timestamp: new Date().toISOString(),
  });
}
