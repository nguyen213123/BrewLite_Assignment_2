# Hướng dẫn Đóng gói, CI/CD, Triển khai & Vận hành (Deployment & Operations Runbook) – BrewLite

> **Dự án**: BrewLite – Ứng dụng đặt cà phê trực tuyến không dùng tiền mặt  
> **Hạng mục**: Task 5.1, Task 5.2, Task 5.3 & Task 5.4 – Containerization, CI/CD & Production Delivery  
> **Sơ đồ triển khai liên quan**: [`docs/architecture/deployment-diagram.md`](architecture/deployment-diagram.md) | [`docs/architecture/deployment-diagram.svg`](architecture/deployment-diagram.svg)  
> **Kiến trúc hệ thống**: [`docs/architecture/system-architecture.md`](architecture/system-architecture.md)

---

## 1. Tổng quan Kiến trúc Triển khai (Deployment Overview)

Hệ thống BrewLite được đóng gói và vận hành xuyên suốt qua 3 môi trường tách biệt:
1. **Môi trường Local Development (`docker-compose.yml`)**:
   - Khởi chạy đồng bộ 3 container (`db`: PostgreSQL 17, `api`: NestJS 11 trên cổng `:3001`, `web`: Next.js 16 trên cổng `:3000`) chỉ bằng một lệnh duy nhất.
   - Tự động kiểm tra sức khỏe cơ sở dữ liệu (`pg_isready`), chạy `prisma migrate deploy` và nạp dữ liệu mẫu (`seed.ts`).
2. **Môi trường CI/CD (`GitHub Actions` + `GHCR`)**:
   - Tự động chạy Quality Gate (`docs:check`, `api:check`, `docs:schema`, `prisma:validate`, `lint`, `test` với PostgreSQL 17 service container, `build` và smoke test `/api/health/ready`) trên mọi Pull Request và mỗi lần push vào `main`.
   - Đóng gói Docker Image multi-stage cho `web` và `api`, gắn thẻ theo commit SHA (`ghcr.io/<owner>/brewlite-api:<sha>`, `ghcr.io/<owner>/brewlite-web:<sha>`) và đẩy lên **GitHub Container Registry (GHCR)**.
3. **Môi trường Production (`Render` Cloud Platform)**:
   - Cung cấp HTTPS tự động (`:443`) ở tầng Edge/CDN, điều phối lưu lượng tới dịch vụ `web` (`:3000`) và `api` (`:3001`), kết nối tới PostgreSQL 17 có ổ đĩa lưu trữ bền vững (Persistent Disk) trong mạng nội bộ.

![Sơ đồ triển khai BrewLite](architecture/deployment-diagram.svg)

---

## 2. Cấu hình Biến môi trường & Bí mật (Environment Variables & Secrets)

Tuyệt đối không commit tệp `.env` chứa khóa bí mật thật lên Git. Sử dụng tệp mẫu [`.env.example`](../.env.example) ở thư mục gốc khi thiết lập môi trường:

| Tên biến | Dịch vụ sử dụng | Mô tả & Quy tắc bảo mật | Giá trị mẫu (Local / Sandbox) |
|---|---|---|---|
| `DATABASE_URL` | `api`, `db` | Chuỗi kết nối PostgreSQL 17 | `postgresql://postgres:postgres@localhost:5432/brewlite?schema=public` |
| `PORT` | `api` | Cổng lắng nghe HTTP của NestJS API | `3001` |
| `FRONTEND_URL` | `api` | Origin được phép gọi CORS tới API | `http://localhost:3000` (hoặc URL HTTPS trên Render) |
| `JWT_SECRET` | `api` | Khóa ký JWT `HS256` (**bắt buộc ≥ 32 ký tự**, kiểm tra fail-fast khi khởi động) | Chuỗi ngẫu nhiên ≥ 32 ký tự |
| `NEXT_PUBLIC_API_URL` | `web` | Đường dẫn gọi REST API từ trình duyệt | `/api` (hoặc `http://localhost:3001/api`) |
| `API_INTERNAL_URL` | `web` | Đường dẫn proxy nội bộ từ container `web` sang `api` | `http://api:3001` (trong Docker Compose / Render) |
| `VNPAY_TMN_CODE` | `api` | Mã Website (Terminal ID) của VNPay Sandbox | Cấu hình theo tài khoản VNPay Sandbox |
| `VNPAY_HASH_SECRET` | `api` | Khóa bí mật tạo chữ ký `HMAC-SHA512` cho VNPay | Cấu hình theo tài khoản VNPay Sandbox |
| `VNPAY_URL` | `api` | URL cổng thanh toán VNPay Sandbox | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |
| `VNPAY_RETURN_URL` | `api` | URL redirect sau khi thanh toán trên VNPay | `http://localhost:3000/payments/vnpay-return` |
| `STRIPE_SECRET_KEY` | `api` | Secret Key của Stripe Test Mode (`sk_test_...`) | Cấu hình trong `.env` / Render Secret |
| `STRIPE_WEBHOOK_SECRET` | `api` | Khóa xác thực chữ ký Stripe Webhook (`whsec_...`) | Cấu hình trong `.env` / Render Secret |

---

## 3. Hướng dẫn Chạy Hệ thống bằng Docker Compose (Task 5.1 & 5.2)

### 3.1. Khởi chạy toàn bộ hệ thống bằng 1 lệnh
Từ thư mục gốc của repository:

```bash
cp .env.example .env
docker compose up --build -d
```

