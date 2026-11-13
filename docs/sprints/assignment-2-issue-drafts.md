# Năm Issue Triển Khai BrewLite · Assignment 2 (Task 4 & Task 5)

Tài liệu này định nghĩa 5 GitHub Issues thực hiện **Task 4 (Sprint 1 & Sprint 2 – Agile Implementation & Testing)** và **Task 5 (Docker, CI/CD & Production Delivery)** sau khi toàn bộ hồ sơ **Task 1–3** đã hoàn thành và merge vào `main` (`b926546`).

- **Baseline mã nguồn hiện tại**: Nhánh `main` (`b926546`).
- **Quy tắc làm việc & PR**:
  - Tạo nhánh mới từ `main` (`feature/...` hoặc `fix/...`).
  - Vì repo đã có code baseline từ giai đoạn trước, mỗi thành viên phải **kiểm định phần đã có**, **bổ sung phần còn thiếu so với SRS/Sơ đồ Task 1–3**, viết/chạy test thực tế và ghi rõ trong mô tả PR: *(1) Phần kế thừa từ baseline, (2) Phần viết mới/sửa đổi, (3) Minh chứng chạy test & ảnh chụp UI/log CI*.
  - Mọi PR phải vượt qua CI Quality Gate (`Install → Lint → Test → Build`) và có ít nhất 1 thành viên khác review trước khi merge.

---

## Issue 1 (TV1) · [Sprint 1 & 2] Catalog API, Database Seed và Giao diện Menu / Chi tiết món Mobile-First

- **Phạm vi Task**: Task 4.3 (MVP Sprint 1) & Task 4.2/5.1 (Chi tiết sản phẩm, size và topping)
- **Story Points**: `8 SP` | **Ưu tiên**: `Must`
- **Truy vết yêu cầu**: `FR-01`, `FR-02`, `FR-03`, `FR-04`, `NFR-01`, `NFR-02`, `NFR-08`, `NFR-10`, `NFR-13`
- **Tài liệu & Sơ đồ liên quan**:
  - Đặc tả yêu cầu: [`docs/requirements/context-and-scope.md`](../requirements/context-and-scope.md), [`docs/requirements/functional-requirements.md`](../requirements/functional-requirements.md) (`FR-01`..`FR-04`), [`docs/requirements/Task-1.2-SRS-BrewLite.md`](../requirements/Task-1.2-SRS-BrewLite.md)
  - Sơ đồ:
    - Use Case tổng quát: [`docs/requirements/usecase-brewlite.svg`](../requirements/usecase-brewlite.svg) (`UC-01`, `UC-02`)
    - Activity Diagram: [`docs/diagrams/activity-checkout.svg`](../diagrams/activity-checkout.svg) (Swimlane Khách hàng / Hệ thống ở bước Duyệt menu, Chọn món, Chọn size S/M/L & topping)
    - Class Diagram: [`docs/diagrams/class-domain.svg`](../diagrams/class-domain.svg) (Các lớp `Product`, `ProductSize`, `Topping`, `Ingredient`, `ProductIngredient`, `ToppingIngredient`)
    - Kiến trúc & ERD: [`docs/diagrams/erd.md`](../diagrams/erd.md), [`docs/diagrams/schema.prisma`](../diagrams/schema.prisma)

### 1. Phần đã có trong baseline trên `main`
- **Backend (`apps/api`)**:
  - `apps/api/src/modules/products/` (`products.controller.ts`, `products.service.ts`, `catalog-pricing.service.ts`) với `GET /api/products` và `GET /api/products/:id`.
  - Schema Prisma & migrations (`apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`) cho danh mục món, bảng giá theo size (`S/M/L`), topping và công thức nguyên liệu.
  - Seed dữ liệu mẫu (`apps/api/src/seed/seed.ts`) và ảnh món trong `apps/web/public/images/`.
- **Frontend (`apps/web`)**:
  - Trang danh sách menu `apps/web/src/app/menu/page.tsx`, chi tiết sản phẩm `apps/web/src/app/products/[id]/page.tsx`.
  - Component hiển thị & bộ lọc: `menu-grid.tsx`, `menu-filter.tsx`, `product-card.tsx`, `product-detail-view.tsx`, hàm tính giá `features/products/pricing.ts`.
