import { test, expect } from '@playwright/test';

test.describe('PWA & Offline Capability (Task 4.4 / NFR-09)', () => {
  test('Web App Manifest is served with required PWA metadata', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);

    const manifest = await res.json();
    expect(manifest.name).toBe('BrewLite Mộc Vị');
    expect(manifest.short_name).toBe('BrewLite');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/menu');
    expect(manifest.theme_color?.toLowerCase()).toBe('#6d4c3d');
    expect(manifest.background_color?.toLowerCase()).toBe('#faf6ec');

    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  test('PWA icons (192px and 512px) are publicly accessible', async ({ request }) => {
    const icon192 = await request.get('/icon-192.png');
    expect(icon192.status()).toBe(200);
    expect(icon192.headers()['content-type']).toContain('image/png');

    const icon512 = await request.get('/icon-512.png');
    expect(icon512.status()).toBe(200);
    expect(icon512.headers()['content-type']).toContain('image/png');
  });

  test('PWA offline fallback page and service worker script are accessible', async ({ request }) => {
    const offlineRes = await request.get('/offline.html');
    expect(offlineRes.status()).toBe(200);
    const offlineText = await offlineRes.text();
    expect(offlineText).toContain('Bạn đang offline');
    expect(offlineText).toContain('BrewLite');

    const swRes = await request.get('/sw.js');
    expect(swRes.status()).toBe(200);
    const swText = await swRes.text();
    expect(swText).toContain('offline.html');
  });

  test('Homepage sets theme-color and viewport metadata for mobile devices', async ({ page }) => {
    await page.goto('/');

    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor?.toLowerCase()).toBe('#6d4c3d');

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});
