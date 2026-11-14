# Deployment Diagram — BrewLite (Task 3.2)

Sơ đồ triển khai UML của môi trường **production**, rà lại theo kiến trúc Task 3.1 ([`system-architecture.md`](./system-architecture.md), mục 8) và phương án đã chọn: **Render** (nền tảng triển khai) + **GHCR** (container registry). Sơ đồ có ranh giới **Local**, **CI/CD (GitHub)** và **Production (Render)**.

| Tệp | Vai trò |
| --- | --- |
| `deployment-diagram.dot` | Mã nguồn sơ đồ (Graphviz) |
| `deployment-diagram.svg` | Ảnh vector, dùng chèn vào tài liệu |
| `deployment-diagram.png` | Ảnh 110 dpi, dùng cho slide hoặc báo cáo Word |

Tạo lại ảnh sau khi sửa `.dot` (cần [Graphviz](https://graphviz.org/download/)):

```bash
dot -Tsvg deployment-diagram.dot -o deployment-diagram.svg
dot -Tpng -Gdpi=110 deployment-diagram.dot -o deployment-diagram.png
```

![BrewLite Deployment Diagram](deployment-diagram.svg)

## 0. Quy ước: phần nào đã có, phần nào đã kiểm chứng

Trên sơ đồ, **viền liền** là thứ đã có trong repository hoặc đã được triển khai và kiểm chứng thật trên Render, GHCR và GitHub Actions ngày **14/11/2026** (nhãn «đã kiểm chứng 14/11»). **Nét đứt kèm «CHƯA KIỂM CHỨNG»** là phần đã thiết kế nhưng chưa chạy thử thật (webhook Stripe qua Render edge). Các nét đứt khác dùng cho quan hệ triển khai, cấu hình và log, không mang nghĩa trạng thái.

| Trạng thái | Thành phần |
| --- | --- |
| **Có sẵn trong repo** | `apps/web/Dockerfile`, `apps/api/Dockerfile`, `docker-compose.yml` (frontend, backend, db), `.github/workflows/ci.yml`, `apps/api/prisma/migrations/`, `GET /api/health` và `GET /api/health/ready`, `.env.example` (chỉ tên biến) |
| **Đã triển khai và kiểm chứng (14/11/2026)** | Hai Web Service `web` và `api` trên Render chạy image từ GHCR, Render PostgreSQL 17, migration chạy khi khởi động container `api`, health check `/api/health/ready`, biến môi trường trên Render, GitHub Secrets/Variables, `release.yml` (Quality Gate, build, push GHCR, deploy hook, smoke test), `rollback.yml`, tag image theo commit SHA, Render Logs, HTTPS trên domain `onrender.com` |
| **Chưa kiểm chứng** | Webhook Stripe qua Render edge; rollback về một commit SHA khác với bản đang chạy; Pre-Deploy Command của Render (không dùng, migration chạy khi khởi động) |

## 1. Các node và truy vết

| Node trên sơ đồ | Stereotype | Vai trò | Thành phần kiến trúc (Task 3.1) | Mã nguồn / cấu hình | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| Customer device | device, browser | Khách xem menu, đặt đơn, thanh toán qua Web/PWA mobile-first | Frontend Next.js/PWA | `apps/web/src/app/` | Đã có (mã nguồn) |
| Staff device | device, browser | Nhân viên cập nhật trạng thái đơn. **Dùng cùng app `apps/web`** (trang `/staff`, `/orders/[id]`), phân quyền bằng vai trò `STAFF` ở API, không phải ứng dụng riêng | Frontend và API vai trò STAFF | `apps/web/src/app/staff/`, `apps/api/src/modules/auth/` | Đã có (mã nguồn) |
| Render edge | execution environment | Chấm dứt TLS, nhận HTTPS :443 trên domain Render, chuyển tới `web` và `api`. **Không có CDN riêng**: tài nguyên tĩnh do container `web` phục vụ phía sau Render edge | Hạ tầng nền tảng triển khai | Cấu hình Render (domain, HTTPS) | Đã triển khai (14/11/2026) |
| web | container (Render Web Service) | Next.js SSR + PWA, `PORT` 3000, image từ GHCR | Frontend | `apps/web/Dockerfile` | Dockerfile đã có; dịch vụ Render đã triển khai (14/11/2026) |
| api | container (Render Web Service) | NestJS theo module (auth, products, orders, payments, inventory, promotions, loyalty, idempotency, order-history, health), `PORT` 3001, tiền tố `/api` | Backend | `apps/api/Dockerfile`, `apps/api/src/modules/` | Dockerfile đã có; dịch vụ Render đã triển khai (14/11/2026) |
| Health check | interface | `GET /api/health/ready` là health check của Render; `GET /api/health` là liveness | Giám sát, health check | `apps/api/src/health/health.controller.ts` | Endpoint đã có; cấu hình trên Render đã triển khai (14/11/2026) |
| Migration trên Render | execution environment | Chạy `prisma migrate deploy` bên trong môi trường Render, qua Internal Database URL, trước khi bản mới vượt health check và nhận traffic (xem mục 4) | Cơ sở dữ liệu và migration | `apps/api/prisma/migrations/`, script `prisma:deploy` | Migration đã có; cách chạy trên Render đã triển khai (14/11/2026) |
| Render PostgreSQL 17 | database (managed) | Dữ liệu nghiệp vụ. Phiên bản 17 khớp local (`postgres:17-bookworm`); gói Free (hết hạn sau 30 ngày, khoảng 13/12/2026). Chỉ truy cập qua Internal Database URL, không mở ra Internet | Cơ sở dữ liệu | `apps/api/prisma/schema.prisma` | Đã triển khai (14/11/2026) |
| Đĩa lưu trữ bền vững | artifact | Lưu trữ bền vững của PostgreSQL do Render quản lý | Cơ sở dữ liệu | Cấu hình Render | Đã triển khai (14/11/2026) |
| Environment / Secrets trên Render | configuration | Cấu hình và bí mật khi chạy (chỉ ghi tên biến, xem mục 5) | Quản lý cấu hình | `.env.example`, `apps/api/.env.example` (không có giá trị thật) | Tên biến đã có; giá trị trên Render đã triển khai (14/11/2026) |
| Render Logs | service | Thu stdout/stderr của `web` và `api` | Logging | Cấu hình Render | Đã triển khai (14/11/2026) |
| GitHub repository | repository | Mã nguồn, Pull Request, tag | Quản lý mã nguồn | Repository `BrewLite_Assignment_2` | Đã có |
| GitHub Actions runner | execution environment | Đã có: Install, Lint, Test, Build, smoke test local trong `ci.yml`. Đích: docker build (api, web), push GHCR, deploy hook, smoke test production | CI/CD | `.github/workflows/ci.yml` (đã có); workflow deploy (Task 5.3) | CI đã có; CD đã triển khai (14/11/2026) |
| GitHub Actions secrets | configuration | Token GHCR, deploy hook Render, URL production cho smoke test | CI/CD | Cài đặt repository trên GitHub | Đã triển khai (14/11/2026) |
| GHCR | container registry | Lưu image `brewlite-api`, `brewlite-web`, tag theo commit SHA (hoặc digest) | CI/CD | Cấu hình workflow | Đã triển khai (14/11/2026) |
| Developer machine | device | Chạy `docker compose` (frontend :3000, backend :3001, db :5432 bind 127.0.0.1) | Môi trường local | `docker-compose.yml`, `.env` (không commit) | Đã có |
| VNPay Sandbox | external system | Cổng thanh toán thử nghiệm | Dịch vụ thanh toán | `apps/api/src/modules/payments/vnpay.service.ts` | Mã nguồn đã có |
| Stripe (Test mode) | external system | Cổng thanh toán thử nghiệm, gửi webhook | Dịch vụ thanh toán | `apps/api/src/modules/payments/stripe.service.ts` | Mã nguồn đã có |

## 2. Kết nối, giao thức và cổng

| Từ | Tới | Giao thức, cổng | Ghi chú |
| --- | --- | --- | --- |
| Customer / Staff device | Render edge | HTTPS :443 | Mọi lưu lượng từ ngoài đều qua HTTPS |
| Render edge | web | HTTP :3000 | Nội bộ Render. Đặt `PORT=3000` |
| Render edge | api | HTTP :3001 | Nội bộ Render. Đặt `PORT=3001`. Trình duyệt gọi API trực tiếp (xem ghi chú bên dưới) |
| api | Render PostgreSQL | TCP :5432 | Internal Database URL, không public |
| api | VNPay Sandbox | HTTPS | Tạo URL ký số, truy vấn giao dịch, hoàn tiền |
| api | Stripe (Test) | HTTPS | Tạo Checkout Session |
| Stripe | api | HTTPS (webhook) | `POST /api/payments/stripe/webhook`, đi qua Render edge |
| Khách | VNPay / Stripe | HTTPS (chuyển hướng) | Sang trang thanh toán rồi quay về `/payments/…-return` của web |
| Developer machine | GitHub repository | HTTPS / SSH | `git push`, Pull Request |
| GitHub repository | Actions runner | Sự kiện push, tag, PR | Kích hoạt pipeline |
| Actions runner | GHCR | HTTPS | Đẩy image tag theo commit SHA |
| GHCR | Render | HTTPS | Render kéo image (cần credential nếu image private) |
| Actions runner | Render | HTTPS (deploy hook) | Sau đó gọi smoke test `/api/health/ready` |

### Kết nối web → api (đã chốt)

Mã nguồn xác nhận: mọi lời gọi API của `apps/web` nằm trong component `'use client'` (`apps/web/src/lib/api.ts`, `api-client.ts`, `components/payments/payment-api.ts`), `apps/web/next.config.ts` không có `rewrites`, và không có `fetch` tới API trong server component. Do đó:

- Container `web` **không gọi** container `api` ở phía server (không có SSR-fetch, không có rewrites/proxy). `web` chỉ phục vụ mã giao diện (HTML, JS, tài nguyên tĩnh).
- **Trình duyệt gọi `api` trực tiếp** qua HTTPS :443 (Render edge → `api`), kèm JWT Bearer. Trên sơ đồ, quan hệ này là đường Customer/Staff → Render edge → `api`, cộng thêm một mũi tên đứt «use» từ `web` sang `api` biểu diễn **phụ thuộc cấu hình**: URL API được nhúng vào image `web` lúc build qua `NEXT_PUBLIC_API_URL` (`ARG` trong `apps/web/Dockerfile`).
- Hệ quả khi triển khai: `api` phải có URL HTTPS truy cập được từ trình duyệt; `FRONTEND_URL` của `api` phải khớp domain `web` (CORS, `apps/api/src/setup.ts`); workflow `release.yml` build image `web` với `NEXT_PUBLIC_API_URL` của production (image dựng cho local không dùng được cho production).
- Nếu sau này `web` gọi `api` phía server (SSR) thì phải thêm kết nối nội bộ web → api và cập nhật sơ đồ này.

## 3. Ranh giới môi trường

| Ranh giới | Nằm ở đâu | Gồm | Dữ liệu và bí mật |
| --- | --- | --- | --- |
| **Local** | Máy lập trình viên | `docker compose`: frontend, backend, db; volume `postgres_data` | File `.env` cá nhân, không commit |
| **CI/CD** | GitHub | Repository, Actions runner (CI đã có, CD đã chạy), secrets, GHCR | Secrets trong cài đặt GitHub, không in ra log CI |
| **Production** | Render | Render edge, web, api, PostgreSQL, đĩa bền vững, logs | Biến môi trường/secret cấu hình trên Render |

## 4. Migration, health check và rollback

- **Migration:** `prisma migrate deploy` chạy **bên trong môi trường Render**, khi container `api` khởi động (`apps/api/Dockerfile` chạy `npm run prisma:deploy && npm start`), dùng Internal Database URL, **trước khi** bản mới vượt health check `/api/health/ready` và nhận traffic. Đã kiểm chứng qua Render Logs ngày 14/11/2026. Nhóm không dùng Pre-Deploy Command. Migration không chạy từ máy lập trình viên hay runner CI vào database production.
- **Health check:** `GET /api/health/ready` (kiểm tra kết nối database) cấu hình làm health check của dịch vụ `api` trên Render; nếu không đạt thì bản mới không nhận traffic.
- **Smoke test:** sau deploy hook, workflow gọi URL production `/api/health/ready`; thất bại thì dừng pipeline.
- **Rollback:** triển khai lại image gắn commit SHA (hoặc image digest) của bản ổn định trước đó trên GHCR/Render. Lưu ý migration đã áp dụng không tự quay lại; migration mới nên tương thích ngược để rollback image an toàn.

## 5. Biến môi trường (chỉ ghi tên)

Không đặt giá trị thật vào repository hay tài liệu này.

- `api`: `PORT`, `FRONTEND_URL`, `DATABASE_URL` (Internal Database URL), `JWT_SECRET`
- VNPay: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`, `VNPAY_API_URL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_RETURN_URL`, `STRIPE_WEBHOOK_SECRET`
- `web`: `PORT`; `NEXT_PUBLIC_API_URL` là build-arg lúc build image, không phải biến chạy
- Seed (chạy riêng, không phải biến vận hành thường xuyên): `SEED_ADMIN_PASSWORD`, `SEED_STAFF_PASSWORD`

## 6. Đối chiếu yêu cầu Task 3.2

| Yêu cầu của đề | Có trên sơ đồ |
| --- | --- |
| Thiết bị người dùng chạy trình duyệt/PWA | Customer device, Staff device |
| Dịch vụ/CDN phục vụ Next.js | Render edge và container `web` (không có CDN riêng) |
| Container chạy NestJS API | Container `api` |
| PostgreSQL có persistent storage | Render PostgreSQL 17 và đĩa bền vững |
| Container registry và nền tảng triển khai | GHCR và Render |
| HTTPS, kết nối nội bộ và cổng | Nhãn trên các đường nối (mục 2) |
| Secret/env, health check và log | Environment/Secrets, Health check, Render Logs |
| Ranh giới local, CI và production | Ba khung LOCAL, CI / CD, PRODUCTION |

## 7. Kết quả kiểm chứng (14/11/2026)

| # | Cấu hình | Kết quả | Minh chứng |
| --- | --- | --- | --- |
| 1 | Hai Web Service Render chạy image từ GHCR | Đạt | Dịch vụ `web` và `api` ở trạng thái Live; web hiển thị menu |
| 2 | Render PostgreSQL 17, chỉ truy cập nội bộ | Đạt | Ứng dụng kết nối qua Internal Database URL; quy tắc truy cập tạm để nạp dữ liệu mẫu đã gỡ sau khi dùng |
| 3 | Migration chạy trước khi nhận traffic | Đạt | Render Logs của `api` có dòng `prisma:deploy` trước khi dịch vụ Live |
| 4 | Health check `/api/health/ready` | Đạt | Render dùng đường dẫn này; smoke test trong pipeline gọi và đạt |
| 5 | Pipeline đủ bước, dừng khi lỗi | Đạt | Release #1 dừng ở job deploy khi chưa có secret; Release #2 xanh toàn bộ (xem [`../deployment.md`](../deployment.md) mục 10) |
| 6 | Rollback | Đạt một phần | Rollback #1 xanh, nhưng rollback về chính commit SHA đang chạy; chưa thử về một SHA khác |
| 7 | Secret không lộ | Đạt | Script không in hook hoặc khóa; secret chỉ nằm trong GitHub Secrets và biến môi trường Render |
| 8 | Webhook Stripe qua Render edge | Chưa kiểm chứng | Chưa cấu hình Stripe webhook trên production |
