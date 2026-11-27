# Feature Inventory

> **Deliverable 2: Sprint 2 Completion and Sprint 3 Progress**  
> **Authors:** Pattarawadee Thanapoomthakul (67070503435), Siripitch Chaiyabutra (67070503440)  
> **Repository path:** `docs/features.md`  
> **Product:** ExpenseFlow: Corporate Expense Reimbursement System (Theme 5, Workflow and Approval)  
> **Companion document:** `docs/traceability.md` maps every requirement to the feature that delivers it and the tests that verify it.

---

## 0. Team

| GitHub | Name | Student ID | Core Role |
| :--- | :--- | :--- | :--- |
| `KaiDaoMuKrobb` | Pattarawadee Thanapoomthakul | 67070503435 | Reviewer / Integrator (Student A) |
| `siripitch-c` | Siripitch Chaiyabutra | 67070503440 | Author / Implementer (Student B) |

Ownership is recorded by GitHub handle so it matches author and reviewer names on every commit, Pull Request, and Issue without ambiguity.

---

## 1. How to Read This File

A **feature** is a bounded unit of engineering work with one owner, one branch, and one engineering contract. Features are numbered `F-01` upward and identifiers never change once allocated.

A **system responsibility** is behavior that applies universally across screens and endpoints: authorization ordering, error envelopes, audit history, and decimal precision. These are listed in §3.

---

## 2. Feature Inventory

### Sprint 1: Delivered & Accepted Baseline (v0.1.0, Commit 3cd8c45)

