# Part C.1: Five Objective Engineering Metrics

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  
> **Observation Window:** 07 November 2026, 23:59 ICT (`v0.1.0`) &mdash; 26 November 2026, 15:40 ICT  

---

## 1. Five Verifiable Metrics Summary Table

| Metric | Definition | Scope | Snapshot / Observation Window | Value | Evidence / Source ID |
|---|---|---|---|---|---|
| **M1: Completed Issues** | Number of closed GitHub issues representing delivered engineering work (excluding duplicates/cancelled). | Repository: `KaiDaoMuKrobb/Workflow-and-Approval-System` | 07 Nov 2026 &mdash; 26 Nov 2026 | **11 Issues** (11 completed, 0 cancelled) | GitHub Issues List (`#17`–`#25`, `#39`, `#43`) |
| **M2: Merged PRs** | Number of Pull Requests peer-reviewed and merged into `staging` or `main`. | Repository: `KaiDaoMuKrobb/Workflow-and-Approval-System` | 07 Nov 2026 &mdash; 26 Nov 2026 | **14 PRs** (9 into `main`, 5 into `staging`) | GitHub Pull Requests List (`#27`–`#29`, `#31`–`#34`, `#36`–`#38`, `#40`–`#42`, `#44`) |
| **M3: Automated Test Results** | Passed, failed, and skipped test counts for the full test suite on the maintained release. | Test Suite: `npm test` (`vitest run`) | Tested on Commit `3d7235d` (Lab 7 Staging Integration) | **71 Passed, 0 Failed, 0 Skipped** (100% pass) | Vitest Test Runner Summary (11 test files) |
| **M4: UAT Defect Status** | User-facing defects discovered in UAT, tracked to resolution and verified. | Product Scope: Sprint 1 Behavior Maintenance | 19 Nov 2026 (Discovered) &mdash; 25 Nov 2026 (Verified) | **1 Opened, 1 Resolved** (100% resolution) | UAT Defect `K-2` / GitHub Issue `#39` |
| **M5: CI Run Outcomes** | Successful, failed, and cancelled automated workflow executions on PRs and releases. | GitHub Actions: `CI & Docker Build` & `Deploy demo` | 07 Nov 2026 &mdash; 26 Nov 2026 | **17 Success, 1 Failed, 1 Cancelled** (94.4% green) | GitHub Actions Run History (Runs `43290`..`45832`) |

---

## 2. Embedded Underlying Reconcilable Data

### M1: Completed Issues Itemization
- `#17`: [Lab 5] GCP project, billing and budget alert (Completed 11 Nov 2026)
- `#18`: [Lab 5] Make ExpenseFlow cloud-ready (Completed 12 Nov 2026)
- `#19`: [Lab 5] Containerise: Dockerfile, Compose and deploy scripts (Completed 13 Nov 2026)
- `#20`: [Lab 5] CI on pull requests, then the first release into main (Completed 13 Nov 2026)
- `#21`: [Lab 5] First deployment to Google Cloud (Completed 14 Nov 2026)
- `#22`: [Lab 5] Keyless cloud authentication and the merge gate on main (Completed 14 Nov 2026)
- `#23`: [Lab 5] Automatic deployment from main and the post-deploy smoke test (Completed 14 Nov 2026)
- `#24`: [Lab 5] Data survives a rollback and a roll-forward (Completed 14 Nov 2026)
- `#25`: [Lab 5] deployment.md and the submission PDF (Completed 14 Nov 2026)
- `#39`: [Lab 7] DEC-02: refuse self-assignment at submit time (Completed 26 Nov 2026)
- `#43`: [F-07] Multi-criteria Filtering, Search & Pagination (Completed 26 Nov 2026)

### M2: Merged Pull Requests Itemization
- `PR #27`: `build/19-docker` $\rightarrow$ `main` (Merged 13 Nov 2026 by KaiDaoMuKrobb)
- `PR #28`: `ci/20-pr-checks` $\rightarrow$ `staging` (Merged 13 Nov 2026 by KaiDaoMuKrobb)
- `PR #29`: `staging` $\rightarrow$ `main` (Merged 13 Nov 2026 by KaiDaoMuKrobb)
- `PR #31`: `feature/auto-deploy` $\rightarrow$ `main` (Merged 14 Nov 2026 by KaiDaoMuKrobb)
- `PR #32`: `staging` $\rightarrow$ `main` (Merged 14 Nov 2026 by siripitch-c)
- `PR #33`: `feat/home` $\rightarrow$ `staging` (Merged 14 Nov 2026 by KaiDaoMuKrobb)
- `PR #34`: `feature/deploy-proof` $\rightarrow$ `main` (Merged 14 Nov 2026 by siripitch-c)
- `PR #36`: `docs/25-deployment-doc` $\rightarrow$ `staging` (Merged 14 Nov 2026 by KaiDaoMuKrobb)
- `PR #37`: `docs/25-deployment-doc` $\rightarrow$ `main` (Merged 16 Nov 2026 by siripitch-c)
- `PR #38`: `fix/controlled-claim-boundary` $\rightarrow$ `staging` (Merged 21 Nov 2026 by siripitch-c)
- `PR #40`: `docs/lab7-dec02-contract` $\rightarrow$ `staging` (Merged 25 Nov 2026 by KaiDaoMuKrobb)
- `PR #42`: `change/lab7-dec02-self-assignment` $\rightarrow$ `staging` (Merged 25 Nov 2026 by KaiDaoMuKrobb)
- `PR #41`: `feat/F-07-search-filter` $\rightarrow$ `staging` (Merged 26 Nov 2026 by siripitch-c)
- `PR #44`: `staging` $\rightarrow$ `main` (Merged 26 Nov 2026 by KaiDaoMuKrobb &mdash; `release: DEC-02 v2.0 maintenance release`)

### M3: Automated Test Execution Breakdown (Commit `3d7235d`)
- `tests/api/auth.test.ts`: 6 passed
- `tests/api/request-crud.test.ts`: 19 passed (includes revised `TEST-18`)
- `tests/api/requests-detail.test.ts`: 8 passed
- `tests/api/requests-list.test.ts`: 7 passed
- `tests/api/review-guards.test.ts`: 12 passed (includes `TEST-31` & `TEST-38`)
- `tests/api/review-success.test.ts`: 5 passed
- `tests/unit/auth.test.ts`: 4 passed
- `tests/unit/dashboard-empty.test.tsx`: 3 passed
- `tests/unit/health-ready.test.ts`: 3 passed
- `tests/unit/review-buttons.test.tsx`: 7 passed
- `tests/unit/review-queue.test.ts`: 4 passed
- **Total: 71 passed, 0 failed, 0 skipped.**
