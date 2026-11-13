# Biên bản Họp Cải tiến Sprint 1 (Sprint 1 Retrospective)

> **Dự án**: BrewLite – Ứng dụng đặt cà phê trực tuyến không dùng tiền mặt  
> **Hạng mục**: Task 4.2 – Sprint 1 Retrospective

---

## 1. Những điểm làm tốt (What Went Well)

1. **Đồng bộ thiết kế trước khi viết code (Design-first & Contract-first)**:
   - Việc thống nhất trước hợp đồng OpenAPI (`docs/api/openapi.yaml`), sơ đồ Class/ERD (`Task 2.3`) và quy tắc giữ kho theo công thức nguyên liệu (`Ingredient` + `OrderIngredientHold`) giúp các thành viên làm việc song song trên Frontend và Backend mà không bị lệch cấu trúc dữ liệu.
2. **Kiểm soát toàn vẹn giao dịch ngay từ Sprint 1**:
   - Mẫu thiết kế `UnitOfWork` kết hợp khóa lạc quan (`Ingredient.version`) và `Idempotency-Key` ở bước tạo đơn hoạt động ổn định, vượt qua các bài kiểm thử đặt hàng đồng thời (`two-customers.integration-spec.ts`).
3. **Chất lượng kiểm thử tự động**:
   - Mọi tính năng của Sprint 1 đều đi kèm Unit Test và Integration Test chạy trên PostgreSQL thật trong pipeline CI.

---

## 2. Những điểm cần cải thiện (What Could Be Improved)

1. **Sự nhất quán về thời điểm tích điểm thưởng (Loyalty Points) giữa các tài liệu ban đầu**:
   - Ở đầu Sprint 1, một số sơ đồ nháp ghi cộng điểm ngay khi `PAID`, trong khi nghiệp vụ chuẩn (`FR-23`, `ADR-006`) quy định chỉ cộng điểm (`EARN`) khi nhân viên chuyển đơn sang `COMPLETED`. Nhóm đã kịp thời rà soát và đồng bộ lại trên toàn bộ sơ đồ Task 1–2–3.
2. **Tùy chọn thanh toán mô phỏng (`MOCK`) trên giao diện Checkout**:
   - Khi tích hợp thêm VNPay Sandbox và Stripe Test Mode, tùy chọn thanh toán mô phỏng nội bộ (`WALLET` / `CARD` với `SUCCESS` / `FAIL`) cần được hiển thị trực quan hơn trên màn hình `/checkout` để thuận tiện cho việc kiểm thử và demo trong Sprint 2.
3. **Tách biệt rõ hành vi Replay (mất mạng) và Retry (sau khi `PAYMENT_FAILED`)**:
   - Cần quy định rõ trong Sequence/Activity Diagram và code xử lý thanh toán: gửi lại cùng `Idempotency-Key` khi mất mạng phải được kiểm tra trước trạng thái đơn, còn thử lại sau khi đã nhận `PAYMENT_FAILED` phải sinh `Idempotency-Key` mới và chạy `prepareRetry` để giữ lại kho nguyên liệu.

---

## 3. Kế hoạch Hành động cho Sprint 2 (Action Items for Sprint 2)

| STT | Hành động cải tiến | Người phụ trách | Hạn hoàn thành |
|:---:|---|---|---|
| 1 | Hiển thị rõ phương thức Ví/Thẻ mô phỏng (`WALLET`/`CARD` + `SUCCESS`/`FAIL`) và xử lý chuẩn Replay vs Retry trên UI `/checkout`, bổ sung PWA Offline | `nghii1236` ([Issue #18](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/18)) | Trong Sprint 2 |
| 2 | Hoàn thiện `prepareRetry` giữ lại kho/mã khuyến mãi khi retry từ `PAYMENT_FAILED`, hoàn thiện luồng `STAFF` chuyển trạng thái đơn và cộng/đảo điểm `LoyaltyEntry` | `phuc35147-web` ([Issue #19](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/19)) | Trong Sprint 2 |
| 3 | Bổ sung lớp bảo vệ HTTP (`helmet`, rate-limit, `X-Correlation-Id`), polling cập nhật trạng thái đơn và bộ kiểm thử E2E trình duyệt thật | `tenki1612` ([Issue #20](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/20)) | Trong Sprint 2 |
| 4 | Hoàn thiện kiểm tra `Idempotency-Key` replay trong `PaymentsService`, xây dựng pipeline CD đẩy image lên GHCR & deploy Render kèm `docs/deployment.md` | `Pobby105` ([Issue #21](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/21)) | Trong Sprint 2 |
