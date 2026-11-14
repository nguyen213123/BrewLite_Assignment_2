# Release Notes – BrewLite

> Nội dung này dùng cho GitHub Release của tag `vX.Y.Z`.

## v1.0.0 (Assignment 2) — 14/11/2026

**Production**: Web https://brewlite-web-btram.onrender.com · API https://brewlite-api-btram.onrender.com/api · Health https://brewlite-api-btram.onrender.com/api/health/ready
**Image**: `ghcr.io/nguyen213123/brewlite-api` và `ghcr.io/nguyen213123/brewlite-web`, tag theo commit SHA (bản triển khai: commit `294732b`)

### Tính năng

- Menu mobile-first, chi tiết đồ uống (size S/M/L, nhiều topping), giỏ hàng lưu bền vững và tính tổng tiền.
- Đăng ký, đăng nhập, JWT; phân quyền khách hàng, nhân viên (`STAFF`) và quản trị (`ADMIN`).
- Báo giá phía server, tạo đơn nguyên tử, giữ/hoàn kho theo nguyên liệu (khóa lạc quan), mã khuyến mãi.
- Thanh toán mô phỏng `WALLET`/`CARD` (kết quả `SUCCESS`/`FAIL`), cổng VNPay Sandbox và Stripe Test mode.
- Idempotency cho tạo đơn và thanh toán (`Idempotency-Key`): gửi lại cùng key và payload trả kết quả cũ kèm `Idempotency-Replayed: true`; cùng key khác payload trả `409 IDEMPOTENCY_KEY_REUSED`.
- Máy trạng thái đơn, lịch sử và theo dõi đơn, nhân viên cập nhật trạng thái pha chế, điểm thưởng (`EARN`/`REVERSE`).
- `GET /api/health` và `GET /api/health/ready`.

### Hạ tầng và phát hành

- `docker compose up --build` chạy `db`, `backend`, `frontend` ở local.
- CI trên mỗi Pull Request: hợp đồng OpenAPI, Prisma, lint, test với PostgreSQL 17, build, smoke test health.
- CD: tag `vX.Y.Z` → Quality Gate → build image → push GHCR (tag theo commit SHA) → deploy Render → smoke test HTTPS. Workflow `Rollback` quay về image cũ.

### Cách nâng cấp và rollback

- Migration chạy tự động khi container `api` khởi động trên Render.
- Rollback: chạy workflow **Rollback** với `image_tag` của bản ổn định trước (xem [`deployment.md`](deployment.md) mục 8). Rollback không hoàn tác migration.

### Giới hạn đã biết

- Thanh toán là môi trường mô phỏng/sandbox, không xử lý tiền thật.
- Đơn `PENDING` chưa có cơ chế tự hết hạn theo thời gian; dùng nút hủy đơn.
- Tiền đến sau khi đơn đã hủy hoặc trùng được ghi nhận để hoàn tiền thủ công, hệ thống không tự gọi API hoàn tiền.
- Bước E2E trình duyệt trong CI chỉ chạy khi có cấu hình Playwright (Issue #20).
- Production chạy trên gói Free của Render: dịch vụ ngủ khi nhàn rỗi (request đầu chậm), database hết hạn sau 30 ngày (khoảng 13/12/2026).
- Webhook Stripe và VNPay Sandbox chưa cấu hình trên production; rollback mới thử về chính commit đang chạy.
