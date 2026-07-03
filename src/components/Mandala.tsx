'use client';

/**
 * 牧心堂 · 三昧耶坛城（Mandala）
 *
 * 设计：
 *   - 五行配色：金-银白、木-青绿、水-深蓝、火-朱红、土-赭黄
 *   - 中心恒定朱砂红点（不动明王种子字位）
 *   - 外圈同心圆随五行变色 + 命中 AI 解读后 animate-pulse
 *   - 8 方位点常驻（不动）
 *   - 移动端隐藏（在 chat 容器内部通过 hidden md:flex 控制）
 *
 * 与 BaziChat 配合：BaziChat 持有 element 状态，命中后传入。
 * 首页 hero 模式：传 `autoSpin` 让外圈慢速自转（呼吸 + 旋转）。
 */

import { useEffect, useState } from 'react';
import type { BaziOutput } from '@/lib/bazi-engine';

export type WuXing = '金' | '木' | '水' | '火' | '土';

interface Palette {
  ring: string;        // tailwind gradient class
  glow: string;        // tailwind shadow class
  text: string;        // tailwind text class
  label: string;       // 文案 "金 · 庚辛"
}

const ELEMENT_PALETTES: Record<WuXing, Palette> = {
  金: {
    ring: 'from-slate-200 via-slate-100 to-zinc-300',
    glow: 'shadow-slate-100/40',
    text: 'text-slate-100',
    label: '金 · 庚辛',
  },
  木: {
    ring: 'from-emerald-400 via-green-300 to-teal-400',
    glow: 'shadow-emerald-300/50',
    text: 'text-emerald-200',
    label: '木 · 甲乙',
  },
  水: {
    ring: 'from-blue-500 via-cyan-400 to-indigo-500',
    glow: 'shadow-cyan-300/50',
    text: 'text-cyan-300',
    label: '水 · 壬癸',
  },
  火: {
    ring: 'from-red-500 via-orange-400 to-rose-500',
    glow: 'shadow-orange-300/60',
    text: 'text-orange-200',
    label: '火 · 丙丁',
  },
  土: {
    ring: 'from-amber-500 via-yellow-400 to-orange-400',
    glow: 'shadow-amber-300/50',
    text: 'text-amber-200',
    label: '土 · 戊己',
  },
};

/** 从排盘结果推断五行：优先日主五行，否则取能量最强者 */
export function detectElement(
  bazi: BaziOutput | null | undefined,
): WuXing | null {
  if (!bazi) return null;
  const dm = bazi.dayMasterElement as WuXing;
  if (dm && ELEMENT_PALETTES[dm]) return dm;
  const entries = Object.entries(bazi.fiveElements) as [WuXing, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? null;
}

interface MandalaProps {
  /** 排盘数据（优先级低于显式 element prop） */
  bazi?: BaziOutput | null;
  /** 显式指定五行（流式命中后由 BaziChat 注入） */
  element?: WuXing | null;
  /** 是否激活脉动（流式完成 → true） */
  isActive?: boolean;
  /** 自定义 className */
  className?: string;
  /**
   * 自动慢速旋转外圈（首页 hero 装饰用）。
   * 旋转外层环，中心朱砂点 + 内环保持稳定。
   * 默认 false，避免影响 BaziChat 内部动画。
   */
  autoSpin?: boolean;
  /**
   * 共鸣脉动触发器（升维二：多感官道场）。
   * BaziChat 流式输出时，自增此 prop；Mandala 监听变化做 600ms 缩放。
   * - 建议节流到 ≥150ms，避免一帧内多次脉冲
   * - 默认 0，不触发
   */
  pulseTick?: number;
}

export function Mandala({
  bazi,
  element,
  isActive = false,
  className = '',
  autoSpin = false,
  pulseTick = 0,
}: MandalaProps) {
  const el: WuXing | null = element ?? detectElement(bazi);
  const palette = el ? ELEMENT_PALETTES[el] : null;

  // 升维二：共鸣脉动状态。pulseTick 变化时短暂放大，模拟"吸气-呼气"。
  const [breathing, setBreathing] = useState(false);
  useEffect(() => {
    if (!pulseTick) return;
    setBreathing(true);
    const t = setTimeout(() => setBreathing(false), 600);
    return () => clearTimeout(t);
  }, [pulseTick]);

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center ${className}`}
      style={{
        // 缩放比例：吸气到 1.06，呼气回 1，CSS transition 600ms
        transform: breathing ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform',
      }}
    >
      {/* 装饰：坛城标牌（autoSpin 模式下隐藏，避免旋转时文字错位） */}
      {!autoSpin && (
        <div className="pointer-events-none absolute top-3 left-0 right-0 text-center text-[10px] tracking-[0.4em] text-foreground/40">
          {bazi ? '三 昧 耶 坛 城' : '入 定 中…'}
        </div>
      )}

      {/* 旋转外层（仅 autoSpin 时启用）：外圈光晕 + 中环 + 八方位点一起慢转，中心朱砂点保持静止 */}
      <div
        aria-hidden
        className={
          autoSpin
            ? 'absolute inset-0 flex items-center justify-center animate-[spin_90s_linear_infinite]'
            : undefined
        }
      >
        {/* 外层光晕（激活时脉动 + 染色） */}
        <div
          aria-hidden
          className={`absolute aspect-square w-[88%] rounded-full transition-all duration-1000
                     ${
                       palette
                         ? `bg-gradient-to-br ${palette.ring} ${palette.glow} ${
                             isActive || autoSpin
                               ? 'opacity-60 animate-pulse'
                               : 'opacity-25 blur-md'
                           }`
                         : 'border border-primary/20 opacity-30'
                     }`}
        />

        {/* 中环：固定结构 + 命中后染色描边 */}
        <div
          aria-hidden
          className={`absolute aspect-square w-[62%] rounded-full border transition-colors duration-1000
                     ${
                       isActive && palette
                         ? `border-2 ${palette.text} opacity-90`
                         : 'border border-primary/30 opacity-60'
                     }`}
        />

        {/* 八方位点（autoSpin 时跟随外圈旋转，更具动感） */}
        <div
          aria-hidden
          className="absolute aspect-square w-[78%]"
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <span
              key={deg}
              className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-1000
                         ${
                           isActive && palette
                             ? `bg-current ${palette.text}`
                             : 'bg-primary/70'
                         }`}
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-44%)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* 内环：固定金边（不旋转，保持坛城中心稳定） */}
      <div
        aria-hidden
        className="absolute aspect-square w-[40%] rounded-full border border-primary/50 bg-black/40"
      />

      {/* 中心朱砂点（恒定） */}
      <div
        aria-hidden
        className="relative z-10 h-12 w-12 rounded-full bg-[#8b1a1a] shadow-[0_0_20px_4px_rgba(194,48,32,0.6)]"
      />

      {/* 底部元素标签（autoSpin 时隐藏，避免旋转） */}
      {!autoSpin && (
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center">
          {palette ? (
            <span
              className={`text-xs tracking-[0.4em] transition-colors duration-1000
                         ${isActive ? palette.text : 'text-foreground/40'}`}
            >
              {palette.label}
            </span>
          ) : (
            <span className="text-xs tracking-[0.4em] text-foreground/30">
              候 · 命 · 启 · 示
            </span>
          )}
        </div>
      )}
    </div>
  );
}
