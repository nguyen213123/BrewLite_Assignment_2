// Chạy: npm run test:tools  (node --test, không cần cài thêm thư viện)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDeployUrl, main, parseServiceId, triggerDeploy, waitForDeploy } from '../../scripts/deploy-render.mjs';
import { runSmoke } from '../../scripts/smoke-production.mjs';

const KEY = 'SECRETKEY123';
const API_HOOK = `https://api.render.com/deploy/srv-api123?key=${KEY}`;
const WEB_HOOK = `https://api.render.com/deploy/srv-web456?key=${KEY}`;
const IMAGE = 'ghcr.io/owner/brewlite-api:abc123';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const noSleep = async () => {};

describe('deploy hook', () => {
  it('lấy service id từ URL hook', () => {
    assert.equal(parseServiceId(API_HOOK), 'srv-api123');
    assert.throws(() => parseServiceId('https://api.render.com/other?key=x'), /Deploy hook/);
  });

  it('gắn imgURL và từ chối HTTP hoặc image rỗng', () => {
    const url = buildDeployUrl(API_HOOK, IMAGE);
    assert.equal(url.searchParams.get('imgURL'), IMAGE);
    assert.equal(url.searchParams.get('key'), KEY);
    assert.throws(() => buildDeployUrl('http://api.render.com/deploy/srv-a?key=k', IMAGE), /HTTPS/);
    assert.throws(() => buildDeployUrl(API_HOOK, ''), /imageRef/);
  });

  it('gọi POST tới hook kèm imgURL và đọc deploy id', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => { calls.push({ url: String(url), method: init.method }); return json({ deploy: { id: 'dep-1' } }); };
    const result = await triggerDeploy({ label: 'api', hookUrl: API_HOOK, imageRef: IMAGE, fetchImpl });
    assert.deepEqual(result, { label: 'api', serviceId: 'srv-api123', deployId: 'dep-1' });
    assert.equal(calls[0].method, 'POST');
    assert.match(calls[0].url, /imgURL=ghcr\.io%2Fowner%2Fbrewlite-api%3Aabc123/);
  });

  it('báo lỗi khi hook không phải 2xx và không lộ khóa trong thông báo', async () => {
    const fetchImpl = async () => new Response('no', { status: 401 });
    await assert.rejects(
      triggerDeploy({ label: 'api', hookUrl: API_HOOK, imageRef: IMAGE, fetchImpl }),
      error => /HTTP 401/.test(error.message) && !error.message.includes(KEY),
    );
  });

  it('lỗi mạng không lộ khóa trong thông báo', async () => {
    const fetchImpl = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(
      triggerDeploy({ label: 'web', hookUrl: WEB_HOOK, imageRef: IMAGE, fetchImpl }),
      error => /fetch failed/.test(error.message) && !error.message.includes(KEY),
    );
  });
});

describe('theo dõi deploy', () => {
  const base = { label: 'api', serviceId: 'srv-api123', deployId: 'dep-1', apiKey: 'k', intervalMs: 1, sleep: noSleep };

  it('chờ tới khi live', async () => {
    const statuses = ['build_in_progress', 'update_in_progress', 'live'];
    const fetchImpl = async () => json({ status: statuses.shift() });
    assert.equal(await waitForDeploy({ ...base, fetchImpl }), 'live');
    assert.equal(statuses.length, 0);
  });

  it('dừng ngay khi deploy lỗi', async () => {
    const fetchImpl = async () => json({ status: 'update_failed' });
    await assert.rejects(waitForDeploy({ ...base, fetchImpl }), /update_failed/);
  });

  it('hết thời gian chờ thì báo lỗi', async () => {
    let t = 0;
    const fetchImpl = async () => json({ status: 'build_in_progress' });
    await assert.rejects(
      waitForDeploy({ ...base, fetchImpl, timeoutMs: 5, now: () => (t += 2) }),
      /quá thời gian/,
    );
  });
});

describe('main', () => {
  it('thiếu biến môi trường thì dừng', async () => {
    await assert.rejects(main({}, { log() {} }), /RENDER_API_DEPLOY_HOOK/);
  });
});

describe('smoke test production', () => {
  const web = 'https://web.example.com';
  const api = 'https://api.example.com/api';
  const options = { webUrl: web, apiUrl: api, sleep: noSleep, intervalMs: 1, timeoutMs: 1, log() {} };
  const healthy = url => {
    if (url === `${web}/`) return new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    if (url.endsWith('/health')) return json({ status: 'ok' });
    if (url.endsWith('/health/ready')) return json({ status: 'ok', database: 'connected' });
    if (url.endsWith('/products')) return json({ data: [{ id: '1' }], meta: {} });
    return new Response('?', { status: 404 });
  };

  it('đạt khi web, health, ready và catalog đều tốt', async () => {
    assert.deepEqual(await runSmoke({ ...options, fetchImpl: async url => healthy(url) }), []);
  });

  it('thất bại khi database chưa kết nối', async () => {
    const fetchImpl = async url => (url.endsWith('/health/ready') ? json({ status: 'ok', database: 'down' }) : healthy(url));
    assert.deepEqual(await runSmoke({ ...options, fetchImpl }), ['api /health/ready']);
  });

  it('thất bại khi catalog rỗng, trừ khi tắt yêu cầu', async () => {
    const fetchImpl = async url => (url.endsWith('/products') ? json({ data: [] }) : healthy(url));
    assert.deepEqual(await runSmoke({ ...options, fetchImpl }), ['api /products (catalog)']);
    assert.deepEqual(await runSmoke({ ...options, fetchImpl, requireProducts: false }), []);
  });

  it('từ chối URL không phải HTTPS', async () => {
    await assert.rejects(runSmoke({ ...options, webUrl: 'http://web.example.com', fetchImpl: async () => json({}) }), /HTTPS/);
  });

  it('thử lại cho tới khi dịch vụ sẵn sàng', async () => {
    let t = 0;
    let readyCalls = 0;
    const fetchImpl = async url => {
      if (url.endsWith('/health/ready') && ++readyCalls < 3) return new Response('starting', { status: 503 });
      return healthy(url);
    };
    const failures = await runSmoke({ ...options, fetchImpl, timeoutMs: 1000, now: () => (t += 1) });
    assert.deepEqual(failures, []);
    assert.equal(readyCalls, 3);
  });
});