### 3.2. Kiểm tra trạng thái các Container và Health Check
```bash
docker compose ps
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/ready
```
- `GET /api/health`: Kiểm tra tiến trình API đang sống (Liveness probe) → trả `200 OK` (`{ "status": "ok" }`).
- `GET /api/health/ready`: Thực thi `SELECT 1` kiểm tra kết nối thực tế tới PostgreSQL 17 (Readiness probe) → trả `200 OK` khi DB sẵn sàng, hoặc `503 Service Unavailable` nếu DB mất kết nối.

### 3.3. Truy cập ứng dụng và Tài khoản Demo (tạo tự động bởi `seed.ts`)
- **Giao diện Web (Next.js)**: `http://localhost:3000`
- **Backend REST API (NestJS)**: `http://localhost:3001/api`
- **Tài khoản mẫu sau khi chạy seed**:
  - **Khách hàng (`CUSTOMER`)**: `customer@brewlite.local` / `Customer@123`
  - **Nhân viên quầy (`STAFF`)**: `staff@brewlite.local` / `Staff@123456`
  - **Quản trị viên (`ADMIN`)**: `admin@brewlite.local` / `Admin@123456`

### 3.4. Dừng hệ thống
```bash
# Dừng các container nhưng giữ lại dữ liệu PostgreSQL trong volume
docker compose down

# Dừng và xóa sạch volume dữ liệu để khởi tạo lại từ đầu
docker compose down -v
```

---

## 4. Quy trình CI/CD với GitHub Actions & GHCR (Task 5.3)

Pipeline tự động tại [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) thực thi các cổng kiểm soát chất lượng (Quality Gates) theo đúng trình tự:

1. **Checkout & Cài đặt phụ thuộc (`npm ci`, `npm run setup`)**: Sử dụng Node.js 24 và bộ nhớ đệm npm.
2. **Kiểm tra hợp đồng OpenAPI & Schema Prisma**:
   - `npm run docs:check`: Xác thực cú pháp OpenAPI 3.0 (`docs/api/openapi.yaml`) và toàn bộ ví dụ JSON (`docs/api/examples.json`).
   - `npm run api:check`: Đảm bảo tệp kiểu dữ liệu sinh tự động (`api.generated.ts`) ở cả `apps/api` và `apps/web` khớp 100% với hợp đồng OpenAPI.
   - `npm run docs:schema`: Xác thực lược đồ Prisma tham chiếu (`docs/diagrams/schema.prisma`).
3. **Áp dụng Migration & Khởi tạo dữ liệu trên PostgreSQL 17 thật**:
   - Chạy `prisma migrate deploy` trên dịch vụ PostgreSQL 17 trong GitHub Actions runner.
4. **Kiểm tra tĩnh & Chạy toàn bộ bộ kiểm thử (`Lint & Test`)**:
   - `npm run lint` (`--max-warnings 0` cho cả `apps/api`, `tests/api` và `apps/web`).
   - `RUN_DB_TESTS="1" npm test`: Chạy toàn bộ Unit Test, Integration Test (gồm kiểm thử đặt hàng đồng thời & idempotency) và E2E API Test.
5. **Biên dịch Production (`npm run build`) & Smoke Test (`/api/health/ready`)**:
   - Build bản production cho cả Backend và Frontend, khởi chạy thử máy chủ API và xác minh `GET /api/health/ready` trả `200 OK` trước khi cho phép merge hoặc phát hành.

---

## 5. Quy trình Triển khai Production, Giám sát & Rollback (Task 5.4)

### 5.1. Quy trình Triển khai lên Production (Render)
1. Khi nhánh `main` vượt qua toàn bộ bước kiểm tra của GitHub Actions, Docker image của `api` và `web` được build theo kiến trúc **Multi-stage Dockerfile** ([`apps/api/Dockerfile`](../apps/api/Dockerfile), [`apps/web/Dockerfile`](../apps/web/Dockerfile)) với người dùng không đặc quyền (`USER node`) và đẩy lên **GHCR** với tag bất biến theo commit SHA.
2. Dịch vụ Backend trên Render thực thi lệnh khởi động an toàn:
   ```bash
   npx prisma migrate deploy && node dist/main.js
   ```
3. Render kiểm tra endpoint `/api/health/ready`. Chỉ khi endpoint này trả về `200 OK`, lưu lượng HTTPS mới được chuyển từ container phiên bản cũ sang container phiên bản mới (**Zero-downtime deployment**).

### 5.2. Quy trình Rollback khi Phát hiện Sự cố (Rollback Procedure)
Nếu bước Smoke Test sau triển khai thất bại hoặc phát hiện lỗi nghiêm trọng trên môi trường Production:
1. **Rollback tự động ở tầng Health Check**: Nếu container mới không vượt qua `/api/health/ready` trong thời gian quy định, nền tảng triển khai tự động hủy đợt phát hành và giữ nguyên container của bản ổn định liền trước.
2. **Rollback chủ động theo Image Tag / Commit SHA**:
   - Trong bảng điều khiển dịch vụ trên Render (hoặc thông qua Deploy Hook), chọn lại image tag ứng với commit SHA ổn định liền trước trên GHCR (`ghcr.io/nguyen213123/brewlite-api:<previous-sha>` và `ghcr.io/nguyen213123/brewlite-web:<previous-sha>`).
   - Xác minh lại trạng thái hệ thống sau khi rollback bằng:
     ```bash
     curl -f https://<production-domain>/api/health/ready
     curl -f https://<production-domain>/api/products
     ```
3. **An toàn Migration khi Rollback**: Các bản ghi migration trong `apps/api/prisma/migrations/` tuân thủ nguyên tắc tương thích ngược (Expand-and-Contract), không xóa cột đang được phiên bản liền trước sử dụng.
