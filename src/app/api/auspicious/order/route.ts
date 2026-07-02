/**
 * 牧心堂 · 吉祥馆 · 请奉登记 API
 *
 * POST /api/auspicious/order
 *   body: {
 *     product_type: 'scroll' | 'bracelet' | 'sachet',
 *     recipient: string,
 *     address: string,
 *     blessing_message?: string,
 *   }
 *
 *   响应：{ ok: true, id: string } 或 { error: string }
 *
 * 数据流：
 *   1. 读取 Supabase Auth 拿 user_id（未登录可提交，user_id = null）
 *   2. 校验必填字段
 *   3. 写入 auspicious_orders 表（status: 'pending'）
 *   4. Supabase 未配置 → mock 成功（不真正写库，但前端体验正常）
 *
 * 表结构（见 src/lib/supabase-migrations-auspicious.sql）：
 *   id (uuid), user_id (text), product_type (text), recipient (text),
 *   address (text), blessing_message (text), status (text), created_at (timestamptz)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getAuthClient } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProductType = 'scroll' | 'bracelet' | 'sachet';

const VALID_PRODUCTS: ProductType[] = ['scroll', 'bracelet', 'sachet'];

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

/* ============ 健康检查 ============ */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'auspicious-order',
    supabase: isSupabaseConfigured(),
    timestamp: new Date().toISOString(),
  });
}
