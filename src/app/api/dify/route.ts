/**
 * 牧心堂 · 通用 Dify 流式 API 路由
 *
 * POST /api/dify
 *   Content-Type: application/json
 *   body: {
 *     system_prompt?: string,           // 角色人设 + 任务要求
 *     query: string,                    // 用户本轮问句
 *     context?: Record<string, unknown> // 结构化变量（双八字、合盘分数等）
 *     fallback?: string                 // Dify 失败 / 未配置时使用的本地兜底文本
 *   }
 *
 *   响应：application/x-ndjson（与 /api/bazi 同协议）
 *     { "type":"meta",  "contextKeys": ["person1", ...] }   // 一次：流开始
 *     { "type":"chunk", "data": "您..." }                   // 多次：流式文字
 *     { "type":"end",   "source":"dify|local|echo" }        // 一次：流结束
 *     { "type":"error", "error":"..." }                     // 出错
 *
 * 设计：
 *   - 与 /api/bazi 共享 NDJSON 协议，前端可复用同一套 reader
 *   - 强制走 Dify Chat（chat-messages）模式：仅需 DIFY_API_KEY + DIFY_BAZI_APP_ID
 *   - Dify 未配置 / 调用失败 → 把 fallback 文本按字符切片推送（流式体验）
 *   - 不写入数据库（比 /api/bazi 轻量；持久化由调用方自行处理）
 *
 * 用例（情缘合盘 AI 阿阇梨解读）：
 *   await fetch('/api/dify', {
 *     method: 'POST',
 *     body: JSON.stringify({
 *       system_prompt: '你是牧心堂的阿阇梨。...',
 *       query: '请根据以下合盘数据生成 300-500 字的开示...',
 *       context: { person1: {...}, person2: {...}, score: 78 },
 *       fallback: '二人五行互补...',     // 本地 match.ts 的 passages
 *     }),
 *   });
 */

import { NextRequest } from 'next/server';
import { callDify, isDifyConfigured } from '@/lib/dify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RequestBody {
  system_prompt?: unknown;
  query?: unknown;
  context?: unknown;
  fallback?: unknown;
  user?: unknown;
}

interface StreamMeta {
  type: 'meta';
  contextKeys: string[];
  dify: boolean;
}

interface StreamChunk {
  type: 'chunk';
  data: string;
}

interface StreamEnd {
  type: 'end';
  source: 'dify' | 'local' | 'echo';
}

interface StreamError {
  type: 'error';
  error: string;
}

type StreamEvent = StreamMeta | StreamChunk | StreamEnd | StreamError;

const CHUNK_SIZE = 12;
const CHUNK_DELAY_MS = 30;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const encoder = new TextEncoder();

  // 1) 解析 body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return ndjsonError(encoder, '请求体必须为 JSON。');
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) {
    return ndjsonError(encoder, 'query 字段为必填。');
  }

  const systemPrompt =
    typeof body.system_prompt === 'string' && body.system_prompt.trim()
      ? body.system_prompt.trim()
      : '你是牧心堂的阿阇梨。请慈悲、温暖地回应。';

  const context =
    body.context && typeof body.context === 'object' && !Array.isArray(body.context)
      ? (body.context as Record<string, unknown>)
      : {};

  const fallback = typeof body.fallback === 'string' ? body.fallback : '';

  const user = typeof body.user === 'string' && body.user.trim() ? body.user.trim() : undefined;

  // 2) 调 Dify（不阻塞主流程；失败回退）
  let text = '';
  let source: 'dify' | 'local' | 'echo' = 'local';

  if (isDifyConfigured()) {
    // 把 system_prompt 注入到 inputs.system（如果对方是 workflow）
    // 同时把 query 注入到 query，供 Chat App 用
    const inputs: Record<string, unknown> = { ...context, system: systemPrompt };
    const r = await callDify({
      query,
      context: inputs,
      user,
      stream: false,
    });
    if (r?.text) {
      text = r.text;
      source = 'dify';
    }
  }

  // 3) 兜底：Dify 失败 / 未配置 → 用 fallback；没有 fallback 就 echo
  if (!text) {
    if (fallback) {
      text = fallback;
      source = 'local';
    } else {
      text = query;
      source = 'echo';
    }
  }

  // 4) 构建流式响应
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(ev) + '\n'));
      };

      // meta
      send({
        type: 'meta',
        contextKeys: Object.keys(context),
        dify: isDifyConfigured(),
      });

      // chunks
      for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        const piece = text.slice(i, i + CHUNK_SIZE);
        send({ type: 'chunk', data: piece });
        if (i + CHUNK_SIZE < text.length) {
          await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
        }
      }

      // end
      send({ type: 'end', source });

      controller.close();
    },
  });

  console.log(
    `[api/dify] stream ok: source=${source} len=${text.length} (${Date.now() - t0}ms prep)`,
  );

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

/* ============ 工具：直接返回 NDJSON 错误 ============ */

function ndjsonError(encoder: TextEncoder, msg: string): Response {
  const body = encoder.encode(JSON.stringify({ type: 'error', error: msg }) + '\n');
  return new Response(body, {
    status: 200, // 仍 200，让前端走流式解析
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  });
}

/* ============ 健康检查 ============ */

export async function GET() {
  return Response.json({
    ok: true,
    service: 'dify',
    streaming: true,
    dify: isDifyConfigured(),
    timestamp: new Date().toISOString(),
  });
}
