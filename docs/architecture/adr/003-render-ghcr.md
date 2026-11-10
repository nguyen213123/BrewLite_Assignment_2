# ADR 003 · Image trên GHCR và triển khai trên Render

**Trạng thái** Nền tảng đã chọn. Triển khai workflow và nghiệm thu production thuộc Sprint 2.

Pipeline dự kiến tạo image Linux amd64 cho web và API, gắn commit SHA và triển khai theo digest trên hai Render web service. PostgreSQL dùng kết nối nội bộ và lưu trữ bền vững. API chạy migration trước khi nhận traffic mới, rồi kiểm tra readiness. Sau khi API sẵn sàng, pipeline triển khai web và kiểm tra HTTPS.

Digest gắn với một artifact xác định và có thể dùng khi rollback. Pipeline cần thông tin dịch vụ và secrets do quản trị viên cấu hình. Rollback ứng dụng cần image cũ còn trên registry và schema tương thích với image đó. Thay đổi schema phá vỡ tương thích phải được chia thành nhiều release có bước chuyển dữ liệu riêng.
