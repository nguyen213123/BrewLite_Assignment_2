'use client';

import { useEffect } from 'react';

/**
 * Đăng ký service worker /sw.js (cache tài nguyên tĩnh công khai + trang /offline.html khi mất mạng).
 * Chỉ bật ở production (hoặc NEXT_PUBLIC_ENABLE_SW=1) vì chunk dev không có hash, cache sẽ làm HMR/hiển thị cũ.
 * Ở môi trường không bật, gỡ service worker cũ (nếu có) để không giữ cache lỗi thời.
 */
export default function OfflineFallbackRegistration() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const enabled = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW === '1';
    if (!enabled) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => void registration.unregister()))
        .catch(() => {});
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((error: unknown) => console.warn('Không đăng ký được service worker', error));
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
