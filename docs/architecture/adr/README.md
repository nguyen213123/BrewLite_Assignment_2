# DANH MỤC CÁC BẢN GHI QUYẾT ĐỊNH KIẾN TRÚC (ADRS INDEX)

Thư mục này lưu trữ tập hợp toàn bộ các bản ghi quyết định kiến trúc (**Architecture Decision Records - ADRs**) của dự án **BrewLite Mộc Vị** theo cấu trúc yêu cầu của đề bài (Mục 3.1 & Mục 9).

Mỗi bản ghi ADR giải thích chi tiết nguyên nhân (*Why*), các phương án đã cân nhắc, ma trận đánh giá có trọng số, mã nguồn triển khai thực tế và kết quả kiểm thử xác minh.

---

## 📋 Bảng Tổng hợp 7 Quyết định Kiến trúc Cốt lõi

| Mã số | Tiêu đề quyết định kiến trúc | Trạng thái | Ngày duyệt | Phạm vi nghiệp vụ & Công nghệ |
| :---: | :--- | :---: | :---: | :--- |
| [**ADR-001**](./ADR-001-monorepo-modular-architecture.md) | Kiến trúc Monorepo và Tách biệt Ứng dụng Frontend - Backend (Decoupled Monorepo) | `ACCEPTED` | 2026-10-22 | Cấu trúc dự án, Next.js 16 + NestJS 11, Contract-first OpenAPI |
| [**ADR-002**](./ADR-002-relational-database-prisma-orm.md) | Lựa chọn Cơ sở dữ liệu Quan hệ PostgreSQL 17 và Prisma ORM 7 với Mô hình Unit of Work | `ACCEPTED` | 2026-10-22 | Cơ sở dữ liệu quan hệ, Toàn vẹn ACID, Quản lý Migration |
| [**ADR-003**](./ADR-003-stateless-jwt-authentication.md) | Xác thực Không trạng thái (Stateless) bằng JSON Web Token (JWT) và Phân quyền RBAC | `ACCEPTED` | 2026-10-23 | Bảo mật, Băm mật khẩu `bcrypt` cost 12, Phân quyền CUSTOMER / STAFF |
| [**ADR-004**](./ADR-004-realtime-inventory-concurrency-optimistic-locking.md) | Quản lý Tồn kho Nguyên liệu Thực tế 2 Pha và Kiểm soát Tranh chấp Đồng thời bằng Khóa Lạc quan (OCC) | `ACCEPTED` | 2026-10-24 | Định lượng món (Recipe-driven), Khóa lạc quan `version`, Chống bán âm |
| [**ADR-005**](./ADR-005-idempotency-key-order-payment.md) | Cơ chế Chống Trùng lặp Giao dịch và Đơn hàng bằng Khóa Lũy đẳng (Idempotency-Key Pattern) | `ACCEPTED` | 2026-10-25 | Toàn vẹn giao dịch, UUIDv4 Header, Mã băm SHA-256, Chống trừ tiền kép |
| [**ADR-006**](./ADR-006-double-entry-loyalty-ledger.md) | Quản lý Điểm thưởng Khách hàng theo Mô hình Sổ cái Bất biến (Immutable Double-entry Ledger Pattern) | `ACCEPTED` | 2026-10-25 | Sổ cái tích điểm `EARN` / `REVERSE`, Audit trail, Đồng bộ Header |
| [**ADR-007**](./ADR-007-multi-gateway-payment-integration.md) | Kiến trúc Adapter Pattern Tích hợp Đa Cổng Thanh toán (VNPay, Stripe, Mock) và Đối soát Hoàn tiền An toàn | `ACCEPTED` | 2026-10-27 | Đa cổng thanh toán, Ký số HMAC-SHA512, Khóa chờ đối soát, Auto-refund |

---

## 🔗 Liên kết Tài liệu Liên quan
- 📘 [**Đặc tả Kiến trúc Hệ thống Toàn diện (System Architecture Specification)**](../system-architecture.md): Mô hình C4 (Level 1, 2, 3), Mô hình dữ liệu ERD, Máy trạng thái đơn hàng, 3 kịch bản luồng dữ liệu và Ma trận NFR.
- 🚀 [**Sơ đồ Triển khai Hệ thống (Deployment Diagram - Task 3.2)**](../deployment-diagram.md): Mô hình triển khai hạ tầng Production, CI/CD và Local Docker Compose.
