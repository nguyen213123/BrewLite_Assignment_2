# Yêu cầu phi chức năng (Non-Functional Requirements) – BrewLite

> **Tài liệu chuẩn hóa theo cấu trúc Mục 9 (Task 1.2)**  
> **Nguồn đồng bộ đầy đủ**: [`docs/requirements/Task-1.2-SRS-BrewLite.md`](./Task-1.2-SRS-BrewLite.md)  
> **Kiến trúc & ADRs liên quan**: [`docs/architecture/system-architecture.md`](../architecture/system-architecture.md) | [`docs/architecture/adr/`](../architecture/adr/README.md)

---

## 1. Danh mục Yêu cầu phi chức năng (`NFR-01` đến `NFR-15`)

Các yêu cầu phi chức năng được tổ chức theo đúng thứ tự các nhóm trong đề bài: **Hiệu năng**, **Bảo mật**, **Tính khả dụng** và **Khả năng triển khai** (kèm kiểm thử, bảo trì & ghi log).

### 1.1 Hiệu năng

#### NFR-01 – Hiệu năng API `Must`

- **AC-NFR01.1** Với dữ liệu mẫu (17 sản phẩm, 5 topping, 20 nguyên liệu), thời gian phản hồi phân vị 95 (p95) của `GET /api/products`, `GET /api/products/:id` và `GET /api/orders/me` nhỏ hơn 500 ms.
- **AC-NFR01.2** `POST /api/orders/quote`, `POST /api/orders` và `POST /api/payments` có p95 nhỏ hơn 1.000 ms (đã gồm xử lý transaction và gọi cổng thanh toán mô phỏng).
- **Kiểm chứng:** M (đo bằng `tests/tools/benchmark-api.cjs`, lưu kết quả vào `docs/qa/final/latency.json`).

#### NFR-02 – Hiệu năng giao diện `Should`

- **AC-NFR02.1** Trang menu đạt LCP không quá 2,5 giây trên mô phỏng mạng 4G và thiết bị di động trung bình (Lighthouse mobile — mục tiêu kiểm thử ngoài CI).
- **Kiểm chứng:** M.

### 1.2 Bảo mật

#### NFR-03 – Bảo mật mật khẩu `Must`

- **AC-NFR03.1** Mật khẩu được băm bằng `bcrypt` (cost factor = `12`); không lưu và không ghi log mật khẩu thô hay `passwordHash` trong bất kỳ response nào.
- **Kiểm chứng:** U, M.

#### NFR-04 – Xác thực và phân quyền `Must`

- **AC-NFR04.1** Mọi API ngoài `GET /api/products`, `GET /api/products/:id`, `GET /api/health`, `GET /api/health/ready`, `POST /api/auth/register`, `POST /api/auth/login` và các callback/webhook xác thực chữ ký riêng (`/api/payments/vnpay/verify`, `/api/payments/vnpay/ipn`, `/api/payments/stripe/verify`, `/api/payments/stripe/webhook`) đều yêu cầu JWT Bearer hợp lệ.
- **AC-NFR04.2** JWT có thời hạn xác định (`expiresInSeconds = 3600` trong `AUTH_POLICY`) và được ký bằng khóa bí mật lấy từ biến môi trường `JWT_SECRET` (tối thiểu 32 ký tự, kiểm tra ngay khi khởi động module).
- **AC-NFR04.3** Phân quyền theo vai trò (`CUSTOMER`, `STAFF`, `ADMIN`) và kiểm tra quyền sở hữu đơn hàng (`order.userId === currentUser.id`) được thực thi nghiêm ngặt ở tầng server (`JwtAuthGuard`, `StaffGuard`, `AdminGuard`), không phụ thuộc vào việc ẩn nút ở giao diện.
- **Kiểm chứng:** I.

#### NFR-05 – Validate dữ liệu đầu vào `Must`

