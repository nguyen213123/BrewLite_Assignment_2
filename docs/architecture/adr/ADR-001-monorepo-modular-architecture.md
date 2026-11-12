# ADR-001: Kiến trúc Monorepo và Tách biệt Ứng dụng Frontend - Backend (Decoupled Monorepo)

## 1. Trạng thái (Status)
**ACCEPTED** (Đã chấp thuận & Áp dụng sản xuất)

## 2. Ngày quyết định (Date)
2026-10-22

## 3. Bối cảnh & Vấn đề Kỹ thuật (Context & Problem Statement)
Hệ thống thương mại điện tử BrewLite phục vụ chuỗi đồ uống với nhóm phát triển gồm 6 kỹ sư phần mềm. 
Hệ thống đòi hỏi sự cân bằng giữa hai thái cực kỹ thuật:
- **Tầng Giao diện (Presentation Layer)**: Cần công nghệ kết xuất hiện đại, tối ưu hóa công cụ tìm kiếm (SEO), render linh hoạt giữa Client Component và Server Component, hỗ trợ tải trang nhanh (Turbopack), và giao diện responsive tương thích hoàn hảo trên các thiết bị di động (Mobile Web).
- **Tầng Máy chủ Nghiệp vụ (Business Core & Persistence Layer)**: Chứa logic định lượng nguyên liệu phức tạp, máy trạng thái đơn hàng (Order State Machine), điều phối giao dịch phân tán (Unit of Work), kiểm soát tranh chấp đồng thời và đối soát thanh toán đa cổng. Toàn bộ logic giá tiền, khuyến mại, giữ kho bắt buộc phải chạy ở Server-side authoritative để triệt tiêu mọi khả năng gian lận giá từ client.
- **Thách thức phối hợp nhóm (Team Collaboration)**: Cần một quy trình phân công nhánh Git rõ ràng cho 6 thành viên, cùng chia sẻ một hợp đồng API chung, chạy được toàn bộ hệ thống bằng một lệnh duy nhất, và kiểm thử CI/CD tự động mà không gặp phải rào cản phân mảnh kho mã nguồn.

## 4. Các yếu tố thúc đẩy quyết định (Decision Drivers)
1. **Developer Experience (DX) & Onboarding**: Thành viên mới chỉ cần clone một repository duy nhất và chạy lệnh thiết lập là có thể code được ngay.
2. **Contract-First Consistency**: Bảo đảm kiểu dữ liệu TypeScript phía Frontend luôn khớp 100% với DTO và Entity phía Backend thông qua tệp hợp đồng `docs/api/openapi.yaml`.
3. **Độc lập triển khai (Decoupled Scalability)**: Frontend và Backend có thể chạy trên hai container độc lập, scale độc lập theo tải (ví dụ: nhân rộng Web container khi lượng xem thực đơn tăng cao mà không cần scale API container).
4. **Kiểm thử tự động đồng bộ (Unified CI/CD)**: Chạy lint, unit test, integration test và contract check cho toàn bộ dự án trong cùng một GitHub Action workflow.

## 5. Các phương án kiến trúc được đánh giá (Considered Options)

### Phương án A: Monolith nguyên khối với Next.js Fullstack (Server Actions & Route Handlers)
- **Mô tả**: Toàn bộ logic nghiệp vụ, Prisma ORM và giao diện React đặt chung trong một ứng dụng Next.js duy nhất.
- **Ưu điểm**:
  - Không cần duy trì tầng REST API trung gian, gọi trực tiếp database query trong Server Action.
  - Cực kỳ gọn nhẹ cho 1-2 người lập trình.
- **Nhược điểm & Rủi ro**:
  - Khó phân định ranh giới trách nhiệm cho nhóm 6 người (rất dễ xảy ra xung đột mã nguồn khi 5 người cùng sửa file server trong Next.js).
  - Khó áp dụng kiến trúc Hexagonal / Clean Architecture và các mẫu thiết kế hướng đối tượng (OOP) như Dependency Injection, Decorator, Interceptor vốn là thế mạnh của NestJS.
  - Việc tổ chức các worker chạy ngầm, cron job đối soát thanh toán hoặc socket trong Next.js serverless/edge runtime rất hạn chế và kém ổn định.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án B: Multi-repo (Tách riêng biệt 2 kho mã nguồn trên GitHub)
