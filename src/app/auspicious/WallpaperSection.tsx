'use client';

/**
 * 牧心堂 · 吉祥馆 · 第一区块：AI 数字曼荼罗壁纸结缘
 *
 * 交互：
 *   1. 三个主题按钮（五行调和 / 本尊守护 / 金刚降魔）
 *   2. 点击 → 调 pollinations.ai 生成 1080x1920 壁纸
 *   3. <img> 直接渲染（pollinations 返回 image/jpeg）
 *   4. 下载权益（藏经阁积分流通体系）：
 *      - 付费会员：无限免费下载
 *      - 免费道友：每月 1 张免费额度；额度用完后可消耗 50 积分兑换一次
 *   5. 调用 /api/auspicious/wallpaper/download 做额度/积分扣减，成功后再下载图片
 *
 * 成本：pollinations.ai 开源免费接口，零成本
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notifyCreditsChanged } from '@/lib/usePoints';

type Theme = 'harmony' | 'guardian' | 'vajra';

interface ThemeMeta {
  label: string;
  glyph: string;
  prompt: string;
}

const THEMES: Record<Theme, ThemeMeta> = {
  harmony: {
    label: '五行调和',
    glyph: '☯',
    prompt:
      'esoteric buddhist mandala, five elements balance, wood fire earth metal water, sacred geometry, golden lines on black void, ultra detailed, spiritual wallpaper, 1080x1920',
  },
  guardian: {
    label: '本尊守护',
    glyph: '☸',
    prompt:
      'guardian deity mandala, golden aura, buddhist protector, lotus and vajra, black background, sacred art, ultra detailed, spiritual wallpaper, 1080x1920',
  },
  vajra: {
    label: '金刚降魔',
    glyph: '⚔',
    prompt:
      'vajra mandala, fierce guardian, golden lightning, black void, esoteric buddhist art, demon subjugation, ultra detailed, spiritual wallpaper, 1080x1920',
  },
};

/** 壁纸积分兑换成本（与后端常量对齐） */
const CREDITS_COST = 50;
/** 免费道友每月免费额度 */
const FREE_MONTHLY_QUOTA = 1;

interface UserProfile {
  tier: 'free' | 'monthly' | 'yearly' | 'lifetime';
  subscribed: boolean;
  displayName: string;
  credits: number;
  wallpaperMonth: string | null;
  wallpaperUsed: number;
}

