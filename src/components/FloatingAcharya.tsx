'use client';

/**
 * 牧心堂 · 全局浮动阿阇梨入口
 *
 * 功能：
 *   - 固定在屏幕右下角的极简种子字按钮（☸）
 *   - 微弱脉动光晕（呼吸效果）
 *   - 点击展开极简对话面板（复用 BaziChat）
 *   - 全站任何页面都可一键呼唤阿阇梨
 *
 * 设计原则：
 *   - 不抢主舞台：浮动按钮 ≤ 56px，z-40（仅 modal 在 z-50 之上）
 *   - 不打扰：可由用户随时关闭（点击 × 或按 ESC）
 *   - 视觉一致：黑金磨砂玻璃，呼应项目主题
 *
 * 性能：
 *   - 按钮和面板都是按需渲染（面板只在 open=true 时挂载 BaziChat）
 *   - 用 framer-motion AnimatePresence 处理进出场
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BaziChat } from './BaziChat';

export function FloatingAcharya() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ===== 浮动按钮（种子字 + 脉动光晕） ===== */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? '关闭阿阇梨对话' : '开启阿阇梨对话'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14
                   place-items-center rounded-full
                   border border-primary/50 bg-black/80
                   text-2xl text-primary backdrop-blur-md
                   shadow-[0_0_20px_-2px_rgba(212,175,55,0.5)]
                   md:bottom-8 md:right-8"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
      >
        {/* 脉动光晕（双层交错，弱呼吸感） */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse"
        />
        <span
          aria-hidden
          className="absolute -inset-2 rounded-full bg-primary/10 blur-xl animate-pulse"
          style={{ animationDelay: '0.8s' }}
        />
        {/* 种子字 ☸ */}
        <span aria-hidden className="relative z-10">
          {open ? '×' : '☸'}
        </span>
        {/* 角标：常驻时小金点提示（未打开时显示） */}
        {!open && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full
                       bg-primary shadow-[0_0_8px_rgba(212,175,55,0.9)]
                       animate-pulse"
          />
        )}
      </motion.button>

      {/* ===== 对话面板（AnimatePresence 包裹，进出场动画） ===== */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="acharya-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-3 z-40
                       w-[min(420px,calc(100vw-1.5rem))]
                       max-h-[min(75vh,640px)]
                       overflow-hidden rounded-2xl
                       border border-primary/30
                       bg-black/95 backdrop-blur-md
                       shadow-[0_0_50px_-10px_rgba(212,175,55,0.4)]
                       md:right-6 md:bottom-28"
            role="dialog"
            aria-label="阿阇梨对话面板"
          >
            {/* 面板顶部条：标题 + 关闭 */}
            <div className="flex items-center justify-between border-b border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-transparent px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-full
                             border border-primary/40 bg-background/60
                             text-sm text-primary"
                >
                  ☸
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-serif text-sm text-foreground">
                    阿阇梨对话
                  </span>
                  <span className="text-[10px] tracking-wider text-foreground/40">
                    ĀCĀRYA · ALWAYS HERE
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭对话"
                className="grid h-7 w-7 place-items-center rounded-full
                           border border-primary/20 bg-background/60
                           text-foreground/60 transition
                           hover:border-primary/60 hover:text-primary"
              >
                <span aria-hidden className="text-base">×</span>
              </button>
            </div>

            {/* BaziChat 主体（compact 模式：仅聊天区，无右侧 Mandala） */}
            <div className="p-3">
              <BaziChat
                showMandala={false}
                compact
                onClose={() => setOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
