# Hồ sơ Quản lý Dự án Agile Scrum (Sprint 1 & Sprint 2) – BrewLite

Tài liệu trong thư mục `docs/sprints/` lưu trữ đầy đủ kế hoạch, biên bản nghiệm thu (Sprint Review), biên bản họp cải tiến (Sprint Retrospective) và đặc tả 5 GitHub Issues triển khai cho **Task 4** và **Task 5** của Assignment 2.

---

## 1. Danh mục Tài liệu Sprint theo Mục 9 của Đề bài

### Sprint 1 (Foundation, Catalog, Auth/RBAC & Atomic Order Creation)
- **Sprint 1 Planning**: [`sprint-1-planning.md`](sprint-1-planning.md)
- **Sprint 1 Review**: [`sprint-1-review.md`](sprint-1-review.md)
- **Sprint 1 Retrospective**: [`sprint-1-retrospective.md`](sprint-1-retrospective.md)

### Sprint 2 (Checkout, Payment Idempotency/Retry, Staff, Loyalty, Testing & CI/CD)
- **Sprint 2 Planning**: [`sprint-2-planning.md`](sprint-2-planning.md)
- **Sprint 2 Review**: [`sprint-2-review.md`](sprint-2-review.md)
- **Sprint 2 Retrospective**: [`sprint-2-retrospective.md`](sprint-2-retrospective.md)

### Đặc tả 5 GitHub Issues Triển khai (`#17` → `#21`)
- **Bản đặc tả chi tiết 5 Issues**: [`assignment-2-issue-drafts.md`](assignment-2-issue-drafts.md)
  - [Issue #17](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/17): Catalog API, Database Seed và Giao diện Menu / Chi tiết món Mobile-First (`8 SP`)
  - [Issue #18](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/18): Giỏ hàng, Giao diện Checkout (Ví/Thẻ mô phỏng, Xác nhận giá, Retry) và PWA Offline (`8 SP`)
  - [Issue #19](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/19): Báo giá, Tạo đơn Atomic, Giữ/Hoàn kho nguyên liệu, Khuyến mãi & Máy trạng thái đơn (`8 SP`)
  - [Issue #20](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/20): Xác thực JWT/RBAC, Bảo vệ HTTP API, Theo dõi đơn & Kiểm thử E2E Trình duyệt (`8 SP`)
  - [Issue #21](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/21): Thanh toán mô phỏng, Idempotency và Pipeline CI/CD Triển khai Render + GHCR (`8 SP`)

### Lưu trữ nghiệm thu giai đoạn nền tảng trước đó
- [`acceptance-2026-10-26/planning.md`](acceptance-2026-10-26/planning.md)
- [`acceptance-2026-10-26/review.md`](acceptance-2026-10-26/review.md)
- [`acceptance-2026-10-26/retrospective.md`](acceptance-2026-10-26/retrospective.md)

---

## 2. Quy ước làm việc & Definition of Done (Task 4.1)

- **Chiến lược Branch/PR, Quy ước Commit (`Conventional Commits`) và Definition of Done (DoD)** dùng chung cho cả Sprint 1 và Sprint 2 được quy định tại [`CONTRIBUTING.md`](../../CONTRIBUTING.md).
- Bảng phân rã Sprint 1 (`18 SP`: `#17`, phần đầu `#19` & `#20`) và Sprint 2 (`22 SP`: `#18`, phần hoàn thiện `#19` & `#20`, `#21`) xem chi tiết trong [`sprint-1-planning.md`](sprint-1-planning.md) và [`sprint-2-planning.md`](sprint-2-planning.md).
