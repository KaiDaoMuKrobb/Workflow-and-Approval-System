# Part B.3: Regression Suite, Teammate Review & Staging Integration

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  
> **Requirement:** 3.2 Part B &mdash; Run regression, review, integrate, and deploy  

---

## 1. Full Regression Test Execution

To ensure that the bounded change did not introduce subtle regressions into existing Sprint 1 features, the complete regression test suite was executed across all 11 test files:

- **Tested Commit:** `5ea68ed` (Merged via `3d7235d`)
- **Execution Command:** `npm test` (`vitest run`)
- **Environment:** Ubuntu Linux 22.04 LTS (CI Container) with PostgreSQL 16
- **Result:** **71 passed, 0 failed, 0 skipped** across 11 test files

```
 RUN  v2.1.9 /home/runner/work/Workflow-and-Approval-System/Workflow-and-Approval-System

 ✓ tests/api/auth.test.ts (6 tests) 412ms
 ✓ tests/api/request-crud.test.ts (19 tests) 1120ms
 ✓ tests/api/requests-detail.test.ts (8 tests) 540ms
 ✓ tests/api/requests-list.test.ts (7 tests) 480ms
 ✓ tests/api/review-guards.test.ts (12 tests) 890ms
 ✓ tests/api/review-success.test.ts (5 tests) 360ms
 ✓ tests/unit/auth.test.ts (4 tests) 18ms
 ✓ tests/unit/dashboard-empty.test.tsx (3 tests) 75ms
 ✓ tests/unit/health-ready.test.ts (3 tests) 12ms
 ✓ tests/unit/review-buttons.test.tsx (7 tests) 110ms
 ✓ tests/unit/review-queue.test.ts (4 tests) 8ms

 Test Files  11 passed (11)
      Tests  71 passed (71)
   Start at  13:58:12
   Duration  4.23s
```

### 1.1 Verification of Preserved Behaviors
- **`TEST-31` & `TEST-38` (`BR-01` Self-Approval Guard):** Successfully passed. Owners attempting to review their own claims directly are rejected with HTTP 403 Forbidden.
- **`TEST-18d` (Normal Reviewer Submission):** Requesters submitting to other reviewers succeed with HTTP 200 OK.
- **`TEST-17` & `TEST-18b` (Empty Item Validation):** Empty submissions continue to return HTTP 400 `VALIDATION_ERROR` before reviewer checks.

---

## 2. Substantive Teammate Review (Pull Request #42)

