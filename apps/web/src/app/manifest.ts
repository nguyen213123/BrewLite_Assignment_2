import type { MetadataRoute } from 'next';

// Phục vụ tại /manifest.webmanifest. Màu theo bảng màu BrewLite (nền kem, chủ đạo nâu cà phê).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'BrewLite Mộc Vị',
    short_name: 'BrewLite',
    description:
      'Đặt đồ uống trực tuyến, tùy chỉnh topping, thanh toán không tiền mặt và tích điểm thưởng.',
    lang: 'vi',
    start_url: '/menu',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf6ec',
    theme_color: '#6d4c3d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
