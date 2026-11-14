# Minh chứng Pipeline Continuous Integration trên Pull Request (Task 4.4)

> **Workflow**: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (`Install → Contract/Schema Check → Lint → Unit/Integration Test (PostgreSQL 17) → Build → Smoke API → Playwright E2E`)
> **Quy tắc bảo vệ nhánh `main`**: Đã bật Branch Protection trên `main` (`required_status_checks: ["check"]`, `strict: true`, `enforce_admins: true`) để **chặn merge Pull Request nếu pipeline CI thất bại**.

---

## 1. Link Pull Request đã chạy CI

| Pull Request | Nhánh | Mô tả | Kết quả CI cuối |
|---|---|---|---|
| **[PR #25](https://github.com/nguyen213123/BrewLite_Assignment_2/pull/25)** | `issue-4-tv4-auth-protection-e2e` → `main` | Bảo vệ HTTP API, auto-refresh đơn & E2E Playwright (Issue #20) | Pass sau khi sửa lỗi E2E ([Run `43393696567`](https://github.com/nguyen213123/BrewLite_Assignment_2/actions/runs/43393696567)) |
| **[PR #22](https://github.com/nguyen213123/BrewLite_Assignment_2/pull/22)** | `issue-5-cicd-deploy` → `main` | Pipeline CD Render + GHCR, rollback, runbook (Issue #21) | Pass ([Run `43364990861`](https://github.com/nguyen213123/BrewLite_Assignment_2/actions/runs/43364990861)) |
| **[PR #23](https://github.com/nguyen213123/BrewLite_Assignment_2/pull/23)** | `feature/issue-17-catalog` → `main` | Catalog API, Seed & Menu/Chi tiết món Mobile-First (Issue #17) | Pass ([Run `43378790438`](https://github.com/nguyen213123/BrewLite_Assignment_2/actions/runs/43378790438)) |
| **[PR #24](https://github.com/nguyen213123/BrewLite_Assignment_2/pull/24)** | `issue-18-tv2-checkout-pwa` → `main` | Giỏ hàng, Checkout Ví/Thẻ mô phỏng & PWA Offline (Issue #18) | Pass ([Run `43379806641`](https://github.com/nguyen213123/BrewLite_Assignment_2/actions/runs/43379806641)) |
| **[PR #26](https://github.com/nguyen213123/BrewLite_Assignment_2/pull/26)** | `issue-19-tv3-orders-promotions-loyalty` → `main` | Báo giá, tạo đơn atomic, kho, khuyến mãi & Loyalty (Issue #19) | Pass ([Run `43450658298`](https://github.com/nguyen213123/BrewLite_Assignment_2/actions/runs/43450658298)) |
| **[PR #27](https://github.com/nguyen213123/BrewLite_Assignment_2/pull/27)** | `docs/deployment-final` → `main` | Cập nhật kết quả triển khai Render + GHCR đã kiểm chứng | Pass ([Run `43558010975`](https://github.com/nguyen213123/BrewLite_Assignment_2/actions/runs/43558010975)) |

---

## 2. Minh chứng lần Pipeline phát hiện lỗi (trước khi merge PR #25)

- **PR:** https://github.com/nguyen213123/BrewLite_Assignment_2/pull/25
- **Workflow Run (Failed):** https://github.com/nguyen213123/BrewLite_Assignment_2/actions/runs/43392242010 (commit `ca853c4`, ngày 13/11/2026)
- **Tóm tắt các bước:**
  - `docs:check`, `api:check`, `docs:schema`, `prisma:validate`, `prisma:deploy`, `npm run lint`, `npm test`, `npm run test:tools`, `npm run build`, `Smoke test API and database`: **success**
  - `Browser E2E (Playwright)`: **failure** (pipeline tự động upload artifact `e2e-report` và chặn merge PR).
- **Trích đoạn log phát hiện lỗi từ job `check`:**

```text
1) [chromium] › tests/e2e/checkout.spec.ts:9:3 › End-to-End Checkout Flow (Task 4.4 / Issue #20) › Full Journey: Menu -> Product Selection -> Cart -> Register/Login -> Order -> Mock Payment FAIL -> Retry SUCCESS -> Order History -> Staff COMPLETED & Loyalty Points

  Error: expect(locator).toBeVisible() failed

  Locator: locator('text=Đã thanh toán (PAID)').first()
  Expected: visible
  Timeout: 10000ms
  Error: element(s) not found
...
  Error: expect(locator).toBeVisible() failed

  Locator: locator('h2:has-text("Đơn BL-")')
  Expected: visible
```

- **Cách khắc phục:** commit [`832ed1c`](https://github.com/nguyen213123/BrewLite_Assignment_2/commit/832ed1c) (`fix(e2e): align order status badge and detail title text assertion (#20)`) cập nhật bộ chọn/assertion khớp với badge trạng thái và tiêu đề trang chi tiết đơn hàng trên UI thật.

---

## 3. Minh chứng lần Pipeline thành công (sau khi sửa trên PR #25 và trên `main`)

- **Workflow Run (Passed trên PR #25):** https://github.com/nguyen213123/BrewLite_Assignment_2/actions/runs/43393696567 (commit `832ed1c`, ngày 13/11/2026)
- **Toàn bộ các bước trong job `check` đều đạt `success`:**
  1. `npm ci` → `npm run docs:check` → `npm run api:check` → `npm run docs:schema` (`success`)
  2. `npm run db:generate` → `prisma:validate` → `prisma:deploy` (`success`)
  3. `npm run lint` → `npm test` (với `RUN_DB_TESTS=1` trên PostgreSQL 17) → `npm run test:tools` → `npm run build` (`success`)
  4. `Smoke test API and database` → `Seed database for E2E` → `Browser E2E (Playwright)` (`success`)
- **Sau khi merge PR #25 (và các PR tiếp theo lên `main`):**
  - CI trên `main` (`39089d9`, ngày 14/11/2026): https://github.com/nguyen213123/BrewLite_Assignment_2/actions/runs/43570528852 (`success`).
