/**
 * 牧心堂 · 通用事件埋点 API（占位实现）
 *
 * POST /api/analytics/event
 *   Content-Type: application/json
 *   body: {
 *     event: string,               // 必填：事件名（snake_case）
 *     source?: string,             // 来源（页面 / 组件 / 工具）
 *     props?: Record<string, unknown>,  // 附加维度
 *     ts?: number                  // 客户端时间戳（默认 Date.now()）
 *   }
 *
 * 响应：200 { ok: true, event, receivedAt }
 *
 * 当前实现：
 *   - 仅 console.log 打印（便于本地开发 + Vercel log 查看）
 *   - 不做 PII 校验（前端应避免把 email/phone 等塞进来）
 *   - 不写数据库（避免污染 Supabase）
 *
 * 后续可平滑替换为：
 *   - PostHog:  fetch('https://app.posthog.com/capture/', ...)
 *   - Plausible: fetch(`https://plausible.io/api/event`, ...)
 *   - 自建表:   supabase.from('analytics_events').insert(...)
 *   - Vercel Analytics: 客户端直接调 window.va()
 *
 * 升级时只需修改 `track()` 函数体，前端调用零改动。
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TrackBody {
  event?: unknown;
  source?: unknown;
  props?: unknown;
  ts?: unknown;
}

const ALLOWED_EVENTS = new Set<string>([
  // 音频
  'audio_play',
  'audio_pause',
  'audio_complete',
  // 画册
  'pdf_downloaded',
  'share_poster_generated',
  // 工具
  'bazi_calculated',
  'match_calculated',
  'chooseday_queried',
  // 商业
  'paywall_viewed',
  'upgrade_clicked',
]);

export async function POST(req: NextRequest) {
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const event = typeof body.event === 'string' ? body.event.trim() : '';
  if (!event) {
    return NextResponse.json(
      { ok: false, error: 'missing_event' },
      { status: 400 },
    );
  }
  // 白名单保护：未登记的事件不收（避免被滥用为日志注入）
  if (!ALLOWED_EVENTS.has(event)) {
    console.warn(`[analytics] ignored unknown event: ${event}`);
    return NextResponse.json(
      { ok: false, error: 'event_not_allowed', event },
      { status: 400 },
    );
  }

  const source = typeof body.source === 'string' ? body.source : null;
  const props =
    body.props && typeof body.props === 'object' && !Array.isArray(body.props)
      ? (body.props as Record<string, unknown>)
      : null;
  const ts =
    typeof body.ts === 'number' && Number.isFinite(body.ts) ? body.ts : Date.now();

  // 统一埋点日志（结构化 JSON，便于 Vercel log 检索）
  console.log(
    JSON.stringify({
      tag: 'analytics',
      event,
      source,
      props,
      ts,
      receivedAt: Date.now(),
    }),
  );

  return NextResponse.json({
    ok: true,
    event,
    receivedAt: Date.now(),
  });
}

/* ============ 健康检查 ============ */

export async function GET() {
  return Response.json({
    ok: true,
    service: 'analytics',
    events: Array.from(ALLOWED_EVENTS),
    timestamp: new Date().toISOString(),
  });
}
