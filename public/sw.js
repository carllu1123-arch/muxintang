/**
 * 牧心堂 · Service Worker
 *
 * 缓存策略（按请求类型分级）：
 *   - 页面导航（HTML）    → network-first，回退到 offline shell
 *   - _next/static/*      → cache-first（带 hash，永不过期）
 *   - 图片 / SVG          → stale-while-revalidate
 *   - /api/*              → network-only（积分扣减等不能离线返回缓存）
 *   - /manifest.json, icon → cache-first
 *
 * 升级：自 v1 起，bump CACHE_VERSION 即可让旧缓存失效。
 */

const CACHE_VERSION = 'mxt-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/** 离线兜底：进入站点后的"安全"页面（用户已访问过的根） */
const SHELL_URLS = ['/', '/manifest.json', '/icon.svg', '/offline'];

/** 永不缓存：所有 API 路由（积分、扣减、评论等必须实时） */
const NETWORK_ONLY_PREFIXES = ['/api/'];

/** 网络优先但有离线回退：所有 HTML 页面 */
const NETWORK_FIRST_PREFIXES = [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // 逐个 add，失败不阻塞整个 install
      await Promise.allSettled(
        SHELL_URLS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => (res.ok ? cache.put(url, res) : null))
            .catch(() => null),
        ),
      );
      // 立即接管页面的旧 SW
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 清理旧版本缓存
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      // 立即控制所有打开的页面
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只处理同源请求；跨源直接走网络（next/image / Supabase Storage 等）
  if (url.origin !== self.location.origin) return;

  // 仅处理 GET
  if (req.method !== 'GET') return;

  // 永不缓存：API 路由
  if (NETWORK_ONLY_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    return; // 默认走网络
  }

  // Cache-first：Next 静态资源（带 hash 内容指纹）
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/icon-192.png' ||
    url.pathname === '/icon-512.png'
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Stale-while-revalidate：图片 / SVG / 字体
  if (req.destination === 'image' || req.destination === 'font') {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
    return;
  }

  // Network-first with cache fallback：HTML 页面导航
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirstWithOffline(req, RUNTIME_CACHE));
    return;
  }

  // 其它：默认 stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

/* ============ 策略实现 ============ */

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // 最后兜底：返回个透明 1x1（避免 JS 崩溃）
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await networkPromise) || new Response('', { status: 504 });
}

async function networkFirstWithOffline(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // 兜底返回根路径（/offline 或 /）
    const offline = (await cache.match('/')) || (await cache.match('/offline'));
    if (offline) return offline;
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>离线</title></head>' +
        '<body style="background:#0B0B0B;color:#D4AF37;font-family:serif;' +
        'display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">' +
        '<div style="text-align:center"><div style="font-size:48px">牧</div>' +
        '<p style="letter-spacing:6px;margin-top:16px">心灯未灭，回归当下</p>' +
        '<p style="color:#888;margin-top:24px;font-size:14px">请检查网络连接</p></div></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

self.addEventListener('message', (event) => {
  // 允许页面主动 skipWaiting 触发激活
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
