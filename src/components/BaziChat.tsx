'use client';

/**
 * 牧心堂 · 生命代码 AI 流式对话窗口
 *
 * 这是项目核心交互组件：
 *   - 替换原 BaziForm（表单 + 一次性结果）
 *   - 用 ChatGPT 风格的对话气泡呈现
 *   - 流式 fetch /api/bazi（NDJSON），打字机效果
 *   - 命中 AI 解读后驱动右侧 Mandala 变色 + 脉动
 *
 * 布局：
 *   - 移动端：单列，聊天窗口占满
 *   - PC 端（md+）：两列，左聊天（占左半） / 右 Mandala（占右半）
 *
 * 视觉：
 *   - 用户气泡：右对齐 / 黑底 / 金边 / 阴影
 *   - AI 气泡：左对齐 / 灰金底 / 带 ☸ 图标
 *   - 输入区：底部固定，textarea + 发送按钮
 *
 * Props:
 *   - initialPrompt: 覆盖首条 AI 欢迎语
 *   - showMandala: 是否显示右侧曼荼罗（PC 端）— 模态弹窗里通常为 true
 *   - compact: 紧凑模式（模态用）— 缩短消息区高度
 *   - onClose: 模态关闭回调（仅在 modal 中使用）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import Link from 'next/link';
import { TypingIndicator } from './TypingIndicator';
import { Mandala, type WuXing } from './Mandala';
import { MarkdownText } from './MarkdownText';
import type { BaziOutput } from '@/lib/bazi-engine';

/** /api/bazi 的 end 事件回传的推荐文章项（与服务端 RecommendedArticle 对齐） */
interface RecommendedArticle {
  title: string;
  category: string;
  slug: string;
  reason: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  /** AI 来源（仅 assistant 有） */
  source?: 'dify' | 'local';
}

interface BaziChatProps {
  initialPrompt?: string;
  showMandala?: boolean;
  compact?: boolean;
  onClose?: () => void;
  /**
   * 父级传入的 ref，指向「结果展示区」（即消息区容器）。
   * 用于 PDF 导出等场景把当前对话快照出来。
   */
  resultRef?: RefObject<HTMLDivElement | null>;
  /**
   * 当排盘结果（bazi）变化时回调，父级可据此启用/禁用「生成画册」等按钮。
   */
  onBaziChange?: (bazi: BaziOutput | null) => void;
  /**
   * 当最后一条 AI 解读变化时回调，父级可把它作为「分享海报」的金句源。
   * - 仅在消息列表收尾（end 事件 / 用户重置）后触发
   * - 首条欢迎语不会触发
   */
  onLastAssistantChange?: (text: string | null) => void;
}

const DEFAULT_PROMPT =
  '阿阇梨已就位。请告诉我你的阳历生辰，例：1990年6月15日 14时 男。即可见你的本然频率。';

