'use client';

/**
 * 牧心堂 · 灵性研学 · 客户端容器
 *
 * 位置：/study 页面
 *
 * 职责：
 *   1. 顶部分类 Tabs：全部 / 打卡 / 感悟 / 问答 / 分享
 *   2. 响应式网格：移动 1 列 / 平板 2 列 / PC 3 列
 *   3. 「✍️ 记录修行」金色按钮 + 黑金磨砂模态框
 *   4. 提交走 POST /api/study/posts，未配置 Supabase 时走 mock
 *   5. 日期使用 formatYmdOrRecent 安全格式化（消除 Invalid Date）
 *
 * 数据流：
 *   - page.tsx (server) → getStudyPosts() → 传入 initialPosts
 *   - 客户端持有 posts state，提交成功后把新帖乐观插入头部
 *   - 切换 Tab 只做客户端 useState 过滤，不重新请求
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatChineseShortDate } from '@/lib/date';
import type { JournalEntry } from '@/types/supabase';

type Tab = '全部' | '打卡' | '感悟' | '问答' | '分享';
const TABS: Tab[] = ['全部', '打卡', '感悟', '问答', '分享'];

/**
 * 规整分类：
 *   - journal_entries 旧字段是 '随笔'（= 感悟的早期命名）
 *   - study_posts 新字段是 '感悟'
 *   - 兼容：'随笔' 与 '感悟' 等价
 */
type RawCategory = '打卡' | '随笔' | '感悟' | '问答' | '分享' | string;
function rawCategoryOf(item: JournalEntry): RawCategory {
  // study_posts 用 category，journal_entries 用 type
  const any = item as unknown as { category?: string; type?: string };
  return (any.category ?? any.type ?? '分享') as RawCategory;
}

function normalizeCategory(item: JournalEntry): Exclude<Tab, '全部'> {
  const raw = rawCategoryOf(item);
  if (raw === '随笔') return '感悟';
  if (raw === '打卡' || raw === '感悟' || raw === '问答' || raw === '分享') {
    return raw;
  }
  return '分享';
}

const CATEGORY_STYLES: Record<string, string> = {
  打卡: 'border-primary/40 text-primary bg-primary/10',
  感悟: 'border-foreground/30 text-foreground/80 bg-foreground/5',
  随笔: 'border-foreground/30 text-foreground/80 bg-foreground/5',
  问答: 'border-accent/40 text-accent bg-accent/10',
  分享: 'border-primary/30 text-primary/80 bg-primary/5',
};

const CATEGORY_GLYPH: Record<string, string> = {
  打卡: '✦',
  感悟: '☾',
  问答: '◈',
  分享: '✧',
};