- **Kiểm thử hiện có**:
  - Unit test: `apps/web/src/features/products/filter.test.ts`, `pricing.test.ts`.
  - Integration/E2E API test: `tests/api/catalog.integration-spec.ts`, `tests/api/catalog-pricing.e2e-spec.ts`, `tests/api/seed-money.integration-spec.ts`.

### 2. Phần cần bổ sung và hoàn thiện
1. **Rà soát và đồng bộ hợp đồng Catalog với SRS & Class Diagram**:
   - Đảm bảo `GET /api/products` và `GET /api/products/:id` tính đúng trạng thái khả dụng (`stock` / giới hạn số lượng tối đa có thể pha chế dựa trên tồn kho nguyên liệu `Ingredient` hiện tại theo công thức món + size + topping).
   - Kiểm tra xử lý lỗi chuẩn (`404 PRODUCT_NOT_FOUND` khi ID không tồn tại hoặc món ngừng bán) khớp với OpenAPI (`docs/api/openapi.yaml`).
2. **Hoàn thiện trải nghiệm Mobile-First (360px–430px) cho Sprint 1 MVP**:
   - Kiểm tra và hoàn thiện 3 trạng thái bắt buộc trên `/menu` và `/products/[id]`: **Loading** (skeleton/spinner), **Empty** (khi lọc không có kết quả hoặc danh mục trống) và **Error** (khi API lỗi, có nút "Thử lại").
   - Tại màn hình chi tiết món (`/products/[id]`): bắt buộc chọn 1 size (`S`/`M`/`L`), cho phép chọn nhiều topping active, cập nhật giá tạm tính tức thì (`(giá size + tổng topping) × số lượng`), và chặn bấm "Thêm vào giỏ" nếu số lượng vượt mức nguyên liệu khả dụng.
3. **Kiểm chứng Seed & Migration trên Database trắng**:
   - Đảm bảo lệnh `prisma migrate deploy` + `seed` khởi tạo lại đầy đủ danh mục, công thức nguyên liệu và giá nguyên VND từ DB trống.
   - Bổ sung/cập nhật bằng chứng kiểm thử và ảnh chụp các trạng thái menu mobile cho nghiệm thu Sprint 1 (Task 4.3 & 4.4).

### 3. Tiêu chí nghiệm thu (Acceptance Criteria)
- [ ] `GET /api/products` trả danh sách món active từ PostgreSQL kèm phân trang đúng; `GET /api/products/:id` trả đầy đủ thông tin món, bảng giá size `S/M/L`, danh sách topping và trạng thái khả dụng theo nguyên liệu.
- [ ] Giao diện `/menu` và `/products/[id]` hiển thị chuẩn ở khung nhìn mobile `360px`, không vỡ bố cục, có đủ trạng thái Loading, Empty và Error kèm nút thử lại.
- [ ] Chọn size và topping cập nhật đúng đơn giá & thành tiền tạm tính; chặn cấu hình thiếu size hoặc vượt số lượng nguyên liệu khả dụng.
- [ ] Chạy pass toàn bộ `filter.test.ts`, `pricing.test.ts`, `catalog.integration-spec.ts`, `catalog-pricing.e2e-spec.ts` trên CI và đính kèm link PR chạy CI xanh.

---

## Issue 2 (TV2) · [Sprint 2] Giỏ hàng, Giao diện Checkout (Ví/Thẻ mô phỏng, Xác nhận giá, Retry) và PWA Offline