- **Mô tả**: Tạo repo `brewlite-web` riêng cho Next.js và repo `brewlite-api` riêng cho NestJS.
- **Ưu điểm**: Phân quyền repository độc lập tuyệt đối.
- **Nhược điểm & Rủi ro**:
  - Khó khăn trong việc đồng bộ hợp đồng API: khi Backend thay đổi trường dữ liệu, Frontend không nhận biết được ngay lập tức dẫn đến runtime error.
  - Phải quản lý 2 luồng CI/CD, 2 bộ pull request cho mỗi tính năng liên quan đến cả 2 bên.
  - Tốn thời gian setup môi trường cho sinh viên và giảng viên khi chấm bài.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án C: Decoupled Monorepo (Phương án được chọn)
- **Mô tả**: Gom cả 2 ứng dụng vào một kho mã nguồn duy nhất nhưng tổ chức thành các thư mục độc lập:
  - `apps/web/`: Ứng dụng Next.js 16 (App Router), React 19, TailwindCSS, Zustand.
  - `apps/api/`: Ứng dụng NestJS 11, TypeScript, Prisma ORM 7.
  - `docs/`: Hợp đồng OpenAPI 3.0, tài liệu kiến trúc, ERD.
  - `tests/`: Bộ kiểm thử E2E và công cụ QA.
- **Ưu điểm**:
  - Kết hợp hoàn hảo giữa tính độc lập kiến trúc của Decoupled API và tính tiện lợi quản trị của Monorepo.
  - Tự động sinh mã nguồn kiểu TypeScript cho cả 2 ứng dụng bằng script `node apps/api/tools/generate-api-types.mjs`.

## 6. Ma trận so sánh & Đánh giá (Evaluation Matrix)

| Tiêu chí kỹ thuật (Weight) | Phương án A (Next.js Monolith) | Phương án B (Multi-repo) | Phương án C (Decoupled Monorepo) |
| :--- | :---: | :---: | :---: |
| Phân chia trách nhiệm nhóm 6 người (25%) | 2/5 | 4/5 | **5/5** |
| Tính toàn vẹn hợp đồng API (25%) | 3/5 | 2/5 | **5/5** |
| Khả năng mở rộng kiến trúc OOP/DI (20%) | 2/5 | 5/5 | **5/5** |
| Đơn giản trong thiết lập & CI/CD (15%) | 4/5 | 2/5 | **4/5** |
| Hỗ trợ kiểm thử tích hợp tự động (15%) | 3/5 | 2/5 | **5/5** |
| **Tổng điểm trọng số** | **2.65 / 5.0** | **3.15 / 5.0** | **4.85 / 5.0** |

## 7. Chi tiết triển khai kỹ thuật (Implementation Details)
1. **Điều phối tiến trình phát triển**:
   Tại tệp gốc [`package.json`](../../../package.json), sử dụng thư viện `concurrently` để chạy đồng thời cả API (Port 3001) và Web (Port 3000) với cờ tắt đồng bộ `-k` (Kill other process if one dies):
   ```json
   "dev": "concurrently -k -n api,web \"npm --prefix apps/api run start:dev\" \"npm --prefix apps/web run dev\""
   ```
2. **Quy trình Contract-First Verification**:
   - `docs/api/openapi.yaml` định nghĩa đầy đủ 17 routes, schema DTO, các mã lỗi HTTP.
   - Script `check-contract.mjs` chạy trình kiểm tra `ajv` xác thực toàn bộ fixtures mẫu.
   - Script `generate-api-types.mjs --check` bảo đảm cả `apps/api/src/common/contracts/api.generated.ts` và `apps/web/src/lib/contracts/api.generated.ts` luôn đồng bộ 100%.

## 8. Hệ quả & Rủi ro (Consequences & Mitigations)
- **Hệ quả tích cực**:
  - Nhóm 6 thành viên làm việc trơn tru, không ai đè mã nguồn của ai.
  - Bắt lỗi sai lệch kiểu dữ liệu ngay tại thời điểm biên dịch (Compile-time Type Safety).
- **Rủi ro & Biện pháp giảm thiểu**:
  - *Rủi ro*: Xung đột CORS (Cross-Origin Resource Sharing) giữa cổng 3000 và 3001.
  - *Biện pháp*: Backend cấu hình CORS chặt chẽ trong `main.ts`, chỉ cho phép `origin: process.env.FRONTEND_URL` (`http://localhost:3000`) và cho phép truyền các header nhạy cảm (`Authorization`, `Idempotency-Key`, `Content-Type`).
