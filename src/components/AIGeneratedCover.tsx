'use client';

import { useState } from 'react';

/**
 * 牧心堂 · AI 文生图封面
 *
 * 零成本方案：image.pollinations.ai
 *   - 无需 API key，无需登录
 *   - 返回真实图片 URL（GET）
 *   - 抽象黑白金风格，与黑金主题契合
 *
 * 用途：
 *   - 文章详情页顶部封面（替代纯文本氛围）
 *   - Prompt 由 article.title + category 拼装，简化哈希 seed 让结果稳定
 *
 * 设计要点：
 *   - 加载态：金色脉动光晕 + 文字提示
 *   - 失败态：降级为站点 ✦ 字符 + 渐变背景（不破版）
 *   - 不阻塞页面渲染：首屏渲染时图片异步加载
 */

interface AIGeneratedCoverProps {
  /** 文章标题（用于 prompt 种子） */
  title: string;
  /** 专栏分类（如 lifecode / habitat / name / teacher） */
  category: string;
  /** 自定义 className */
  className?: string;
  /** 图片宽度（默认 512） */
  width?: number;
  /** 图片高度（默认 512） */
  height?: number;
}

const STYLE_SUFFIX =
  ', abstract zen mandala, monochrome black white and gold, sacred geometry, ink wash, minimal, no text, no watermark, no people, cinematic lighting, 4k, high detail';

const CATEGORY_KEYWORDS: Record<string, string> = {
  lifecode: 'bagua, yin yang, five elements wuxing, destiny code',
  habitat: 'feng shui compass, river, mountain, architecture, dwelling',
  name: 'chinese calligraphy stroke, oracle bone script, seal engraving',
  teacher: 'lotus, dharma wheel, meditation hall, candle flame',
  default: 'eastern philosophy, tao, zen aesthetic',
};

function buildPrompt(title: string, category: string): string {
  const keyword = CATEGORY_KEYWORDS[category] ?? CATEGORY_KEYWORDS.default;
  // 截取 title 前 12 字防止过长
  const safeTitle = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9 ,]/g, '').slice(0, 12);
  return `Abstract spiritual cover art for "${safeTitle}", ${keyword}${STYLE_SUFFIX}`;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function AIGeneratedCover({
  title,
  category,
  className = '',
  width = 512,
  height = 512,
}: AIGeneratedCoverProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  // 用 title+category 生成稳定 seed，避免每次刷新都换图
  const seed = hashSeed(`${title}|${category}`) % 1000000;
  const prompt = buildPrompt(title, category);
  const encoded = encodeURIComponent(prompt);
  // pollinations 关键参数：nologo 去水印、seed 稳定结果、model=flux 质量较好
  const src = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary/30
                  bg-gradient-to-br from-black/80 via-black/60 to-black/80
                  shadow-[0_0_60px_-25px_rgba(212,175,55,0.4)]
                  ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* 加载态：金色脉动 + 文字 */}
      {status !== 'loaded' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3
                     bg-gradient-to-br from-background/80 via-background/60 to-background/80 backdrop-blur-sm"
        >
          <div className="relative h-12 w-12">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-primary/40 animate-ping"
              style={{ animationDuration: '2s' }}
            />
            <span
              aria-hidden
              className="absolute inset-2 rounded-full bg-primary/20 blur-md animate-pulse"
            />
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center font-serif text-xl text-primary"
            >
              ✦
            </span>
          </div>
          <p className="font-serif text-xs tracking-[0.4em] text-primary/80">
            {status === 'error' ? '封面生成失败' : '阿阇梨正在为您绘制封面'}
          </p>
          {status === 'error' && (
            <p className="text-[10px] tracking-wider text-foreground/40">
              · 已降级为字符封面 ·
            </p>
          )}
        </div>
      )}

      {/* 真实图片 */}
      {status !== 'error' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${title} 封面`}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`h-full w-full object-cover transition-opacity duration-700
                      ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* 失败降级：大字符 + 渐变 */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid h-32 w-32 place-items-center rounded-full border border-primary/40 bg-background/60 font-serif text-6xl text-primary shadow-[0_0_40px_-10px_rgba(212,175,55,0.5)]">
            ✦
          </div>
        </div>
      )}

      {/* 底部暗角 + 来源标识 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="pointer-events-none absolute bottom-2 right-3 text-[9px] tracking-[0.3em] text-foreground/30">
        AI · COVER
      </div>
    </div>
  );
}
