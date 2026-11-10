# Thiết kế triển khai · Render và GHCR

Tài liệu định nghĩa cấu hình đích để triển khai ở Sprint 2. Xem [sơ đồ UML](architecture/deployment-diagram.md) và [ADR](architecture/adr/003-render-ghcr.md).

| Thành phần | Thiết kế đích |
| --- | --- |
| Web Next.js | Render web service lấy image từ GHCR. HTTPS công khai. Image build với `NEXT_PUBLIC_API_URL` là base URL HTTPS của API. |
| NestJS API | Render web service riêng, nhận `FRONTEND_URL` và các secret qua biến môi trường. Health check `/api/health/ready`. |
| PostgreSQL | Render PostgreSQL cùng region, dùng kết nối nội bộ và lưu trữ bền vững. Tắt truy cập trực tiếp từ Internet. |
| Registry và CI | GitHub Actions chạy quality gate, build hai image gắn commit SHA và push GHCR. Deploy theo digest bằng secret Render, chờ đúng deploy ID chuyển live rồi chạy smoke. |
| Migration và rollback | Chạy migration trước khi API nhận traffic. Giữ digest cũ và kiểm tra tương thích schema. Dừng nếu deploy hoặc smoke lỗi và dùng bản deploy thành công trước để rollback. |

## Tiêu chí bàn giao Sprint 2

- [ ] Thiết lập hai service Render, private PostgreSQL và quyền pull image từ GHCR.
- [ ] Lưu secret trong GitHub environment và Render. Ghi tên biến, không ghi giá trị vào repo.
- [ ] Thực thi pipeline, lưu URL HTTPS web/API/health, link run, SHA/digest và release notes.
- [ ] Kiểm tra ca thành công và ca dừng khi lỗi. Ghi cách rollback thực tế, có người review migration và phục hồi dữ liệu.