- **Phạm vi Task**: Giỏ hàng, tính tổng tiền, UI thanh toán Ví/Thẻ mô phỏng, xử lý lỗi frontend & PWA mobile-first
- **Story Points**: `8 SP` | **Ưu tiên**: `Must`
- **Truy vết yêu cầu**: `FR-05`, `FR-06`, `FR-07`, `FR-11`, `FR-13`, `FR-14`, `FR-15`, `FR-16`, `NFR-08`, `NFR-09`
- **Tài liệu & Sơ đồ liên quan**:
  - Đặc tả yêu cầu: [`docs/requirements/functional-requirements.md`](../requirements/functional-requirements.md), [`docs/requirements/use-cases.md`](../requirements/use-cases.md) (`UC-06`), [`docs/requirements/checkout-integration.md`](../requirements/checkout-integration.md)
  - Sơ đồ:
    - Use Case chi tiết: [`docs/requirements/SWE_UC_chitiet.svg`](../requirements/SWE_UC_chitiet.svg) (`UC-06`, `UC-06.2`, `UC-06.3`, `UC-07`)
    - Activity Diagram: [`docs/diagrams/activity-checkout.svg`](../diagrams/activity-checkout.svg) (Luồng Giỏ hàng → Checkout → Xác nhận lại giá nếu lệch → Thanh toán Ví/Thẻ mô phỏng `SUCCESS`/`FAIL` → Màn hình xác nhận đơn & chuyển sang Lịch sử/Theo dõi)
    - Sequence Diagram: [`docs/diagrams/sequence-checkout.svg`](../diagrams/sequence-checkout.svg) (Lifeline `Customer → Next.js UI → NestJS API`: giữ `Idempotency-Key` khi mất mạng vs tạo key mới khi thử lại sau `FAIL`)
    - Kiến trúc: [`docs/architecture/system-architecture.md`](../architecture/system-architecture.md)

### 1. Phần đã có trong baseline trên `main`
- **Giỏ hàng (`apps/web`)**:
  - Store giỏ hàng `apps/web/src/lib/cart/cart-store.ts` (lưu `localStorage`, gộp dòng trùng `productId + size + sorted(toppingIds)`, chỉ xóa các dòng đã mua sau khi thanh toán thành công) và unit test `cart-store.test.ts`.
  - Trang giỏ hàng `apps/web/src/app/cart/page.tsx` và badge số lượng trên `Header.tsx`.
- **Quản lý phiên Checkout**:
  - `apps/web/src/lib/checkout/session.ts` & `errors.ts` (gọi quote, tạo đơn, lưu trạng thái attempt + `Idempotency-Key` theo phiên người dùng, kiểm tra lệch giá `checkOrderPriceChange`) kèm unit test `session.test.ts`, `errors.test.ts`.
  - Component `apps/web/src/components/checkout/Checkout.tsx` và trang `apps/web/src/app/checkout/page.tsx`.

### 2. Phần cần bổ sung và hoàn thiện
1. **Khôi phục và hiển thị tùy chọn Thanh toán Ví/Thẻ mô phỏng (`MOCK`) trên UI `Checkout.tsx`**:
   - Đưa tùy chọn **Ví/Thẻ mô phỏng (`MOCK`: chọn `WALLET`/`CARD` và `SUCCESS`/`FAIL`)** lên làm lựa chọn mặc định trên giao diện `/checkout` (bên cạnh Stripe/VNPay Sandbox) ở cả bước thanh toán lần đầu lẫn bước **Thử lại thanh toán** khi đơn ở trạng thái `PAYMENT_FAILED` — đúng theo Activity/Sequence Diagram.
2. **Đảm bảo đúng hành vi Replay vs Retry trên UI**:
   - Khi mất mạng hoặc kết quả thanh toán chưa xác minh (`!state.verified`): giữ nguyên `Idempotency-Key` và payload cũ, hiển thị nút kiểm tra lại / gửi lại cùng key.
   - Khi server đã xác nhận `PAYMENT_FAILED` (`state.verified && order.status === 'PAYMENT_FAILED'`): giữ nguyên giỏ hàng, cho phép khách chọn lại phương thức và bấm thanh toán lại trên cùng `orderId` với **`Idempotency-Key` mới** (`session.pay(method, outcome, true)`).
   - Khi `PAID`: xóa đúng các món đã mua khỏi giỏ, hiển thị mã đơn `orderCode`, trạng thái `PAID` và nút điều hướng sang Xem chi tiết đơn (`/orders/[id]`) hoặc Lịch sử đơn (`/orders`).
3. **Bổ sung cấu hình PWA & Offline Fallback**:
   - Tạo `apps/web/src/app/manifest.ts` (`/manifest.webmanifest`), icon `apps/web/public/icon-192.png`, `icon-512.png`.
   - Tạo Service Worker `apps/web/public/sw.js` (chỉ cache tài nguyên tĩnh công khai, không cache response API có JWT), trang `apps/web/public/offline.html` và component đăng ký `OfflineFallbackRegistration.tsx` gắn vào `apps/web/src/app/layout.tsx`.
   - Cập nhật unit test `apps/web/src/components/checkout/Checkout.test.ts`.