| ID | Title | What it delivers | Requirements | Depends on | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `F-01` | Authentication and session | Sign in, sign out, session cookie, bcrypt password hashing, seed accounts | `FR-01`, `NFR-01`, `NFR-02` | None | KaiDaoMuKrobb | `verified` (PR #6) |
| `F-02` | Expense request and line items | Draft creation, line items, request numbering, submission, immutability | `FR-02`, `FR-03`, `BR-03`, `BR-04`, `BR-06` | `F-01` | KaiDaoMuKrobb | `verified` (PR #8, #42, #44) |
| `F-03` | Reviewer dashboard and assigned view | Scoped request lists, detail view, read isolation, queue empty states | `FR-04`, `BR-05` (read), `NFR-03` | `F-01` | siripitch-c | `verified` (PR #11) |
| `F-04` | Approval workflow and business rule guards | Approve/reject endpoints, decision reasons, self-approval prevention | `FR-05`, `BR-01`, `BR-02`, `BR-05` (decide) | `F-03` | siripitch-c | `verified` (PR #14) |

### Sprint 2: Core Expansion Increments (Target v0.3.0)

| ID | Title | What it delivers | Requirements | Depends on | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `F-05` | Return and resubmission workflow | Reviewer returns claim with reason; requester updates line items and resubmits | `FR-06`, `BR-07`, `BR-08` | `F-04` | siripitch-c | `verified` (11 tests pass, Issue #45, PR #54) |
| `F-06` | Second stage approval for high amounts | Claims > 50,000 THB require two distinct approvals; dual control segregation | `FR-07`, `BR-09` | `F-04` | siripitch-c | `verified` (14 tests pass, Issue #47) |
| `F-07` | Multi-criteria search, filter, and pagination | Status, category, date, department filtering, text search, pagination | `FR-08` | `F-03` | KaiDaoMuKrobb | `verified` (PR #41, 10 tests passing, released) |

### Sprint 3: Advanced Analytics & Hardening

| ID | Title | What it delivers | Requirements | Depends on | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `F-08` | Department summaries and analytics | Aggregated spend by department, category percentage breakdown, monthly totals | `FR-09`, `NFR-05` | `F-04` | KaiDaoMuKrobb | `verified` (PR #46, 6/6 tests passing, UI dashboard ready) |
| `F-09` | Financial report export | Reviewer exports reimbursement reports as CSV/JSON; requester access denied | `FR-10`, `BR-10` | `F-08` | KaiDaoMuKrobb | `specified` (Contract committed in sprint-3) |
| `F-10` | Hardening and regression | Viewport responsiveness, duplicate-submit guards, complete regression suite | `NFR-01` .. `NFR-04` | all | siripitch-c | `specified` (Contract committed in sprint-3) |

---

## 3. System Responsibilities

| ID | Responsibility | Established by | Verified by | Sprint | Status |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `SR-01` | **Authorization check order:** `401 -> 404 -> 403 -> 400` fixed evaluation order | `F-04` | `TEST-38`, `TEST-33b`, `TEST-34b`, `TEST-80`, `TEST-81` | 1, 3 | `verified` |
| `SR-02` | **Error envelope:** Shared `{ success: false, error: { message, code } }` schema | `F-01` | All negative criteria assert code and status | 1, 2, 3 | `verified` |
| `SR-03` | **Append-only audit history:** Every state transition writes an `ApprovalHistory` row | `F-02`, `F-04`, `F-05` | `TEST-30b`, `TEST-50`, `TEST-55` | 1, 2 | `verified` |
| `SR-04` | **Monetary precision:** Amounts stored as `Decimal(12,2)` and transferred as formatted strings | `F-01`, `F-02` | `TEST-12`, `TEST-20b`, `TEST-84`, `TEST-85` | 1, 2, 3 | `verified` |
| `SR-05` | **Server-side enforcement:** All security guards enforced in route handlers | `F-04`, `F-07`, `F-08` | Isolated API-level test cases without browser dependency | 1, 2, 3 | `verified` |

---

## 4. Coverage Check

Every requirement in `docs/srs.md` maps to exactly one feature. Nothing is unallocated.

| Requirement | Feature | Sprint | Covered |
| :--- | :--- | :---: | :--- |
| `FR-01` | `F-01` | 1 | yes (`verified`) |
| `FR-02` | `F-02` | 1 | yes (`verified`) |
| `FR-03` | `F-02` | 1 | yes (`verified`) |
| `FR-04` | `F-03` | 1 | yes (`verified`) |
| `FR-05` | `F-04` | 1 | yes (`verified`) |
| `FR-06` | `F-05` | 2 | yes (`verified`) |
| `FR-07` | `F-06` | 2 | yes (`verified`) |
| `FR-08` | `F-07` | 2 | yes (`verified`) |
| `FR-09` | `F-08` | 3 | yes (`verified`) |
| `FR-10` | `F-09` | 3 | yes (`specified`) |
| `BR-01` | `F-04` | 1 | yes (`verified`) |
| `BR-02` | `F-04` | 1 | yes (`verified`) |
| `BR-03` | `F-02` | 1 | yes (`verified`) |
| `BR-04` | `F-02` | 1 | yes (`verified`) |
| `BR-05` | `F-03` (read), `F-04` (decide) | 1 | yes (`verified`) |
| `BR-06` | `F-02` | 1 | yes (`verified`) |
| `BR-07` | `F-05` | 2 | yes (`verified`) |
| `BR-08` | `F-05` | 2 | yes (`verified`) |
| `BR-09` | `F-06` | 2 | yes (`verified`) |
| `BR-10` | `F-09` | 3 | yes (`specified`) |
| `NFR-01` | `F-01` | 1 | yes (`verified`) |
| `NFR-02` | `F-01`, `SR-01` | 1 | yes (`verified`) |
| `NFR-03` | `F-03` | 1 | yes (`verified`) |
| `NFR-04` | `F-10` | 3 | yes (`specified`) |
| `NFR-05` | `F-08` | 3 | yes (`verified`) |

**Uncovered requirements:** None.  
**Threshold decision:** Confirmed at **50,000.00 THB** for `F-06` dual approval workflow.

---

## 5. Approved Scope & Architectural Changes

| Date | Change ID | Summary & Rationale | Recorded in |
| :--- | :--- | :--- | :--- |
| 03 Nov 2026 | `DEC-07` | Deleting a request is excluded from scope; immutability preserved via terminal states. | Team agreement |
| 04 Nov 2026 | Scope Realignment | `F-09` formalized as Financial Report Export (`FR-10`, `BR-10`) to match SRS baseline. | `docs/sprints/plan.md` |
| 03 Nov 2026 | `BR-04` | A request must contain at least one line item prior to submission. | Team agreement |
| 24 Nov 2026 | `DEC-02 v2.0` | Refuse self-assignment at submission with HTTP 400 `SELF_ASSIGNMENT`. Resolves UAT finding K-2. | Issue #39, PR #40, PR #42, PR #44 |
| 26 Nov 2026 | Boundary Fix | Enforce 100,000.00 THB maximum boundary on individual line items (`DEF-CONTROLLED-BOUNDARY-01`). | PR #38 |
| 27 Nov 2026 | `DEC-08` | Finalize two-stage approval threshold at 50,000.00 THB for high-value claims (`F-06`). | `docs/sprints/sprint-2/F-06-second-approval.md` |
