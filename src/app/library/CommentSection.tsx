'use client';

/**
 * 牧心堂 · 行者故事 · 底部"读后感"评论区
 *
 * - 黑金磨砂输入框，提示"在此留下你的修行随感…"
 * - 可选"阅读进度"标签（读到第几段产生此感）
 * - 评论列表：精选置顶 + 时间倒序
 * - 阿阇梨回复带金色 🪷 徽章
 */

import { useEffect, useState } from 'react';
import { AcharyaBadge } from '@/components/AcharyaBadge';

interface Comment {
  id: string;
  chapter_slug: string;
  author_name: string;
  author_role: string;
  body: string;
  reading_tag: string | null;
  is_featured: boolean;
  created_at: string;
}

interface CommentSectionProps {
  chapterSlug: string;
  /** 段落数量（用于"读到第X段"下拉） */
  paragraphCount: number;
}

export function CommentSection({ chapterSlug, paragraphCount }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [body, setBody] = useState('');
  const [readingTag, setReadingTag] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showTagSelector, setShowTagSelector] = useState(false);
  /** 当前用户角色（用于阿阇梨精选按钮） */
  const [userRole, setUserRole] = useState<string>('reader');
  /** 正在精选的评论 id */
  const [featuringId, setFeaturingId] = useState<string | null>(null);

  // 拉取评论 + 当前用户角色
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [commentRes, userRes] = await Promise.all([
          fetch(`/api/library/comment?slug=${encodeURIComponent(chapterSlug)}`, {
            cache: 'no-store',
          }),
          fetch('/api/user', { cache: 'no-store' }),
        ]);
        if (commentRes.ok) {
          const { comments } = (await commentRes.json()) as { comments: Comment[] };
          if (!cancelled) setComments(comments);
        }
        if (userRes.ok) {
          const { user } = (await userRes.json()) as {
            user: { role?: string } | null;
          };
          if (!cancelled && user?.role) setUserRole(user.role);
        }
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

  const isAcharya = userRole === 'acharya' || userRole === 'admin';

  // 阿阇梨精选置顶
  async function handleFeature(commentId: string, featured: boolean) {
    if (featuringId) return;
    setFeaturingId(commentId);
    try {
      const r = await fetch(`/api/library/comment?id=${encodeURIComponent(commentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: featured }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || '精选操作失败');
      }
      // 更新本地列表：重新排序（精选置顶）
      setComments((prev) => {
        const updated = prev.map((c) =>
          c.id === commentId ? { ...c, is_featured: featured } : c,
        );
        return [...updated].sort((a, b) => {
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });
    } catch (e) {
      setError((e as { message?: string })?.message || '精选操作失败');
    } finally {
      setFeaturingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!body.trim()) {
      setError('请先写下您的随感');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/library/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_slug: chapterSlug,
          body: body.trim(),
          reading_tag: readingTag || null,
        }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || '提交失败');
      }
      const { comment } = (await r.json()) as { comment: Comment };
      setComments((prev) => [comment, ...prev]);
      setBody('');
      setReadingTag('');
      setShowTagSelector(false);
    } catch (e) {
      setError((e as { message?: string })?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-label="读后感留言"
      className="rounded-2xl border border-primary/30
                 bg-gradient-to-br from-primary/5 via-transparent to-transparent
                 p-5 backdrop-blur-md md:p-8"
    >
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-primary/60">
            READER · 读后感
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground md:text-2xl">
            善信留言
          </h2>
        </div>
        <span className="text-xs text-foreground/50">
          {comments.length} 条
        </span>
      </header>

      {/* 精选留言提示 */}
      {comments.some((c) => c.is_featured) && (
        <p className="mb-4 rounded-lg border border-accent/30 bg-accent/5 p-2.5 text-xs text-accent">
          🪷 以下带有金色徽章者为阿阇梨开示
        </p>
      )}

      {/* 输入区 */}
      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="在此留下你的修行随感…"
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-lg border border-primary/25
                     bg-background/70 px-4 py-3 text-sm text-foreground
                     placeholder:text-foreground/30
                     focus:border-primary focus:outline-none"
        />

        {/* 阅读进度标签 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTagSelector((v) => !v)}
            className="text-xs text-foreground/50 underline underline-offset-2 hover:text-primary"
          >
            {showTagSelector
              ? '收起进度标签'
              : readingTag
              ? `📊 ${readingTag}`
              : '+ 标注阅读进度'}
          </button>
        </div>
        {showTagSelector && (
          <select
            value={readingTag}
            onChange={(e) => setReadingTag(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-primary/25
                       bg-background/70 px-3 py-2 text-xs text-foreground
                       focus:border-primary focus:outline-none"
          >
            <option value="">不标注</option>
            {Array.from({ length: paragraphCount }, (_, i) => (
              <option key={i} value={`读到第 ${i + 1} 段产生此感`}>
                读到第 {i + 1} 段产生此感
              </option>
            ))}
          </select>
        )}

        {error && (
          <p className="rounded-lg border border-accent/40 bg-accent/10 p-2.5 text-xs text-accent">
            ※ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-primary px-5 py-2
                     font-serif text-sm text-background transition
                     hover:bg-primary/90
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? '提交中…' : '留下随感'}
        </button>
      </form>

      {/* 评论列表 */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-primary/15 bg-muted/30"
            />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-primary/20 bg-background/40 p-6 text-center text-sm text-foreground/50">
          尚无留言。成为第一位留下修行随感的善信。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className={`rounded-lg border p-4 ${
                c.is_featured
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-primary/15 bg-black/30'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="grid h-7 w-7 place-items-center rounded-full
                             border border-primary/30 bg-background/60
                             font-serif text-xs text-primary"
                >
                  {c.author_name.slice(0, 1)}
                </span>
                <span className="font-serif text-sm text-foreground">
                  {c.author_name}
                </span>
                <AcharyaBadge role={c.author_role} />
                {c.is_featured && (
                  <span className="text-[10px] tracking-wider text-accent">
                    · 精选
                  </span>
                )}
                <span className="ml-auto text-[10px] text-foreground/40">
                  {new Date(c.created_at).toLocaleDateString('zh-CN')}
                </span>
                {/* 阿阇梨精选按钮 */}
                {isAcharya && (
                  <button
                    type="button"
                    onClick={() => void handleFeature(c.id, !c.is_featured)}
                    disabled={featuringId === c.id}
                    title={c.is_featured ? '取消精选' : '设为精选'}
                    className={`ml-1 rounded-full border px-2 py-0.5 text-[10px]
                                transition disabled:cursor-not-allowed disabled:opacity-50
                                ${
                                  c.is_featured
                                    ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
                                    : 'border-foreground/20 bg-background/40 text-foreground/50 hover:border-accent/50 hover:text-accent'
                                }`}
                  >
                    {featuringId === c.id ? '…' : c.is_featured ? '★ 取消精选' : '☆ 设为精选'}
                  </button>
                )}
              </div>
              {c.reading_tag && (
                <p className="mb-1.5 text-[10px] tracking-wider text-foreground/40">
                  📊 {c.reading_tag}
                </p>
              )}
              <p className="text-sm leading-relaxed text-foreground/85">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[10px] tracking-wider text-foreground/40">
        · 留言即结善缘 · 阿阇梨会不定期回复有深度的随感 ·
      </p>
    </section>
  );
}

export default CommentSection;
