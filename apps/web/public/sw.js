/*
 * BrewLite service worker (Offline Fallback).
 *
 * Nguyên tắc an toàn:
 *  - Chỉ cache tài nguyên TĨNH CÔNG KHAI (JS/CSS/ảnh/font/icon) cùng origin với trang.
 *  - KHÔNG BAO GIỜ cache response API, request có header Authorization (JWT), request không phải GET,
 *    request khác origin (API backend chạy ở origin riêng) hoặc response có Cache-Control no-store/private.
 *  - Trang HTML (có thể chứa dữ liệu theo người dùng) không được cache: mất mạng thì hiện /offline.html.
 *  - Không bao giờ trả kết quả giả cho thanh toán/đơn hàng: mọi request ngoài danh sách tĩnh đi thẳng ra mạng.
 */
const CACHE_PREFIX = 'brewlite-static-';
const CACHE_VERSION = 'v1';
const STATIC_CACHE = CACHE_PREFIX + CACHE_VERSION;
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [OFFLINE_URL, '/icon-192.png', '/icon-512.png'];
const STATIC_FILE = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/i;

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    PRECACHE_URLS.includes(url.pathname) ||
    STATIC_FILE.test(url.pathname)
  );
}

function isCacheable(response) {
  if (!response || !response.ok || response.type !== 'basic') return false;
  const cacheControl = response.headers.get('Cache-Control') || '';
  return !/no-store|private/i.test(cacheControl) && !response.headers.has('Set-Cookie');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.headers.has('Authorization')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) return;

  // Điều hướng trang: luôn ưu tiên mạng, không cache HTML; mất mạng thì hiện trang offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) =>
            cached ||
            new Response('Bạn đang offline. Vui lòng kết nối mạng và thử lại.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            }),
        ),
      ),
    );
    return;
  }

  if (!isStaticAsset(url)) return;

  // File build có hash (immutable): cache-first. Ảnh/icon: stale-while-revalidate.
  const immutable = url.pathname.startsWith('/_next/static/');
  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        if (cached && immutable) return cached;
        const network = fetch(request)
          .then((response) => {
            if (isCacheable(response)) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      }),
    ),
  );
});