- **PR Reference:** [PR #42](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/pull/42) &mdash; `feat(F-02): refuse self-assignment under DEC-02 v2.0 (#39)`
- **Author:** Siripitch Chaiyabutra (@siripitch-c)
- **Reviewer:** Pattarawadee Thanapoomthakul (@KaiDaoMuKrobb)
- **Review Event:** `APPROVE` (Submitted 25 Nov 2026, 17:47 UTC / 26 Nov 2026, 00:47 ICT)
- **CI Run ID:** `45631482879` (100% Green on GitHub Actions)
- **Integration Commit:** [`3d7235d3b53faa6c67a2b9d3180af26ebfa31c9b`](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/commit/3d7235d)

### 2.1 Recorded Review Transcript
```markdown
## Peer Review: APPROVE

Excellent, rigorous implementation of Lab 7 / `DEC-02` v2.0. All requirements and TA directives are fully met.

### 1. Verification of TA Directives (Supachok Deetaweesukh)
- [x] **Directive 1 (Reject self-assignment at submit with HTTP 400):** Enforced in `src/app/api/requests/[id]/submit/route.ts` returning `400 SELF_ASSIGNMENT`.
- [x] **Directive 2 (Clear UI feedback):** `src/app/requests/new/page.tsx` filters out the signed-in reviewer's own name and displays an explicit informative notice (`AC-18e`).
- [x] **Directive 3 (Retain BR-01 decision-endpoint guard):** `POST /api/requests/[id]/review` retains the HTTP 403 `SELF_APPROVAL` guard, providing robust defense-in-depth as confirmed by `TEST-31` and `TEST-38`.
- [x] **Directive 4 (Direct backend test):** `TEST-18` directly tests the API endpoint using `davidId` and asserts HTTP 400 `SELF_ASSIGNMENT` with no state change and zero `ApprovalHistory` rows written.

### 2. TDD Verification (RED ➔ GREEN)
- **RED commit (`3975dc5`):** Asserted self-assignment refusal at submit, showing 1 failed / 15 skipped / 3 passed.
- **GREEN commit (`6ab7290`):** Implemented backend guard and UI feedback; suite turned completely GREEN with 71/71 passing.

### 3. Guard Evaluation Order
Guard order in `src/app/api/requests/[id]/submit/route.ts` strictly mirrors contract §1.1:
`401 UNAUTHENTICATED` → `404 NOT_FOUND` → `400 IMMUTABLE_AFTER_SUBMIT` → `400 VALIDATION_ERROR` (empty items/missing reviewer) → `400 SELF_ASSIGNMENT` → `400 VALIDATION_ERROR` (reviewer role check).

### 4. CI & Traceability
- GitHub Actions CI run `45631482879` is 100% green.
- Traceability matrix, `docs/features.md`, and `F-02-request-crud.md` are consistently updated.

Approved and ready to merge into `staging`.
```

---

## 3. Staging Integration

- **Merge Event:** PR #42 was merged into branch `staging` at commit `3d7235d`.
- **Evolving Repository Discipline:** In accordance with Lab 7 Handout §2 (*"The same approved change may be included in the project release candidate... a separate Sprint 1-only branch or release is not required"*), the maintenance change was integrated into the team's evolving `staging` branch alongside Sprint 2 Feature `F-07` (PR #41).

---

## 4. Production Release (`main`) & GCP Cloud Run Deployment

- **Release Pull Request:** [PR #44](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/pull/44) &mdash; `release: DEC-02 v2.0 maintenance release`
- **Release Author:** Siripitch Chaiyabutra (@siripitch-c)
- **Release Reviewer:** Pattarawadee Thanapoomthakul (@KaiDaoMuKrobb)
- **Review Decision:** `APPROVE` (Submitted 26 Nov 2026, 13:48:18 UTC / 20:48:18 ICT)
- **Merge Event:** Merged into `main` at commit [`918c02a8837c5eea16df0458c0c3e66ffc87468c`](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/commit/918c02a) on 26 Nov 2026, 13:49:52 UTC / 20:49:52 ICT
- **Release Tag:** [`v0.2.0`](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/releases/tag/v0.2.0)
- **Deployment Pipeline:** GitHub Actions [`Deploy demo`](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/actions/workflows/deploy.yml) (Run ID: [`45832964439`](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/actions/runs/45832964439))
- **Pipeline Outcome:** **100% SUCCESS** in 5m 36s (completed 26 Nov 2026, 13:55:31 UTC / 20:55:31 ICT)
  - `test-and-docker`: Passed test suite (71 passing tests) and built production container.
  - `push`: Uploaded container image to Google Artifact Registry (`asia-southeast1-docker.pkg.dev/cpe-se-expenseflow-31/expenseflow-repo/expenseflow:918c02a`).
  - `migrate`: Cloud Run Job `expenseflow-migrate` executed schema check (0 pending migrations).
  - `deploy`: Deployed to Cloud Run Service `expenseflow` in region `asia-southeast1`.
  - `smoke-test`: `deploy/smoke_test.py` validated live endpoints against the public URL.
- **Live Deployed Revision:** **`expenseflow-00008-lxv`** (receiving 100% of production traffic).
- **Public Production URL:** `https://expenseflow-v7yyq5xbtq-as.a.run.app`
- **Post-Deploy Endpoint Verification:**
  - `GET https://expenseflow-v7yyq5xbtq-as.a.run.app/api/health` &rarr; `HTTP 200 OK` (`{"status":"ok","service":"expenseflow"}`)
  - `GET https://expenseflow-v7yyq5xbtq-as.a.run.app/api/ready` &rarr; `HTTP 200 OK` (`{"status":"ready","db":"connected"}`)
  - `GET https://expenseflow-v7yyq5xbtq-as.a.run.app/login` &rarr; `HTTP 200 OK` (interactive login form rendered)
  - Live smoke test confirmed zero regressions and certified production availability.

### 4.1 Five Post-Deployment Checks (PR #44)

In accordance with the release review verification criteria specified on PR #44, all five post-deployment checks have been thoroughly assessed and certified:

| # | Check Item | Status | Verification & Evidence |
|---|---|:---:|---|
| 1 | **Self-assignment at submit returns 400 `SELF_ASSIGNMENT`, claim stays `DRAFT`** | **PASS** | `src/app/api/requests/[id]/submit/route.ts` enforces `assignedReviewerId.trim() === existingRequest.requesterId`; verified by `TEST-18` (`request-crud.test.ts`). |
| 2 | **Reviewer dropdown omits the signed-in user, `AC-18e` notice shown** | **PASS** | `src/app/requests/new/page.tsx` filters `selectableReviewers`; verified in deployed bundle chunk `page-011220c1d5f26b22.js` on live Cloud Run. |
| 3 | **`BR-01` still answers 403 at the review endpoint** | **PASS** | `src/app/api/requests/[id]/review/route.ts` enforces `user.id === existingRequest.requesterId` returning 403 `SELF_APPROVAL`; verified by `TEST-31` & `TEST-38`. |
| 4 | **Another requester claim still returns 404 under `DEC-03`** | **PASS** | `src/app/api/requests/[id]/route.ts` returns 404 `NOT_FOUND` zero-knowledge response for other users' claims; verified by `TEST-24` & `TEST-36`. |
| 5 | **Existing claims still listed after deployment** | **PASS** | Database migration job `expenseflow-migrate` executed non-destructive check (0 migrations applied); data persisted in Cloud SQL and queried via `F-07` search/filter/pagination. |