### 3. Tiêu chí nghiệm thu (Acceptance Criteria)
- [ ] Thêm món cùng `productId + size + toppingIds` tự gộp thành 1 dòng; tăng/giảm/xóa cập nhật đúng badge và tổng tạm tính; reload trang hoặc chuyển qua đăng nhập không mất giỏ hàng.
- [ ] Tại `/checkout`, khách chọn được trực tiếp **Ví điện tử (`WALLET`) / Thẻ ngân hàng (`CARD`) mô phỏng** với kết quả `SUCCESS` hoặc `FAIL`.
- [ ] Nếu giá lúc tạo đơn khác giá báo giá (`quote`), UI chặn thanh toán và yêu cầu khách xác nhận tổng tiền mới trước khi trả tiền.
- [ ] Khi chạy mock `FAIL`: đơn chuyển sang `PAYMENT_FAILED`, giỏ hàng còn nguyên, khách bấm thử lại với `SUCCESS` trên cùng đơn sẽ chuyển sang `PAID`, xóa món đã mua khỏi giỏ và hiện link sang `/orders/[id]`.
- [ ] `/manifest.webmanifest`, `sw.js`, `offline.html` hoạt động đúng; chạy pass `cart-store.test.ts`, `session.test.ts`, `Checkout.test.ts`.

---

## Issue 3 (TV3) · [Sprint 1 & 2] Báo giá, Tạo đơn Atomic, Giữ/Hoàn kho nguyên liệu, Khuyến mãi & Máy trạng thái đơn

- **Phạm vi Task**: Tạo đơn hàng, trạng thái đơn, validate backend & Unit/Integration test cho nghiệp vụ đặt đơn & tồn kho
- **Story Points**: `8 SP` | **Ưu tiên**: `Must`
- **Truy vết yêu cầu**: `FR-11`, `FR-12`, `FR-19`, `FR-20`, `FR-22`, `FR-23`, `NFR-05`, `NFR-12`
- **Tài liệu & Sơ đồ liên quan**:
  - Đặc tả yêu cầu: [`docs/requirements/functional-requirements.md`](../requirements/functional-requirements.md), [`docs/requirements/use-cases.md`](../requirements/use-cases.md) (`UC-06`, `UC-06.2`, `UC-06.3`, `UC-08`), [`docs/requirements/business-rules.md`](../requirements/business-rules.md), [`docs/requirements/order-state-machine.md`](../requirements/order-state-machine.md), [`docs/requirements/inventory-concurrency.md`](../requirements/inventory-concurrency.md)
  - Sơ đồ:
    - Activity Diagram: [`docs/diagrams/activity-checkout.svg`](../diagrams/activity-checkout.svg)
    - Sequence Diagram: [`docs/diagrams/sequence-checkout.svg`](../diagrams/sequence-checkout.svg)
    - Class Diagram: [`docs/diagrams/class-domain.svg`](../diagrams/class-domain.svg) (`Order`, `OrderItem`, `OrderItemTopping`, `OrderIngredientHold`, `Ingredient`, `Promotion`, `LoyaltyEntry`, enum `OrderStatus`)
    - Kiến trúc & ADR: [`docs/architecture/system-architecture.md`](../architecture/system-architecture.md), [`docs/architecture/adr/ADR-002-relational-database-prisma-orm.md`](../architecture/adr/ADR-002-relational-database-prisma-orm.md), [`docs/architecture/adr/ADR-004-realtime-inventory-concurrency-optimistic-locking.md`](../architecture/adr/ADR-004-realtime-inventory-concurrency-optimistic-locking.md), [`docs/architecture/adr/ADR-006-double-entry-loyalty-ledger.md`](../architecture/adr/ADR-006-double-entry-loyalty-ledger.md)

