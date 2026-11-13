# Biên bản Lập kế hoạch Sprint 1 (Sprint 1 Planning)

> **Dự án**: BrewLite – Ứng dụng đặt cà phê trực tuyến không dùng tiền mặt  
> **Hạng mục**: Task 4.1 & Task 4.2 – Quản lý Backlog & Thực thi Sprint 1  
> **Thời lượng Sprint 1**: Tuần 1 (Giai đoạn Nền tảng, Danh mục, Xác thực & Tạo đơn giữ kho nguyên liệu)

---

## 1. Mục tiêu Sprint 1 (Sprint Goal)

Xây dựng và kiểm định trọn vẹn **nền tảng dữ liệu & luồng đặt hàng cốt lõi (MVP Sprint 1)**:
1. Hoàn thiện lược đồ cơ sở dữ liệu PostgreSQL 17 với Prisma ORM (`17 models`), migration và dữ liệu seed mẫu (sản phẩm, bảng giá size `S/M/L`, topping, nguyên liệu `Ingredient` và định mức công thức `ProductIngredient` / `ToppingIngredient`).
2. Hoàn thiện API và giao diện **Xem menu & Chi tiết sản phẩm Mobile-First (`360px`)** với đầy đủ trạng thái Loading, Empty, Error và tính toán số lượng khả dụng theo kho nguyên liệu thực tế (`UC-01`, `UC-02`).
3. Hoàn thiện **Đăng ký, Đăng nhập JWT (`HS256`), Phân quyền RBAC (`CUSTOMER`, `STAFF`, `ADMIN`)** và lớp bảo vệ HTTP API (`UC-04`, `UC-05`).
4. Hoàn thiện **Báo giá (`POST /api/orders/quote`) và Tạo đơn hàng nguyên tử (`POST /api/orders`)** kèm `Idempotency-Key` (`CREATE_ORDER`) và giữ kho nguyên liệu 2 pha bằng khóa lạc quan (`OrderIngredientHold`, `Ingredient.version`) (`UC-06`, `UC-06.2`).

---

## 2. Định nghĩa Hoàn thành (Definition of Done – DoD)

Một hạng mục công việc (Issue / User Story) trong Sprint 1 chỉ được chuyển sang cột **Done** khi thỏa mãn toàn bộ các điều kiện sau:
- [x] Mã nguồn tuân thủ hợp đồng OpenAPI (`npm run docs:check` và `npm run api:check` pass 100%).
- [x] Vượt qua kiểm tra tĩnh ESLint & TypeScript (`npm run lint` với `--max-warnings 0` và `npm run build` thành công).
- [x] Có Unit Test và Integration Test kiểm chứng các tiêu chí chấp nhận (*Given – When – Then*) trên PostgreSQL thật.
- [x] Giao diện tương thích khung nhìn di động `360px` (Mobile-first), không tràn ngang, có xử lý trạng thái tải và lỗi.
- [x] Mở Pull Request vào `main`, vượt qua GitHub Actions CI Quality Gate và có ít nhất 1 thành viên khác review.

---

## 3. Danh mục Công việc Sprint 1 (Sprint 1 Backlog)

| Issue | Hạng mục / User Story | Yêu cầu (`FR` / `NFR`) | Use Case & Sơ đồ | Story Points | Phụ trách |
|---|---|---|---|:---:|---|
| **[#17](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/17)** | **Catalog API, Database Seed và Giao diện Menu / Chi tiết món Mobile-First**<br>- Kiểm định `GET /api/products`, `GET /api/products/:id` tính tồn kho từ `Ingredient`<br>- Hoàn thiện UI `/menu` & `/products/[id]` (Loading / Empty / Error, chọn size `S/M/L` & topping) | `FR-01`..`FR-04`, `NFR-01`, `NFR-02`, `NFR-08` | `UC-01`, `UC-02`, `activity-checkout.svg`, `class-domain.svg` | **8 SP** | `phannguyen1105` |
| **[#19](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/19)** *(Phần Sprint 1)* | **Báo giá, Tạo đơn Atomic & Giữ kho nguyên liệu theo công thức**<br>- `POST /api/orders/quote` & `POST /api/orders` kèm `Idempotency-Key`<br>- Quy đổi công thức `ProductIngredient` (S=100%, M=125%, L=150%) + `ToppingIngredient`<br>- Giữ kho `OrderIngredientHold (HELD)` với khóa lạc quan `Ingredient.version` | `FR-11`, `FR-12`, `FR-19`, `NFR-05`, `NFR-12` | `UC-06`, `UC-06.2`, `sequence-checkout.svg`, `ADR-002`, `ADR-004` | **5 SP** | `phuc35147-web` |
| **[#20](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/20)** *(Phần Sprint 1)* | **Xác thực JWT/RBAC & Bảo vệ HTTP API**<br>- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` (`bcrypt` cost 12, `HS256`)<br>- `JwtAuthGuard`, `StaffGuard`, `AdminGuard`, cách ly đơn hàng chủ sở hữu (`404 ORDER_NOT_FOUND`) | `FR-08`, `FR-09`, `FR-10`, `NFR-03`, `NFR-04`, `NFR-05` | `UC-04`, `UC-05`, `ADR-003` | **5 SP** | `tenki1612` |
| **Tổng cộng Sprint 1** | **3 Hạng mục cốt lõi (Must Have)** | **10 FR + 7 NFR** | **UC-01..UC-06.2** | **18 SP** | **Nhóm phát triển** |

---

## 4. Rủi ro Kỹ thuật & Biện pháp Giảm thiểu trong Sprint 1

| Rủi ro nhận diện | Mức độ | Biện pháp xử lý đã thống nhất |
|---|:---:|---|
| **Tranh chấp tồn kho nguyên liệu dùng chung** khi nhiều khách đặt các món cùng dùng hạt cà phê / sữa tươi | Cao | Sắp xếp `ingredientId ASC` để chống deadlock; cập nhật có điều kiện `WHERE id = ? AND version = ? AND stock >= required` (retry tối đa 3 lần) theo `ADR-004`. |
| **Lệch kiểu dữ liệu giữa Frontend và Backend** khi thêm trường mới | Trung bình | Áp dụng quy trình Contract-first từ `docs/api/openapi.yaml` và chạy `npm run api:check` tự động trong CI (`ADR-001`). |
| **Sai lệch số học dấu phẩy động khi tính giá món & topping** | Trung bình | Lưu trữ và tính toán toàn bộ giá tiền bằng số nguyên dương đồng Việt Nam (`Int` VND), kiểm chứng bằng `seed-money.integration-spec.ts`. |
