# Biên bản Sơ kết & Nghiệm thu Sprint 1 (Sprint 1 Review)

> **Dự án**: BrewLite – Ứng dụng đặt cà phê trực tuyến không dùng tiền mặt  
> **Hạng mục**: Task 4.2 & Task 4.3 – Nghiệm thu kết quả Sprint 1  
> **Mục tiêu đối chiếu**: [`docs/sprints/sprint-1-planning.md`](sprint-1-planning.md)

---

## 1. Tóm tắt Kết quả Đạt được (Sprint 1 Summary)

- **Tổng Story Points cam kết**: `18 SP`
- **Tổng Story Points hoàn thành**: `18 SP` (**Đạt 100% kế hoạch Sprint 1**)
- **Trạng thái mục tiêu Sprint 1 (Sprint Goal)**: **ĐẠT** — Hệ thống đã hoàn thiện luồng từ duyệt Menu, xem Chi tiết sản phẩm (chọn size `S/M/L`, chọn topping, tính tồn kho theo nguyên liệu), Đăng ký/Đăng nhập JWT, đến Báo giá & Tạo đơn hàng `PENDING` có giữ chỗ nguyên liệu nguyên tử (`OrderIngredientHold`).

---

## 2. Bảng Nghiệm thu Các Hạng mục Công việc (Completed Backlog Items)

| Issue | Hạng mục nghiệm thu | Yêu cầu đáp ứng | Minh chứng Mã nguồn & Kiểm thử | Kết quả |
|---|---|---|---|---|
| **[#17](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/17)** | **Catalog API, Database Seed & Giao diện Menu / Chi tiết món Mobile-First** | `FR-01`..`FR-04`, `NFR-01`, `NFR-08` | - API: `apps/api/src/modules/products/`<br>- UI: `apps/web/src/features/products/menu-grid.tsx`, `app/products/[id]/page.tsx`<br>- Tests: `tests/api/catalog.integration-spec.ts`, `tests/api/catalog-pricing.e2e-spec.ts`, `apps/web/src/features/products/filter.test.ts`, `pricing.test.ts`<br>- Ảnh chụp QA: [`docs/qa/issue-4/README.md`](../qa/issue-4/README.md) | **DONE (8 SP)** |
| **[#19](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/19)** *(Phần Sprint 1)* | **Báo giá, Tạo đơn Atomic & Giữ kho nguyên liệu 2 Pha (OCC)** | `FR-11`, `FR-12`, `FR-19`, `NFR-12` | - API: `apps/api/src/modules/orders/orders.service.ts`, `apps/api/src/modules/inventory/inventory.service.ts`<br>- Tests: `tests/api/orders-create.integration-spec.ts`, `tests/api/inventory-stock.e2e-spec.ts`, `tests/api/two-customers.integration-spec.ts` | **DONE (5 SP)** |
| **[#20](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/20)** *(Phần Sprint 1)* | **Xác thực JWT (`HS256`), Bcrypt & Phân quyền RBAC (`CUSTOMER`/`STAFF`/`ADMIN`)** | `FR-08`, `FR-09`, `FR-10`, `NFR-03`, `NFR-04` | - API: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/common/security/security.ts`<br>- Tests: `tests/api/auth.e2e-spec.ts`, `tests/api/auth.integration-spec.ts`, `tests/api/staff-activation.integration-spec.ts` | **DONE (5 SP)** |

---

## 3. Kịch bản Demo & Bằng chứng Kiểm chứng Sprint 1

1. **Khởi tạo cơ sở dữ liệu từ trạng thái trống**:
   - Chạy `prisma migrate deploy` và `seed.ts` tạo đầy đủ 17 sản phẩm, 5 loại topping, 20 nguyên liệu, định mức công thức và các tài khoản mẫu (`customer@brewlite.local`, `staff@brewlite.local`, `admin@brewlite.local`).
2. **Duyệt Menu & Chi tiết sản phẩm trên khung nhìn di động (`360px`)**:
   - Hiển thị đúng danh sách đồ uống, lọc theo danh mục và từ khóa không phân biệt dấu.
   - Minh chứng hình ảnh các trạng thái Loading, Empty, Error, Retry và Mobile/Desktop được lưu trữ tại [`docs/qa/issue-4/README.md`](../qa/issue-4/README.md).
3. **Tạo đơn & Kiểm soát tranh chấp tồn kho nguyên liệu**:
   - Kiểm thử hai khách hàng đặt đồng thời món dùng chung nguyên liệu cuối cùng (`tests/api/two-customers.integration-spec.ts`): chỉ 1 đơn được tạo (`201 Created`), đơn còn lại nhận `409 OUT_OF_STOCK`, tồn kho nguyên liệu không bao giờ âm.
