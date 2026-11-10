# Kiến trúc BrewLite

BrewLite dùng kiến trúc phân lớp trong một monorepo. Client gọi API HTTPS và được phép phục vụ bởi một web service riêng. Backend là một ứng dụng NestJS phân theo module nghiệp vụ. PostgreSQL là nguồn dữ liệu dùng chung cho transaction và ràng buộc toàn vẹn.

| Lớp | Thành phần | Trách nhiệm |
| --- | --- | --- |
| Giao diện | `apps/web` · Next.js App Router | Menu mobile-first, tùy chọn và giỏ Zustand, xác thực, checkout và lịch sử. Giỏ lưu localStorage; yêu cầu checkout chưa xác minh được giữ theo phiên và tài khoản. PWA sẽ bổ sung web manifest theo NFR-09. |
| API và xác thực | `apps/api/src/setup.ts`, `common/security`, các controller | REST dưới `/api`, CORS theo origin frontend, DTO validation, JWT và phân quyền khách/nhân viên/quản trị. OpenAPI và kiểu dùng chung trong `docs/api`. |
| Nghiệp vụ | `apps/api/src/modules` | Catalog và báo giá, đơn và trạng thái, công thức/giữ kho, thanh toán, khuyến mãi, loyalty và lịch sử. Cổng mock chạy trong backend. Stripe/VNPay sandbox là tích hợp tùy cấu hình. |
| Dữ liệu | Prisma và PostgreSQL | Migration có phiên bản. Transaction gộp tạo đơn, giữ kho và cập nhật khuyến mãi; version, unique constraints và bản ghi idempotency bảo vệ cập nhật đồng thời. |
| Vận hành | Nest logger, health endpoint, Docker, GitHub Actions | Lỗi HTTP được chuẩn hóa. Log ứng dụng đi qua stdout/stderr. `/api/health` kiểm tra tiến trình, `/api/health/ready` kiểm tra kết nối DB. Thiết lập thông qua biến môi trường và kho secrets. |

Monorepo giữ hợp đồng API, frontend, backend và test trong cùng một thay đổi có thể review. Backend dạng monolith mô-đun giúp cập nhật tồn kho và đơn trong một transaction, giảm số dịch vụ phải vận hành. Đổi lại, các module chia sẻ chu kỳ phát hành, và sự cố của tiến trình API có thể ảnh hưởng toàn bộ các module. Hai image cho phép cập nhật web và API theo thứ tự, với điều kiện hợp đồng API và migration vẫn tương thích trong khoảng chuyển phiên bản.

## Môi trường

- **Local** dùng Docker Compose hoặc Next.js/NestJS chạy trực tiếp với PostgreSQL local.
- **CI** dùng PostgreSQL tạm, chạy kiểm tra hợp đồng, lint, test, build và smoke.
- **Production dự kiến** dùng Render và GHCR. Thiết kế yêu cầu web và API qua HTTPS, PostgreSQL dùng URL nội bộ với lưu trữ bền vững. [Sơ đồ triển khai](deployment-diagram.md) và [quy trình triển khai](../deployment.md) ghi cấu hình cần xác minh cho từng release.

Xem [ADR monorepo](adr/001-monorepo.md), [ADR transaction](adr/002-order-consistency.md) và [ADR triển khai](adr/003-render-ghcr.md).
