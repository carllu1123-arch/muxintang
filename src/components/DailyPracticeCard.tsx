'use client';

/**
 * 牧心堂 · 今日修行日课卡
 *
 * 职责：
 *   - 跟踪"今日"两个里程碑：
 *       ① 收听晨音（audioListened）— MorningVoice 完成时写入
 *       ② 下载 PDF 画册（pdfDownloaded）— ExportPdfButton 完成时写入
 *   - 双精进时点亮「今日精进」徽章
 *   - 监听 muxintang:practice 自定义事件 → 即时刷新
 *
 * 数据源：localStorage（按日期 key 切分）
 *   muxintang_practice_2026-07-02 = { audioListened: true, pdfDownloaded: false, ... }
 *
 * 视觉：
 *   - 黑底金边卡片（与 /me 风格一致）
 *   - 两个待办点（圆环 + 图标 + 标题 + 状态）
 *   - 全部完成时显示金色"今日精进"徽章
 */

import { useEffect, useState } from 'react';
import { getPractice, type DailyPractice } from '@/lib/practice';

interface Task {
  key: keyof Pick<DailyPractice, 'audioListened' | 'pdfDownloaded'>;
  glyph: string;
  title: string;
  hint: string;
  href?: string;
  linkLabel?: string;
}

const TASKS: Task[] = [
  {
    key: 'audioListened',
    glyph: '🔔',
    title: '晨音收听',
    hint: '收听完今日阿阇梨晨音（30 秒）',
  },
  {
    key: 'pdfDownloaded',
    glyph: '📜',
    title: '画册下载',
    hint: '生成并下载今日修行画册',
  },
];

export function DailyPracticeCard() {
  const [practice, setPractice] = useState<DailyPractice | null>(null);

  useEffect(() => {
    setPractice(getPractice());

    function onPracticeChange() {
      setPractice(getPractice());
    }
    window.addEventListener('muxintang:practice', onPracticeChange);
    // 兜底：跨标签页同步
    function onStorage(e: StorageEvent) {
      if (e.key?.startsWith('muxintang_practice_')) {
        setPractice(getPractice());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('muxintang:practice', onPracticeChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const completedCount = practice
    ? TASKS.filter((t) => practice[t.key]).length
    : 0;
  const allDone = completedCount === TASKS.length;
  const today = new Date().toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  return (
    <section
      aria-label="今日修行日课"
      className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-md md:p-6
                  ${
                    allDone
                      ? 'border-primary/60 bg-gradient-to-br from-primary/15 via-black/60 to-accent/10 shadow-[0_0_32px_-8px_rgba(212,175,55,0.35)]'
                      : 'border-primary/30 bg-black/60'
                  }`}
    >
      {/* 顶部 header */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-foreground/40">
            DAILY · PRACTICE
          </p>
          <h3 className="mt-1 font-serif text-xl text-foreground md:text-2xl">
            今日修行日课
            <span className="ml-2 text-xs font-sans text-foreground/50">
              · {today}
            </span>
          </h3>
        </div>
        {allDone ? (
          <span
            className="inline-flex animate-pulse items-center gap-1.5 rounded-full
                       border border-primary/60 bg-primary/10 px-3 py-1
                       font-serif text-xs text-primary"
          >
            <span aria-hidden>✦</span> 今日精进
          </span>
        ) : (
          <span className="text-[10px] tracking-wider text-foreground/40">
            {completedCount} / {TASKS.length} 已完成
          </span>
        )}
      </header>

      {/* 任务列表 */}
      <ol className="space-y-3">
        {TASKS.map((t) => {
          const done = practice?.[t.key] ?? false;
          return (
            <li
              key={t.key}
              className={`flex items-start gap-3 rounded-xl border p-3 transition
                          ${
                            done
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-foreground/15 bg-background/40'
                          }`}
            >
              {/* 状态环 */}
              <span
                aria-hidden
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center
                           rounded-full border-2 transition
                           ${
                             done
                               ? 'border-primary bg-primary text-background'
                               : 'border-foreground/30 bg-background/50 text-foreground/50'
                           }`}
              >
                {done ? '✓' : t.glyph}
              </span>
              <div className="flex-1">
                <h4
                  className={`font-serif text-sm md:text-base ${
                    done ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {t.title}
                </h4>
                <p className="mt-0.5 text-[11px] text-foreground/55">
                  {done ? '已完成 · ' : '待完成 · '}
                  {t.hint}
                </p>
              </div>
              {done && (
                <span
                  aria-label="已完成"
                  className="self-center text-[10px] tracking-wider text-primary/80"
                >
                  DONE
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* 底部激励语 */}
      <p className="mt-4 text-center text-[11px] leading-relaxed tracking-wider text-foreground/55">
        {allDone ? (
          <>
            🙏 双精进圆满，<span className="text-primary">愿今日所行皆回向众生</span>。
          </>
        ) : (
          <>日拱一卒，功不唐捐 —— 完成两件日课，<span className="text-primary">点亮「今日精进」徽章</span>。</>
        )}
      </p>
    </section>
  );
}