export function StudyContent({ initialPosts }: { initialPosts: JournalEntry[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('全部');
  const [posts, setPosts] = useState<JournalEntry[]>(initialPosts);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const filtered = useMemo(() => {
    if (activeTab === '全部') return posts;
    return posts.filter((p) => normalizeCategory(p) === activeTab);
  }, [activeTab, posts]);

  // 每个 tab 的数量（用于角标）
  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      全部: posts.length,
      打卡: 0,
      感悟: 0,
      问答: 0,
      分享: 0,
    };
    for (const p of posts) {
      const k = normalizeCategory(p);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [posts]);

  return (
    <>
      {/* 标题行 + 发布按钮 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.4em] text-primary/60 md:text-xs">
            STUDY
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-wider text-foreground md:text-5xl">
            灵性研学
          </h1>
          <p className="mt-2 text-sm text-foreground/60 md:mt-3 md:text-base">
            同修的日常 · 相互映照的修行
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-1 flex shrink-0 items-center gap-2 rounded-full
                     border border-primary/50 bg-primary
                     px-4 py-2.5 font-serif text-sm text-background
                     shadow-[0_0_24px_-8px_rgba(212,175,55,0.7)]
                     transition hover:bg-primary/90
                     md:mt-2 md:px-5 md:text-base"
        >
          <span aria-hidden>✍️</span>
          <span className="hidden sm:inline">记录今日修行</span>
        </button>
      </div>

      {/* 分类 Tabs */}
      <nav
        role="tablist"
        aria-label="灵性研学分类"
        className="flex gap-1.5 overflow-x-auto pb-1
                   md:gap-2"
      >
        {TABS.map((t) => {
          const active = activeTab === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setActiveTab(t)}
              className={[
                'shrink-0 rounded-full border px-3.5 py-1.5',
                'text-xs tracking-wider transition md:px-4 md:text-sm',
                active
                  ? 'border-primary bg-primary text-background shadow-[0_0_18px_-6px_rgba(212,175,55,0.6)]'
                  : 'border-primary/25 text-foreground/60 hover:border-primary/50 hover:text-foreground/90',
              ].join(' ')}
            >
              {t}
              <span
                className={[
                  'ml-1.5 inline-block min-w-[1.25rem] rounded-full px-1.5 text-[10px]',
                  active
                    ? 'bg-background/20 text-background/90'
                    : 'bg-foreground/10 text-foreground/40',
                ].join(' ')}
              >
                {counts[t] ?? 0}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 文章列表（响应式网格） */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary/20 bg-muted/20 px-6 py-16 text-center">
          <p className="font-serif text-base text-foreground/60 md:text-lg">
            该分类下暂无内容
          </p>
          <p className="mt-2 text-xs text-foreground/40">
            做第一个留下记录的人 · 点右上角「✍️ 记录修行」
          </p>
        </div>
      ) : (
        <section
          aria-label={`${activeTab}分类的文章`}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-6"
        >
          {filtered.map((e) => {
            const cat = normalizeCategory(e);
            return (
              <article
                key={e.id}
                className="flex h-full flex-col rounded-2xl border border-border bg-muted/40 p-5
                           transition hover:border-primary/40 hover:shadow-[0_0_24px_-12px_rgba(212,175,55,0.4)]
                           md:p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="grid h-7 w-7 place-items-center rounded-full
                                 border border-primary/30 bg-primary/10
                                 font-serif text-sm text-primary"
                    >
                      {CATEGORY_GLYPH[cat] ?? '✦'}
                    </span>
                    <span className="font-serif text-sm text-foreground md:text-base">
                      {e.author_name}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] tracking-wider
                                  ${CATEGORY_STYLES[cat] ?? ''}`}
                    >
                      {cat}
                    </span>
                  </div>
                  <span className="text-[10px] tracking-wider text-foreground/40">
                    {formatChineseShortDate(e.published_at)}
                  </span>
                </div>

                <h2 className="mt-3 font-serif text-base text-foreground md:text-lg">
                  {e.title || '—'}
                </h2>
                <p className="mt-2 line-clamp-4 flex-1 text-sm leading-relaxed text-foreground/70 md:text-base">
                  {e.excerpt || (e.body ? e.body.slice(0, 140) : '')}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-foreground/50">
                  <div className="flex items-center gap-4">
                    <span>♥ {e.like_count ?? 0}</span>
                    <span>💬 {e.comment_count ?? 0}</span>
                  </div>
                  {e.title && (
                    <span className="text-[10px] tracking-wider text-primary/70">
                      阅读全文 →
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <p className="text-center text-xs text-foreground/40">
        · 登录后可发帖；非会员可读但不可互动 ·
      </p>

      {/* 发布模态框 */}
      {modalOpen && (
        <PostModal
          onClose={() => setModalOpen(false)}
          onSuccess={(newPost, isMock) => {
            setPosts((prev) => [newPost, ...prev]);
            setModalOpen(false);
            setActiveTab('全部');
            setToast({
              kind: 'ok',
              text: isMock
                ? '已记录（演示模式，未写入数据库）'
                : '已记录，感谢您的分享 ✦',
            });
          }}
          onError={(msg) => {
            setToast({ kind: 'err', text: msg });
          }}
        />
      )}

      {/* 轻提示 */}
      {toast && (
        <Toast
          kind={toast.kind}
          text={toast.text}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

/* ============================================
 * PostModal — 发布模态框
 * ============================================ */

function PostModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: (post: JournalEntry, isMock: boolean) => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Exclude<Tab, '全部'>>('感悟');
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ESC 关闭
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  // 锁滚动
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const dialogRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      onError('正文不能为空');
      return;
    }
    if (trimmedBody.length > 2000) {
      onError('正文不能超过 2000 字');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/study/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          category,
          body: trimmedBody,
          authorName: authorName.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        mock?: boolean;
        post?: JournalEntry;
        error?: string;
        detail?: string;
        message?: string;
      };

      if (!res.ok || !data.ok || !data.post) {
        if (data.error === 'rate_limited') {
          onError(data.message || '请稍候再发（5 分钟内最多 3 次）');
        } else {
          onError(data.detail || data.message || '提交失败，请稍后重试');
        }
        return;
      }

      onSuccess(data.post, !!data.mock);
      // 清空表单
      setTitle('');
      setBody('');
      setAuthorName('');
    } catch {
      onError('网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="发布灵性研学帖子"
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
    >
      {/* 遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        className="relative z-10 mx-3 mb-3 w-full max-w-lg
                   rounded-2xl border border-primary/40
                   bg-gradient-to-br from-primary/15 via-black/85 to-black
                   p-5 shadow-[0_-20px_60px_-20px_rgba(212,175,55,0.5)]
                   backdrop-blur-xl md:mx-4 md:mb-0 md:p-6"
      >
        {/* 装饰光晕 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 left-1/2 h-20 w-20
                     -translate-x-1/2 rounded-full bg-primary/30 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-foreground md:text-xl">
              ✍️ 记录修行
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="关闭"
              className="grid h-8 w-8 place-items-center rounded-full
                         text-foreground/50 transition hover:bg-foreground/10
                         hover:text-foreground disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            {/* 标题（可选） */}
            <label className="block">
              <span className="flex items-center justify-between text-xs tracking-wider text-foreground/60">
                <span>
                  标题
                  <span className="ml-1 text-foreground/30">（可选）</span>
                </span>
                <span className="text-[10px] text-foreground/30">
                  {title.length}/80
                </span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="如：晨起打坐第七日"
                maxLength={80}
                disabled={submitting}
                className="mt-1.5 w-full rounded-lg border border-primary/25
                           bg-background/60 px-3 py-2.5 text-base text-foreground
                           placeholder:text-foreground/30
                           focus:border-primary focus:outline-none
                           focus:ring-1 focus:ring-primary/40
                           disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            {/* 分类下拉框 */}
            <label className="block">
              <span className="block text-xs tracking-wider text-foreground/60">
                分类
              </span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Exclude<Tab, '全部'>)
                }
                disabled={submitting}
                className="mt-1.5 w-full rounded-lg border border-primary/25
                           bg-background/60 px-3 py-2.5 text-base text-foreground
                           focus:border-primary focus:outline-none
                           focus:ring-1 focus:ring-primary/40
                           disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="打卡">✦ 打卡 · 日常修行记录</option>
                <option value="感悟">☾ 感悟 · 心境与领悟</option>
                <option value="问答">◈ 问答 · 请教同修</option>
                <option value="分享">✧ 分享 · 心得与善知识</option>
              </select>
            </label>

            {/* 署名（可选） */}
            <label className="block">
              <span className="flex items-center justify-between text-xs tracking-wider text-foreground/60">
                <span>
                  署名
                  <span className="ml-1 text-foreground/30">（可选，匿名则显示"道友"）</span>
                </span>
                <span className="text-[10px] text-foreground/30">
                  {authorName.length}/32
                </span>
              </span>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="如：清和居士"
                maxLength={32}
                disabled={submitting}
                className="mt-1.5 w-full rounded-lg border border-primary/25
                           bg-background/60 px-3 py-2.5 text-base text-foreground
                           placeholder:text-foreground/30
                           focus:border-primary focus:outline-none
                           focus:ring-1 focus:ring-primary/40
                           disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            {/* 正文 */}
            <label className="block">
              <span className="flex items-center justify-between text-xs tracking-wider text-foreground/60">
                <span>
                  正文
                  <span className="ml-1 text-primary">*</span>
                </span>
                <span className="text-[10px] text-foreground/30">
                  {body.length}/2000
                </span>
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="留下此刻的心境、打卡记录、或向同修的提问…"
                maxLength={2000}
                rows={5}
                disabled={submitting}
                className="mt-1.5 w-full resize-none rounded-lg border border-primary/25
                           bg-background/60 px-3 py-2.5 text-base text-foreground
                           placeholder:text-foreground/30
                           focus:border-primary focus:outline-none
                           focus:ring-1 focus:ring-primary/40
                           disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || body.trim().length === 0}
              className="mt-2 flex items-center justify-center gap-2
                         rounded-lg border border-primary/50 bg-primary
                         px-4 py-2.5 font-serif text-sm text-background
                         shadow-[0_0_24px_-10px_rgba(212,175,55,0.7)]
                         transition hover:bg-primary/90
                         disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span
                    aria-hidden
                    className="inline-block h-4 w-4 animate-spin rounded-full
                               border-2 border-background/40 border-t-background"
                  />
                  提交中…
                </>
              ) : (
                <>✦ 发布记录</>
              )}
            </button>

            <p className="text-center text-[10px] tracking-wider text-foreground/40">
              · 5 分钟内最多发布 3 次 · 内容公开可读 ·
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ============================================
 * Toast — 轻提示
 * ============================================ */

function Toast({
  kind,
  text,
  onDismiss,
}: {
  kind: 'ok' | 'err';
  text: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
  }, [onDismiss, text]);

  const isOk = kind === 'ok';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div
        className={[
          'flex max-w-sm items-center gap-2 rounded-full border px-4 py-2.5',
          'font-serif text-sm shadow-2xl backdrop-blur-md',
          isOk
            ? 'border-primary/50 bg-primary/15 text-primary'
            : 'border-accent/50 bg-accent/15 text-accent',
        ].join(' ')}
      >
        <span aria-hidden>{isOk ? '✦' : '⚠'}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}
