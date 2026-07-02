'use client';

/**
 * 牧心堂 · 积分读取 hook（轻量级）
 *
 * 设计：
 *   - mount 时立即拉一次 /api/user
 *   - 每 60s 轮询一次（保持"近实时"，又不至于太重）
 *   - 监听全局事件 `muxintang:credits-changed`，消费积分后立即刷新
 *   - 未登录返回 loggedIn=false，组件据此隐藏
 *
 * 用法：
 *   const { credits, loggedIn, loading, refresh } = usePoints();
 *   notifyCreditsChanged();  // 消费积分后触发全局刷新
 */

import { useCallback, useEffect, useState } from 'react';

export interface PointsState {
  credits: number;
  loading: boolean;
  loggedIn: boolean;
}

const POLL_INTERVAL = 60_000;

/** 全局事件名（消费积分后 dispatch，触发所有 usePoints 实例刷新） */
export const CREDITS_CHANGED_EVENT = 'muxintang:credits-changed';

export function usePoints(): PointsState & { refresh: () => Promise<void> } {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/user', { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as {
        user?: { credits?: number } | null;
      };
      if (data.user) {
        setLoggedIn(true);
        setCredits(data.user.credits ?? 0);
      } else {
        setLoggedIn(false);
        setCredits(0);
      }
    } catch {
      /* 未登录或网络异常：静默 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL);
    const onChanged = () => void refresh();
    window.addEventListener(CREDITS_CHANGED_EVENT, onChanged);
    // 切回标签页时刷新一次（用户可能在其他 tab 消费了积分）
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener(CREDITS_CHANGED_EVENT, onChanged);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { credits, loading, loggedIn, refresh };
}

/** 通知全局积分已变动（消费/获得积分后调用，触发所有 PointsBadge 刷新） */
export function notifyCreditsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
  }
}