### 1. Phần đã có trong baseline trên `main`
- **Backend Modules (`apps/api/src/modules/`)**:
  - `orders/`: `orders.controller.ts`, `orders.service.ts`, `order-transactions.service.ts`, `order-reader.service.ts`, `domain/order-pricing.ts`, `domain/order-state-machine.ts`.
  - `inventory/`: `inventory.service.ts`, `recipe.repository.ts`, `domain/recipe.ts` (tính lượng nguyên liệu theo công thức món + size + topping, giữ kho vào `OrderIngredientHold` với optimistic locking `version`).
  - `promotions/`: `promotions.controller.ts`, `promotions.service.ts`, `promotion-rules.ts`.
  - `loyalty/`: `loyalty.controller.ts`, `loyalty.service.ts` (sổ cái điểm thưởng `LoyaltyEntry`).
  - `common/database/unit-of-work.ts` (quản lý transaction).
- **Kiểm thử hiện có**:
  - `tests/api/orders-create.e2e-spec.ts`, `tests/api/orders-create.integration-spec.ts`, `tests/api/inventory.integration-spec.ts`, `tests/api/two-customers.integration-spec.ts`, `tests/api/order-state.e2e-spec.ts`, `tests/api/order-transitions.e2e-spec.ts`, `tests/api/order-transitions.integration-spec.ts`, `tests/api/promotion-rules.e2e-spec.ts`, `tests/api/loyalty.e2e-spec.ts`.

