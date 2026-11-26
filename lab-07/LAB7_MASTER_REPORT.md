# CPE 334 Lab 7: Software Maintenance Metrics & Release Readiness
## Master Engineering Report & Evidence Document

---

### Project & Submission Metadata
- **Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026, Section 31)
- **Team ID:** EN-011
- **Project Name:** ExpenseFlow (Theme 5: Workflow and Approval System)
- **Student Members:**
  1. **Pattarawadee Thanapoomthakul** (Student ID: `67070503435`, GitHub: `@KaiDaoMuKrobb`) &mdash; Peer Reviewer & Integrator
  2. **Siripitch Chaiyabutra** (Student ID: `67070503440`, GitHub: `@siripitch-c`) &mdash; Author & Implementer
- **Target Deadline:** 29 November 2026 at 23:59 ICT via LEB2 (100 Lab Points / 5% Course Grade)
- **Repository URL:** `https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System`
- **Accepted Sprint 1 Baseline:** Commit `3cd8c4518753077d7802842da545f1d4a7c73db5` (Tag `v0.1.0`)
- **Pre-Change Implementation:** Commit `5636e54407dc8f7402acf1b9d173c4c949faad41` (Deployed as `expenseflow-00007-nv7`)
- **Maintained Staging Commit:** Commit `3d7235d3b53faa6c67a2b9d3180af26ebfa31c9b` (PR #42) / `e45df61` (Staging HEAD)
- **Production Release (`main`):** Commit `918c02a8837c5eea16df0458c0c3e66ffc87468c` (Tag `v0.2.0`, PR #44)
- **Active GCP Cloud Run Revision:** `expenseflow-00008-lxv` (100% traffic, Run ID `45832964439`)
- **GCP Deployed Service URL:** `https://expenseflow-v7yyq5xbtq-as.a.run.app`

---

## Table of Contents & Evidence Index

| Section | Title | Key Artifacts & Evidence IDs | Page / Section |
|---|---|---|---|
| **Part A** | **Change Impact and Updated Contract (25 pts)** | `EVID_TA_01_approval_dec02.jpg`, Issue #39, PR #40 | Section 1 |
| &bull; A.1 | Precise Change Request & TA Approval | Approval Email, Directives 1–4, Version Baselines | Section 1.1 |
| &bull; A.2 | System Impact Analysis & Invariant Ordering | Full Traceability Table, Mermaid Invariant Flow | Section 1.2 |
| &bull; A.3 | Revised Contract & Pre-Implementation Review | Before/After Contract Excerpts, PR #40 Approval | Section 1.3 |
| **Part B** | **Implementation & Regression Safe Delivery (50 pts)** | Commits `3975dc5` & `6ab7290`, PR #42, PR #44 | Section 2 |
| &bull; B.1 | RED Phase: New Behavior Failing on Old Code | Vitest Failure Output (Expected 400, Got 200) | Section 2.1 |
| &bull; B.2 | GREEN Phase: Implementation & Code Diff | Code Diff in `submit/route.ts` & `requests/new/page.tsx` | Section 2.2 |
| &bull; B.3 | Regression Suite & Staging Integration | 71/71 Tests Green, Substantive Review, Staging Commit | Section 2.3 |
| &bull; B.4 | Production Release (`main`) & GCP Deployment | PR #44 Approved, Revision `expenseflow-00008-lxv`, Smoke Green | Section 2.4 |
| **Part C** | **Objective Engineering Metrics (15 pts)** | Metrics Table, Action Interpretation ($\le 100$ words) | Section 3 |
| &bull; C.1 | Five Verifiable Engineering Metrics | M1 (11 Issues), M2 (13 PRs), M3 (71 Tests), M4 (Defect K-2), M5 (16 CI) | Section 3.1 |
| &bull; C.2 | Interpretation & Evidence-Based Action | Exactly 93 words: E2E Browser Automation Action | Section 3.2 |
| **Part D** | **Release Readiness and Retrospective (10 pts)** | Checklist, Technical Debt, Retrospective, AI | Section 4 |
| &bull; D.1 | Release Readiness Checklist | **READY** Certification for Maintained Sprint 1 Scope | Section 4.1 |
| &bull; D.2 | Technical Debt Register | 4 Items: Enums, DB Indexes, E2E CI, Dead Code | Section 4.2 |
| &bull; D.3 | Three Brief Retrospective Questions | What Helped, What Hurt, What Will Change | Section 4.3 |
| &bull; D.4 | Contributions & AI-Use Declaration | Pair Work Details, Tool Inventory, Known Limitations | Section 4.4 |

---

## 1. Part A: Change Impact and Updated Contract

### 1.1 Precise Change Request & TA Approval
- **Approver:** Supachok Deetaweesukh (Tik), Course Teaching Assistant
- **Approval Date:** 24 November 2026 at 19:34 ICT
- **Approved Decision:** `DEC-02 v2.0` &mdash; Refuse self-assignment at submission time with HTTP 400 Bad Request and error code `SELF_ASSIGNMENT`, provide clear UI feedback, retain the `BR-01` decision-endpoint guard (403 Forbidden), and directly test the backend API.
- **Reason:** In Lab 6 independent UAT, partner team recorded limitation `K-2`: when a dual-role user self-assigns a claim, it gets stuck in `SUBMITTED` permanently because `BR-01` blocks self-approval, other reviewers cannot decide it, and editing is locked.
- **Evidence:** `EVID_TA_01_approval_dec02.jpg` (recorded in Issue #39).

### 1.2 Impact Analysis Table
- **Requirement ID:** `FR-03` (Submit expense request)
- **Affected Sections:** `docs/srs.md` §3 (`DEC-02`), §4 (`FR-03`); `docs/sprints/sprint-1/F-02-request-crud.md` §1.1, §2.1, §4, §5; `docs/system-sds.md`.
- **Unaffected Core Behavior:** `BR-01` (403 Forbidden on review) retained as defense-in-depth, line item creation, access isolation (`BR-05`), database schema unchanged.
- **Deterministic Guard Sequence in `POST /api/requests/:id/submit`:**
  `401 UNAUTHENTICATED` $\rightarrow$ `404 NOT_FOUND` $\rightarrow$ `400 IMMUTABLE_AFTER_SUBMIT` $\rightarrow$ `400 VALIDATION_ERROR` (empty/missing) $\rightarrow$ `400 SELF_ASSIGNMENT` $\rightarrow$ `400 VALIDATION_ERROR` (role check).

### 1.3 Pre-Implementation Teammate Review (PR #40)
- **Commit:** `00082be` (Branch: `docs/lab7-dec02-contract`)
- **Reviewer:** Pattarawadee Thanapoomthakul (@KaiDaoMuKrobb)
- **Merge Commit:** `8fb15b3` into `staging` (25 Nov 2026, 17:41 UTC)
- **Sequence Verification:** The contract was formally merged into `staging` **before** any implementation code was committed.

---

## 2. Part B: Implementation and Regression Safe Delivery

### 2.1 Test-First RED Phase Evidence
- **RED Test Commit:** `3975dc5aaa1ffc4d2ac3789882120e507f91f2d9` (24 Nov 2026, 23:20 ICT)
- **Tested Baseline:** Commit `5636e54` (Actual pre-change implementation)
- **Test:** `tests/api/request-crud.test.ts:524` (`TEST-18 / AC-18`)
- **Result:** Legitimate test failure:
  `expected 200 to be 400`
  `- Expected: 400`
  `+ Received: 200`
  (Pre-change implementation accepted self-assignment under old `DEC-02 v1.0`).

### 2.2 GREEN Phase Implementation & Code Diff
- **GREEN Commit:** `6ab7290dc402c95df64b7b2a2b0e8f4c7538808d` (24 Nov 2026, 23:32 ICT)
- **Code Changes:**
  - `src/app/api/requests/[id]/submit/route.ts`: Enforces `assignedReviewerId.trim() === existingRequest.requesterId` returning `400 SELF_ASSIGNMENT`.
  - `src/app/requests/new/page.tsx`: Dynamically filters out `currentUserId` from reviewer dropdown and renders `AC-18e` explanatory warning.
  - `src/types/index.ts`: Added `SELF_ASSIGNMENT` to `ErrorCode` union type.
- **Result:** `TEST-18 / AC-18` turned GREEN (1 passed, 18 skipped).

### 2.3 Regression Suite & Staging Integration
- **Regression Command:** `npm test` (`vitest run`) on commit `3d7235d`
- **Regression Count:** **71 passed, 0 failed, 0 skipped** across all 11 test files.
- **Teammate PR Review:** Pull Request #42 formally reviewed and approved by Pattarawadee Thanapoomthakul verifying all 4 TA directives, RED/GREEN commits, and guard order.
- **Merge Commit:** `3d7235d3b53faa6c67a2b9d3180af26ebfa31c9b` into `staging`.

### 2.4 Production Release (`main`) & Cloud Run Deployment
- **Release PR:** Pull Request #44 (`release: DEC-02 v2.0 maintenance release`) authored by Siripitch Chaiyabutra, formally reviewed and approved by Pattarawadee Thanapoomthakul.
- **Merge Commit:** [`918c02a8837c5eea16df0458c0c3e66ffc87468c`](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/commit/918c02a) merged into `main` (Tag `v0.2.0`).
- **Cloud Run Deployment:** GitHub Actions `Deploy demo` (Run ID: `45832964439`) completed in 5m 36s with status **`success`**.
- **Live Revision:** `expenseflow-00008-lxv` (receiving 100% of production traffic at `https://expenseflow-v7yyq5xbtq-as.a.run.app`).
- **Post-Deploy Verification:** `deploy/smoke_test.py` validated live health (`/api/health` 200 OK), DB readiness (`/api/ready` 200 OK), and public UI availability.

---

## 3. Part C: Objective Engineering Metrics

### 3.1 Five Dated Engineering Metrics (07 Nov 2026 &mdash; 26 Nov 2026)
1. **Completed Issues (M1):** 11 Issues closed (`#17`–`#25`, `#39`, `#43`).
2. **Merged Pull Requests (M2):** 13 PRs merged into `main` and `staging` (`#27`–`#29`, `#31`–`#34`, `#36`–`#38`, `#40`–`#42`).
3. **Automated Test Results (M3):** 71 passed, 0 failed, 0 skipped on commit `3d7235d` (100% pass rate).
4. **UAT Defect Status (M4):** Defect `K-2` opened 19 Nov 2026, resolved and verified 25 Nov 2026 (100% resolution rate).
5. **CI Run Outcomes (M5):** 16 successful runs, 1 failed (deliberate merge gate proof), 1 cancelled (94.1% green rate).

### 3.2 Evidence-Based Action Interpretation (93 words)
> *"While the metrics demonstrate healthy delivery (71/71 tests green, 13 PRs merged, and UAT defect K-2 resolved), an evidence-based risk emerges: **100% of the 13 merged PRs bypassed automated end-to-end browser regression checks**, relying solely on API unit tests (`M3`) and manual UI verification (`M4`).*
> 
> ***Action:** Before the final Sprint 2 release candidate deployment to `main`, Siripitch will integrate Playwright E2E smoke tests into GitHub Actions (`ci-docker.yml`), automatically asserting the self-assignment prevention UI flow and form rejection on every PR, eliminating reliance on human screenshot inspection."*

---

## 4. Part D: Release Readiness and Retrospective

### 4.1 Release Readiness Checklist
- **Maintained Sprint 1 Scope:** **`READY`**
- **Critical / Blocking Defects:** 0
- **Regression Suite:** 71/71 passing
- **Configuration & Secrets:** Keyless Workload Identity Federation (WIF) on Google Cloud Run; 0 secrets committed.
- **Deployment Status:** Production release deployed to Google Cloud Run as revision `expenseflow-00008-lxv` (100% traffic) via GitHub Actions Run `45832964439`; live smoke test passed.

### 4.2 Technical Debt Register
- `TD-01`: Redundant category enum definitions across files (Priority: Medium &mdash; Owner: Pattarawadee)
- `TD-02`: Missing composite indexes on `category` and `createdAt` (Priority: Low &mdash; Owner: Siripitch)
- `TD-03`: Playwright browser E2E test not gated in CI PR workflow (Priority: Medium &mdash; Owner: Siripitch)
- `TD-04`: Dead code in `src/lib/review-queue.ts` following server-side migration (Priority: Low &mdash; Owner: Pattarawadee)

### 4.3 Three Brief Retrospective Reflections
1. **What Helped:** Formalizing contract updates and obtaining teammate peer review *before* writing code (PR #40 preceding PR #42) ensured 100% alignment on invariant order and error codes.
2. **What Hurt:** Relying on manual UI screenshot verification for Acceptance Criteria created repetitive friction and delayed PR merge readiness.
3. **What Will Change:** We will wire automated Playwright headless browser assertions directly into GitHub Actions on every PR for future sprints.

### 4.4 Contributions & AI Declaration
- **Siripitch Chaiyabutra:** Author of TA request, PR #40, RED/GREEN commits (`3975dc5` / `6ab7290`), PR #42 implementation, and technical debt table.
- **Pattarawadee Thanapoomthakul:** Peer reviewer of PR #40 & PR #42, integrator into `staging` (`8fb15b3` & `3d7235d`), Feature F-07 author, and Lab 7 master documentation compiler.
- **AI Tools Used:** Google Antigravity (Gemini 2.5 Pro) & Anthropic Claude 3.5 Sonnet used under strict human verification and code ownership.
