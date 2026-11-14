# Biên bản Lập kế hoạch Sprint 2 (Sprint 2 Planning)

> **Dự án**: BrewLite – Ứng dụng đặt cà phê trực tuyến không dùng tiền mặt  
> **Hạng mục**: Task 4.2, Task 4.4 & Task 5 – Lập kế hoạch Sprint 2, Kiểm thử Toàn diện & Triển khai Production  
> **Đầu vào cải tiến từ Sprint 1**: [`docs/sprints/sprint-1-retrospective.md`](sprint-1-retrospective.md)

---

## 1. Mục tiêu Sprint 2 (Sprint Goal)

Hoàn thiện **trọn vẹn chu trình Đặt hàng – Thanh toán không tiền mặt – Pha chế – Điểm thưởng – Quản trị** và **đưa hệ thống lên môi trường Production qua CI/CD**:
1. Hoàn thiện giao diện **Giỏ hàng & Checkout** với đầy đủ phương thức **Ví/Thẻ mô phỏng (`WALLET`/`CARD` + `SUCCESS`/`FAIL`)**, cổng thử nghiệm **VNPay Sandbox / Stripe Test Mode**, xác nhận lại giá khi lệch báo giá và cấu hình PWA Offline ([Issue #18](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/18)).
2. Hoàn thiện **Thanh toán lũy đẳng (`Idempotency-Key` replay/retry)**, cơ chế `prepareRetry` giữ lại kho nguyên liệu + mã khuyến mãi khi thử lại từ `PAYMENT_FAILED`, luồng nhân viên quầy (`PAID → PREPARING → READY → COMPLETED`), hủy đơn hoàn kho và **sổ cái điểm thưởng `LoyaltyEntry` (`EARN` khi `COMPLETED`, `REVERSE` khi hủy)** ([Issue #19](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/19) & [Issue #21](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/21)).
3. Hoàn thiện **Lịch sử & Theo dõi đơn hàng (`/orders`, `/orders/[id]`)**, **Quầy pha chế (`/staff`)**, **Quản trị (`/admin`)**, lớp bảo vệ HTTP (`helmet`, rate-limit, `X-Correlation-Id`) và **bộ kiểm thử tự động toàn diện (Unit, Integration, E2E)** ([Issue #20](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/20)).
4. Hoàn thiện **Dockerization (`Dockerfile`, `docker-compose.yml`), GitHub Actions CI/CD (`.github/workflows/ci.yml`), đẩy image lên GHCR, triển khai Production trên Render** và tài liệu vận hành [`docs/deployment.md`](../deployment.md) ([Issue #21](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/21)).

---

## 2. Danh mục Công việc Sprint 2 (Sprint 2 Backlog)

| Issue | Hạng mục / User Story | Yêu cầu (`FR` / `NFR`) | Use Case & Sơ đồ | Story Points | Phụ trách |
|---|---|---|---|:---:|---|
| **[#18](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/18)** | **Giỏ hàng, Giao diện Checkout (Ví/Thẻ mô phỏng, Xác nhận giá, Retry) & PWA Offline**<br>- Lưu giỏ hàng bền vững `localStorage` (`brewlite-cart`), gộp dòng trùng<br>- UI `/checkout` chọn Ví/Thẻ mô phỏng (`SUCCESS`/`FAIL`), VNPay/Stripe, xử lý Replay vs Retry | `FR-05`..`FR-07`, `FR-13`..`FR-16`, `NFR-08`, `NFR-09` | `UC-03`, `UC-06`, `UC-07`, `activity-checkout.svg`, `sequence-checkout.svg` | **8 SP** | `nghii1236` |
| **[#19](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/19)** *(Phần Sprint 2)* | **Hoàn/Giữ lại kho khi Retry (`prepareRetry`), Khuyến mãi, Hủy đơn & Sổ cái Điểm thưởng**<br>- Nhả kho/mã khi `PAYMENT_FAILED`/`CANCELLED`; `prepareRetry` khi thử lại<br>- Áp mã khuyến mãi (`PERCENT`/`FIXED`) nguyên tử<br>- Cộng điểm `EARN` khi `COMPLETED` và `REVERSE` khi hủy | `FR-12`, `FR-15`, `FR-20`, `FR-22`, `FR-23`, `NFR-12` | `UC-06.3`, `UC-08`, `UC-10`, `ADR-004`, `ADR-006` | **3 SP** | `phuc35147-web` |
| **[#20](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/20)** *(Phần Sprint 2)* | **Theo dõi đơn, Giao diện Quầy `/staff`, Quản trị `/admin`, Bảo vệ HTTP & Kiểm thử E2E**<br>- Lịch sử & chi tiết đơn (`/orders`, `/orders/[id]`), Quầy Barista (`/staff`), Quản trị (`/admin`)<br>- Kiểm thử tự động toàn diện (Unit, Integration, E2E) | `FR-17`..`FR-21`, `FR-24`..`FR-26`, `NFR-04`, `NFR-07`, `NFR-14`, `NFR-15` | `UC-09`, `UC-11`..`UC-14`, `ADR-003` | **3 SP** | `tenki1612` |
| **[#21](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/21)** | **Thanh toán mô phỏng, Idempotency & Pipeline CI/CD Triển khai Render + GHCR (Task 5)**<br>- Kiểm tra `Idempotency-Key` replay trước trạng thái đơn, đối soát VNPay/Stripe<br>- Docker multi-stage, `docker-compose.yml`, GitHub Actions CI/CD, Health Check & `docs/deployment.md` | `FR-13`..`FR-15`, `NFR-06`, `NFR-11`, `NFR-12`, `NFR-13` | `UC-07`, `deployment-diagram.svg`, `ADR-005`, `ADR-007` | **8 SP** | `Pobby105` |
| **Tổng cộng Sprint 2** | **4 Hạng mục hoàn thiện sản phẩm & DevOps** | **Toàn bộ 26 FR + 15 NFR** | **UC-01..UC-14** | **22 SP** | **Nhóm phát triển** |

---

## 3. Kế hoạch Kiểm thử Tự động trong Sprint 2 (Task 4.4)

| Cấp độ kiểm thử | Yêu cầu tối thiểu của đề bài | Phạm vi kiểm thử trong dự án BrewLite |
|---|---|---|
| **Unit Tests** | ≥ 15 test cases, coverage ≥ 70% tầng domain/service | Tính giá sản phẩm/size/topping (`pricing.test.ts`, `catalog-pricing.e2e-spec.ts`), quy tắc khuyến mãi (`promotion-rules.e2e-spec.ts`), máy trạng thái đơn (`order-state.e2e-spec.ts`), giỏ hàng (`cart-store.test.ts`), phiên checkout (`session.test.ts`, `Checkout.test.ts`), điểm thưởng (`loyalty.e2e-spec.ts`). |
| **Integration Tests** | ≥ 8 test cases với PostgreSQL thật | Tạo đơn & giữ kho nguyên liệu (`orders-create.integration-spec.ts`), tranh chấp tồn kho đồng thời (`two-customers.integration-spec.ts`, `inventory.integration-spec.ts`), chuyển trạng thái & hủy đơn (`order-transitions.integration-spec.ts`), thanh toán & idempotency (`checkout.integration-spec.ts`, `idempotency.e2e-spec.ts`), đối soát cổng thanh toán (`gateway-safety.integration-spec.ts`, `vnpay.integration-spec.ts`). |
| **End-to-End (E2E) & QA** | ≥ 2 luồng đầu-cuối (Happy path & Payment failure/retry) | Luồng đặt hàng và thanh toán thành công → xác nhận đơn → pha chế `COMPLETED` cộng điểm, và luồng thanh toán thất bại (`PAYMENT_FAILED`) → nhả kho → thử lại thành công (`PAID`). |

---

## 4. Định nghĩa Hoàn thành (Definition of Done – DoD)

Áp dụng thống nhất theo [`CONTRIBUTING.md`](../../CONTRIBUTING.md) và bổ sung yêu cầu phát hành của Sprint 2:
- [x] Toàn bộ tiêu chí DoD kỹ thuật của Sprint 1 (`docs:check`, `api:check`, `lint` 0 warnings, `build`, unit/integration test với PostgreSQL 17 thật).
- [x] Hoàn thiện kiểm thử E2E trình duyệt (Playwright) cho luồng checkout từ menu đến xác nhận đơn và trạng thái PWA offline.
- [x] `docker compose up --build -d` khởi động đủ 3 service (`db`, `backend`, `frontend`) kèm health check `/api/health` và `/api/health/ready`.
- [x] Pipeline CD (`.github/workflows/release.yml`) và hướng dẫn vận hành/rollback (`docs/deployment.md`, `README.md`) được kiểm chứng trên môi trường production HTTPS.