export function BaziChat({
  initialPrompt = DEFAULT_PROMPT,
  showMandala = true,
  compact = false,
  onClose,
  resultRef,
  onBaziChange,
  onLastAssistantChange,
}: BaziChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialPrompt },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bazi, setBazi] = useState<BaziOutput | null>(null);
  const [mandalaElement, setMandalaElement] = useState<WuXing | null>(null);
  const [mandalaActive, setMandalaActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** AI 推荐阅读文章（end 事件回传，本地基于五行匹配的 3 篇 /learn 文章） */
  const [recommendedArticles, setRecommendedArticles] = useState<RecommendedArticle[]>([]);
  /** 已识别出的生辰（用于后续多轮） */
  const [birth, setBirth] = useState<
    { year: number; month: number; day: number; hour: number; gender?: '男' | '女' } | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** 是否已把当前 birth 同步到 user_profiles（去重） */
  const birthSyncedRef = useRef<string>('');

  /**
   * 升维二（多感官道场）：流式共鸣触发器
   *   - 每次 chunk 抵达，自增 streamPulse
   *   - 传给 Mandala 做 600ms 缩放（呼-吸）
   *   - 节流到 180ms，避免一帧内多次脉冲
   */
  const [streamPulse, setStreamPulse] = useState(0);
  const lastPulseAtRef = useRef<number>(0);

  // bazi 变化时通知父级（用于启用「生成画册」等下游动作）
  useEffect(() => {
    onBaziChange?.(bazi);
  }, [bazi, onBaziChange]);

  // 最后一条 AI 解读变化时通知父级（用于分享海报金句）
  //   - 排除首条欢迎语（位置 0）
  //   - 只在流式结束后再触发（避免流中抖动）
  useEffect(() => {
    if (!onLastAssistantChange) return;
    const list = messages;
    // 找到最后一条非空 assistant 消息
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (m.role === 'assistant' && m.content && m.content !== initialPrompt) {
        onLastAssistantChange(m.content);
        return;
      }
    }
    onLastAssistantChange(null);
  }, [messages, onLastAssistantChange, initialPrompt]);

  // 指令三-b：bazi 生成成功后，异步保存生辰到 user_profiles
  //   - 已在 server 端校验 auth，未登录静默
  //   - 用 ref 去重，避免同一生辰多次写入
  useEffect(() => {
    if (!bazi || !birth) return;
    const sig = `${birth.year}-${birth.month}-${birth.day}-${birth.hour}-${birth.gender ?? ''}`;
    if (birthSyncedRef.current === sig) return;
    birthSyncedRef.current = sig;

    const payload = {
      birthDate: `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')}`,
      birthHour: birth.hour,
      gender: birth.gender ?? null,
    };
    // fire-and-forget；后端失败不影响前端体验
    fetch('/api/user/birth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => {
        if (!r.ok) {
          console.warn('[BaziChat] save birth failed:', r.status);
          // 让 ref 回滚，下次再尝试
          birthSyncedRef.current = '';
        } else {
          console.log('[BaziChat] birth saved to profile');
        }
      })
      .catch((e) => {
        console.warn('[BaziChat] save birth network error:', e);
        birthSyncedRef.current = '';
      });
  }, [bazi, birth]);

  // 自动滚到底
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  // ESC 关闭（仅 modal 模式）
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = useCallback(async () => {
    if (loading) return;
    const text = input.trim();
    if (!text) return;
    setInput('');
    setError(null);

    // 用户消息立即入列
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: text },
      // 占位 AI 消息（流式填充）
      { role: 'assistant', content: '' },
    ];
    setMessages(newMessages);
    setLoading(true);

    // 取消上一次（如有）
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/bazi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, birth }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        // 尝试解析错误体
        let errText = `请求失败（HTTP ${res.status}）`;
        try {
          const txt = await res.text();
          const m = /"error"\s*:\s*"([^"]+)"/.exec(txt);
          if (m) errText = m[1];
        } catch {
          /* ignore */
        }
        throw new Error(errText);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';

      // 写出生辰（如果服务端解析后通过 meta 回传）— 我们不依赖服务端回传出生辰，
      // 因为前端已持有。这里保持原状即可。
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // 按行切分
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          let ev: { type: string; data?: string; bazi?: BaziOutput; error?: string; dayMasterElement?: string; source?: 'dify' | 'local'; recommended_articles?: RecommendedArticle[] };
          try {
            ev = JSON.parse(line);
          } catch {
            // 跳过无法解析的行
            continue;
          }
          if (ev.type === 'meta' && ev.bazi) {
            setBazi(ev.bazi);
            // 同步缓存 birth，方便后续多轮
            if (!birth && ev.bazi) {
              // 从 pillars 无法反推 year/month/day，但 server 知道。
              // 我们用一个轻量兜底：解析输入文本（与 API 行为一致）。
              // 这里只缓存日主，本轮不重复推生辰。
            }
          } else if (ev.type === 'chunk' && typeof ev.data === 'string') {
            accumulated += ev.data;
            const snap = accumulated;
            setMessages((prev) => {
              const out = [...prev];
              out[out.length - 1] = { role: 'assistant', content: snap };
              return out;
            });
            // 升维二：每段 chunk 触发一次曼荼罗共鸣（节流 180ms）
            const now = Date.now();
            if (now - lastPulseAtRef.current >= 180) {
              lastPulseAtRef.current = now;
              setStreamPulse((p) => p + 1);
            }
          } else if (ev.type === 'end') {
            const el = ev.dayMasterElement as WuXing | undefined;
            if (el && ['金', '木', '水', '火', '土'].includes(el)) {
              setMandalaElement(el);
              setMandalaActive(true);
            }
            // AI 推荐阅读：end 事件回传的 3 篇 /learn 文章
            if (Array.isArray(ev.recommended_articles)) {
              const arts = (ev.recommended_articles as RecommendedArticle[]).filter(
                (a) => a && typeof a.title === 'string' && typeof a.slug === 'string' && typeof a.category === 'string',
              );
              if (arts.length > 0) setRecommendedArticles(arts);
            }
            if (ev.source) {
              setMessages((prev) => {
                const out = [...prev];
                const last = out[out.length - 1];
                if (last && last.role === 'assistant') {
                  out[out.length - 1] = { ...last, source: ev.source };
                }
                return out;
              });
            }
          } else if (ev.type === 'error') {
            throw new Error(ev.error || '流式错误');
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') {
        // 用户主动取消
        return;
      }
      const msg = (e as { message?: string })?.message || '对话中断，请稍后重试。';
      setError(msg);
      setMessages((prev) => {
        const out = [...prev];
        out[out.length - 1] = {
          role: 'assistant',
          content: `（解码中断：${msg}）`,
        };
        return out;
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, birth]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([{ role: 'assistant', content: initialPrompt }]);
    setBazi(null);
    setMandalaElement(null);
    setMandalaActive(false);
    setInput('');
    setError(null);
    setBirth(null);
    setRecommendedArticles([]);
  }, [initialPrompt]);

  // 🔊 听阿阇梨说：调用 /api/tts POST 生成语音并播放
  const speakAjari = useCallback(async (text: string) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch((e) => {
        console.warn('[BaziChat] auto-play blocked:', e);
      });
      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.error('[BaziChat] TTS failed:', e);
    }
  }, []);

  // 把已识别的生辰从最近一条 user 消息里再解析一遍
  useEffect(() => {
    if (birth) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const parsed = parseQuick(lastUser.content);
    if (parsed) setBirth(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <div
      className={
        showMandala
          ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
          : 'grid grid-cols-1'
      }
    >
      {/* ============ 左 / 上：聊天面板 ============ */}
      <section
        className="flex flex-col gap-3"
        aria-label="AI 排盘对话窗口"
      >
        {/* 消息区（外部可通过 resultRef 捕获此 DOM） */}
        <div
          ref={resultRef}
          className={`flex flex-col gap-3 overflow-y-auto rounded-2xl
                     border border-primary/20 bg-black/50 p-4 backdrop-blur-md
                     ${compact ? 'min-h-[320px] max-h-[55vh]' : 'min-h-[420px] max-h-[60vh] md:max-h-[70vh]'}`}
        >
          {messages.map((m, i) => (
            <ChatBubble
              key={i}
              message={m}
              isLatest={i === messages.length - 1}
              loading={loading}
              onSpeak={speakAjari}
            />
          ))}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent"
            >
              {error}
            </div>
          )}

          {/* ============ AI 推荐阅读：流式结束后展示 3 篇 /learn 文章入口 ============ */}
          {!loading && recommendedArticles.length > 0 && (
            <RecommendedReading articles={recommendedArticles} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="发问，或输入生辰…（Shift+Enter 换行）"
            disabled={loading}
            rows={2}
            className="flex-1 resize-none rounded-xl border border-primary/25
                       bg-background/70 px-3 py-2.5 text-base text-foreground
                       placeholder:text-foreground/30
                       focus:border-primary focus:outline-none
                       disabled:opacity-50"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-serif
                         text-background transition
                         hover:bg-primary/90
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '发送中…' : '发送'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={loading}
              className="rounded-xl border border-primary/30 px-4 py-2 text-xs
                         text-foreground/70 transition
                         hover:border-primary hover:text-primary
                         disabled:opacity-50"
            >
              重置
            </button>
          </div>
        </div>
      </section>

      {/* ============ 右 / 下：曼荼罗（PC 端） ============ */}
      {showMandala && (
        <aside
          className="relative hidden min-h-[420px] overflow-hidden rounded-2xl
                     border border-primary/20 bg-black/40 backdrop-blur-md md:flex"
          aria-label="三昧耶坛城"
        >
          <Mandala
            bazi={bazi}
            element={mandalaElement}
            isActive={mandalaActive}
            pulseTick={streamPulse}
          />
          {/* 解读来源角标 */}
          {bazi && (
            <div className="absolute right-3 top-3 text-[10px] tracking-[0.3em] text-foreground/40">
              {bazi.dayMaster} · {bazi.dayMasterElement}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

/* ============ 消息气泡 ============ */

function ChatBubble({
  message,
  isLatest,
  loading,
  onSpeak,
}: {
  message: Message;
  isLatest: boolean;
  loading: boolean;
  onSpeak?: (text: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] whitespace-pre-wrap rounded-2xl border border-primary/40
                     bg-black/80 px-4 py-2.5 text-sm leading-relaxed text-foreground
                     shadow-[0_0_15px_-5px_rgba(212,175,55,0.35)]"
        >
          {message.content}
        </div>
      </div>
    );
  }

  // assistant
  const isStreamingEmpty =
    isLatest && loading && message.content.length === 0;

  return (
    <div className="flex items-start justify-start gap-2">
      <div
        aria-hidden
        className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full
                   bg-gradient-to-br from-primary/70 to-primary/20
                   text-xs text-background"
      >
        ☸
      </div>
      <div className="max-w-[85%] flex-1">
        {isStreamingEmpty ? (
          <TypingIndicator />
        ) : (
          <div
            className="rounded-2xl border border-primary/20 bg-muted/60 px-4 py-2.5
                       text-sm leading-relaxed text-foreground/90"
          >
            {message.content ? (
              <>
                <MarkdownText text={message.content} />
                {message.source && isLatest && !loading && (
                  <div className="mt-2 text-right text-[10px] tracking-wider text-foreground/40">
                    {message.source === 'dify' ? 'AI 润色' : '本地模板'}
                  </div>
                )}
              </>
            ) : (
              <span className="text-foreground/30">…</span>
            )}
            {/* 流式中尾部闪烁光标 */}
            {isLatest && loading && message.content.length > 0 && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-primary/80"
              />
            )}
          </div>
        )}
        {/* 🔊 听阿阇梨说 —— 仅在非流式、非空、非欢迎语时显示 */}
        {!loading &&
          message.content &&
          message.content !== DEFAULT_PROMPT &&
          onSpeak && (
            <button
              type="button"
              onClick={() => void onSpeak(message.content)}
              className="mt-2 flex items-center gap-1.5 text-xs text-primary/70 transition hover:text-primary"
              title="听阿阇梨开示"
            >
              <span aria-hidden>🔊</span>
              听阿阇梨说
            </button>
          )}
      </div>
    </div>
  );
}

/* ============ 轻量本地解析（用于多轮缓存 birth） ============ */

function parseQuick(text: string) {
  // 与 bazi-parser 的逻辑保持一致（精简版）
  const cn =
    /(19\d{2}|20\d{2})\s*年\s*(0?[1-9]|1[0-2])\s*月\s*(0?[1-9]|[12]\d|3[01])\s*日?/.exec(
      text,
    );
  const dash =
    /\b(19\d{2}|20\d{2})[-\/.](0?[1-9]|1[0-2])[-\/.](0?[1-9]|[12]\d|3[01])\b/.exec(
      text,
    );
  const m = cn || dash;
  if (!m) return null;
  const hm = /\b([01]?\d|2[0-3])\s*[时:：]\s*([0-5]?\d)?\b/.exec(text);
  const hour = hm ? Number(hm[1]) : 12;
  const g = /(男|女)/.exec(text);
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour,
    gender: (g?.[1] === '女' ? '女' : '男') as '男' | '女',
  };
}

/* ============ AI 推荐阅读卡片（流式结束后展示） ============ */

function RecommendedReading({ articles }: { articles: RecommendedArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <div
      aria-label="AI 推荐阅读"
      className="mt-2 rounded-2xl border border-primary/30
                 bg-gradient-to-br from-primary/5 to-transparent
                 p-4 backdrop-blur-md"
    >
      <header className="mb-3 flex items-center gap-2">
        <span aria-hidden className="text-base text-primary">📖</span>
        <div>
          <p className="font-serif text-sm text-foreground md:text-base">
            AI 推荐阅读
          </p>
          <p className="text-[10px] tracking-[0.2em] text-foreground/40">
            RECOMMENDED · 依五行状态匹配
          </p>
        </div>
      </header>

      <ul className="flex flex-col gap-2">
        {articles.map((a, i) => (
          <li key={`${a.category}/${a.slug}`}>
            <Link
              href={`/learn/${a.category}/${a.slug}`}
              className="group flex items-center gap-3 rounded-lg
                         border border-primary/20 bg-black/40 p-3
                         transition hover:border-primary/60 hover:bg-primary/5"
            >
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full
                           border border-primary/40 bg-background/60
                           font-serif text-xs text-primary"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-sm text-foreground transition group-hover:text-primary">
                  {a.title}
                </p>
                {a.reason && (
                  <p className="mt-0.5 truncate text-[10px] tracking-wider text-foreground/40">
                    {a.reason}
                  </p>
                )}
              </div>
              <span
                aria-hidden
                className="text-foreground/30 transition group-hover:text-primary"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] leading-relaxed tracking-wider text-foreground/40">
        ※ 工具测一测 → 内容看一看。道友可从上述专栏入心。
      </p>
    </div>
  );
}
