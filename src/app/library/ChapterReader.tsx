'use client';

/**
 * 牧心堂 · 行者故事 · 章节正文阅读器（含划线批注 + 沉浸式 + 进度记忆）
 *
 * 功能：
 *   1. 渲染正文段落（与原 server 端样式一致）
 *   2. 监听 mouseup：当 window.getSelection() 选中段落内文本时，
 *      弹出"✍️ 写心语"悬浮按钮
 *   3. 点击按钮 → 弹出对话框写批注 → POST /api/library/annotation
 *   4. 已有批注的段落下方显示极细金色虚线 + 批注列表
 *   5. 沉浸式阅读模式：顶部「全屏阅读」按钮 → 隐藏全局 Navbar + 底部 Tab，
 *      正文放大到 max-w-2xl，仅留左侧极简返回箭号
 *   6. 阅读进度记忆：IntersectionObserver 监听当前可见段落，
 *      防抖写入 localStorage；下次进入 /library 时由 LibraryTabs 提示"继续阅读"
 *   7. URL hash 锚点：进入页面时若有 #para-N，自动滚动到对应段落
 *   8. 金句海报积分消耗：生成前弹出确认弹窗，消耗 20 藏经阁积分
 *      （POST /api/user/spend { amount: 20, reason: 'poster' }）
 *
 * 数据流：
 *   - 加载时 GET /api/library/annotation?slug=xxx 拉取已有批注
 *   - 按段落分组，渲染在对应段落下方
 *   - 段落可见性变化 → saveProgress 写 localStorage
 */

import { useEffect, useRef, useState } from 'react';
import { AcharyaBadge } from '@/components/AcharyaBadge';
import { saveProgress } from '@/lib/reading-progress';
import { usePoints, notifyCreditsChanged } from '@/lib/usePoints';

/** 金句海报积分消耗（与后端业务约定对齐） */
const POSTER_CREDITS_COST = 20;

interface Annotation {
  id: string;
  chapter_slug: string;
  paragraph_idx: number;
  selected_text: string;
  note: string;
  author_name: string;
  author_role: string;
  created_at: string;
}

interface ChapterReaderProps {
  chapterSlug: string;
  paragraphs: string[];
  /** 章节标题（沉浸式顶栏 + 进度记忆使用） */
  chapterTitle: string;
  /** 卷号（短篇传 null） */
  chapterIndex: number | null;
  /** 故事类型 */
  storyType: 'serial' | 'short';
}

