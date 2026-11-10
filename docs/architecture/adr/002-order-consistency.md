# ADR 002 · Nhất quán đơn, kho và thanh toán

**Trạng thái** Đã áp dụng.

API tính lại giá và lượng nguyên liệu từ công thức. Tạo đơn, giữ kho và giữ lượt khuyến mãi dùng transaction PostgreSQL và kiểm tra version. Đơn lưu snapshot giá và bản ghi giữ kho để hoàn trả chính xác. Idempotency có phạm vi theo người dùng và nghiệp vụ, kết hợp ràng buộc unique với fingerprint của payload. Thanh toán mô phỏng dùng cùng logic chuyển trạng thái như những lần xác nhận cổng sandbox.

Một nguồn dữ liệu bảo đảm tính toàn vẹn khi có tranh chấp. Các request cạnh tranh có thể cần thử lại và checkout phải giữ key khi chưa rõ kết quả. Với cổng bên ngoài, giao dịch đến muộn hoặc trùng được ghi nhận để đối soát mà không lặp hiệu ứng lên đơn và kho.
