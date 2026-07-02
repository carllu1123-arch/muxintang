'use client';

/**
 * 牧心堂 · 文章 TTS 朗读组件
 *
 * 在静态文章 / 故事章节详情页顶部渲染一个"阿阇梨朗读"按钮：
 *   1. 点击 → 截取 title + 前 200 字 body
 *   2. POST /api/tts 拿 audio/wav Blob
 *   3. URL.createObjectURL → 生成临时 audioUrl
 *   4. 按钮下方动态渲染 <audio controls> 让用户边看边听
 *
 * 设计要点：
 *   - 用 objectURL 而非 dataURL（避免 base64 膨胀、避免 localStorage 占用）
 *   - 组件卸载时 revokeObjectURL 释放内存
 *   - 三态按钮：idle / loading / ready
 *   - 失败时显示错误提示，不阻塞阅读
 *   - 黑金主题 / 磨砂玻璃 / 与其他卡片视觉一致
 *
 * 用法：
 *   <ArticleTTS title={article.title} body={article.body} />
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface ArticleTTSProps {
  title: string;
  body: string;
  /** 朗读文本截取长度（含标题），默认 200 字 */
  limit?: number;
}

export function ArticleTTS({ title, body, limit = 200 }: ArticleTTSProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 保存上一次的 objectURL，便于释放
  const objectUrlRef = useRef<string | null>(null);

  /**
   * 截取朗读文本：title + 换行 + body 前 (limit - title.length) 字
   * 保证总长度不超过 limit，避免单次请求体过大
   */
  function buildSpeechText(): string {
    const titlePart = title.trim();
    const bodyPart = (body || '').replace(/\s+/g, ' ').trim();
    const remaining = Math.max(0, limit - titlePart.length - 1);
    const bodySlice = bodyPart.slice(0, remaining);
    return bodySlice ? `${titlePart}\n${bodySlice}` : titlePart;
  }

  const handleSpeak = useCallback(async () => {
    const text = buildSpeechText();
    if (!text) return;

    // 释放上一次的 objectURL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setAudioUrl(null);
    setError(null);
    setLoading(true);

    try {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${r.status}`);
      }

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setAudioUrl(url);
    } catch (e) {
      const msg = (e as { message?: string })?.message || '阿阇梨暂未在线';
      setError(msg);
    } finally {
      setLoading(false);
    }
    // buildSpeechText 不进 deps（依赖 title/body，闭包足够稳定）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, limit]);

  /** 卸载时释放 objectURL，避免内存泄漏 */
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  return (
    <section
      aria-label="文章朗读"
      className="rounded-2xl border border-primary/30
                 bg-black/40 p-4 backdrop-blur-md md:p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-full
                       border border-primary/40 bg-background/60
                       font-serif text-base text-primary"
          >
            {loading ? '…' : '🔊'}
          </span>
          <div>
            <p className="font-serif text-sm text-foreground md:text-base">
              阿阇梨朗读
            </p>
            <p className="text-[10px] tracking-wider text-foreground/50">
              TTS · 约 {limit} 字预览
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSpeak()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2
                     rounded-lg border border-primary/40 bg-primary/5
                     px-4 py-2 text-sm font-serif text-primary
                     transition hover:border-primary hover:bg-primary/10
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <span
                aria-hidden
                className="inline-block h-3 w-3 animate-spin
                           rounded-full border-2 border-primary/40
                           border-t-primary"
              />
              合成中…
            </>
          ) : audioUrl ? (
            <>重新朗读</>
          ) : (
            <>开始朗读</>
          )}
        </button>
      </div>

      {/* 动态 audio 播放器 */}
      {audioUrl && (
        <audio
          controls
          autoPlay
          src={audioUrl}
          className="mt-3 w-full"
          aria-label="阿阇梨朗读音频"
        />
      )}

      {/* 错误提示 */}
      {error && (
        <p className="mt-2 text-xs text-accent">
          ※ {error}
        </p>
      )}
    </section>
  );
}

export default ArticleTTS;