### 2. Phần cần bổ sung và hoàn thiện
1. **Rà soát và đảm bảo khớp tuyệt đối với Sequence Diagram (#8), Activity Diagram (#7) và Class Diagram (#13)**:
   - **Tạo đơn (`POST /api/orders`)**: Tính lại toàn bộ giá món, size, topping, giảm giá khuyến mãi (`Promotion`) và định mức nguyên liệu ở server; lưu snapshot giá vào `Order`/`OrderItem`/`OrderItemTopping`, tạo `OrderIngredientHold` (`reservationStatus = HELD`) và tăng `usedCount` mã khuyến mãi trong **cùng một PostgreSQL transaction**.
   - **Hoàn kho và giữ lại kho khi Retry thanh toán (`prepareRetry`)**:
     - Khi thanh toán `FAIL` (đơn sang `PAYMENT_FAILED`) hoặc khách hủy đơn (`PENDING`/`PAYMENT_FAILED` → `CANCELLED`), hệ thống chuyển `reservationStatus` sang `RELEASED`, cộng trả tồn nguyên liệu và giảm `usedCount` mã khuyến mãi đúng 1 lần.
     - Khi đơn đang ở `PAYMENT_FAILED` và khách gửi yêu cầu thử thanh toán lần mới (key mới), phải thực hiện `prepareRetry` kiểm tra và **giữ lại nguyên liệu (`RELEASED → HELD`) + lượt mã khuyến mãi** trước khi gọi cổng thanh toán.
   - **Tích điểm thưởng khi `COMPLETED`**:
     - Đảm bảo điểm thưởng (`floor(total / 10000)`) và bản ghi `LoyaltyEntry (EARN)` chỉ được cộng duy nhất 1 lần khi đơn chuyển sang trạng thái **`COMPLETED`** (không cộng ở bước `PAID`).
2. **Kiểm chứng đồng thời (Concurrency) & Migration trên PostgreSQL thật**:
   - Chạy và rà soát toàn bộ bộ test DB (`npm run test:db`), đặc biệt `tests/api/two-customers.integration-spec.ts`, `tests/api/inventory.integration-spec.ts`, `tests/api/orders-create.integration-spec.ts` và `tests/api/order-transitions.integration-spec.ts`.

### 3. Tiêu chí nghiệm thu (Acceptance Criteria)
- [ ] `POST /api/orders/quote` và `POST /api/orders` tính đúng `subtotal`, `discount`, `total` ở server (không nhận giá từ client); lưu đơn `PENDING` và giữ nguyên liệu (`reservationStatus = HELD`) trong 1 transaction.
- [ ] Khi thiếu bất kỳ nguyên liệu nào, rollback toàn bộ transaction (không tạo đơn, không trừ nguyên liệu dở dang) và trả `409 OUT_OF_STOCK` kèm chi tiết món/nguyên liệu thiếu.
- [ ] Hai request đặt đơn đồng thời tranh cùng nguyên liệu cuối cùng: chỉ 1 đơn thành công, không bao giờ xảy ra tồn kho nguyên liệu âm.
- [ ] Máy trạng thái chỉ cho phép chuyển đúng đồ thị (`PAID → PREPARING → READY → COMPLETED`; hủy từ `PENDING`/`PAYMENT_FAILED`); cộng điểm `LoyaltyEntry` đúng 1 lần khi `COMPLETED`.
- [ ] Pass 100% unit test và integration test với PostgreSQL thật.

---

## Issue 4 (TV4) · [Sprint 1 & 2] Xác thực JWT/RBAC, Bảo vệ HTTP API, Theo dõi đơn & Kiểm thử E2E Trình duyệt

- **Phạm vi Task**: Đăng ký, đăng nhập, JWT, lịch sử & trạng thái đơn, giao diện quầy & End-to-End test cho luồng từ menu đến xác nhận đơn
- **Story Points**: `8 SP` | **Ưu tiên**: `Must`
- **Truy vết yêu cầu**: `FR-08`, `FR-09`, `FR-10`, `FR-16`, `FR-17`, `FR-18`, `FR-21`, `FR-24`..`FR-26`, `NFR-03`, `NFR-04`, `NFR-05`, `NFR-07`, `NFR-15`
- **Tài liệu & Sơ đồ liên quan**:
  - Đặc tả yêu cầu: [`docs/requirements/functional-requirements.md`](../requirements/functional-requirements.md), [`docs/requirements/use-cases.md`](../requirements/use-cases.md) (`UC-04`, `UC-05`, `UC-09`, `UC-11`..`UC-14`)
  - Sơ đồ:
    - Activity Diagram: [`docs/diagrams/activity-checkout.svg`](../diagrams/activity-checkout.svg)
    - Sequence Diagram: [`docs/diagrams/sequence-checkout.svg`](../diagrams/sequence-checkout.svg)
    - Class Diagram: [`docs/diagrams/class-domain.svg`](../diagrams/class-domain.svg) (`User`, enum `Role`: `CUSTOMER`, `STAFF`, `ADMIN`)
    - Kiến trúc & ADR: [`docs/architecture/system-architecture.md`](../architecture/system-architecture.md), [`docs/architecture/adr/ADR-003-stateless-jwt-authentication.md`](../architecture/adr/ADR-003-stateless-jwt-authentication.md)

### 1. Phần đã có trong baseline trên `main`
- **Backend Auth & Order History (`apps/api`)**:
  - `apps/api/src/modules/auth/` (`auth.controller.ts`, `auth.service.ts`, `admin.controller.ts`, `admin.service.ts`, `auth-policy.ts`) và `common/security/security.ts` (`JwtAuthGuard`, `StaffGuard`, `AdminGuard`).
  - `apps/api/src/modules/order-history/order-history.controller.ts` (`GET /api/orders/me`, `GET /api/orders/:id`).
- **Frontend Auth, Lịch sử đơn, Quầy & Admin (`apps/web`)**:
  - Các trang `/login`, `/register`, `/profile`, `/orders`, `/orders/[id]`, `/staff`, `/admin`.
- **Kiểm thử API hiện có**:
  - `tests/api/auth.e2e-spec.ts`, `tests/api/auth.integration-spec.ts`, `tests/api/order-history.e2e-spec.ts`, `tests/api/staff-activation.integration-spec.ts`, `tests/api/admin-staff-regression.e2e-spec.ts`, `tests/api/admin-validation.e2e-spec.ts`.

### 2. Phần cần bổ sung và hoàn thiện
1. **Bổ sung lớp bảo vệ HTTP & Correlation ID trong `apps/api/src/setup.ts`**:
   - Cấu hình `helmet()`, `express-rate-limit` (trả `429 RATE_LIMIT_EXCEEDED`, bỏ qua `/health`, `/health/ready` và webhook/IPN), sinh header `X-Correlation-Id` cho mọi request `/api`, và ghi log JSON có cấu trúc ở production mà không lộ mật khẩu/JWT.
   - Viết test kiểm chứng tại `tests/api/http-protection.e2e-spec.ts`.
2. **Hoàn thiện tự động làm mới (Auto-refresh 5s) & Chống rò dữ liệu khi đổi tài khoản trên `/orders`, `/orders/[id]`, `/staff`**:
   - Polling tự động mỗi 5 giây khi đơn đang hoạt động (tạm dừng khi `document.hidden`) và kiểm tra token hiện hành trước khi cập nhật state để đáp ứng `FR-17`, `FR-18`, `FR-21`.
3. **Xây dựng bộ End-to-End (E2E) Test trên trình duyệt thật (Task 4.4)**:
   - Cấu hình Playwright (`tests/e2e/playwright.config.ts`) và viết E2E test trên trình duyệt Chromium (`tests/e2e/checkout.spec.ts`, `tests/e2e/pwa.spec.ts`) chạy với Next.js + NestJS + PostgreSQL thật cho toàn bộ luồng:
     `Xem menu → Chọn món, size & topping → Giỏ hàng → Đăng ký/Đăng nhập → Đặt đơn → Thanh toán Ví/Thẻ mô phỏng FAIL → Thử lại SUCCESS trên cùng đơn → Xem xác nhận & Lịch sử đơn → Nhân viên quầy chuyển trạng thái đến COMPLETED và cộng điểm`.

### 3. Tiêu chí nghiệm thu (Acceptance Criteria)
- [ ] Đăng ký chỉ tạo role `CUSTOMER`, mật khẩu băm `bcrypt`; thiếu/sai JWT trả `401`; khách xem đơn của người khác nhận `404 ORDER_NOT_FOUND`; `CUSTOMER` gọi API `/staff` hoặc `/admin` bị chặn `403`.
- [ ] Mọi response từ `/api` có `X-Correlation-Id`, security headers (`helmet`) và rate-limit hoạt động đúng (`tests/api/http-protection.e2e-spec.ts` pass).
- [ ] Trang `/orders`, `/orders/[id]` và `/staff` tự động cập nhật trạng thái đơn đang xử lý và không hiển thị dữ liệu cũ sau khi đăng xuất.
- [ ] Lệnh `npm run test:e2e` chạy Playwright trình duyệt thật pass 100% luồng end-to-end từ menu đến hoàn tất đơn.

---

## Issue 5 (TV5) · [Sprint 2 & Task 5] Thanh toán mô phỏng, Idempotency và Pipeline CI/CD Triển khai Render + GHCR

- **Phạm vi Task**: API Thanh toán & Idempotency, Health check, Docker Compose (Task 5.1 & 5.2), Continuous Delivery/Deployment (Task 5.3) & Triển khai Production (Task 5.4)
- **Story Points**: `8 SP` | **Ưu tiên**: `Must`
- **Truy vết yêu cầu**: `FR-13`, `FR-14`, `FR-15`, `NFR-06`, `NFR-07`, `NFR-11`, `NFR-12`, `NFR-13`
- **Tài liệu & Sơ đồ liên quan**:
  - Đặc tả yêu cầu: [`docs/requirements/functional-requirements.md`](../requirements/functional-requirements.md), [`docs/requirements/use-cases.md`](../requirements/use-cases.md) (`UC-07`), [`docs/requirements/idempotency-acceptance.md`](../requirements/idempotency-acceptance.md)
  - Sơ đồ:
    - Sequence Diagram: [`docs/diagrams/sequence-checkout.svg`](../diagrams/sequence-checkout.svg)
    - Class Diagram: [`docs/diagrams/class-domain.svg`](../diagrams/class-domain.svg) (`Payment`, `IdempotencyRecord`, enum `PaymentMethod`, `PaymentStatus`)
    - Kiến trúc & ADR: [`docs/architecture/system-architecture.md`](../architecture/system-architecture.md), [`docs/architecture/adr/ADR-005-idempotency-key-order-payment.md`](../architecture/adr/ADR-005-idempotency-key-order-payment.md), [`docs/architecture/adr/ADR-007-multi-gateway-payment-integration.md`](../architecture/adr/ADR-007-multi-gateway-payment-integration.md)
    - Deployment Diagram: [`docs/architecture/deployment-diagram.svg`](../architecture/deployment-diagram.svg), [`docs/architecture/deployment-diagram.md`](../architecture/deployment-diagram.md)

### 1. Phần đã có trong baseline trên `main`
- **Backend Payments & Idempotency (`apps/api`)**:
  - `apps/api/src/modules/payments/` (`payments.controller.ts`, `payments.service.ts`, `mock-payment-gateway.service.ts`, `stripe.service.ts`, `vnpay.service.ts`).
  - `apps/api/src/modules/idempotency/` (`idempotency.service.ts`).
  - `apps/api/src/health/health.controller.ts` (`GET /api/health` và `GET /api/health/ready`).
- **Docker & CI cơ bản**:
  - `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`.
  - `.github/workflows/ci.yml` (chạy lint, unit/db test, build và smoke test `/api/health/ready`).
- **Kiểm thử hiện có**:
  - `tests/api/payments.e2e-spec.ts`, `tests/api/idempotency.e2e-spec.ts`, `tests/api/checkout.integration-spec.ts`, `tests/api/gateway-safety.integration-spec.ts`, `tests/api/health.e2e-spec.ts`.

### 2. Phần cần bổ sung và hoàn thiện
1. **Rà soát `PaymentsService` & `IdempotencyService` khớp tuyệt đối với Sequence Diagram (#8)**:
   - Đảm bảo khi `POST /api/payments` được gọi lại với **cùng `Idempotency-Key` và cùng payload** (kể cả khi đơn đã chuyển sang `PAID` ở lần gọi trước), hệ thống **kiểm tra và trả lại kết quả đã lưu (`Idempotency-Replayed: true`) trước khi kiểm tra từ chối đơn đã `PAID`**.
   - Nếu cùng `Idempotency-Key` nhưng khác payload → trả `409 IDEMPOTENCY_KEY_REUSED`.
   - Nếu đơn ở `PAYMENT_FAILED` và khách gửi `Idempotency-Key` mới → phối hợp với `OrdersModule`/`InventoryModule` (`prepareRetry`) kiểm tra và giữ lại kho nguyên liệu + lượt mã trước khi thực hiện giao dịch mới.
2. **Nâng cấp `.github/workflows/ci.yml` và Xây dựng Pipeline CD `.github/workflows/release.yml` (Task 5.3)**:
   - Cập nhật `.github/workflows/ci.yml`: bổ sung bước chạy seed và chạy Playwright E2E (`npm run test:e2e`) trên PostgreSQL thật trong CI.
   - Tạo mới `.github/workflows/release.yml` và bộ script triển khai (`scripts/deploy-render.mjs`, `scripts/smoke-production.mjs`, test `tests/tools/deploy-render.test.mjs`) thực hiện đủ các bước của Task 5.3:
     `Push/Tag → Quality Gate (Lint, Test, Build, E2E) → Build Docker Images (tag theo commit SHA) → Push lên GHCR → Trigger Deploy lên Render bằng Secret → Chạy Migration an toàn → Smoke Test HTTPS Web + API Health/Ready + Catalog`.
3. **Hoàn thiện Runbook Triển khai (`docs/deployment.md`), Release Notes và Bàn giao (Task 5.4)**:
   - Viết đầy đủ [`docs/deployment.md`](../deployment.md) (cấu hình biến môi trường Render/GitHub Secrets, quy trình deploy, smoke test và hướng dẫn rollback về image digest trước đó), `docs/release-notes.md`, và cập nhật `README.md`.

### 3. Tiêu chí nghiệm thu (Acceptance Criteria)
- [ ] `POST /api/payments` xử lý đúng `WALLET`/`CARD` và `SUCCESS`/`FAIL`; lấy số tiền từ đơn hàng trên server; replay cùng key/payload trả đúng kết quả cũ và header `Idempotency-Replayed: true`; khác payload trả `409`.
- [ ] `docker compose up --build` chạy đồng bộ `web`, `api`, `db` ở local; `GET /api/health` và `GET /api/health/ready` trả `200 OK`.
- [ ] Pipeline `.github/workflows/ci.yml` và `.github/workflows/release.yml` chạy thành công; image đẩy lên GHCR gắn tag SHA; dừng pipeline ngay nếu smoke test lỗi.
- [ ] Bàn giao đầy đủ `docs/deployment.md` (có hướng dẫn rollback), `docs/release-notes.md`, tag release và URL HTTPS Production (Web + API Health Check).
