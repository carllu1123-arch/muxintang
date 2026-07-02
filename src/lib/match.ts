/**
 * 牧心堂 · 合盘分析（Match / Couple Compatibility）
 *
 * 输入：两个 BaziOutput
 * 输出：
 *   - 日主关系：相生 / 相同 / 相克 / 中平
 *   - 五行互补度：0~100（一方缺什么，对方是否补上）
 *   - 解读短文（3-5 段）
 *   - 整体打分：上 / 中 / 下
 *
 * 限制：
 *   - 纯规则系统，零 LLM
 *   - 简化到五行层面（不深挖十神、纳音、神煞）
 *   - 真实产品可接 Dify 做润色
 */

import type { BaziOutput } from './bazi-engine';

type WuXing = '金' | '木' | '水' | '火' | '土';

const SHENG: Record<WuXing, WuXing> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};
const KE: Record<WuXing, WuXing> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

export type MatchLevel = '上等' | '中等' | '需调和';
export type DayMasterRelation =
  | '相生'      // 我生他 / 他生我
  | '相同'      // 同元素
  | '相克'      // 我克他 / 他克我
  | '中平';     // 无直接生克

export interface MatchResult {
  /** 日主关系 */
  relation: DayMasterRelation;
  /** 关系描述（"我木，他火，木生火 → 我滋养他"） */
  relationDesc: string;
  /** 互补度 0..100 */
  complement: number;
  /** 互补说明 */
  complementDesc: string;
  /** 整体等级 */
  level: MatchLevel;
  /** 解读段落 */
  passages: string[];
  /** 五行差值（key: A 减 B，正= A 多） */
  elementDelta: Record<WuXing, number>;
}

function safeRel(a: string, b: string): WuXing | null {
  if (['金', '木', '水', '火', '土'].includes(a) && ['金', '木', '水', '火', '土'].includes(b)) {
    return a as WuXing;
  }
  return null;
}

function classifyRelation(a: WuXing, b: WuXing): { rel: DayMasterRelation; desc: string } {
  if (a === b) {
    return { rel: '相同', desc: `二人皆属${a}，气质相近，性情相通，但易固执己见。` };
  }
  if (SHENG[a] === b) {
    return {
      rel: '相生',
      desc: `${a}生${b}，您是他的滋养者与靠山，宜主动给予。`,
    };
  }
  if (SHENG[b] === a) {
    return {
      rel: '相生',
      desc: `${b}生${a}，他常是您背后的支撑，宜珍惜与感恩。`,
    };
  }
  if (KE[a] === b) {
    return {
      rel: '相克',
      desc: `${a}克${b}，相处中您可能感到"被消耗"，需以柔化刚。`,
    };
  }
  if (KE[b] === a) {
    return {
      rel: '相克',
      desc: `${b}克${a}，您需注意守护自己的能量与边界。`,
    };
  }
  return { rel: '中平', desc: `二者无直接生克，关系平和但需主动经营。` };
}

/**
 * 互补度：1 - max(|差值|)
 * 如果 A 多 0.3 B 少 0.3 → 互补度高
 * 如果 A 多 0.3 B 也多 0.3 → 互补度低（同步）
 */
function calcComplement(a: BaziOutput, b: BaziOutput) {
  const keys: WuXing[] = ['金', '木', '水', '火', '土'];
  const delta: Record<WuXing, number> = {
    金: 0, 木: 0, 水: 0, 火: 0, 土: 0,
  };
  let maxAbs = 0;
  let positiveSum = 0; // A 多 B 少 的总量
  let negativeSum = 0; // A 少 B 多 的总量
  for (const k of keys) {
    const da = a.fiveElements[k] ?? 0;
    const db = b.fiveElements[k] ?? 0;
    const d = da - db;
    delta[k] = Math.round(d * 100) / 100;
    if (Math.abs(d) > maxAbs) maxAbs = Math.abs(d);
    if (d > 0) positiveSum += d;
    else if (d < 0) negativeSum += -d;
  }
  // 互补 = min(pos, neg) × 2 归一化到 0..1
  const mutual = Math.min(positiveSum, negativeSum) * 2;
  const score = Math.round(Math.min(1, mutual) * 100);
  return { delta, score };
}

export function analyzeMatch(a: BaziOutput, b: BaziOutput): MatchResult {
  const aEl = safeRel(a.dayMasterElement, a.dayMasterElement);
  const bEl = safeRel(b.dayMasterElement, b.dayMasterElement);
  if (!aEl || !bEl) {
    return {
      relation: '中平',
      relationDesc: '日主信息异常',
      complement: 0,
      complementDesc: '—',
      level: '需调和',
      passages: ['日主信息异常，请检查输入。'],
      elementDelta: { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 },
    };
  }

  const { rel, desc } = classifyRelation(aEl, bEl);
  const { delta, score } = calcComplement(a, b);

  // 找出 A 多而 B 少、B 多而 A 少的元素
  const aMoreThanB: WuXing[] = [];
  const bMoreThanA: WuXing[] = [];
  (['金', '木', '水', '火', '土'] as WuXing[]).forEach((k) => {
    if (delta[k] > 0.05) aMoreThanB.push(k);
    if (delta[k] < -0.05) bMoreThanA.push(k);
  });

  const complementDesc =
    aMoreThanB.length === 0 && bMoreThanA.length === 0
      ? '二人五行分布相近，性格节奏同步。'
      : aMoreThanB.length > 0 && bMoreThanA.length > 0
      ? `您多${aMoreThanB.join('、')}，对方多${bMoreThanA.join('、')}，五行互相补足。`
      : '五行偏同步，多需共同向外求补。';

  // 整体等级
  let level: MatchLevel = '中等';
  let scoreTotal = score;
  if (rel === '相生') scoreTotal += 15;
  else if (rel === '相克') scoreTotal -= 15;
  if (scoreTotal >= 75) level = '上等';
  else if (scoreTotal < 50) level = '需调和';

  // 解读段落
  const passages: string[] = [
    desc,
    complementDesc,
  ];

  // 加一段关系经营建议
  if (rel === '相生') {
    passages.push('关系如春木与夏火，宜顺势而为，少争多让。');
  } else if (rel === '相同') {
    passages.push('同频者易共振亦易相撞，需各自留白。');
  } else if (rel === '相克') {
    passages.push('相克未必是凶；以"金"之柔化"木"之刚，仍可相得。');
  } else {
    passages.push('中平之合需主动经营，约定的仪式感尤为重要。');
  }

  // 加一段打分与建议
  if (level === '上等') {
    passages.push('综合来看，此缘为上等婚配，宜惜缘共修。');
  } else if (level === '中等') {
    passages.push('综合来看，缘分中等，相处中宜多沟通、多成长。');
  } else {
    passages.push('综合来看，需以修行调和；在差异中观照自心，方为长久之道。');
  }

  return {
    relation: rel,
    relationDesc: desc,
    complement: score,
    complementDesc,
    level,
    passages,
    elementDelta: delta,
  };
}
