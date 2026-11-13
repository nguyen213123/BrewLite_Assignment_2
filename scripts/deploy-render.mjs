#!/usr/bin/env node
// Kích hoạt triển khai lên Render từ GitHub Actions (Task 5.3, release.yml).
//
// Render Web Service chạy image lấy từ GHCR. Script gọi Deploy Hook của từng dịch vụ, truyền
// image cần chạy qua tham số `imgURL`, rồi (nếu có RENDER_API_KEY) chờ deploy chuyển sang `live`.
//
// Biến môi trường (đều đến từ GitHub Secrets/Variables, không có giá trị nào nằm trong repo):
//   RENDER_API_DEPLOY_HOOK  URL Deploy Hook của dịch vụ api   (secret, chứa khóa)
//   RENDER_WEB_DEPLOY_HOOK  URL Deploy Hook của dịch vụ web   (secret, chứa khóa)
//   API_IMAGE, WEB_IMAGE    ví dụ ghcr.io/<owner>/brewlite-api:<commit-sha>
//   RENDER_API_KEY          (tuỳ chọn, secret) để theo dõi trạng thái deploy qua Render API
//   DEPLOY_TIMEOUT_MS       (tuỳ chọn) mặc định 15 phút
//
// Script KHÔNG bao giờ in URL hook hoặc API key ra log.
import { pathToFileURL } from 'node:url';

export const RENDER_API = 'https://api.render.com/v1';
const FAILED = new Set(['build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated']);

export function parseServiceId(hookUrl) {
  const match = /\/deploy\/(srv-[A-Za-z0-9]+)/.exec(new URL(hookUrl).pathname + '/');
  if (!match) throw new Error('Deploy hook không đúng dạng https://api.render.com/deploy/srv-...');
  return match[1];
}

export function buildDeployUrl(hookUrl, imageRef) {
  if (!imageRef || /\s/.test(imageRef)) throw new Error('imageRef không hợp lệ');
  const url = new URL(hookUrl);
  if (url.protocol !== 'https:') throw new Error('Deploy hook phải dùng HTTPS');
  url.searchParams.set('imgURL', imageRef);
  return url;
}

export async function triggerDeploy({ label, hookUrl, imageRef, fetchImpl = fetch }) {
  const serviceId = parseServiceId(hookUrl);
  const url = buildDeployUrl(hookUrl, imageRef);
  let response;
  try {
    response = await fetchImpl(url, { method: 'POST' });
  } catch (error) {
    throw new Error(`[${label}] không gọi được Deploy Hook: ${error instanceof Error ? error.message : 'lỗi mạng'}`);
  }
  if (!response.ok) throw new Error(`[${label}] Deploy Hook trả HTTP ${response.status}`);
  let body = null;
  try { body = await response.json(); } catch { /* hook có thể không trả JSON */ }
  const deployId = body?.deploy?.id ?? body?.id ?? null;
  return { label, serviceId, deployId };
}

export async function waitForDeploy({
  label, serviceId, deployId, apiKey, fetchImpl = fetch,
  intervalMs = 10_000, timeoutMs = 15 * 60_000, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now,
}) {
  const deadline = now() + timeoutMs;
  let last = 'unknown';
  while (now() < deadline) {
    const response = await fetchImpl(`${RENDER_API}/services/${serviceId}/deploys/${deployId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`[${label}] Render API trả HTTP ${response.status} khi kiểm tra deploy`);
    last = (await response.json()).status;
    if (last === 'live') return last;
    if (FAILED.has(last)) throw new Error(`[${label}] deploy kết thúc với trạng thái ${last}`);
    await sleep(intervalMs);
  }
  throw new Error(`[${label}] quá thời gian chờ deploy (trạng thái cuối: ${last})`);
}

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  return value;
}

export async function main(env = process.env, io = { log: console.log }) {
  const targets = [
    { label: 'api', hookUrl: required(env, 'RENDER_API_DEPLOY_HOOK'), imageRef: required(env, 'API_IMAGE') },
    { label: 'web', hookUrl: required(env, 'RENDER_WEB_DEPLOY_HOOK'), imageRef: required(env, 'WEB_IMAGE') },
  ];
  const apiKey = env.RENDER_API_KEY?.trim();
  const timeoutMs = Number(env.DEPLOY_TIMEOUT_MS) || undefined;

  // api trước, web sau: web gọi api trực tiếp từ trình duyệt nên api phải sẵn sàng trước.
  for (const target of targets) {
    const deploy = await triggerDeploy(target);
    io.log(`[${target.label}] đã kích hoạt deploy image ${target.imageRef}`);
    if (apiKey && deploy.deployId) {
      const status = await waitForDeploy({ ...deploy, apiKey, timeoutMs });
      io.log(`[${target.label}] deploy ${status}`);
    } else {
      io.log(`[${target.label}] không theo dõi được trạng thái (thiếu RENDER_API_KEY hoặc deploy id); dựa vào smoke test`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
