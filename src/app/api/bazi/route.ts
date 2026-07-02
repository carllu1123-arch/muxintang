/**
 * 牧心堂 · 生命代码（Bazi）API 路由
 *
 * POST /api/bazi
 *   body: { year: number, month: number, day: number, hour: number, gender?: '男' | '女' }
 *   resp: {
 *     ok: true,
 *     bazi: BaziOutput,        // 硬算 100% 精准
 *     interpretation: string,   // Markdown，AI 润色 或 本地模板
 *     source: 'dify' | 'local'  // 解读来源
 *     latencyMs: number
 *   }
 *   失败: { ok: false, error: string }
 *
 * 流程：
 *   1. 校验输入
 *   2. 调 bazi-engine.calculateBazi() 硬算（毫秒级）
 *   3. 调 Dify 做 AI 润色（失败回退到本地模板）
 *   4. 写 bazi_readings 表（如已配 Supabase）便于日后分析
 *   5. 返回合并结果
 *
 * 注意：硬算的"精准"由 lunar-javascript 库保证；AI 润色只是文采与可读性。
 *   即便 AI 故障，硬算结果依然 100% 正确，绝不出现"算错"的情况。
 */

import { NextRequest } from 'next/server';
import { calculateBazi, validateBaziInput, type BaziInput } from '@/lib/bazi-engine';
import { callDify, isDifyConfigured } from '@/lib/dify';
import { buildLocalInterpretation } from '@/lib/bazi-interpretation';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createClient as createServerClient } from '@/lib/supabase-server';
import type { Json } from '@/types/supabase';

// 强制运行时为 Node（lunar-javascript 用了 Buffer 等 Node API）
export const runtime = 'nodejs';
// 不缓存：每次排盘结果取决于用户输入
export const dynamic = 'force-dynamic';

type RequestBody = BaziInput;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<RequestBody>;
    const input: BaziInput = {
      year: Number(body.year),
      month: Number(body.month),
      day: Number(body.day),
      hour: Number(body.hour),
      gender: body.gender === '女' ? '女' : body.gender === '男' ? '男' : undefined,
    };

    // 1) 校验
    const err = validateBaziInput(input);
    if (err) {
      return Response.json({ ok: false, error: err }, { status: 400 });
    }

    // 2) 硬算（同步，毫秒级）
    const bazi = calculateBazi(input);

    // 3) AI 润色（带兜底）
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

    let interpretation: string | null = null;
    let source: 'dify' | 'local' = 'local';

    if (isDifyConfigured()) {
      interpretation = (await callDify({ query: userQuery, context, stream: false }))?.text ?? null;
      if (interpretation) source = 'dify';
    }
    if (!interpretation) {
      interpretation = buildLocalInterpretation(bazi);
      source = 'local';
    }

    // 4) 可选：写入 bazi_readings（用于统计分析 / 复盘）
    if (isSupabaseConfigured()) {
      try {
        const sb = createServerClient();
        // 不 await —— 写入失败不影响主流程
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void sb.from('bazi_readings').insert({
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
          ai_interpretation: interpretation.slice(0, 8000), // 防爆
        } as any).then(({ error }: { error: unknown }) => {
          if (error) console.warn('[api/bazi] bazi_readings insert failed:', error);
        });
      } catch (e) {
        console.warn('[api/bazi] supabase unavailable:', e);
      }
    }

    return Response.json({
      ok: true,
      bazi,
      interpretation,
      source,
      latencyMs: Date.now() - t0,
    });
  } catch (e: any) {
    console.error('[api/bazi] unexpected error:', e);
    return Response.json(
      { ok: false, error: e?.message || '排盘服务异常' },
      { status: 500 },
    );
  }
}

/** 健康检查 */
export async function GET() {
  return Response.json({
    ok: true,
    service: 'bazi',
    dify: isDifyConfigured(),
    supabase: isSupabaseConfigured(),
    timestamp: new Date().toISOString(),
  });
}
