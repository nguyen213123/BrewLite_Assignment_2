import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it } from 'node:test';
import manifest from './manifest.ts';

const publicFile = (name: string) => new URL(`../../public/${name}`, import.meta.url);

function pngSize(name: string) {
  const buf = readFileSync(publicFile(name));
  assert.equal(buf.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('PWA manifest + icons', () => {
  const m = manifest();
  it('is installable: name, standalone display, start_url, theme colors', () => {
    assert.equal(m.short_name, 'BrewLite');
    assert.equal(m.display, 'standalone');
    assert.equal(m.start_url, '/menu');
    assert.equal(m.lang, 'vi');
    assert.match(String(m.theme_color), /^#[0-9a-f]{6}$/i);
    assert.match(String(m.background_color), /^#[0-9a-f]{6}$/i);
  });
  it('declares 192 and 512 icons that exist with matching dimensions', () => {
    const sizes = new Set((m.icons ?? []).map((i) => i.sizes));
    assert.ok(sizes.has('192x192') && sizes.has('512x512'));
    assert.deepEqual(pngSize('icon-192.png'), { width: 192, height: 192 });
    assert.deepEqual(pngSize('icon-512.png'), { width: 512, height: 512 });
    for (const icon of m.icons ?? []) assert.match(icon.src, /^\/icon-(192|512)\.png$/);
  });
});

describe('offline.html', () => {
  const html = readFileSync(publicFile('offline.html'), 'utf8');
  it('is self-contained, mobile-friendly and in Vietnamese', () => {
    assert.match(html, /<html lang="vi">/);
    assert.match(html, /name="viewport"/);
    assert.match(html, /Bạn đang offline/);
    assert.doesNotMatch(html, /(?:src|href)="https?:\/\//);
  });
});

// Chạy sw.js thật trong sandbox với cache/fetch giả để kiểm tra chính sách cache.
function loadServiceWorker(networkUp = true) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const store = new Map<string, Response>();
  const puts: string[] = [];
  const cache = {
    addAll: async (urls: string[]) => urls.forEach((u) => store.set(u, new Response('precached'))),
    match: async (req: string | { url: string }) => {
      const key = typeof req === 'string' ? req : new URL(req.url).pathname;
      return store.get(key)?.clone();
    },
    put: async (req: { url: string }, res: Response) => {
      const key = new URL(req.url).pathname;
      puts.push(key);
      store.set(key, res);
    },
  };
  const sandbox = {
    URL, Response, Headers,
    self: {
      location: { origin: 'https://brewlite.test' },
      addEventListener: (type: string, fn: (event: unknown) => void) => { listeners[type] = fn; },
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    caches: {
      open: async () => cache,
      match: (req: string) => cache.match(req),
      keys: async () => [],
      delete: async () => true,
    },
    fetch: async (req: { url: string }) => {
      if (!networkUp) throw new TypeError('network down');
      const path = new URL(req.url).pathname;
      const headers: Record<string, string> = path === '/private.png' ? { 'Cache-Control': 'private' } : {};
      const res = new Response('network:' + path, { status: 200, headers });
      // Trình duyệt trả type 'basic' cho request cùng origin.
      Object.defineProperty(res, 'type', { value: 'basic' });
      return res;
    },
  };
  runInNewContext(readFileSync(publicFile('sw.js'), 'utf8'), sandbox);
  const dispatch = (url: string, init: { method?: string; mode?: string; headers?: Record<string, string> } = {}) => {
    let responded: Promise<Response> | undefined;
    listeners.fetch({
      request: { url, method: init.method ?? 'GET', mode: init.mode ?? 'no-cors', headers: new Headers(init.headers) },
      respondWith: (p: Promise<Response>) => { responded = Promise.resolve(p); },
    });
    return responded;
  };
  return { listeners, store, puts, dispatch };
}

describe('sw.js caching policy', () => {
  const origin = 'https://brewlite.test';

  it('precaches the offline page and icons on install', async () => {
    const sw = loadServiceWorker();
    let done: Promise<unknown> | undefined;
    sw.listeners.install({ waitUntil: (p: Promise<unknown>) => { done = p; } });
    await done;
    assert.ok(sw.store.has('/offline.html') && sw.store.has('/icon-192.png') && sw.store.has('/icon-512.png'));
  });

  it('serves /offline.html for navigations only when the network fails', async () => {
    const down = loadServiceWorker(false);
    down.store.set('/offline.html', new Response('OFFLINE PAGE'));
    const res = await down.dispatch(`${origin}/checkout`, { mode: 'navigate' });
    assert.equal(await res!.text(), 'OFFLINE PAGE');

    const up = loadServiceWorker(true);
    const online = await up.dispatch(`${origin}/menu`, { mode: 'navigate' });
    assert.equal(await online!.text(), 'network:/menu');
    assert.deepEqual(up.puts, [], 'HTML pages must never be cached');
  });

  it('never intercepts API calls, JWT requests, non-GET or cross-origin requests', () => {
    const sw = loadServiceWorker();
    assert.equal(sw.dispatch(`${origin}/api/orders`), undefined);
    assert.equal(sw.dispatch(`${origin}/images/latte.jpg`, { headers: { Authorization: 'Bearer secret.jwt' } }), undefined);
    assert.equal(sw.dispatch(`${origin}/images/latte.jpg`, { method: 'POST' }), undefined);
    assert.equal(sw.dispatch('http://localhost:3001/api/orders'), undefined);
    assert.equal(sw.dispatch(`${origin}/_next/data/build/menu.json`), undefined);
    assert.equal(sw.dispatch(`${origin}/orders/123`), undefined);
    assert.deepEqual(sw.puts, []);
  });

  it('caches public static assets but skips Cache-Control private/no-store responses', async () => {
    const sw = loadServiceWorker();
    const asset = await sw.dispatch(`${origin}/_next/static/chunks/app.js`);
    assert.equal(await asset!.text(), 'network:/_next/static/chunks/app.js');
    const image = await sw.dispatch(`${origin}/images/latte.jpg`);
    assert.equal(await image!.text(), 'network:/images/latte.jpg');
    await sw.dispatch(`${origin}/private.png`);
    assert.deepEqual(sw.puts, ['/_next/static/chunks/app.js', '/images/latte.jpg']);
  });
});

describe('layout wiring', () => {
  it('mounts OfflineFallbackRegistration in the root layout and sets the theme color', () => {
    const layout = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');
    assert.match(layout, /import OfflineFallbackRegistration from '@\/components\/OfflineFallbackRegistration'/);
    assert.match(layout, /<OfflineFallbackRegistration \/>/);
    assert.match(layout, /themeColor: '#6d4c3d'/);
  });
});
