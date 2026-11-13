#!/usr/bin/env node
// Smoke test sau triển khai (Task 5.3): Web qua HTTPS, API health/ready và Catalog.
//
//   PRODUCTION_WEB_URL  ví dụ https://brewlite-web.onrender.com
//   PRODUCTION_API_URL  ví dụ https://brewlite-api.onrender.com/api   (cùng giá trị với NEXT_PUBLIC_API_URL)
//   SMOKE_TIMEOUT_MS    (tuỳ chọn) tổng thời gian chờ mỗi kiểm tra, mặc định 5 phút (Render có thể khởi động chậm)
//   SMOKE_REQUIRE_PRODUCTS=false  bỏ yêu cầu catalog có ít nhất 1 sản phẩm
//
// Thoát mã khác 0 nếu bất kỳ kiểm tra nào không đạt để pipeline dừng lại.
import { pathToFileURL } from 'node:url';

const trim = value => value.replace(/\/+$/, '');

export function buildChecks({ webUrl, apiUrl, requireProducts = true }) {
  const api = trim(apiUrl);
  return [
    { name: 'web (HTTPS)', url: `${trim(webUrl)}/`, verify: () => undefined },
    {
      name: 'api /health',
      url: `${api}/health`,
      verify: body => { if (body?.status !== 'ok') throw new Error('status khác "ok"'); },
    },
    {
      name: 'api /health/ready',
      url: `${api}/health/ready`,
      verify: body => {
        if (body?.status !== 'ok' || body?.database !== 'connected') throw new Error('database chưa kết nối');
      },
    },
    {
      name: 'api /products (catalog)',
      url: `${api}/products`,
      verify: body => {
        if (!Array.isArray(body?.data)) throw new Error('thiếu mảng data');
        if (requireProducts && body.data.length === 0) throw new Error('catalog rỗng (chưa seed dữ liệu?)');
      },
    },
  ];
}

export async function runSmoke({
  webUrl, apiUrl, requireProducts = true, fetchImpl = fetch,
  timeoutMs = 5 * 60_000, intervalMs = 10_000, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now,
  log = console.log,
}) {
  for (const value of [webUrl, apiUrl]) {
    if (new URL(value).protocol !== 'https:') throw new Error('Smoke test production yêu cầu URL HTTPS');
  }
  const failures = [];
  for (const check of buildChecks({ webUrl, apiUrl, requireProducts })) {
    const deadline = now() + timeoutMs;
    let lastError = 'chưa thử';
    let passed = false;
    do {
      try {
        const response = await fetchImpl(check.url, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const isJson = (response.headers.get('content-type') ?? '').includes('json');
        check.verify(isJson ? await response.json() : null);
        passed = true;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'lỗi không rõ';
        if (now() < deadline) await sleep(intervalMs);
      }
    } while (!passed && now() < deadline);
    if (passed) log(`PASS ${check.name}`);
    else { log(`FAIL ${check.name}: ${lastError}`); failures.push(check.name); }
  }
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { PRODUCTION_WEB_URL, PRODUCTION_API_URL, SMOKE_TIMEOUT_MS, SMOKE_REQUIRE_PRODUCTS } = process.env;
  if (!PRODUCTION_WEB_URL || !PRODUCTION_API_URL) {
    console.error('::error::Thiếu PRODUCTION_WEB_URL hoặc PRODUCTION_API_URL');
    process.exit(1);
  }
  runSmoke({
    webUrl: PRODUCTION_WEB_URL,
    apiUrl: PRODUCTION_API_URL,
    requireProducts: SMOKE_REQUIRE_PRODUCTS !== 'false',
    timeoutMs: Number(SMOKE_TIMEOUT_MS) || undefined,
  }).then(failures => {
    if (failures.length > 0) {
      console.error(`::error::Smoke test thất bại: ${failures.join(', ')}`);
      process.exit(1);
    }
  }).catch(error => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
