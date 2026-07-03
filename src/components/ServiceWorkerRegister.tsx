'use client';

/**
 * 牧心堂 · Service Worker 注册
 *
 * 仅在浏览器环境 + 生产构建下注册（dev 下 SW 频繁失效反而扰民）。
 * 用户可在 DevTools → Application → Service Workers 看到状态。
 *
 * 设计要点：
 *   - 校验 location.protocol，避免 file:// 协议注册失败
 *   - 使用 navigator.serviceWorker.register，注册失败仅 console.warn，不影响主流程
 *   - 监听 controllerchange，当新的 SW 接管时给页面发一个 reload 信号
 */

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 仅在 http(s) 协议下注册
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    // 开发环境跳过（避免 SW 缓存 HMR 资源造成混乱）
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // console.info('[muxintang] SW registered, scope:', reg.scope);
          // 监听更新：找到新 SW 后提示用户刷新（这里直接静默接管）
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // 新版本已就绪，让等待中的 SW 立即激活
                newWorker.postMessage('SKIP_WAITING');
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[muxintang] SW register failed:', err);
        });
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }

    // 新的 SW 接管后，刷新一次让用户看到最新内容
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    return () => {
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return null;
}
