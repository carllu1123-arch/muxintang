/**
 * 牧心堂 · 生命代码（Bazi）流式 API 路由
 *
 * POST /api/bazi
 *   Content-Type: application/json
 *   body: {
 *     message: string,                 // 用户本轮发言（必填）
 *     birth?: { year, month, day, hour, gender? }  // 可选：上一轮已抽取的生辰
 *   }
 *
 *   响应：application/x-ndjson（每行一个 JSON 对象）
 *     { "type":"meta",  "bazi": {...} }                  // 一次：流开始
 *     { "type":"chunk", "data": "您..." }                // 多次：流式文字
 *     { "type":"end",   "source":"dify|local",
 *                        "dayMasterElement":"木" }       // 一次：流结束
 *     { "type":"error", "error":"..." }                  // 出错
 *
 * 流程：
 *   1. 解析 body（message / birth）
 *   2. 若没有 birth，从 message 用正则抽生辰
 *   3. validateBaziInput 校验
 *   4. calculateBazi 硬算
 *   5. callDify / buildLocalInterpretation → 完整解读文本
 *   6. 把全文按 ~12 字符切片、每片间隔 ~30ms 推入 ReadableStream
 *   7. 末尾推送 end（含 dayMasterElement，供前端驱动曼荼罗）
 *
 * 为什么不在 Dify 端直接 SSE？
 *   - 我们有本地模板兜底逻辑，必须保证流式体验一致
 *   - 统一 NDJSON 协议，前端只需一套 reader 逻辑
 *   - Dify streaming 协议需要 chunk 解析、event 拼接，复杂度高
 *   - 30ms 间隔的"假流式"用户感知与真 SSE 几乎无差
 */

import { NextRequest } from 'next/server';
import {
  calculateBazi,
  validateBaziInput,
  type BaziInput,
  type BaziOutput,
} from '@/lib/bazi-engine';
import { callDify, isDifyConfigured } from '@/lib/dify';
import { buildLocalInterpretation } from '@/lib/bazi-interpretation';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createClient as createServerClient } from '@/lib/supabase-server';
import type { Json } from '@/types/supabase';
import { parseBirthFromText } from '@/lib/bazi-parser';
import { ARTICLES } from '@/lib/mock-data';

/* ============ AI 推荐阅读：基于五行状态本地匹配 3 篇 /learn 文章 ============ */

export interface RecommendedArticle {
  title: string;
  category: string;
  slug: string;
  /** 推荐理由（如"木弱调候"、"日主木·生长"），前端可不展示 */
  reason: string;
}

/**
 * 根据用户五行状态推荐 3 篇真实存在的 /learn 文章
 *
 * 策略：
 *   1. 找出最弱五行（fiveElements 中值最小者）→ 推荐一篇"调候"文章
 *   2. 根据日主五行 → 推荐一篇"特质呼应"文章
 *   3. 通用补足 → lifecode/five-elements 等通论文章
 *
 * 为什么本地匹配而不是让 Dify 生成？
 *   - LLM 会幻觉出不存在的 slug，导致 /learn/[category]/[slug] 404
 *   - 本地基于 ARTICLES 真实数据匹配，保证链接可达
 *   - 五行映射规则是固定命理知识，不需要 LLM 推理
 */
