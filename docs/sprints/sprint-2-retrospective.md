# Biên bản Họp Cải tiến Sprint 2 (Sprint 2 Retrospective)

> **Dự án**: BrewLite – Ứng dụng đặt cà phê trực tuyến không dùng tiền mặt  
> **Hạng mục**: Task 4.2 – Sprint 2 Retrospective & Tổng kết Dự án

---

## 1. Những điểm làm tốt trong Sprint 2 (What Went Well)

1. **Hoàn thành trọn vẹn các hành động cải tiến từ Sprint 1**:
   - Toàn bộ 4 hành động đề ra ở cuối Sprint 1 (tách biệt Replay khi mất mạng và Retry bằng `Idempotency-Key` mới kèm `prepareRetry`, chỉ cộng điểm `EARN` khi `COMPLETED`, đồng bộ sơ đồ Task 1–2–3 với mã nguồn) đều đã được giải quyết triệt để.
2. **Độ tin cậy cao của cơ chế Thanh toán & Sổ cái Điểm thưởng**:
   - Việc kiểm tra `Idempotency-Key` trước khi xét trạng thái đơn hàng giúp client khi bị rớt mạng và gửi lại request luôn nhận lại đúng kết quả cũ (`Idempotency-Replayed: true`) thay vì bị báo lỗi `409 ORDER_ALREADY_PAID`.
   - Ràng buộc duy nhất `@@unique([orderId, kind])` trên bảng `LoyaltyEntry` loại bỏ hoàn toàn nguy cơ cộng điểm hoặc trừ điểm 2 lần.
3. **Tự động hóa kiểm tra chất lượng trên CI/CD**:
   - Pipeline `.github/workflows/ci.yml` tự động kiểm tra hợp đồng OpenAPI (`docs:check`, `api:check`), schema Prisma (`docs:schema`), lint (`--max-warnings 0`), chạy toàn bộ test với PostgreSQL 17 thật và kiểm tra smoke test `/api/health/ready`.

---

## 2. Những bài học kinh nghiệm rút ra (Lessons Learned)

1. **Quản lý trạng thái giữ kho khi thử lại thanh toán (`PAYMENT_FAILED → PENDING`)**:
   - Khi thanh toán thất bại, việc nhả kho nguyên liệu ngay lập tức (`RELEASED`) giúp không giữ chết nguyên liệu của quán; nhưng điều đó đòi hỏi khi khách bấm "Thử lại" trên cùng đơn hàng, hệ thống bắt buộc phải chạy `prepareRetry` trong transaction để kiểm tra và giữ lại kho trước khi gọi cổng thanh toán.
2. **Bảo vệ dữ liệu phiên người dùng trên trình duyệt dùng chung**:
   - Lưu giỏ hàng trong `localStorage` nhưng lưu token xác thực trong `sessionStorage` và chỉ xóa đúng các dòng giỏ hàng đã mua sau khi server xác nhận trạng thái `PAID` giúp trải nghiệm người dùng vừa an toàn vừa không bị mất giỏ hàng khi gặp lỗi thanh toán.

---

## 3. Đánh giá Tổng kết Quy trình Làm việc Nhóm (Team Collaboration Summary)

- **Quy trình phân nhánh & Code Review**: Nhóm tuân thủ nghiêm ngặt quy trình tạo nhánh theo từng Task/Issue, mở Pull Request (PR #1 → PR #16 cho giai đoạn Đặc tả/Thiết kế/Kiến trúc và các Issue `#17` → `#21` cho giai đoạn Sprint 1–2 & DevOps), kiểm tra chéo giữa tài liệu SRS, sơ đồ UML/C4 và mã nguồn trước khi merge vào `main`.
- **Truy vết đầu-cuối (End-to-End Traceability)**: Mọi yêu cầu từ `FR-01`..`FR-26` và `NFR-01`..`NFR-15` đều được ánh xạ đầy đủ tới Use Case, Sơ đồ thiết kế, ADR, Module code và File kiểm thử trong [`docs/traceability-matrix.md`](../traceability-matrix.md).
