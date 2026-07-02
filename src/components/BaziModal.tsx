'use client';

/**
 * 牧心堂 · 生命代码弹窗（BaziModal）
 *
 * 入口：/tools 页面上"生命代码"卡片点击触发
 * 行为：
 *   - 全屏/近全屏黑底磨砂玻璃模态
 *   - 内部直接渲染 BaziChat（带曼荼罗，compact 模式）
 *   - 右上角关闭按钮：onClose()（同时绑 ESC、点击遮罩）
 *   - body scroll lock，避免背景滚动
 *   - 动画淡入 + 缩放（CSS transition，零依赖）
 *
 * 设计：
 *   - 不使用 portal；挂在原 DOM 树即可（Next.js App Router 默认即这样）
 *   - 不引 framer-motion（避免打包体积）
 *   - 移动端几乎全屏；PC 端 75% 宽 + 80vh 高，居中
 */

import { useEffect } from 'react';
import { BaziChat } from './BaziChat';

interface BaziModalProps {
  open: boolean;
  onClose: () => void;
}

export function BaziModal({ open, onClose }: BaziModalProps) {
  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="生命代码 AI 对话"
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
    >
      {/* 遮罩（点击关闭） */}
      <div
        onClick={onClose}
        aria-hidden
        className="bazi-modal-overlay absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* 弹窗体 */}
      <div
        className="bazi-modal-body relative z-10 flex w-full flex-col gap-4
                   rounded-t-2xl border border-primary/30
                   bg-background/95 p-4 shadow-[0_-20px_60px_-20px_rgba(212,175,55,0.4)]
                   backdrop-blur-xl
                   max-h-[92vh] overflow-y-auto
                   md:w-[min(75vw,1100px)] md:rounded-2xl md:p-6"
      >
        {/* 顶部条：标题 + 关闭 */}
        <header className="flex items-center justify-between border-b border-primary/15 pb-3">
          <div>
            <p className="text-[10px] tracking-[0.4em] text-primary/60">
              TOOL · BAZI
            </p>
            <h2 className="font-serif text-xl text-foreground md:text-2xl">
              生命代码 · AI 对话
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid h-9 w-9 place-items-center rounded-full
                       border border-primary/30 text-foreground/70 transition
                       hover:border-primary hover:text-primary"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M3 3L13 13M13 3L3 13" />
            </svg>
          </button>
        </header>

        {/* 聊天主体（compact：消息区高度收一点，给标题让位） */}
        <BaziChat compact onClose={onClose} />
      </div>
    </div>
  );
}
