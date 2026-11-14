# Hướng dẫn Đóng góp & Quy trình Phát triển – BrewLite (Task 4.1)

Tài liệu này chuẩn hóa **chiến lược branch/Pull Request**, **quy ước commit**, **Product Backlog** và **Definition of Done (DoD)** dùng chung cho toàn nhóm trong Assignment 2.

---

## 1. Cấu trúc Repository

```text
BrewLite_Assignment_2/
├── apps/
│   ├── web/                       # Frontend Next.js (App Router, mobile-first/PWA)
│   └── api/                       # Backend NestJS + Prisma ORM + PostgreSQL migrations
├── docs/
│   ├── requirements/              # Task 1: context-and-scope, SRS (FR/NFR), Use Cases
│   ├── diagrams/                  # Task 2: Activity, Sequence, Class diagram, ERD
│   ├── architecture/              # Task 3: Kiến trúc hệ thống, ADRs, Deployment diagram
│   ├── api/                       # Hợp đồng OpenAPI 3.0 & examples
│   ├── sprints/                   # Backlog, Sprint 1 & 2 Planning / Review / Retrospective
│   ├── qa/                        # Bằng chứng kiểm thử & kịch bản demo
│   ├── traceability-matrix.md     # Mục 8.1: Ma trận truy vết yêu cầu
│   ├── deployment.md              # Hướng dẫn đóng gói, CI/CD, vận hành & rollback
│   └── release-notes.md           # Ghi chú phát hành theo phiên bản
├── tests/
│   ├── api/                       # Integration & E2E API tests (PostgreSQL thật)
│   ├── e2e/                       # Browser E2E tests (Playwright)
│   └── tools/                     # Script QA, benchmark và kiểm thử script deploy
├── scripts/                       # Script triển khai Render & smoke test production
├── .github/workflows/             # CI (ci.yml), CD (release.yml), Rollback (rollback.yml)
├── docker-compose.yml             # Chạy db, backend, frontend ở local
├── .env.example                   # Mẫu biến môi trường (không commit .env thật)
├── .gitignore
├── CONTRIBUTING.md
└── README.md
```

---

## 2. Chiến lược Branch & Pull Request

- **Nhánh chính (`main`)**: luôn ở trạng thái build được, pass kiểm thử và sẵn sàng triển khai; **không merge khi CI thất bại**.
- **Nhánh công việc (Feature / Task / Fix)**: mỗi hạng mục tách nhánh riêng từ `main` và đóng lại sau khi merge:
  - Tài liệu & thiết kế: `task-<số>-<mô-tả>` hoặc `docs/<mô-tả>` (ví dụ: `task-1.1`, `Task-2.1`, `Task-3.1-System-Architecture-and-ADRs`, `docs/deployment-final`).
  - Tính năng / Issue Sprint: `feat/<mô-tả>`, `feature/issue-<số>-<mô-tả>`, `issue-<số>-<tv>-<mô-tả>` (ví dụ: `feature/issue-17-catalog`, `issue-18-tv2-checkout-pwa`).
  - Sửa lỗi / CI/CD: `fix/<mô-tả>`, `ci/<mô-tả>`.
- **Quy trình Pull Request (PR)**:
  1. Tạo PR vào `main` sử dụng mẫu [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) và gắn Issue liên quan (`Closes #<issue>`).
  2. Mọi thay đổi về **yêu cầu, sơ đồ hoặc kiến trúc** (Task 4.2) phải đi qua commit/PR và **ghi rõ lý do thay đổi**.
  3. Đính kèm bằng chứng kiểm tra (kết quả test, ảnh giao diện hoặc link CI run).
  4. Bắt buộc pass toàn bộ pipeline CI (`.github/workflows/ci.yml`: `docs:check`, `api:check`, `docs:schema`, `lint`, `test`, `test:tools`, `build`, smoke API và Playwright E2E) và có ít nhất **1 thành viên khác review** trước khi merge.

---

## 3. Quy ước Commit (Commit Convention)

Dự án áp dụng chuẩn **Conventional Commits**:

```text
<type>(<scope>): <mô tả ngắn gọn, rõ mục đích thay đổi>
```

- **Các `type` chính:**
  - `feat`: thêm tính năng hoặc luồng nghiệp vụ mới (code FE/BE, API, PWA, E2E).
  - `fix`: sửa lỗi logic, UI, test hoặc cấu hình.
  - `docs`: cập nhật tài liệu SRS, sơ đồ UML, ADR, sprint docs, README, runbook.
  - `ci`: thay đổi GitHub Actions workflow, Dockerfile, script deploy/smoke.
  - `test`: bổ sung hoặc cập nhật unit/integration/E2E test.
  - `refactor`: tái cấu trúc code nhưng không đổi hành vi nghiệp vụ.
  - `chore` / `build`: cập nhật dependencies, cấu hình build, công cụ phát triển.
