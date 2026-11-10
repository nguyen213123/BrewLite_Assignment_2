# Deployment Diagram — BrewLite (Task 3.2)

Sơ đồ UML mô tả kiến trúc đích Render + GHCR và ranh giới Local, CI/CD, Production. Workflow phát hành, service ID, digest đang live và URL HTTPS cần được bổ sung trong Sprint 2.

| Tệp | Vai trò |
| --- | --- |
| `deployment-diagram.dot` | Mã nguồn sơ đồ (Graphviz) |
| `deployment-diagram.svg` | Ảnh kết xuất vector, dùng chèn vào tài liệu |
| `deployment-diagram.png` | Ảnh raster, dùng cho slide hoặc báo cáo Word |

Tạo lại ảnh sau khi sửa `.dot` (cần cài [Graphviz](https://graphviz.org/download/)):

```bash
dot -Tsvg deployment-diagram.dot -o deployment-diagram.svg
dot -Tpng -Gdpi=150 deployment-diagram.dot -o deployment-diagram.png
```

![BrewLite Deployment Diagram](deployment-diagram.svg)

## 1. Các node và truy vết

Các đường dẫn `apps/web/Dockerfile`, `apps/api/Dockerfile`, `docker-compose.yml`, `apps/api/prisma/migrations/` và `.github/workflows/ci.yml` đã được kiểm tra là có trong repository.

| Node trên sơ đồ | Stereotype | Vai trò | Thành phần kiến trúc (Task 3.1) | Mã nguồn / cấu hình |
| --- | --- | --- | --- | --- |
| Customer device | device, browser | Khách xem menu, đặt đơn, thanh toán qua Web/PWA mobile-first | Frontend Next.js/PWA | `apps/web/` |
| Staff device | device, browser | Nhân viên cập nhật trạng thái đơn | Frontend (giao diện nhân viên) và API vai trò STAFF | `apps/web/`, `apps/api/` |
| Platform edge / CDN | execution environment | Chấm dứt TLS, nhận HTTPS :443, chuyển tới web và api | Hạ tầng nền tảng triển khai | Cấu hình nền tảng (domain, HTTPS) |
| web | container | Next.js (SSR + PWA), lắng nghe :3000 | Frontend | `apps/web/Dockerfile` |
| api | container | NestJS theo module/domain, lắng nghe :3001 | Backend | `apps/api/Dockerfile`, `apps/api/src/` |
| PostgreSQL 17 | database | Dữ liệu nghiệp vụ, nằm trong mạng nội bộ, không public | Cơ sở dữ liệu và migration | `apps/api/prisma/migrations/` |
| Persistent volume / disk | artifact | Lưu trữ bền vững cho PostgreSQL | Cơ sở dữ liệu | Cấu hình nền tảng |
| Deployment platform | execution environment | Nhận yêu cầu qua Render API, chạy container, chạy migration trước khi bật bản mới, health check | Quy trình triển khai | `docs/deployment.md` |
| Environment variables / Secrets | configuration | Cấu hình và bí mật khi chạy (chỉ ghi tên biến, xem mục 4) | Quản lý cấu hình | `.env.example` (không có giá trị thật) |
| Platform logs | service | Thu stdout/stderr của container | Logging | Cấu hình nền tảng |
| GitHub repository | repository | Mã nguồn, Pull Request, tag | Quản lý mã nguồn | Repository `BrewLite_Assignment_2` |
| GitHub Actions runner | execution environment | CI baseline chạy kiểm tra hợp đồng, lint, test PostgreSQL và build. Sprint 2 bổ sung E2E và Release để đẩy image lên GHCR, deploy Render và smoke test. | CI/CD | [CI hiện có](../../.github/workflows/ci.yml). `.github/workflows/release.yml` dự kiến cho Sprint 2. |
| GitHub Actions secrets | configuration | `GITHUB_TOKEN` và `RENDER_API_KEY` | CI/CD | Cài đặt repository trên GitHub |
| Container registry (GHCR) | container registry | Lưu image, tag bằng commit SHA | CI/CD | Cấu hình workflow |
| Developer machine | device | Chạy `docker-compose` (web, api, db) để phát triển | Môi trường local | `docker-compose.yml`, `.env` (không commit) |
| VNPay Sandbox | external system | Cổng thanh toán thử nghiệm | Dịch vụ thanh toán | Module thanh toán trong `apps/api/` |
| Stripe Sandbox | external system | Cổng thanh toán thử nghiệm, gửi webhook | Dịch vụ thanh toán | Module thanh toán trong `apps/api/` |

## 2. Kết nối, giao thức và cổng

| Từ | Tới | Giao thức, cổng | Ghi chú |
| --- | --- | --- | --- |
| Customer / Staff device | Platform edge | HTTPS :443 | Mọi lưu lượng từ ngoài đều qua HTTPS |
| Platform edge | web | HTTP :3000 | Trong mạng nội bộ |
| Platform edge | api | HTTP :3001 | Trong mạng nội bộ |
| api | PostgreSQL | TCP :5432 | Mạng nội bộ, không mở ra Internet |
| api | VNPay Sandbox | HTTPS | Khởi tạo và đối soát giao dịch |
| api | Stripe Sandbox | HTTPS | API thanh toán |
| Stripe Sandbox | api | HTTPS (webhook) | Đi qua platform edge |
| Khách | VNPay / Stripe | HTTPS (redirect) | Chuyển sang trang thanh toán rồi quay về return URL của web |
| Developer machine | GitHub repository | HTTPS / SSH | `git push`, Pull Request |
| GitHub repository | Actions runner | Sự kiện push, tag, PR | Kích hoạt pipeline |
| Actions runner | Container registry | HTTPS | Đẩy image, tag bằng commit SHA |
| Container registry | Deployment platform | HTTPS | Nền tảng kéo image |
| Actions runner | Deployment platform | HTTPS (Render API) | Sau đó gọi smoke test |

## 3. Ranh giới môi trường

| Ranh giới | Nằm ở đâu | Gồm | Dữ liệu và bí mật |
| --- | --- | --- | --- |
| **Local** | Máy lập trình viên | `docker-compose` chạy web, api, db; volume cục bộ | File `.env` cá nhân, không commit |
| **CI/CD** | GitHub | Repository, Actions runner, secrets, registry | Secrets lưu trong cài đặt GitHub, không in ra log |
| **Production** | Nền tảng triển khai | edge, web, api, PostgreSQL, volume, logs | Biến môi trường cấu hình trên nền tảng |

## 4. Biến môi trường (chỉ ghi tên)

Không đặt giá trị thật vào repository hay tài liệu này.

- Chung: `PORT`, `FRONTEND_URL`, `DATABASE_URL`, `JWT_SECRET`
- VNPay: Các biến `VNPAY_*` theo [`apps/api/.env.example`](../../apps/api/.env.example)
- Stripe: Các biến `STRIPE_*` theo [`apps/api/.env.example`](../../apps/api/.env.example)

## 5. Health check và log

- Health check: `GET /api/health` (liveness) và `GET /api/health/ready` (database sẵn sàng). Render dùng readiness của API. Workflow kiểm tra cả hai endpoint và dừng khi lỗi. Xem quy trình rollback trong runbook.
- Log: container ghi ra stdout/stderr, nền tảng thu thập. Không ghi bí mật ra log CI.

## 6. Đối chiếu yêu cầu Task 3.2

| Yêu cầu của đề | Có trên sơ đồ |
| --- | --- |
| Thiết bị người dùng chạy trình duyệt/PWA | Customer device, Staff device |
| Dịch vụ/CDN phục vụ Next.js | Platform edge / CDN và container web |
| Container hoặc dịch vụ chạy NestJS API | Container api |
| PostgreSQL có persistent storage | PostgreSQL 17 và Persistent volume |
| Container registry và nền tảng triển khai | GHCR và Deployment platform |
| HTTPS, kết nối nội bộ và cổng | Nhãn trên các đường nối (mục 2) |
| Secret/env, health check và log | Environment variables / Secrets, health check ở Deployment platform, Platform logs |
| Ranh giới local, CI và production | Ba khung LOCAL, CI / CD, PRODUCTION |

## 7. Đối chiếu môi trường thật

Nhóm chọn **Render + GHCR**. Các node thể hiện cấu hình đích, còn URL, service ID, digest đang live và bằng chứng HTTPS sẽ được điền trong [runbook triển khai](../deployment.md). Kiểm tra PostgreSQL tắt truy cập external, API chạy migration và readiness, GHCR giữ digest của bản trước, và workflow chạy smoke test trên đúng phiên bản vừa deploy.