function recommendArticles(bazi: BaziOutput): RecommendedArticle[] {
  // 五行 → 调和文章（最弱五行用它补）
  const harmonyMap: Record<string, { category: string; slug: string; reason: string }> = {
    '木': { category: 'habitat', slug: 'orientation', reason: '木弱·东方调和' },
    '火': { category: 'name', slug: 'phonetics', reason: '火弱·音律调候' },
    '土': { category: 'habitat', slug: 'zodiac', reason: '土弱·生肖调和' },
    '金': { category: 'name', slug: 'strokes', reason: '金弱·笔画补金' },
    '水': { category: 'name', slug: 'phonetics', reason: '水弱·音律补智' },
  };

  // 日主五行 → 特质文章
  const dayMasterMap: Record<string, { category: string; slug: string; reason: string }> = {
    '木': { category: 'lifecode', slug: 'five-elements', reason: '木日主·生长之力' },
    '火': { category: 'teacher', slug: 'dharma-1', reason: '火日主·文明之光' },
    '土': { category: 'habitat', slug: 'orientation', reason: '土日主·承载之德' },
    '金': { category: 'teacher', slug: 'dharma-2', reason: '金日主·决断之锋' },
    '水': { category: 'lifecode', slug: 'intro', reason: '水日主·智慧之源' },
  };

  // 通用补足池
  const generalPool: Array<{ category: string; slug: string; reason: string }> = [
    { category: 'lifecode', slug: 'five-elements', reason: '五行通论' },
    { category: 'lifecode', slug: 'intro', reason: '入门导引' },
    { category: 'teacher', slug: 'dharma-1', reason: '阿阇梨开示' },
    { category: 'teacher', slug: 'dharma-2', reason: '阿阇梨开示' },
  ];

  // 从 ARTICLES 真实数据里查找 title（避免硬编码出错）
  function find(cat: string, slug: string, reason: string): RecommendedArticle | null {
    const a = ARTICLES.find(
      (x) => x.category === cat && x.slug === slug,
    );
    if (!a) return null;
    return { title: a.title, category: a.category, slug: a.slug, reason };
  }

  // 找最弱五行
  const entries = Object.entries(bazi.fiveElements) as [string, number][];
  const weakest =
    entries.length > 0
      ? entries.reduce((min, cur) => (cur[1] < min[1] ? cur : min))[0]
      : '木';

  const result: RecommendedArticle[] = [];
  const usedKeys = new Set<string>();

  function pushArt(cat: string, slug: string, reason: string) {
    const key = `${cat}/${slug}`;
    if (usedKeys.has(key)) return;
    const art = find(cat, slug, reason);
    if (!art) return;
    result.push(art);
    usedKeys.add(key);
  }

  // 1. 调和文章
  const h = harmonyMap[weakest];
  if (h) pushArt(h.category, h.slug, h.reason);

  // 2. 日主文章
  const d = dayMasterMap[bazi.dayMasterElement];
  if (d) pushArt(d.category, d.slug, d.reason);

  // 3. 通用补足
  for (const g of generalPool) {
    if (result.length >= 3) break;
    pushArt(g.category, g.slug, g.reason);
  }

  return result.slice(0, 3);
}

// 强制 Node 运行时（lunar-javascript 依赖 Node API）
export const runtime = 'nodejs';
// 不缓存
export const dynamic = 'force-dynamic';

interface RequestBody {
  message?: unknown;
  birth?: unknown;
}

interface StreamMeta {
  type: 'meta';
  bazi: BaziOutput;
}

interface StreamChunk {
  type: 'chunk';
  data: string;
}

interface StreamEnd {
  type: 'end';
  source: 'dify' | 'local';
  dayMasterElement: string;
  /** AI 推荐阅读：基于五行状态本地匹配的 3 篇 /learn 文章 */
  recommended_articles: RecommendedArticle[];
}

interface StreamError {
  type: 'error';
  error: string;
}

type StreamEvent = StreamMeta | StreamChunk | StreamEnd | StreamError;