- **Các `scope` thường dùng:** `api`, `web`, `auth`, `catalog`, `orders`, `payments`, `e2e`, `release`, `deploy`, `architecture`, `sprints`, `task-1.1`, `task-2.1`.
- **Ví dụ hợp lệ:**
  - `feat(web): MOCK Wallet/Card checkout, replay vs retry (#18)`
  - `fix(e2e): align order status badge and detail title text assertion (#20)`
  - `docs(architecture): add system architecture specification and adr directory (Task 3.1)`
  - `ci(release): them release.yml, rollback.yml, script deploy/smoke Render + GHCR`
- **Nguyên tắc an toàn:** tuyệt đối không commit tệp `.env`, khóa bí mật (`JWT_SECRET`, `RENDER_API_DEPLOY_HOOK`, `STRIPE_SECRET_KEY`, mật khẩu thật) vào lịch sử Git.

---

## 4. Issue Board & Product Backlog (Sprint 1 & Sprint 2)

Backlog chi tiết và các biên bản Scrum được lưu trong [`docs/sprints/`](docs/sprints/README.md) và theo dõi trên **GitHub Issues**:

| Issue | Sprint | Phạm vi chính | Story Points | Tài liệu đặc tả |
|---|---|---|:---:|---|
| [#17](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/17) | Sprint 1 | Catalog API, Database Seed & Giao diện Menu / Chi tiết món Mobile-First (`360px`) | 8 SP | [`docs/sprints/sprint-1-planning.md`](docs/sprints/sprint-1-planning.md) |
| [#18](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/18) | Sprint 2 | Giỏ hàng, Checkout (Ví/Thẻ mô phỏng, xác nhận giá, retry) & PWA Offline | 8 SP | [`docs/sprints/sprint-2-planning.md`](docs/sprints/sprint-2-planning.md) |
| [#19](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/19) | Sprint 1 & 2 | Báo giá, tạo đơn atomic, giữ/hoàn kho OCC, khuyến mãi, state machine & Loyalty | 8 SP | [`docs/sprints/assignment-2-issue-drafts.md`](docs/sprints/assignment-2-issue-drafts.md) |
| [#20](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/20) | Sprint 1 & 2 | Xác thực JWT/RBAC, bảo vệ HTTP API, theo dõi đơn (`/orders`, `/staff`, `/admin`) & Playwright E2E | 8 SP | [`docs/sprints/assignment-2-issue-drafts.md`](docs/sprints/assignment-2-issue-drafts.md) |
| [#21](https://github.com/nguyen213123/BrewLite_Assignment_2/issues/21) | Sprint 2 | Thanh toán mô phỏng, Idempotency-Key, Docker Compose & CI/CD Render + GHCR | 8 SP | [`docs/sprints/assignment-2-issue-drafts.md`](docs/sprints/assignment-2-issue-drafts.md) |

---

## 5. Definition of Done (DoD)

Một Issue / User Story chỉ được chuyển sang **Done** khi đáp ứng toàn bộ các tiêu chí sau:

1. **Đúng yêu cầu & hợp đồng:** đáp ứng đầy đủ tiêu chí chấp nhận (`FR`/`NFR` liên quan trong `docs/requirements/Task-1.2-SRS-BrewLite.md`); vượt qua `npm run docs:check`, `npm run api:check` và `npm run docs:schema`.
2. **Chất lượng mã nguồn & build:** vượt qua `npm run lint` (`0` warnings/errors) và `npm run build` cho cả `apps/api` và `apps/web`; không chứa dữ liệu giả ở runtime và không lộ secret.
3. **Kiểm thử tự động:** có Unit Test và Integration/E2E Test phù hợp kiểm chứng trên PostgreSQL thật (`npm run test:db` / `npm run test:e2e`), xử lý đầy đủ trạng thái loading, empty, error và validate đầu vào ở cả FE/BE.
4. **Cập nhật tài liệu & truy vết:** cập nhật OpenAPI, migration/seed, `.env.example`, `README.md` / `docs/deployment.md` và [`docs/traceability-matrix.md`](docs/traceability-matrix.md) nếu có thay đổi liên quan.
5. **Review & CI:** mở Pull Request theo mẫu, vượt qua toàn bộ GitHub Actions CI (`ci.yml`), được ít nhất 1 thành viên khác review trước khi merge vào `main`.
