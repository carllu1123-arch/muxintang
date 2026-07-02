'use client';

/**
 * 牧心堂 · 今日阿阇梨晨音
 *
 * 行为：
 *   1. 组件挂载时自动 fetch /api/tts
 *   2. 取得 WAV 字节 → 转 Blob URL → 喂给 <audio>
 *   3. 展示当日偈语（固定表，按日期取一句）
 *   4. 黑底金边 / 磨砂玻璃 / 与个人中心风格一致
 *
 * Props：
 *   - displayName: 用户称呼（用于"道友"称谓）
 *
 * 错误兜底：
 *   - 网络失败 / TTS 路由异常 → 显示"今日暂未开示"，按钮允许重试
 */

import { useEffect, useRef, useState } from 'react';
import { markPractice } from '@/lib/practice';

interface MorningVoiceProps {
  displayName?: string;
}

const MORNING_QUOTES = [
  '「心如止水，行如微风。」',
  '「观呼吸三息，自见本来。」',
  '「晨钟入耳，万缘放下。」',
  '「一念清净，烦恼即菩提。」',
  '「先安住，后观照。」',
  '「怒时返观，惧时返闻。」',
  '「心不动，则万物自现。」',
];

function pickQuote(seed: number): string {
  return MORNING_QUOTES[seed % MORNING_QUOTES.length];
}

function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function MorningVoice({ displayName = '道友' }: MorningVoiceProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  /** 本次会话是否已报过一次 audio_complete（去重） */
  const completedRef = useRef(false);
  /** audio 元素 ref（用于读取 currentTime / duration） */
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  async function load() {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch('/api/tts', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setStatus('ready');
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '未知错误';
      setError(msg);
      setStatus('error');
    }
  }

  /**
   * 通用埋点（fire-and-forget；失败不影响 UI）
   * - 列入白名单的事件才会被服务端接收
   * - 不阻塞主流程
   */
  function track(
    event:
      | 'audio_play'
      | 'audio_pause'
      | 'audio_complete',
    extra?: Record<string, unknown>,
  ) {
    try {
      void fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          source: 'daily_voice',
          props: extra,
          ts: Date.now(),
        }),
      });
    } catch {
      /* 静默 — 埋点失败不打断用户体验 */
    }
  }

  function handlePlay() {
    track('audio_play');
  }

  function handlePause() {
    track('audio_pause', {
      currentTime: audioElRef.current?.currentTime ?? null,
    });
  }

  /**
   * 完整听完条件：
   *   - audio 元素 onEnded 触发
   *   - 或用户手动 seek 到末尾（>= 0.95 * duration）
   *   - 且本次会话未报过
   */
  function handleEnded() {
    const el = audioElRef.current;
    const listened =
      el && el.duration > 0 ? el.currentTime / el.duration >= 0.95 : true;
    if (listened && !completedRef.current) {
      completedRef.current = true;
      track('audio_complete', {
        duration: el?.duration ?? null,
      });
      // 写入今日修行打卡（供 /me 页面"今日精进"徽章）
      markPractice('audioListened');
    }
  }

  // 挂载时自动加载
  useEffect(() => {
    void load();
    // 卸载时释放 Blob URL
    return () => {
      // 注意：cleanup 时拿到的 url 是当时的 state
      // 用 setAudioUrl 闭包不可靠，但每次新加载都会 revoke 上一个
    };
  }, []);

  const quote = pickQuote(daySeed());
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <section
      aria-label="今日阿阇梨晨音"
      className="rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-md md:p-6"
    >
      <header className="mb-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-foreground/40">
            MORNING · VOICE
          </p>
          <h3 className="mt-1 font-serif text-xl text-primary md:text-2xl">
            今日阿阇梨晨音
          </h3>
        </div>
        <span className="text-xs text-foreground/50">
          {today} · 致 {displayName}
        </span>
      </header>

      {/* 当日偈语 */}
      <p className="mb-4 font-serif text-base italic text-foreground/85 md:text-lg">
        {quote}
      </p>

      {/* 音频播放器 */}
      <div className="space-y-2">
        {status === 'loading' && (
          <div className="rounded-lg border border-primary/20 bg-muted/40 p-3 text-center text-sm text-foreground/60">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
              />
              开示准备中…
            </span>
          </div>
        )}

        {status === 'ready' && audioUrl && (
          <audio
            ref={audioElRef}
            controls
            className="w-full"
            src={audioUrl}
            preload="metadata"
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
          >
            您的浏览器不支持 audio 元素。
          </audio>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <p className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
              今日暂未开示（{error ?? '未知错误'}）
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-primary/40 px-4 py-2 text-sm text-primary
                         transition hover:bg-primary hover:text-background"
            >
              重试
            </button>
          </div>
        )}

        <p className="text-[11px] tracking-wider text-foreground/40">
          · 30 秒占位（136Hz 嗡音），后续接入真人语音 / Edge TTS ·
        </p>
      </div>
    </section>
  );
}
