# Ma trận truy vết BrewLite

Mã yêu cầu và tiêu chí chấp nhận lấy từ [SRS](requirements/Task-1.2-SRS-BrewLite.md). [UC-06](requirements/use-case-checkout.md) là use-case trọng tâm của Assignment 2. Ma trận thiết kế trước Sprint 1–2. Các link test trỏ tới baseline hiện có. Mục ghi dự kiến là công việc của sprint và cần cập nhật với PR, test run và bằng chứng thực tế.

Ký hiệu thiết kế **A** [Activity-01](diagrams/activity-checkout.svg), **S** [Sequence-01](diagrams/sequence-checkout.svg), **C** [Class-01](diagrams/class-domain.svg), **K** [kiến trúc](architecture/overview.md), **D** [deployment](architecture/deployment-diagram.md).

| Mã yêu cầu | Use-case hoặc user story | Thiết kế | Code/API | Kiểm chứng |
| --- | --- | --- | --- | --- |
| FR-01 | Xem menu | A | `GET /api/products`, `/menu` | [API catalog](../tests/api/catalog.integration-spec.ts). Dự kiến E2E ở Sprint 2. |
| FR-02 | Lọc và tìm món | A | `apps/web/src/components/menu-grid.tsx` | [Lọc menu](../apps/web/src/features/products/filter.test.ts) |
| FR-03 | Xem chi tiết món | A, C | `GET /api/products/:id`, `/products/[id]` | [API catalog](../tests/api/catalog.integration-spec.ts). Dự kiến E2E ở Sprint 2. |
| FR-04 | Chọn size/topping | A, C | `apps/web/src/features/products/pricing.ts`, catalog pricing | [Tính giá web](../apps/web/src/features/products/pricing.test.ts), [API giá](../tests/api/catalog-pricing.e2e-spec.ts) |
| FR-05 | UC-06 · Thêm giỏ | A | `cart-store.ts` | [Giỏ](../apps/web/src/lib/cart/cart-store.test.ts). Dự kiến E2E ở Sprint 2. |
| FR-06 | UC-06 · Sửa giỏ và tổng tiền | A, S | `/cart`, `POST /api/orders/quote` | [Giỏ](../apps/web/src/lib/cart/cart-store.test.ts), [Checkout tích hợp](../tests/api/checkout.integration-spec.ts) |
| FR-07 | UC-06 · Khôi phục giỏ | A | `cart-store.ts`, `checkout/session.ts` | [Giỏ](../apps/web/src/lib/cart/cart-store.test.ts), [Phiên](../apps/web/src/lib/checkout/session.test.ts) |
| FR-08 | Đăng ký | K | `POST /api/auth/register` | [Auth HTTP](../tests/api/auth.e2e-spec.ts). Dự kiến E2E ở Sprint 2. |
| FR-09 | UC-06 · Đăng nhập | A, K | `POST /api/auth/login`, `GET /api/auth/me` | [Auth HTTP](../tests/api/auth.e2e-spec.ts), [Auth DB](../tests/api/auth.integration-spec.ts) |
| FR-10 | UC-06 · Bảo vệ dữ liệu | S, K | `JwtAuthGuard`, `OrderHistoryController` | [Auth HTTP](../tests/api/auth.e2e-spec.ts), [Quyền đơn](../tests/api/order-history.e2e-spec.ts) |
| FR-11 | UC-06 · Báo giá và tạo đơn | A, S, C | `POST /api/orders/quote`, `POST /api/orders` | [Tạo đơn DB](../tests/api/orders-create.integration-spec.ts). Dự kiến E2E ở Sprint 2. |
| FR-12 | UC-06 · Giữ và trả kho | A, S, K | `InventoryService`, `OrderIngredientHold` | [Tranh tồn kho](../tests/api/inventory.integration-spec.ts), [Checkout tích hợp](../tests/api/checkout.integration-spec.ts) |
| FR-13 | UC-06 · Ví/Thẻ mô phỏng | A, S, C | `POST /api/payments`, `/checkout` | [Payment HTTP](../tests/api/payments.e2e-spec.ts). Dự kiến E2E ở Sprint 2. |
| FR-14 | UC-06 · Chống gửi trùng | S, K | `IdempotencyService`, `Idempotency-Key` | [Idempotency HTTP](../tests/api/idempotency.e2e-spec.ts), [Checkout DB](../tests/api/checkout.integration-spec.ts) |
| FR-15 | UC-06 · FAIL, thử lại, đối soát | A, S, C | `/checkout`, `GET /api/payments/manual-review` | Dự kiến E2E ở Sprint 2. [Gateway DB](../tests/api/gateway-safety.integration-spec.ts) |
| FR-16 | UC-06 · Xác nhận đơn | A, S | `/checkout`, `GET /api/orders/:id` | [Checkout web baseline](../apps/web/src/components/checkout/Checkout.test.ts). Dự kiến E2E ở Sprint 2. |
| FR-17 | UC-06 · Lịch sử | A, C | `GET /api/orders/me`, `/orders` | [Lịch sử HTTP](../tests/api/order-history.e2e-spec.ts). Dự kiến E2E ở Sprint 2. |
| FR-18 | UC-06 · Theo dõi trạng thái | A, C | `GET /api/orders/:id`, `/orders/[id]` | [Lịch sử HTTP](../tests/api/order-history.e2e-spec.ts). Dự kiến E2E ở Sprint 2. |
| FR-19 | Chuyển trạng thái | C, K | `ORDER_TRANSITIONS`, `PATCH /api/orders/:id/status` | [State machine](../tests/api/order-state.e2e-spec.ts), [Transition DB](../tests/api/order-transitions.integration-spec.ts) |
| FR-20 | Hủy đơn | A, C | `POST /api/orders/:id/cancel` | [Checkout DB](../tests/api/checkout.integration-spec.ts), [Chuyển trạng thái DB](../tests/api/order-transitions.integration-spec.ts) |
| FR-21 | Vận hành quầy | C, K | `/staff`, `GET /api/orders/staff`, `PATCH /api/orders/:id/status` | [Staff regression](../tests/api/admin-staff-regression.e2e-spec.ts), [Transition HTTP](../tests/api/order-transitions.e2e-spec.ts) |
| FR-22 | UC-06 · Dùng ưu đãi | S, C | `POST /api/promotions/validate`, `PromotionsService` | [Quy tắc ưu đãi](../tests/api/promotion-rules.e2e-spec.ts), [Checkout DB](../tests/api/checkout.integration-spec.ts) |
| FR-23 | Tích điểm khi hoàn tất | C, K | `LoyaltyService`, `GET /api/loyalty/me` | [Ledger HTTP](../tests/api/loyalty.e2e-spec.ts), [Checkout DB](../tests/api/checkout.integration-spec.ts) |
| FR-24 | Quản trị danh mục và tồn | C, K | `/admin`, `/api/auth/admin/*` | [Validation quản trị](../tests/api/admin-validation.e2e-spec.ts). Tạo sản phẩm mới là phần mở rộng chưa có. |
| FR-25 | Thống kê và đối soát | C, K | `GET /api/auth/admin/overview`, `GET /api/payments/manual-review` | [Tổng quan admin](../apps/web/src/app/admin/admin-overview.test.ts), [Gateway DB](../tests/api/gateway-safety.integration-spec.ts). Xác minh số liệu khi demo. |
| FR-26 | Tài khoản nhân viên | K | `POST /api/auth/staff`, `/api/auth/staff/:id/status` | [Staff DB](../tests/api/staff-activation.integration-spec.ts), [Auth HTTP](../tests/api/auth.e2e-spec.ts) |
| NFR-01 | Hiệu năng API | K, D | `npm run qa:benchmark` | [Mẫu latency](qa/final/latency.json). Ghi rõ baseline và môi trường đo. |
| NFR-02 | LCP menu mobile | A, D | `/menu` và ảnh sản phẩm | Nghiệm thu Lighthouse mobile trên URL production. |
| NFR-03 | Băm mật khẩu | K | `AUTH_POLICY`, `AuthService`, `seed-users.ts` | [Auth DB](../tests/api/auth.integration-spec.ts), [Seed DB](../tests/api/seed-money.integration-spec.ts) |
| NFR-04 | JWT và phân quyền | S, K | `JwtAuthGuard`, `StaffGuard`, `AdminGuard` | [Auth HTTP](../tests/api/auth.e2e-spec.ts), [Staff DB](../tests/api/staff-activation.integration-spec.ts) |
| NFR-05 | Validate input | S, K | `configureApp`, DTO, Prisma | [Hợp đồng](api/README.md), [Validation quản trị](../tests/api/admin-validation.e2e-spec.ts), [Tạo đơn](../tests/api/orders-create.e2e-spec.ts) |
| NFR-06 | Cấu hình và secrets | D | `.env.example`, GitHub environment, Render | [Thiết kế triển khai](deployment.md). Kiểm tra log và cấu hình khi deploy thật. |
| NFR-07 | TLS, DB nội bộ và bảo vệ HTTP | D, K | Render TLS và private PostgreSQL, `configureApp`, CORS | Dự kiến test bảo vệ HTTP và script CD ở Sprint 2. Xác nhận HTTPS và DB private trên production. |
| NFR-08 | Mobile-first và phản hồi | A | Menu, giỏ và checkout | Dự kiến E2E ở Sprint 2. [ảnh QA](qa/issue-4/README.md) |
| NFR-09 | PWA và xử lý mất mạng | A, K | Dự kiến `/manifest.webmanifest` và trang thử lại khi mất mạng | Dự kiến kiểm tra manifest và mất mạng bằng E2E ở Sprint 2. |
| NFR-10 | Tương thích trình duyệt | A | Next.js và Playwright | Dự kiến chạy E2E Chromium ở Sprint 2. Kiểm tra bổ sung Edge/Firefox/Safari trước khi xác nhận toàn bộ AC. |
| NFR-11 | Liveness/readiness và lỗi | K, D | `GET /api/health`, `GET /api/health/ready`, `ApiExceptionFilter` | [Health HTTP](../tests/api/health.e2e-spec.ts), [API skeleton](../tests/api/api-skeleton.e2e-spec.ts) |
| NFR-12 | Transaction và đồng thời | S, C, K | PostgreSQL, `UnitOfWork`, khóa lạc quan, idempotency | [Schema DB](../tests/api/schema.integration-spec.ts), [Kho DB](../tests/api/inventory.integration-spec.ts), [Checkout DB](../tests/api/checkout.integration-spec.ts) |
| NFR-13 | Tái lập và triển khai | D | Compose, migration/seed, CI, GHCR, Render | [CI](../.github/workflows/ci.yml), [Thiết kế triển khai](deployment.md). Workflow Release, minh chứng production và người ngoài nhóm clone thuộc Sprint 2. |
| NFR-14 | Khả năng bảo trì và test | K | `npm test`, `npm run test:db`, `npm run test:e2e`, OpenAPI | [CI](../.github/workflows/ci.yml). Báo cáo coverage cần được đo riêng nếu dùng ngưỡng 70%. |
| NFR-15 | Log và truy vết request | K, D | Nest logger, `ApiExceptionFilter`, log Render | [API skeleton](../tests/api/api-skeleton.e2e-spec.ts) kiểm tra che lỗi. Dự kiến kiểm tra ID tương quan trong Sprint 2. Đối chiếu log thật trên Render. |