- **AC-NFR05.1** Mọi DTO của API được validate bằng `ValidationPipe` toàn cục (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`); dữ liệu không hợp lệ hoặc chứa trường lạ trả mã `400 VALIDATION_ERROR`.
- **AC-NFR05.2** Truy vấn cơ sở dữ liệu dùng Prisma ORM và truy vấn tham số hóa (`$executeRaw` / `$queryRaw` tagged template), tuyệt đối không nối chuỗi SQL từ dữ liệu người dùng.
- **AC-NFR05.3** Giao diện validate các biểu mẫu trước khi gửi và hiển thị thông báo lỗi rõ ràng.
- **Kiểm chứng:** U, I.

#### NFR-06 – Quản lý bí mật và cấu hình `Must`

- **AC-NFR06.1** Không có bí mật thật của production hardcode trong mã nguồn; repository có `.env.example` ở gốc, `apps/api/.env.example` và `apps/web/.env.example` hướng dẫn cấu hình môi trường.
- **AC-NFR06.2** Cấu hình khác nhau giữa local, Docker, CI và production được cung cấp hoàn toàn qua biến môi trường.
- **Kiểm chứng:** M (rà soát repository và log CI).

#### NFR-07 – An toàn đường truyền và truy cập dữ liệu `Must`

- **AC-NFR07.1** API cấu hình CORS chỉ cho phép origin từ biến môi trường `FRONTEND_URL` (mặc định `http://localhost:3000`), tắt `credentials`, chỉ cho phép header `Authorization`, `Content-Type`, `Idempotency-Key` và expose `Idempotency-Replayed`, `Retry-After`.
- **AC-NFR07.2** Cơ sở dữ liệu trong Docker Compose được cô lập trong mạng nội bộ và kiểm tra sức khỏe (`pg_isready`) trước khi backend nhận tải.
- **AC-NFR07.3** Hỗ trợ HTTPS qua reverse proxy, middleware header bảo mật (`helmet`) và rate limit (`ThrottlerModule`) ở tầng triển khai production.
- **Kiểm chứng:** M, I.

### 1.3 Tính khả dụng (Usability, Xử lý mất mạng, Tương thích, Sẵn sàng & Toàn vẹn đồng thời)

#### NFR-08 – Tính khả dụng của giao diện (Usability) `Must`

- **AC-NFR08.1** Giao diện thiết kế mobile-first, hiển thị và dùng được ở chiều rộng 360 px mà không bị tràn ngang.
- **AC-NFR08.2** Từ menu đến màn hình xác nhận thanh toán, khách hoàn thành đặt đơn trong tối đa 6 màn hình chính (menu, tùy chọn chi tiết, giỏ hàng, đăng nhập nếu cần, checkout/thanh toán, xác nhận/chi tiết đơn).
- **AC-NFR08.3** Mọi thao tác có phản hồi trạng thái (loading, thành công, lỗi), thông báo lỗi theo cấu trúc chuẩn `{ statusCode, code, message, details }` và không lộ stack trace nội bộ.
- **Kiểm chứng:** M, E.

#### NFR-09 – Giao diện bền lỗi mạng (Resilience / PWA mục tiêu) `Should`

- **AC-NFR09.1** Khi mất mạng, timeout (5 giây trên `apiFetch`) hoặc API lỗi, giao diện hiển thị thông báo thân thiện, giữ nguyên trạng thái giỏ/checkout (`uncertain`) và cho phép xác minh hoặc thử lại thay vì làm trắng trang.
- **AC-NFR09.2** Cấu hình Web App Manifest (`/manifest.webmanifest`) và Service Worker để cài đặt PWA là mục tiêu mở rộng.
- **Kiểm chứng:** U, M.

#### NFR-10 – Tương thích trình duyệt `Must`

- **AC-NFR10.1** Hoạt động đúng trên hai phiên bản mới nhất của Chrome, Edge, Firefox và Safari (di động và máy tính).
- **Kiểm chứng:** M.

#### NFR-11 – Tính sẵn sàng và giám sát `Must`

- **AC-NFR11.1** API có endpoint liveness `GET /api/health` và readiness `GET /api/health/ready` (kiểm tra kết nối thực tế tới PostgreSQL bằng `SELECT 1`) trả mã `200` khi hệ thống sẵn sàng, hoặc `503` khi DB mất kết nối.
- **AC-NFR11.2** Mọi lỗi phát sinh trong API đều đi qua `ApiExceptionFilter`, trả về cấu trúc JSON thống nhất (`statusCode`, `code`, `message`, `details`) và ẩn thông tin driver DB/stack trace khỏi response khi lỗi `500 INTERNAL_ERROR`.
- **Kiểm chứng:** I, M.

#### NFR-12 – Toàn vẹn dữ liệu và đồng thời `Must`

- **AC-NFR12.1** Tồn kho nguyên liệu (`Ingredient.stock`) có ràng buộc `CHECK (stock >= 0)` ở mức PostgreSQL và khóa lạc quan `version`, đảm bảo không bao giờ âm và không bán vượt số lượng trong mọi trường hợp đặt đồng thời.
- **AC-NFR12.2** Một yêu cầu tạo đơn hoặc thanh toán gửi lặp lại cùng `Idempotency-Key` không bao giờ tạo hai `Order`/`Payment` hoặc chuyển trạng thái đơn hai lần.
- **AC-NFR12.3** Các thao tác ghi liên quan (tạo đơn, giữ/nhả kho nguyên liệu, tăng/hoàn lượt mã khuyến mãi, cập nhật trạng thái đơn, ghi nhận thanh toán, cộng/đảo điểm thưởng) luôn thực thi trong database transaction (`UnitOfWork` với `SET LOCAL lock_timeout = '3s'`, `timeout = 5000ms`, `ReadCommitted`).
- **Kiểm chứng:** U, I.

### 1.4 Khả năng triển khai (kèm Kiểm thử và Bảo trì)

#### NFR-13 – Khả năng triển khai `Must`

- **AC-NFR13.1** Một người ngoài nhóm clone repository, làm theo README và chạy được toàn bộ hệ thống (`db`, `backend`, `frontend`) bằng `docker compose up --build -d`.
- **AC-NFR13.2** Migration (`prisma migrate deploy`) và seed (`npm run seed`) tái tạo được cơ sở dữ liệu đầy đủ (sản phẩm, topping, nguyên liệu, định mức công thức, khuyến mãi, tài khoản mẫu) từ trạng thái trống.
- **AC-NFR13.3** Pipeline CI/CD (`.github/workflows/ci.yml`) thực hiện kiểm tra tài liệu hợp đồng (`docs:check`), kiểm tra kiểu dữ liệu (`api:check`), `docs:schema`, `prisma:validate`, `prisma:deploy`, `lint`, `test` (`RUN_DB_TESTS="1"`), `build` và smoke test readiness API.
- **AC-NFR13.4** Có quy trình vận hành/rollback được mô tả trong `docs/deployment.md` và migration chạy an toàn thông qua `prisma migrate deploy`.
- **Kiểm chứng:** M, E.

#### NFR-14 – Khả năng kiểm thử và bảo trì `Should`

- **AC-NFR14.1** Mã nguồn qua lint không lỗi (`--max-warnings 0`); có bộ kiểm thử tự động toàn diện cho cả backend (`tests/api/*.e2e-spec.ts`, `tests/api/*.integration-spec.ts`) và frontend (`apps/web/src/**/*.test.ts`), bao phủ các module `Auth`, `Products`, `Inventory`, `Orders`, `Payments`, `Promotions`, `Loyalty`, `Admin`.
- **AC-NFR14.2** Backend chia module rõ ràng theo domain (`AuthModule`, `ProductsModule`, `InventoryModule`, `OrdersModule`, `OrderHistoryModule`, `PaymentsModule`, `PromotionsModule`, `LoyaltyModule`, `IdempotencyModule`, `PrismaModule`, `DatabaseModule`) và sinh hợp đồng kiểu dữ liệu dùng chung từ `docs/api/openapi.yaml` sang `api.generated.ts` ở cả backend và frontend (`npm run api:types`).
- **Kiểm chứng:** I, M (CI).

#### NFR-15 – Ghi log lỗi và bảo mật log `Should`

- **AC-NFR15.1** `ApiExceptionFilter` chỉ ghi log lỗi 500 bằng thông điệp đã lọc bỏ dữ liệu nhạy cảm (`Unhandled request exception; investigate server-side with sanitized context`), tuyệt đối không ghi mật khẩu, token JWT, khóa bí mật hay dữ liệu thẻ.
- **AC-NFR15.2** Mở rộng `CorrelationIdMiddleware` (`X-Correlation-Id`) và `LoggingInterceptor` cho từng request là mục tiêu cải tiến bổ sung.
- **Kiểm chứng:** M.

---

## 2. Phân loại ưu tiên MoSCoW (`NFR-01` đến `NFR-15`)

| Mã | Tên yêu cầu phi chức năng | Nhóm yêu cầu | Ưu tiên MoSCoW |
|---|---|---|---|
| NFR-01 | Hiệu năng API (`p95 < 500ms` đọc, `< 1000ms` ghi) | Hiệu năng | **Must** |
| NFR-02 | Hiệu năng giao diện (`LCP <= 2,5s`) | Hiệu năng | **Should** |
| NFR-03 | Bảo mật mật khẩu (`bcrypt` cost 12) | Bảo mật | **Must** |
| NFR-04 | Xác thực và phân quyền (`JWT` + `RBAC` + `BOLA`) | Bảo mật | **Must** |
| NFR-05 | Validate dữ liệu đầu vào (`ValidationPipe` + Prisma parameterized) | Bảo mật | **Must** |
| NFR-06 | Quản lý bí mật và cấu hình (`.env.example`) | Bảo mật | **Must** |
| NFR-07 | An toàn đường truyền và truy cập dữ liệu (`CORS`, mạng nội bộ DB) | Bảo mật | **Must** |
| NFR-08 | Tính khả dụng của giao diện (`360px` mobile-first, ≤ 6 màn hình) | Tính khả dụng | **Must** |
| NFR-09 | Giao diện bền lỗi mạng (`uncertain` state, retry) | Tính khả dụng | **Should** |
| NFR-10 | Tương thích trình duyệt (Chrome, Edge, Firefox, Safari) | Tính khả dụng | **Must** |
| NFR-11 | Tính sẵn sàng và giám sát (`/api/health`, `/api/health/ready`) | Tính khả dụng | **Must** |
| NFR-12 | Toàn vẹn dữ liệu và đồng thời (`OCC`, `Idempotency`, `UnitOfWork`) | Tính khả dụng | **Must** |
| NFR-13 | Khả năng triển khai (`docker compose`, `prisma migrate`, CI/CD) | Khả năng triển khai | **Must** |
| NFR-14 | Khả năng kiểm thử và bảo trì (Modular, OpenAPI codegen, tests) | Khả năng triển khai | **Should** |
| NFR-15 | Ghi log lỗi và bảo mật log (`ApiExceptionFilter` sanitized) | Khả năng triển khai | **Should** |
