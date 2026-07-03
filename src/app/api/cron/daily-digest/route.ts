/**
 * 牧心堂 · 每日晨音推送（Vercel Cron）
 *
 * 路由：GET /api/cron/daily-digest
 * 调用方：Vercel Cron Jobs（每日 22:00 UTC = 次日北京时间 06:00）
 *
 * 鉴权（生产环境）：
 *   - 必须携带 Authorization: Bearer <CRON_SECRET>
 *   - CRON_SECRET 未配置时 → 任何调用都放行（仅 dev 模式，部署时必设）
 *
 * 流程：
 *   1. 校验 cron secret
 *   2. 查询 Supabase：tier IN ('monthly', 'yearly') AND tier_expires_at > now()
 *      （带 auth.users 嵌入，取 email + display_name）
 *   3. 拉当日金句
 *   4. 逐封渲染 + 发送
 *   5. 返回 { sent, failed, mode, total, sample }
 *
 * 失败策略：
 *   - 任何一封失败都 log，但不中断后续发送
 *   - 整体响应 200（让 Vercel Cron 不重复触发）
 *
 * 性能：
 *   - maxDuration: 60s（Vercel Hobby 默认 10s，Pro 默认 60s）
 *   - 群发建议控制在 200 封以内（Hobby 单次限制），更大请分批
 *
 * 配置：
 *   vercel.json: { "crons": [{ "path": "/api/cron/daily-digest", "schedule": "0 22 * * *" }] }
 *   env: SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM / CRON_SECRET
 *
 * 时区注意：Vercel Cron 走 UTC。"0 22 * * *" = UTC 22:00 = 北京时间次日 06:00。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getDailyQuote } from '@/lib/daily-quote';
import { renderDailyDigest, sendEmail, isEmailMockMode } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface DigestUser {
  email: string;
  displayName: string;
}

interface DigestResult {
  sent: number;
  failed: number;
  mode: 'mock' | 'smtp';
  total: number;
  sample?: { to: string; subject: string };
  error?: string;
  skipped?: string;
}

/** 校验 Vercel Cron 鉴权头（CRON_SECRET 配了才校验） */
function checkCronAuth(req: NextRequest): { ok: boolean; reason?: string } {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // dev 模式：未配置 CRON_SECRET → 放行
    return { ok: true };
  }
  const got = req.headers.get('authorization');
  if (got === `Bearer ${expected}`) return { ok: true };
  return { ok: false, reason: 'invalid cron secret' };
}

/**
 * 取活跃付费会员名单（monthly + yearly，未过期）
 *
 * 用两步查询避免 N+1：
 *   1. user_profiles 查 (id, display_name, tier, tier_expires_at)
 *   2. auth.admin.listUsers 一次拉所有 email
 *   3. 在内存里按 id 拼装
 */
async function fetchDigestUsers(): Promise<DigestUser[]> {
  const sb = createClient();

  // Step 1: 拉会员列表
   
  const { data: profiles, error: pErr } = await (sb.from('user_profiles') as any)
    .select('id, display_name, tier, tier_expires_at')
    .in('tier', ['monthly', 'yearly'])
    .gt('tier_expires_at', new Date().toISOString())
    .limit(200);

  if (pErr) throw new Error(`query profiles failed: ${pErr.message}`);
  const list = (profiles ?? []) as Array<{
    id: string;
    display_name: string | null;
  }>;
  if (list.length === 0) return [];

  // Step 2: 通过 admin API 批量拉邮箱
  // 一次最多 50 个，分页拉
  const emailMap = new Map<string, string>();
  try {
    let page = 1;
    const perPage = 50;
     
    const admin: any = sb.auth.admin;
    while (true) {
       
      const { data, error } = await admin.listUsers({ page, perPage });
      if (error) {
        console.warn('[cron/daily-digest] listUsers error:', error.message);
        break;
      }
       
      const users = (data?.users ?? []) as any[];
      if (users.length === 0) break;
      for (const u of users) {
        if (u?.id && u?.email) emailMap.set(u.id, u.email);
      }
      if (users.length < perPage) break;
      page += 1;
      if (page > 20) break; // 硬上限：1000 用户
    }
  } catch (e) {
    console.warn(
      '[cron/daily-digest] admin.listUsers failed (need service_role key?):',
      e,
    );
    return [];
  }

  // Step 3: 拼装
  const out: DigestUser[] = [];
  for (const p of list) {
    const email = emailMap.get(p.id);
    if (!email) continue;
    out.push({
      email,
      displayName: p.display_name || email.split('@')[0] || '道友',
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  // 1) 鉴权
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason ?? 'unauthorized' },
      { status: 401 },
    );
  }

  // 2) Supabase 检查
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      sent: 0,
      failed: 0,
      mode: isEmailMockMode() ? 'mock' : 'smtp',
      total: 0,
      skipped: 'supabase unconfigured',
    } satisfies DigestResult);
  }

  // 3) 拉会员名单
  let users: DigestUser[] = [];
  try {
    users = await fetchDigestUsers();
  } catch (e) {
    console.error('[cron/daily-digest] fetchDigestUsers failed:', e);
    return NextResponse.json({
      sent: 0,
      failed: 0,
      mode: isEmailMockMode() ? 'mock' : 'smtp',
      total: 0,
      error: (e as Error).message,
    } satisfies DigestResult);
  }

  if (users.length === 0) {
    return NextResponse.json({
      sent: 0,
      failed: 0,
      mode: isEmailMockMode() ? 'mock' : 'smtp',
      total: 0,
      skipped: 'no active members',
    } satisfies DigestResult);
  }

  // 4) 取当日金句
  const quote = getDailyQuote(new Date());
  const sentDate = new Date();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muxintang.com';
  const ctaHref = `${siteUrl}/me`;
  const ctaLabel = '今日闻法 →';

  // 5) 逐封发送
  let sent = 0;
  let failed = 0;
  let sample: { to: string; subject: string } | undefined;

  for (const u of users) {
    const env = renderDailyDigest({
      displayName: u.displayName,
      quote,
      sentDate,
      ctaHref,
      ctaLabel,
    });
    env.to = u.email;
    const result = await sendEmail(env);
    if (result.ok) {
      sent += 1;
      if (!sample) sample = { to: u.email, subject: env.subject };
    } else {
      failed += 1;
      console.warn(
        `[cron/daily-digest] send failed to ${u.email}:`,
        result.error,
      );
    }
  }

  const body: DigestResult = {
    sent,
    failed,
    mode: isEmailMockMode() ? 'mock' : 'smtp',
    total: users.length,
    sample,
  };
  console.log(
    `[cron/daily-digest] complete: sent=${sent} failed=${failed} total=${users.length} mode=${body.mode}`,
  );
  return NextResponse.json(body);
}