export function ChapterReader({
  chapterSlug,
  paragraphs,
  chapterTitle,
  chapterIndex,
  storyType,
}: ChapterReaderProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  /** 当前选中的段落索引 + 选中文本 + 浮窗位置 */
  const [selection, setSelection] = useState<{
    paraIdx: number;
    text: string;
    x: number;
    y: number;
  } | null>(null);
  /** 批注对话框 */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  /** 金句海报 */
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterDialogOpen, setPosterDialogOpen] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  /** 金句海报积分确认弹窗（点击 🪷 后、生成前） */
  const [posterConfirmOpen, setPosterConfirmOpen] = useState(false);
  /** 积分扣减失败提示（在确认弹窗内联显示） */
  const [posterSpendError, setPosterSpendError] = useState<string | null>(null);
  /** 当前用户积分（用于确认弹窗显示余额） */
  const { credits: userCredits, loggedIn: userLoggedIn } = usePoints();
  /** 沉浸式阅读模式 */
  const [immersive, setImmersive] = useState(false);
  /** 当前可见段落索引（用于进度记忆 + 顶部进度条） */
  const [currentParaIdx, setCurrentParaIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  /** 进度保存防抖句柄 */
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 当前段落索引的 ref（避免 IntersectionObserver effect 依赖 currentParaIdx 导致频繁重建） */
  const currentParaIdxRef = useRef(0);

  // 拉取批注
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/library/annotation?slug=${encodeURIComponent(chapterSlug)}`,
          { cache: 'no-store' },
        );
        if (!r.ok) return;
        const { annotations } = (await r.json()) as { annotations: Annotation[] };
        if (!cancelled) setAnnotations(annotations);
      } catch {
        /* 静默 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterSlug]);

  // 监听 mouseup
  useEffect(() => {
    function handleMouseUp(e: MouseEvent) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2 || text.length > 200) {
        setSelection(null);
        return;
      }
      // 找到选中文本属于哪个段落
      const target = e.target as HTMLElement;
      const paraEl = target.closest('[data-para-idx]');
      if (!paraEl) {
        setSelection(null);
        return;
      }
      const paraIdx = Number(paraEl.getAttribute('data-para-idx'));
      if (Number.isNaN(paraIdx)) {
        setSelection(null);
        return;
      }
      // 检查选中文本是否真的在该段落内
      const paraText = paragraphs[paraIdx] ?? '';
      if (!paraText.includes(text)) {
        setSelection(null);
        return;
      }
      setSelection({
        paraIdx,
        text,
        x: e.clientX,
        y: e.clientY,
      });
    }
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [paragraphs]);

  /* ============ 沉浸式模式：切换 body class ============ */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (immersive) {
      document.body.classList.add('immersive-mode');
      // 进入沉浸式时滚到顶，避免顶栏遮挡
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      document.body.classList.remove('immersive-mode');
    }
    return () => {
      // 卸载时兜底移除（防止 SPA 切页残留）
      document.body.classList.remove('immersive-mode');
    };
  }, [immersive]);

  /* ============ URL hash 锚点：#para-N → 滚动到对应段落 ============ */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    const m = /^#para-(\d+)$/.exec(hash);
    if (!m) return;
    const idx = Number(m[1]);
    if (Number.isNaN(idx)) return;
    // 段落可能还没渲染完，等一帧
    requestAnimationFrame(() => {
      const el = document.getElementById(`para-${idx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    });
  }, []);

  /* ============ IntersectionObserver：追踪当前可见段落 + 防抖保存进度 ============ */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof IntersectionObserver === 'undefined') return;
    const root = containerRef.current;
    if (!root) return;

    const paraEls = Array.from(
      root.querySelectorAll<HTMLElement>('[data-para-idx]'),
    );
    if (paraEls.length === 0) return;

    // 记录每个段落的可见比例
    const visibleRatios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const idx = Number(el.getAttribute('data-para-idx'));
          if (Number.isNaN(idx)) continue;
          visibleRatios.set(idx, entry.intersectionRatio);
        }
        // 选可见比例最大且 >0 的段落作为"当前段落"
        let bestIdx = -1;
        let bestRatio = 0;
        for (const [idx, ratio] of visibleRatios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }
        if (bestIdx >= 0 && bestIdx !== currentParaIdxRef.current) {
          currentParaIdxRef.current = bestIdx;
          setCurrentParaIdx(bestIdx);

          // 防抖保存到 localStorage（500ms）
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            saveProgress({
              slug: chapterSlug,
              title: chapterTitle,
              chapterIndex,
              storyType,
              paragraphIdx: bestIdx,
              paragraphCount: paragraphs.length,
              updatedAt: new Date().toISOString(),
            });
          }, 500);
        }
      },
      {
        // 顶部留 80px 容差，避免顶栏遮挡时仍判定为"可见"
        rootMargin: '-80px 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    paraEls.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // 故意不依赖 currentParaIdx，用 ref 避免每次滚动重建 observer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterSlug, chapterTitle, chapterIndex, storyType, paragraphs.length]);

  // 点击 🪷 金句海报 → 先弹积分确认
  function openPosterConfirm() {
    if (!selection || posterBusy) return;
    setPosterSpendError(null);
    setPosterConfirmOpen(true);
  }

  // 调用 /api/user/spend 扣减积分；返回 { ok, balance?, error? }
  async function spendPosterCredits(): Promise<{
    ok: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      const r = await fetch('/api/user/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: POSTER_CREDITS_COST,
          reason: 'poster',
        }),
        cache: 'no-store',
      });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        balance?: number;
        error?: string;
        required?: number;
      };
      if (r.ok && data.ok) return { ok: true, balance: data.balance };
      // 503 unconfigured → 开发/预览环境无积分系统，放行不扣
      if (r.status === 503) return { ok: true };
      if (r.status === 401) return { ok: false, error: '请先登录后再生成金句海报' };
      if (r.status === 402) {
        return {
          ok: false,
          error: `积分不足，需 ${data.required ?? POSTER_CREDITS_COST} 积分，当前 ${data.balance ?? 0} 积分`,
        };
      }
      return { ok: false, error: data.error || '积分扣减失败' };
    } catch {
      return { ok: false, error: '网络异常，请稍后重试' };
    }
  }

  // 确认扣减积分后生成金句海报
  async function handleGeneratePoster() {
    if (!selection || posterBusy) return;
    setPosterSpendError(null);
    setPosterBusy(true);
    try {
      // 1) 扣减积分
      const spend = await spendPosterCredits();
      if (!spend.ok) {
        setPosterSpendError(spend.error ?? '积分扣减失败');
        return;
      }
      // 通知全局积分徽章刷新
      notifyCreditsChanged();

      // 2) 生成海报
      const { default: html2canvas } = await import('html2canvas');
      const node = document.getElementById('poster-offscreen');
      if (!node) throw new Error('海报节点未就绪');
      node.style.display = 'block';
      // 填充金句
      const quoteEl = document.getElementById('poster-quote');
      if (quoteEl) quoteEl.textContent = `「${selection.text}」`;
      const canvas = await html2canvas(node, {
        width: 1080,
        height: 1080,
        scale: 2,
        backgroundColor: '#0a0a0a',
        useCORS: true,
      });
      node.style.display = 'none';
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );
      if (!blob) throw new Error('海报生成失败');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '金句分享卡.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // 关闭确认弹窗，显示积分提示弹窗
      setPosterConfirmOpen(false);
      setPosterDialogOpen(true);
      // 清除选区
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      setPosterError((e as { message?: string })?.message || '海报生成失败');
      setPosterConfirmOpen(false);
    } finally {
      setPosterBusy(false);
    }
  }

  // 点击"写心语"按钮
  function openDialog() {
    if (!selection) return;
    setNoteText('');
    setDialogError(null);
    setDialogOpen(true);
  }

  async function saveAnnotation() {
    if (!selection) return;
    if (!noteText.trim()) {
      setDialogError('请写下您的感受');
      return;
    }
    setSubmitting(true);
    setDialogError(null);
    try {
      const r = await fetch('/api/library/annotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_slug: chapterSlug,
          paragraph_idx: selection.paraIdx,
          selected_text: selection.text,
          note: noteText.trim(),
        }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || '保存失败');
      }
      const { annotation } = (await r.json()) as { annotation: Annotation };
      setAnnotations((prev) => [...prev, annotation]);
      setDialogOpen(false);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      setDialogError((e as { message?: string })?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  // 按段落分组批注
  const annotationsByPara = new Map<number, Annotation[]>();
  for (const a of annotations) {
    const list = annotationsByPara.get(a.paragraph_idx) ?? [];
    list.push(a);
    annotationsByPara.set(a.paragraph_idx, list);
  }

  // 阅读进度百分比（0-100）
  const progressPct =
    paragraphs.length > 0
      ? Math.min(
          100,
          Math.round(((currentParaIdx + 1) / paragraphs.length) * 100),
        )
      : 0;

  // 沉浸式顶栏标题
  const immersiveTitle =
    storyType === 'short' || chapterIndex == null
      ? chapterTitle
      : `第${chapterIndex}卷 · ${chapterTitle}`;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-5 md:gap-6 ${
        immersive ? 'mx-auto w-full max-w-2xl px-1' : ''
      }`}
    >
      {/* ============ 顶部工具栏：全屏阅读切换 ============ */}
      {!immersive && (
        <div className="flex items-center justify-end gap-2 border-b border-primary/10 pb-3">
          <button
            type="button"
            onClick={() => setImmersive(true)}
            className="flex items-center gap-1.5 rounded-full
                       border border-primary/30 bg-background/60
                       px-3 py-1.5 text-xs text-primary/80 transition
                       hover:border-primary hover:bg-primary/10 hover:text-primary"
            title="进入沉浸式阅读（隐藏顶栏与底栏）"
          >
            <span aria-hidden>⛶</span>
            全屏阅读
          </button>
        </div>
      )}

      {/* ============ 沉浸式顶栏：返回箭号 + 标题 + 退出 ============ */}
      {immersive && (
        <div
          className="fixed inset-x-0 top-0 z-50
                     flex h-12 items-center gap-3
                     bg-background/95 px-4 backdrop-blur-md
                     border-b border-primary/20"
        >
          <button
            type="button"
            onClick={() => setImmersive(false)}
            aria-label="退出沉浸式阅读"
            className="flex items-center gap-1 text-sm text-foreground/70 transition hover:text-primary"
          >
            <span aria-hidden className="text-lg leading-none">←</span>
            <span className="hidden sm:inline">返回</span>
          </button>
          <span className="truncate font-serif text-sm text-foreground/80">
            {immersiveTitle}
          </span>
          <span className="ml-auto text-[10px] tracking-wider text-primary/70">
            {progressPct}%
          </span>
        </div>
      )}

      {/* ============ 沉浸式进度条 ============ */}
      {immersive && (
        <div className="fixed inset-x-0 top-12 z-50 h-0.5 bg-primary/10">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* 沉浸式时顶部留白，避免内容被 fixed 顶栏遮挡 */}
      {immersive && <div className="h-10" aria-hidden />}

      {paragraphs.map((p, i) => {
        const anns = annotationsByPara.get(i) ?? [];
        return (
          <div key={i}>
            <p
              id={`para-${i}`}
              data-para-idx={i}
              className="scroll-mt-20 text-base leading-loose text-foreground/85 md:text-lg
                         first-letter:font-serif first-letter:text-2xl
                         md:first-letter:text-3xl first-letter:text-primary/90
                         first-letter:mr-1 first-letter:float-left
                         first-letter:leading-none first-letter:mt-1
                         cursor-text select-text"
            >
              {p}
            </p>
            {/* 已有批注：金色虚线 + 批注列表 */}
            {anns.length > 0 && (
              <div className="mt-2 border-t border-dashed border-primary/30 pt-2">
                {anns.map((a) => (
                  <div
                    key={a.id}
                    className="mb-2 rounded-md bg-primary/5 px-3 py-2"
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span aria-hidden className="text-[10px] text-primary/60">
                        ✍️
                      </span>
                      <span className="text-xs text-foreground/70">
                        {a.author_name}
                      </span>
                      <AcharyaBadge role={a.author_role} />
                      <span className="ml-auto text-[10px] text-foreground/30">
                        {new Date(a.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground/70">
                      <span className="text-primary/60">「{a.selected_text}」</span>
                      {' — '}
                      {a.note}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* "写心语" + "生成金句海报" 悬浮按钮组 */}
      {selection && !dialogOpen && (
        <div
          style={{
            position: 'fixed',
            left: selection.x,
            top: selection.y - 50,
          }}
          className="z-50 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={openDialog}
            className="flex items-center gap-1 rounded-full
                       border border-primary/50 bg-background/95
                       px-3 py-1.5 text-xs text-primary shadow-lg
                       backdrop-blur-md transition hover:bg-primary/10"
          >
            <span aria-hidden>✍️</span>
            写心语
          </button>
          <button
            type="button"
            onClick={openPosterConfirm}
            disabled={posterBusy}
            className="flex items-center gap-1 rounded-full
                       border border-accent/50 bg-background/95
                       px-3 py-1.5 text-xs text-accent shadow-lg
                       backdrop-blur-md transition hover:bg-accent/10
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden>🪷</span>
            {posterBusy ? '生成中…' : '金句海报'}
          </button>
        </div>
      )}

      {/* 海报生成错误提示 */}
      {posterError && (
        <p className="rounded-lg border border-accent/40 bg-accent/10 p-2.5 text-xs text-accent">
          ※ {posterError}
        </p>
      )}

      {/* 离屏海报节点（1080x1080，黑金曼荼罗 + 金句 + 水印） */}
      <div
        id="poster-offscreen"
        aria-hidden
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '1080px',
          height: '1080px',
          display: 'none',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '1080px',
            height: '1080px',
            background:
              'radial-gradient(circle at 50% 45%, #1a1410 0%, #0a0a0a 70%)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '120px 100px',
            boxSizing: 'border-box',
          }}
        >
          {/* 曼荼罗 SVG 背景 */}
          <svg
            width="900"
            height="900"
            viewBox="0 0 200 200"
            style={{
              position: 'absolute',
              top: '90px',
              left: '90px',
              opacity: 0.18,
            }}
          >
            <g stroke="#d4af37" strokeWidth="0.4" fill="none">
              <circle cx="100" cy="100" r="95" />
              <circle cx="100" cy="100" r="80" />
              <circle cx="100" cy="100" r="65" />
              <circle cx="100" cy="100" r="50" />
              <circle cx="100" cy="100" r="35" />
              <circle cx="100" cy="100" r="20" />
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i * 30 * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    x1="100"
                    y1="100"
                    x2={100 + 95 * Math.cos(a)}
                    y2={100 + 95 * Math.sin(a)}
                  />
                );
              })}
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i * 45 * Math.PI) / 180 + 0.393;
                const r = 50;
                return (
                  <line
                    key={i}
                    x1={100 + r * Math.cos(a)}
                    y1={100 + r * Math.sin(a)}
                    x2={100 - r * Math.cos(a)}
                    y2={100 - r * Math.sin(a)}
                  />
                );
              })}
            </g>
          </svg>

          {/* 金句文本 */}
          <p
            id="poster-quote"
            style={{
              position: 'relative',
              zIndex: 2,
              fontFamily: '"Noto Serif SC", "STSong", serif',
              fontSize: '48px',
              fontWeight: 500,
              lineHeight: 1.8,
              color: '#f5e6c8',
              textAlign: 'center',
              textShadow: '0 0 20px rgba(212,175,55,0.5)',
              maxWidth: '880px',
              wordBreak: 'break-word',
            }}
          >
            「载入中…」
          </p>

          {/* 底部水印 */}
          <div
            style={{
              position: 'absolute',
              bottom: '80px',
              left: 0,
              right: 0,
              textAlign: 'center',
              zIndex: 2,
            }}
          >
            <p
              style={{
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '32px',
                color: '#d4af37',
                letterSpacing: '12px',
                margin: 0,
              }}
            >
              牧心堂
            </p>
            <p
              style={{
                fontFamily: 'sans-serif',
                fontSize: '16px',
                color: 'rgba(245,230,200,0.4)',
                letterSpacing: '4px',
                marginTop: '8px',
              }}
            >
              MUXINTANG · 行者故事
            </p>
          </div>
        </div>
      </div>

      {/* 金句海报 · 积分消耗确认弹窗（生成前） */}
      {posterConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !posterBusy && setPosterConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-accent/40
                       bg-background p-6 text-center shadow-[0_0_60px_-20px_rgba(212,175,55,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="text-4xl">
              🪷
            </span>
            <h3 className="mt-3 font-serif text-lg text-foreground">
              生成金句海报
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">
              是否消耗{' '}
              <span className="font-semibold text-accent">
                {POSTER_CREDITS_COST} 藏经阁积分
              </span>{' '}
              生成金句海报？
            </p>
            {userLoggedIn ? (
              <p className="mt-2 text-xs text-foreground/50">
                当前积分余额：
                <span className="text-accent">{userCredits}</span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-foreground/50">
                · 请先登录 ·
              </p>
            )}

            {posterSpendError && (
              <p className="mt-3 rounded-lg border border-accent/40 bg-accent/10
                            px-3 py-2 text-xs text-accent">
                ※ {posterSpendError}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPosterConfirmOpen(false)}
                disabled={posterBusy}
                className="flex-1 rounded-lg border border-foreground/20
                           px-4 py-2.5 text-sm text-foreground/70
                           transition hover:bg-foreground/5
                           disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleGeneratePoster()}
                disabled={posterBusy}
                className="flex-1 rounded-lg bg-accent px-4 py-2.5
                           font-serif text-sm text-background transition
                           hover:bg-accent/90
                           disabled:cursor-not-allowed disabled:opacity-60"
              >
                {posterBusy ? '生成中…' : `⚡ 确认生成`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 朋友圈积分提示弹窗 */}
      {posterDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPosterDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-accent/40
                       bg-background p-6 text-center shadow-[0_0_60px_-20px_rgba(212,175,55,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="text-4xl">
              🪷
            </span>
            <h3 className="mt-3 font-serif text-lg text-foreground">
              金句分享卡已下载
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">
              将金句分享至朋友圈，可获得额外
              <span className="font-serif text-accent">「藏经阁」</span>
              积分。
            </p>
            <button
              type="button"
              onClick={() => setPosterDialogOpen(false)}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5
                         font-serif text-sm text-background transition
                         hover:bg-primary/90"
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {/* 批注对话框 */}
      {dialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-primary/40
                       bg-background p-6 shadow-[0_0_60px_-20px_rgba(212,175,55,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-3">
              <p className="text-[10px] tracking-[0.3em] text-primary/60">
                ANNOTATION · 写心语
              </p>
              <h3 className="mt-1 font-serif text-lg text-foreground">
                为这段文字写下感受
              </h3>
            </header>

            {/* 选中文本预览 */}
            <blockquote
              className="mb-4 rounded-lg border-l-2 border-primary/40
                         bg-primary/5 px-3 py-2 text-sm italic
                         text-foreground/70"
            >
              「{selection?.text}」
            </blockquote>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="写下您对这段文字的修行随感…"
              rows={4}
              maxLength={300}
              autoFocus
              className="w-full resize-none rounded-lg border border-primary/25
                         bg-background/70 px-3 py-2.5 text-sm text-foreground
                         placeholder:text-foreground/30
                         focus:border-primary focus:outline-none"
            />

            {dialogError && (
              <p className="mt-2 text-xs text-accent">※ {dialogError}</p>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => void saveAnnotation()}
                disabled={submitting}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5
                           font-serif text-sm text-background transition
                           hover:bg-primary/90
                           disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? '保存中…' : '保存批注'}
              </button>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg border border-primary/30 px-4 py-2.5
                           text-sm text-foreground/70 transition
                           hover:border-primary hover:text-primary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加载提示 */}
      {loading && (
        <p className="text-center text-[10px] tracking-wider text-foreground/30">
          · 批注加载中 ·
        </p>
      )}
    </div>
  );
}

export default ChapterReader;