function currentMonth(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

export function WallpaperSection() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  // 积分兑换确认弹层
  const [confirmExchange, setConfirmExchange] = useState(false);

  // 拉取用户档案（用于下载权益校验 + 积分余额）
  const refreshUser = useCallback(async () => {
    try {
      const r = await fetch('/api/user', { cache: 'no-store' });
      if (!r.ok) return;
      const { user } = (await r.json()) as { user: UserProfile | null };
      if (user) setUser(user);
    } catch {
      /* 未登录静默 */
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // 衍生：当前额度状态
  const quotaState = useMemo(() => {
    if (!user) return { kind: 'guest' as const };
    const isPaid = user.tier !== 'free';
    if (isPaid) return { kind: 'paid' as const };
    const month = currentMonth();
    const used = user.wallpaperMonth === month ? user.wallpaperUsed : 0;
    const freeRemaining = Math.max(0, FREE_MONTHLY_QUOTA - used);
    if (freeRemaining > 0) {
      return { kind: 'free-available' as const, used, freeRemaining };
    }
    // 额度耗尽
    if (user.credits >= CREDITS_COST) {
      return {
        kind: 'quota-exhausted-can-exchange' as const,
        used,
        credits: user.credits,
      };
    }
    return {
      kind: 'quota-exhausted-no-credits' as const,
      used,
      credits: user.credits,
    };
  }, [user]);

  const generateWallpaper = useCallback((t: Theme) => {
    setTheme(t);
    setImgLoading(true);
    setImgUrl(null);
    setToast(null);
    setConfirmExchange(false);
    const seed = Math.floor(Math.random() * 100000);
    const prompt = encodeURIComponent(THEMES[t].prompt);
    // pollinations.ai 直接返回图片，<img src> 自动触发加载
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=1080&height=1920&seed=${seed}&nologo=true`;
    setImgUrl(url);
  }, []);

  /** 实际下载图片字节并触发浏览器保存 */
  async function downloadImageBytes() {
    if (!imgUrl) return;
    try {
      const r = await fetch(imgUrl);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `muxintang-wallpaper-${theme}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setToast('下载失败，请稍后重试。');
    }
  }

  /** 调用壁纸下载 API（额度/积分扣减） */
  async function callWallpaperApi(mode: 'free' | 'credits') {
    const r = await fetch('/api/auspicious/wallpaper/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
      cache: 'no-store',
    });
    const data = (await r.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      balance?: number;
      wallpaperUsed?: number;
      wallpaperMonth?: string;
      creditsCost?: number;
      required?: number;
    };
    return { ok: r.ok, status: r.status, data };
  }

  async function handleDownload() {
    if (!imgUrl) return;

    // 未登录 → 提示
    if (!user) {
      setToast('请先登录后再下载壁纸。');
      return;
    }

    setToast(null);
    setDownloading(true);
    try {
      // 付费会员 / 免费额度尚有 → mode=free
      if (quotaState.kind === 'paid' || quotaState.kind === 'free-available') {
        const { ok, data } = await callWallpaperApi('free');
        if (!ok) {
          // 极少数情况：跨月边界 + 并发 → 额度刚好用完，引导兑换
          if (data?.error === 'quota_exhausted') {
            await refreshUser();
            setConfirmExchange(true);
          } else {
            setToast('下载失败，请稍后重试。');
          }
          return;
        }
        await downloadImageBytes();
        // 刷新本地额度状态
        await refreshUser();
        return;
      }

      // 额度耗尽 → 弹出积分兑换确认
      if (quotaState.kind === 'quota-exhausted-can-exchange') {
        setConfirmExchange(true);
        return;
      }

      // 额度耗尽且积分不足
      if (quotaState.kind === 'quota-exhausted-no-credits') {
        setToast(
          `本月免费额度已用完，需 ${CREDITS_COST} 积分兑换，当前仅 ${quotaState.credits} 积分。`,
        );
        return;
      }
    } finally {
      setDownloading(false);
    }
  }

  /** 确认消耗积分兑换下载 */
  async function confirmExchangeDownload() {
    setConfirmExchange(false);
    setDownloading(true);
    try {
      const { ok, data } = await callWallpaperApi('credits');
      if (!ok) {
        if (data?.error === 'insufficient_credits') {
          setToast(
            `积分不足，需 ${data.required ?? CREDITS_COST} 积分，当前 ${data.balance ?? 0} 积分。`,
          );
        } else {
          setToast('兑换失败，请稍后重试。');
        }
        return;
      }
      await downloadImageBytes();
      // 通知全局积分徽章刷新
      notifyCreditsChanged();
      // 刷新本地用户档案（积分 + 额度）
      await refreshUser();
      setToast(`已消耗 ${CREDITS_COST} 积分兑换下载。`);
    } finally {
      setDownloading(false);
    }
  }

  // 额度状态文案
  const quotaHint = useMemo(() => {
    switch (quotaState.kind) {
      case 'guest':
        return null;
      case 'paid':
        return '会员尊享 · 无限下载';
      case 'free-available':
        return `本月免费额度：剩 ${quotaState.freeRemaining}/${FREE_MONTHLY_QUOTA}`;
      case 'quota-exhausted-can-exchange':
        return `本月免费额度已用完 · 可 ${CREDITS_COST} 积分兑换（当前 ${quotaState.credits} 积分）`;
      case 'quota-exhausted-no-credits':
        return `本月免费额度已用完 · 积分不足（${quotaState.credits}/${CREDITS_COST}）`;
    }
  }, [quotaState]);

  return (
    <div>
      <header className="mb-5">
        <p className="text-[10px] tracking-[0.3em] text-primary/60">
          AUSPICIOUS · DIGITAL
        </p>
        <h2 className="mt-1 font-serif text-xl text-foreground md:text-2xl">
          数字壁纸 · AI 曼荼罗结缘
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/60">
          选择主题，AI 即时生成专属曼荼罗壁纸。每月一图，养心养眼。
        </p>
      </header>

      {/* 主题按钮 */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(THEMES) as Theme[]).map((k) => {
          const t = THEMES[k];
          const active = theme === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => generateWallpaper(k)}
              disabled={imgLoading}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2
                          font-serif text-sm transition
                          disabled:cursor-not-allowed disabled:opacity-50
                          ${
                            active
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-primary/30 bg-background/40 text-foreground/80 hover:border-primary hover:bg-primary/5'
                          }`}
            >
              <span aria-hidden className="text-base">
                {t.glyph}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 壁纸预览区 */}
      <div className="mt-5">
        {imgLoading && (
          <div
            className="mx-auto aspect-[9/16] w-full max-w-[320px]
                       animate-pulse rounded-xl border border-primary/20
                       bg-muted/40"
            aria-label="壁纸生成中"
          >
            <div className="flex h-full items-center justify-center text-sm text-foreground/40">
              曼荼罗生成中…
            </div>
          </div>
        )}

        {imgUrl && (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt={`${THEMES[theme!]?.label ?? ''} 曼荼罗壁纸`}
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setImgLoading(false);
                setToast('图片生成失败，请稍后重试。');
              }}
              className={`mx-auto w-full max-w-[320px] rounded-xl border border-primary/30
                          shadow-[0_0_40px_-15px_rgba(212,175,55,0.5)]
                          ${imgLoading ? 'hidden' : 'block'}`}
            />

            {!imgLoading && (
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-lg
                           bg-primary px-5 py-2.5 font-serif text-sm
                           text-background transition hover:bg-primary/90
                           disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden>⬇</span>
                {downloading
                  ? '处理中…'
                  : quotaState.kind === 'quota-exhausted-can-exchange'
                    ? `下载壁纸（${CREDITS_COST} 积分）`
                    : '下载壁纸'}
              </button>
            )}
          </div>
        )}

        {!imgUrl && !imgLoading && (
          <div
            className="mx-auto flex aspect-[9/16] w-full max-w-[320px]
                       items-center justify-center rounded-xl
                       border border-dashed border-primary/20
                       bg-background/40 p-6 text-center"
          >
            <p className="text-xs leading-relaxed text-foreground/40">
              点击上方任一主题，
              <br />
              即可生成你的专属曼荼罗壁纸
            </p>
          </div>
        )}
      </div>

      {/* 积分兑换确认弹层 */}
      {confirmExchange && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallpaper-exchange-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-primary/40
                       bg-background p-6 shadow-2xl"
          >
            <h3
              id="wallpaper-exchange-title"
              className="font-serif text-lg text-primary"
            >
              ⚡ 积分兑换下载
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">
              本月免费额度已用完。是否消耗{' '}
              <span className="font-semibold text-primary">
                {CREDITS_COST} 藏经阁积分
              </span>{' '}
              兑换一次壁纸下载？
            </p>
            <p className="mt-2 text-xs text-foreground/50">
              当前积分余额：
              <span className="text-primary">{user?.credits ?? 0}</span>
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmExchange(false)}
                className="flex-1 rounded-lg border border-foreground/20
                           px-4 py-2 text-sm text-foreground/70
                           transition hover:bg-foreground/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void confirmExchangeDownload()}
                disabled={downloading}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm
                           font-medium text-background transition
                           hover:bg-primary/90 disabled:opacity-60"
              >
                {downloading ? '兑换中…' : `确认兑换`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {toast && (
        <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
          {toast}
          {(!user || user.tier === 'free') && (
            <Link
              href="/pricing"
              className="ml-2 underline underline-offset-2 hover:text-primary"
            >
              立即开通 ›
            </Link>
          )}
        </div>
      )}

      {/* 权益说明 */}
      <p className="mt-4 text-[10px] tracking-wider text-foreground/40">
        {quotaHint ? `· ${quotaHint} ·` : '· 免费道友每月可结缘 1 张，会员可无限下载 ·'}
      </p>
    </div>
  );
}

export default WallpaperSection;
