# Part D.2: Technical Debt Register

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  
> **Definition:** Engineering work intentionally deferred that incurs future maintenance overhead or risk.  

---

## 1. Technical Debt Assessment Table

| Debt ID | Technical Debt Item | Architectural Impact | Priority | Disposition / Planned Action | Owner & Target Milestone |
|---|---|---|:---:|---|---|
| **TD-01** | **Redundant Category Enum Definitions** | Expense categories are defined in `review-rules.ts`, mocked in tests, and hardcoded as HTML `<select>` options in `requests/new/page.tsx` rather than a unified Prisma enum. | Medium | Consolidate into a single canonical `ExpenseCategory` enum in `prisma/schema.prisma` with a dedicated migration during Sprint 2 Finalization. | Pattarawadee (Sprint 2 Cleanup) |
| **TD-02** | **Missing Database Index on `category` and `createdAt`** | `prisma/schema.prisma` only indexes foreign keys (`requesterId`, `assignedReviewerId`) and `status`. Filter queries on `category` and sorting on `createdAt` scan full tables at scale. | Low | Add composite indexes `@@index([status, createdAt])` and `ExpenseItem(category)` in Prisma schema as part of the F-06 migration PR. | Siripitch (Sprint 2 / F-06) |
| **TD-03** | **Playwright E2E Tests Not Gated in CI** | Playwright test suites exist locally but are not automatically executed inside the GitHub Actions PR merge gate due to container headless browser setup complexity. | Medium | Add a dedicated `e2e-test` job in `.github/workflows/ci-docker.yml` running Playwright headless against seeded demo containers. | Siripitch (Sprint 3 Hardening) |
| **TD-04** | **Unreferenced `review-queue.ts` Helper** | With server-side `queue=true` filtering implemented directly in Prisma for F-07, the client-side helper `src/lib/review-queue.ts` is only imported by its unit test. | Low | Deprecate and remove `src/lib/review-queue.ts` and its redundant test file to reduce dead code footprint. | Pattarawadee (Sprint 3 / F-10) |

---

## 2. Debt vs. Defect Distinction
None of the above items represent incorrect system behavior or broken specifications. All functional invariants, validation rules, and security boundaries operate correctly; these items represent maintainability and performance optimizations scheduled for future iterations.