const CHUNK_SIZE = 12;     // 每次推多少字
const CHUNK_DELAY_MS = 30; // 每次推送间隔（毫秒）— 模拟打字机节奏

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
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return ndjsonError(encoder, '请输入消息。');
  }

  // 2) 确定生辰输入
  let input: BaziInput | null = null;
  if (body.birth && typeof body.birth === 'object') {
    const b = body.birth as Partial<BaziInput>;
    if (
      typeof b.year === 'number' &&
      typeof b.month === 'number' &&
      typeof b.day === 'number' &&
      typeof b.hour === 'number'
    ) {
      input = {
        year: b.year,
        month: b.month,
        day: b.day,
        hour: b.hour,
        gender: b.gender === '女' ? '女' : b.gender === '男' ? '男' : undefined,
      };
    }
  }
  if (!input) {
    const parsed = parseBirthFromText(message);
    if (!parsed) {
      return ndjsonError(
        encoder,
        '未能识别生辰。请用如下格式：1990年6月15日 14时 男（或 1990-6-15 14:00）',
      );
    }
    input = parsed;
  }

  // 3) 校验
  const err = validateBaziInput(input);
  if (err) return ndjsonError(encoder, err);

  // 4) 硬算
  const bazi = calculateBazi(input);

  // 5) 取得解读全文（Dify 或本地）
  const userQuery = `我出生于 ${input.year}年${input.month}月${input.day}日 ${input.hour}时${
    input.gender ? `（${input.gender}）` : ''
  }，请按下方排盘信息给予修行建议。`;

  const context = {
    birth: {
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      gender: input.gender ?? '未填',
    },
    pillars: {
      year: bazi.yearPillar,
      month: bazi.monthPillar,
      day: bazi.dayPillar,
      hour: bazi.hourPillar,
    },
    day_master: bazi.dayMaster,
    day_master_element: bazi.dayMasterElement,
    deity: bazi.deity,
    five_elements: bazi.fiveElements,
    ten_gods: bazi.tenGods,
    lunar_date: bazi.lunarDate,
    zodiac: bazi.zodiac,
    solar_term: bazi.solarTerm,
    nayin: bazi.nayin,
  };

  let interpretation: string;
  let source: 'dify' | 'local' = 'local';
  if (isDifyConfigured()) {
    const r = await callDify({ query: userQuery, context, stream: false });
    if (r?.text) {
      interpretation = r.text;
      source = 'dify';
    } else {
      interpretation = buildLocalInterpretation(bazi);
      source = 'local';
    }
  } else {
    interpretation = buildLocalInterpretation(bazi);
  }

  // 6) 异步写库（不阻塞流）
  if (isSupabaseConfigured()) {
    try {
      const sb = createServerClient();
      void sb
        .from('bazi_readings')
        .insert({
          birth_year: input.year,
          birth_month: input.month,
          birth_day: input.day,
          birth_hour: input.hour,
          gender: input.gender ?? null,
          year_pillar: bazi.yearPillar,
          month_pillar: bazi.monthPillar,
          day_pillar: bazi.dayPillar,
          hour_pillar: bazi.hourPillar,
          day_master: bazi.dayMaster,
          five_elements: bazi.fiveElements as unknown as Json,
          ten_gods: bazi.tenGods as unknown as Json,
          deity: bazi.deity,
          ai_interpretation: interpretation.slice(0, 8000),
        } as never)
        .then(({ error }: { error: unknown }) => {
          if (error) console.warn('[api/bazi] bazi_readings insert failed:', error);
        });
    } catch (e) {
      console.warn('[api/bazi] supabase unavailable:', e);
    }
  }

  // 7) 构建流式响应
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(ev) + '\n'));
      };

      // meta（只此一次）
      send({ type: 'meta', bazi });

      // chunks
      for (let i = 0; i < interpretation.length; i += CHUNK_SIZE) {
        const piece = interpretation.slice(i, i + CHUNK_SIZE);
        send({ type: 'chunk', data: piece });
        // 最后一段不再 sleep
        if (i + CHUNK_SIZE < interpretation.length) {
          await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
        }
      }

      // end
      send({
        type: 'end',
        source,
        dayMasterElement: bazi.dayMasterElement,
        recommended_articles: recommendArticles(bazi),
      });

      controller.close();
    },
  });

  // 简单访问日志
  console.log(
    `[api/bazi] stream ok: ${input.year}-${input.month}-${input.day} ${input.hour}h (${Date.now() - t0}ms prep)`,
  );

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // 防止 nginx 缓冲
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

/* ============ 健康检查（保留） ============ */

export async function GET() {
  return Response.json({
    ok: true,
    service: 'bazi',
    streaming: true,
    dify: isDifyConfigured(),
    supabase: isSupabaseConfigured(),
    timestamp: new Date().toISOString(),
  });
}
