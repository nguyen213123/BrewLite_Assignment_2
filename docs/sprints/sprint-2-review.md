# Biên bản Sơ kết & Nghiệm thu Sprint 2 (Sprint 2 Review)

> **Dự án**: BrewLite – Ứng dụng đặt cà phê trực tuyến không dùng tiền mặt  
> **Hạng mục**: Task 4.2, Task 4.4 & Task 5 – Nghiệm thu Sprint 2 & Bàn giao Hệ thống  
> **Mục tiêu đối chiếu**: [`docs/sprints/sprint-2-planning.md`](sprint-2-planning.md) | [`docs/qa/final/README.md`](../qa/final/README.md)

---

## 1. Tóm tắt Kết quả Đạt được (Sprint 2 Summary)

- **Tổng Story Points cam kết trong Sprint 2**: `22 SP` (Tổng cộng cả 2 Sprint: `40 SP` trên 5 Issues `#17`..`#21`).
- **Trạng thái mục tiêu Sprint 2**: Hoàn thiện toàn bộ luồng nghiệp vụ từ Giỏ hàng, Báo giá, Áp mã khuyến mãi, Đặt đơn giữ kho nguyên liệu, Thanh toán lũy đẳng (`Idempotency-Key`), Xử lý thất bại & Thử lại (`prepareRetry`), Quầy pha chế (`/staff`), Sổ cái điểm thưởng (`LoyaltyEntry`), Quản trị (`/admin`) đến Đóng gói Docker & Pipeline CI/CD.

---

## 2. Bảng Nghiệm thu Các Hạng mục Sprint 2

| Issue | Hạng mục nghiệm thu | Yêu cầu đáp ứng | Minh chứng Mã nguồn, Kiểm thử & QA | Trạng thái |
|---|---|---|---|---|
| **[#18](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/18)** | **Giỏ hàng, Giao diện Checkout (Ví/Thẻ mô phỏng, Xác nhận giá, Retry) & PWA Offline** | `FR-05`..`FR-07`, `FR-13`..`FR-16`, `NFR-08`, `NFR-09` | - Code: `apps/web/src/lib/cart/cart-store.ts`, `apps/web/src/lib/checkout/session.ts`, `apps/web/src/components/checkout/Checkout.tsx`<br>- Tests: `cart-store.test.ts`, `session.test.ts`, `Checkout.test.ts`<br>- Ảnh chụp nghiệm thu: [`docs/qa/final/README.md`](../qa/final/README.md) | **8 SP** |
| **[#19](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/19)** *(Phần Sprint 2)* | **Hoàn/Giữ lại kho khi Retry (`prepareRetry`), Khuyến mãi, Hủy đơn & Sổ cái Điểm thưởng (`LoyaltyEntry`)** | `FR-12`, `FR-15`, `FR-20`, `FR-22`, `FR-23`, `NFR-12` | - Code: `apps/api/src/modules/orders/order-transactions.service.ts`, `promotions.service.ts`, `loyalty.service.ts`<br>- Tests: `order-transitions.integration-spec.ts`, `promotion-rules.e2e-spec.ts`, `loyalty.e2e-spec.ts` | **3 SP** |
| **[#20](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/20)** *(Phần Sprint 2)* | **Theo dõi đơn (`/orders`), Giao diện Quầy (`/staff`), Quản trị (`/admin`) & Kiểm thử Toàn diện** | `FR-17`..`FR-21`, `FR-24`..`FR-26`, `NFR-04`, `NFR-14` | - Code: `apps/web/src/app/orders/`, `apps/web/src/app/staff/`, `apps/web/src/app/admin/`<br>- Tests: `order-history.e2e-spec.ts`, `order-transitions.e2e-spec.ts`, `admin-staff-regression.e2e-spec.ts`, `admin-validation.e2e-spec.ts` | **3 SP** |
| **[#21](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/21)** | **Thanh toán lũy đẳng (`Idempotency-Key`), Docker Compose, CI/CD & Triển khai Production (Task 5)** | `FR-13`..`FR-15`, `NFR-06`, `NFR-11`, `NFR-13` | - Code: `apps/api/src/modules/payments/`, `apps/api/src/modules/idempotency/`, `docker-compose.yml`, `.github/workflows/ci.yml`, [`docs/deployment.md`](../deployment.md)<br>- Tests: `payments.e2e-spec.ts`, `idempotency.e2e-spec.ts`, `gateway-safety.integration-spec.ts`, `health.e2e-spec.ts` | **8 SP** |

---

## 3. Tổng hợp Bằng chứng Kiểm thử & Hiệu năng (Task 4.4 & NFR-01)

1. **Bộ kiểm thử tự động**:
   - **Backend E2E & Integration Suites (`tests/api/`)**: 21 bộ test chuyên sâu bao phủ toàn bộ 17 endpoints OpenAPI, kiểm thử tranh chấp kho đồng thời, kiểm thử gửi lặp `Idempotency-Key` và đối soát thanh toán.
   - **Frontend Unit & Component Suites (`apps/web/src/`)**: 9 bộ test kiểm chứng tính giá, bộ lọc menu, giỏ hàng bền vững, phiên thanh toán, xử lý lỗi và thống kê quản trị.
2. **Đo kiểm hiệu năng API (`NFR-01`)**:
   - Kết quả benchmark lưu tại [`docs/qa/final/latency.json`](../qa/final/latency.json) đạt ngưỡng `p95 < 500ms` cho các API đọc và `p95 < 1000ms` cho các API tạo đơn/thanh toán.
3. **Bằng chứng giao diện thực tế (Mobile & Desktop)**:
   - Bộ ảnh chụp đầy đủ các màn hình Giỏ hàng, Báo giá, Cảnh báo đổi giá, Mã khuyến mãi không hợp lệ, Thanh toán thành công (`PAID`), Thanh toán thất bại (`PAYMENT_FAILED`), Lịch sử đơn, Hủy đơn và Đảo điểm thưởng được lưu tại [`docs/qa/final/README.md`](../qa/final/README.md).
