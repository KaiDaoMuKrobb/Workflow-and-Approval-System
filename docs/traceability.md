# Requirements Traceability Matrix

> **Deliverable 2: Sprint 2 Completion and Sprint 3 Progress**  
> **Authors:** Pattarawadee Thanapoomthakul (67070503435), Siripitch Chaiyabutra (67070503440)  
> **Repository path:** `docs/traceability.md`  
> **Companion documents:** `docs/features.md` (feature definitions), `docs/srs.md` (requirements specification), `docs/system-sds.md` (software design)

---

## 1. How to Read This Matrix

Traceability runs bidirectionally to ensure full alignment between product scope and code:

1. **Forward Traceability (§2):** Maps every functional requirement, business rule, and non-functional requirement to the feature that delivers it, the allocated sprint, acceptance criteria, test specifications, and verified status.
2. **Backward Traceability (§3):** Maps individual numbered acceptance criteria to executable test suites, test files, assertion levels, and current execution results.
3. **Coverage & Gaps Analysis (§4):** Distinguishes specification coverage from test execution coverage, explicitly disclosing deferred verification for subsequent increments.
4. **Change Register (§5):** Chronological log of approved scope revisions, technical decisions, and bug-fix invariants.

### 1.1 Status Vocabulary
| Status | Definition |
| :--- | :--- |
| `verified` | Automated test suite or manual UI check executed and passing on candidate (100% green). |
| `specified` | Acceptance criteria (AC) and test specifications (STS) fully defined in committed engineering contracts. |
| `in-progress` | Implementation or code review currently active on a dedicated feature branch. |
| `planned` | Allocated to a sprint; criteria and schema will be elaborated as that increment starts. |

> **Note on Test Counts:** On `origin/staging`, the regression test suite stands at **112/112 passing tests across 15 test files**. `F-05` contributed 11 of those and `F-06` a further 14, each added as its own suite. The 87/87 across 13 files quoted before `F-05` merged was the Sprint 1 and `F-08` baseline both were measured against.

---

## 2. Requirement -> Feature -> Sprint -> Verification

### 2.1 Functional Requirements

| Requirement | Feature | Sprint | Acceptance Criteria | Tests | Status |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `FR-01` Sign in and sign out | `F-01` | 1 | `AC-01` .. `AC-04` | `TEST-01` .. `TEST-04` | `verified` (81/81 baseline, PR #6) |
| `FR-02` Create request with line items | `F-02` | 1 | `AC-10` .. `AC-13` | `TEST-10` .. `TEST-19` | `verified` (81/81 baseline, PR #8) |
| `FR-03` Submit to named reviewer | `F-02` | 1 | `AC-16` .. `AC-18`, `AC-18b` .. `AC-18e` | `TEST-16` .. `TEST-19`, `TEST-18d` | `verified` (400 `SELF_ASSIGNMENT` under `DEC-02 v2.0`, PR #42, #44) |
| `FR-04` Reviewer sees assigned requests | `F-03` | 1 | `AC-20` .. `AC-24`, `AC-28` .. `AC-28g` | `TEST-20` .. `TEST-24`, `TEST-28` .. `TEST-28g` | `verified` (81/81 baseline, PR #11) |
| `FR-05` Approve or reject with reason | `F-04` | 1 | `AC-30`, `AC-36` | `TEST-30` .. `TEST-30c`, `TEST-36`, `TEST-E2E-02` | `verified` (Reason mandatory for both outcomes, PR #14) |
| `FR-06` Return and resubmission workflow | `F-05` | 2 | `AC-50` .. `AC-59` | `TEST-50` .. `TEST-59` | `verified` (11 tests pass in `tests/api/request-return-resubmit.test.ts`, with `AC-58` carried by the existing `TEST-15`; contract `docs/sprints/sprint-2/F-05-return-resubmit.md`, Issue #45, merged in PR #54) |
| `FR-07` Second stage approval for high amounts | `F-06` | 2 | `AC-60` .. `AC-69` | `TEST-60` .. `TEST-69`, plus `TEST-60b`, `TEST-62b`, `TEST-66b`, `TEST-67b` | `verified` (14 tests pass in `tests/api/requests-second-approval.test.ts`; `TEST-69b` is the manual interface check the contract specifies; threshold strictly `> 50,000.00 THB` under `DEC-08`) |
| `FR-08` Multi-criteria search, filter, and pagination | `F-07` | 2 | `AC-70` .. `AC-77` | `TEST-70` .. `TEST-76b`, `TEST-78`, `TEST-79` | `verified` (10/10 tests pass; UI filters verified, PR #41, #44) |
| `FR-09` Department expense summaries and analytics | `F-08` | 3 | `AC-80` .. `AC-86` | `TEST-80` .. `TEST-85` | `verified` (6/6 tests pass; interactive UI dashboard at `/reports`; enforces `SR-04` Decimal accumulation, PR #46) |
| `FR-10` Financial report export (CSV/JSON) | `F-09` | 3 | `AC-90` .. `AC-95` | `TEST-90` .. `TEST-95` | `specified` (Contract committed in `docs/sprints/sprint-3/F-09-financial-export.md`) |

### 2.2 Business Rules

| Rule | Feature | Sprint | Acceptance Criteria | Tests | Status |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `BR-01` No self-approval | `F-04` | 1 | `AC-31`, `AC-38` | `TEST-31`, `TEST-38`, `TEST-39c` | `verified` (403 `SELF_APPROVAL` enforced) |
| `BR-02` Valid state transitions only | `F-04` | 1 | `AC-32` | `TEST-32`, `TEST-32b`, `TEST-39e`, `TEST-39f` | `verified` (Terminal states immutable) |
| `BR-03` Immutable after submission | `F-02` | 1 | `AC-15` | `TEST-15` | `verified` (Edits refused once submitted) |
| `BR-04` Line item and total validation | `F-02` | 1 | `AC-11`, `AC-12` | `TEST-11`, `TEST-12` | `verified` (Line item <= 100,000 THB boundary) |
| `BR-05` Access isolation (read) | `F-03` | 1 | `AC-21`, `AC-26`, `AC-27`, `AC-34` | `TEST-21`, `TEST-26`, `TEST-27`, `TEST-34` | `verified` (404 zero-knowledge privacy) |
| `BR-05` Access isolation (decide) | `F-04` | 1 | `AC-33` | `TEST-33`, `TEST-33b`, `TEST-39d` | `verified` (403 assigned reviewer only) |
| `BR-06` Sequential request numbering | `F-02` | 1 | `AC-10` | `TEST-10`, `TEST-10b` | `verified` (Prefix EXP-YYYYMM-XXXX) |
| `BR-07` Return requires explanatory reason | `F-05` | 2 | `AC-51`, `AC-52` | `TEST-51`, `TEST-52` | `verified` (both sides of the boundary are exercised: `TEST-51` at nine characters is refused, `TEST-52` at exactly ten is accepted. Approve and reject keep the 5 character rule) |
| `BR-08` Resubmission authorization | `F-05` | 2 | `AC-55`, `AC-57` | `TEST-55`, `TEST-57` | `verified` (only the original requester may edit and resubmit, and both transitions are written to `ApprovalHistory`) |
| `BR-09` Dual control threshold (> 50,000.00 THB) | `F-06` | 2 | `AC-60` .. `AC-63`, `AC-66`, `AC-67` | `TEST-60`, `TEST-60b`, `TEST-61`, `TEST-62`, `TEST-63`, `TEST-66`, `TEST-66b`, `TEST-67`, `TEST-67b` | `verified` (both sides of the boundary are exercised one satang apart, and the dual control refusals are 403 `FORBIDDEN` under the `DEC-06` order rather than a new error code) |
| `BR-10` Financial export role restriction | `F-09` | 3 | `AC-91` | `TEST-91` | `specified` (Reviewer/Admin only; 403 on requester per `F-09-financial-export.md`) |

### 2.3 Non-Functional Requirements & Cross-Cutting Responsibilities

| Requirement | Scope | Sprint | Acceptance Criteria | Verification Method | Status |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `NFR-01` Passwords hashed with bcrypt | `F-01` | 1 | `AC-01` .. `AC-04` | Automated test asserts `$2a$` or `$2b$` prefix | `verified` (81/81 baseline) |
| `NFR-02` Unauthenticated access refused | `SR-01` | 1 | `AC-23`, `AC-37`, `AC-80` | Automated tests verify 401 on protected routes | `verified` (81/81 baseline) |
| `NFR-03` List endpoints respond under 500ms | `F-03`, `F-07` | 1, 2 | `AC-29`, `AC-76b` | Vitest timer assertions against seeded DB | `verified` (81/81 baseline) |
| `NFR-04` Responsive layout (mobile/tablet/desktop) | `F-10` | 3 | `AC-104` | Tailwind viewport checks (375px, 768px, 1280px) | `specified` |
| `NFR-05` Sub-second aggregated analytics | `F-08` | 3 | `AC-86` | Vitest API execution time measured at 227ms | `verified` (PR #46) |
| `SR-01` Auth check order (401 -> 404 -> 403 -> 400) | Core | 1 | `AC-38` | Proven by `TEST-38`, `TEST-33b`, `TEST-34b` | `verified` (Universal guard ordering) |
| `SR-02` Standard error envelope | Core | 1 | All negative AC | `{ success: false, error: { message, code } }` | `verified` (Universal error schema) |
| `SR-03` Append-only audit history | Core | 1 | `AC-30`, `AC-36` | `ApprovalHistory` rows created, never deleted | `verified` (Audit trail integrity) |
| `SR-04` Monetary precision (`Decimal(12,2)`) | Core | 1, 3 | `TEST-12`, `TEST-20b`, `TEST-84`, `TEST-85` | Prisma Decimal mapping; no float arithmetic in route handlers; strings end-to-end on wire | `verified` (PR #8, PR #11, PR #46 commit `484a4b3`) |
| `SR-05` Immutability of terminal audit trail | Core | 2 | `AC-30`, `AC-36`, `AC-57`, `AC-68` | `TEST-57`, `TEST-68` | Every transition appends a row and none is ever rewritten, across both the `F-05` and `F-06` paths | `verified` |

---

## 3. Detailed Acceptance Criteria to Test Mappings

### 3.1 Sprint 1 Features

#### `F-01` Authentication & Session Management (KaiDaoMuKrobb)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-01` Sign in with valid credentials | `TEST-01` | API | `tests/api/auth.test.ts` | `verified` |
| `AC-02` Sign in with invalid credentials | `TEST-02` | API | `tests/api/auth.test.ts` | `verified` |
| `AC-03` Sign out terminates session | `TEST-03` | API | `tests/api/auth.test.ts` | `verified` |
| `AC-04` Password hashed with bcrypt | `TEST-04` | Unit | `tests/unit/auth.test.ts` | `verified` |

#### `F-02` Expense Request & Line Items (KaiDaoMuKrobb)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-10` Create request generates EXP number | `TEST-10`, `TEST-10b` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-11` Line item amount must be positive | `TEST-11` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-12` Total amount equals sum of line items | `TEST-12` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-13` Update request while in DRAFT | `TEST-13` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-14` Delete request while in DRAFT | N/A | API | N/A (`DEC-07`: Deletion removed from scope) | N/A |
| `AC-15` Refuse edit after submission | `TEST-15` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-16` Submit request transitions to SUBMITTED | `TEST-16` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-17` Submit without line items refused | `TEST-17` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-18` Submit assigns to named reviewer | `TEST-18` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-18b` Nonexistent reviewer refused (404) | `TEST-18b` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-18c` Reviewer without REVIEWER role refused (400) | `TEST-18c` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-18d` Self-assignment refused (400 SELF_ASSIGNMENT) | `TEST-18d` | API | `tests/api/request-crud.test.ts` | `verified` (`DEC-02 v2.0`) |
| `AC-18e` Reviewer dropdown omits signed-in user | Manual UI Check | UI | Production bundle inspection | `verified` |
| `AC-19` Requester journey complete flow | `TEST-E2E-01` | E2E | `tests/e2e/requester-journey.spec.ts` | `verified` (Playwright) |

#### `F-03` Reviewer Dashboard & Assigned View (siripitch-c)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-20` Reviewer list shows assigned requests | `TEST-20` | API | `tests/api/requests-list.test.ts` | `verified` |
| `AC-20b` List returns Decimal amounts as strings | `TEST-20b` | API | `tests/api/requests-list.test.ts` | `verified` |
| `AC-21` Read isolation excludes other reviewers' claims | `TEST-21` | API | `tests/api/requests-list.test.ts` | `verified` |
| `AC-22` Filter claims by status | `TEST-22` | API | `tests/api/requests-list.test.ts` | `verified` |
| `AC-23` Unauthenticated request list refused (401) | `TEST-23` | API | `tests/api/requests-list.test.ts` | `verified` |
| `AC-24` Detail view returns request and line items | `TEST-24` | API | `tests/api/requests-detail.test.ts` | `verified` |
| `AC-25` Detail view includes approval history | `TEST-25` | API | `tests/api/requests-detail.test.ts` | `verified` |
| `AC-26` Detail view returns 404 for non-existent claim | `TEST-26` | API | `tests/api/requests-detail.test.ts` | `verified` |
| `AC-27` Detail view returns 404 for unassigned reviewer | `TEST-27` | API | `tests/api/requests-detail.test.ts` | `verified` (Zero-knowledge) |
| `AC-28` Dashboard empty state rendering | `TEST-28` | UI | `tests/unit/dashboard-empty.test.tsx` | `verified` |
| `AC-28b` Dashboard loading state indicator | `TEST-28b` | UI | `tests/unit/dashboard-empty.test.tsx` | `verified` |
| `AC-28c` Dashboard error state banner | `TEST-28c` | UI | `tests/unit/dashboard-empty.test.tsx` | `verified` |
| `AC-28d` Status filter tab selection | `TEST-28d` | Unit | `tests/unit/review-queue.test.ts` | `verified` |
| `AC-28e` Status queue badge counts | `TEST-28e` | Unit | `tests/unit/review-queue.test.ts` | `verified` |
| `AC-28f` Queue sorting by date descending | `TEST-28f` | Unit | `tests/unit/review-queue.test.ts` | `verified` |
| `AC-28g` Queue pagination controls | `TEST-28g` | Unit | `tests/unit/review-queue.test.ts` | `verified` |
| `AC-29` List response performance under 500ms | `TEST-29` | API | `tests/api/requests-list.test.ts` | `verified` |

#### `F-04` Approval Workflow & Business Rule Guards (siripitch-c)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-30` Reviewer approves claim with reason | `TEST-30`, `TEST-30b` | API | `tests/api/review-success.test.ts` | `verified` |
| `AC-31` Requester cannot approve own claim (403 SELF_APPROVAL) | `TEST-31` | API | `tests/api/review-guards.test.ts` | `verified` |
| `AC-32` Disallowed state transitions refused (400 INVALID_TRANSITION) | `TEST-32`, `TEST-32b` | API | `tests/api/review-guards.test.ts` | `verified` |
| `AC-33` Unassigned reviewer cannot decide claim (403 FORBIDDEN) | `TEST-33`, `TEST-33b` | API | `tests/api/review-guards.test.ts` | `verified` |
| `AC-34` Non-existent claim review returns 404 NOT_FOUND | `TEST-34`, `TEST-34b` | API | `tests/api/review-guards.test.ts` | `verified` |
| `AC-36` Reviewer rejects claim with reason | `TEST-36` | API | `tests/api/review-success.test.ts` | `verified` |
| `AC-37` Unauthenticated review request returns 401 UNAUTHENTICATED | `TEST-37`, `TEST-37b` | API | `tests/api/review-guards.test.ts` | `verified` |
| `AC-38` Invariant guard order (401 -> 404 -> 403 -> 400) | `TEST-38` | API | `tests/api/review-guards.test.ts` | `verified` |
| `AC-39` Review decision action buttons render for assigned reviewer | `TEST-39` | UI | `tests/unit/review-buttons.test.tsx` | `verified` |
| `AC-39b` Buttons hidden for unassigned reviewer or requester | `TEST-39b` | UI | `tests/unit/review-buttons.test.tsx` | `verified` |
| `AC-39c` Self-approval controls disabled/hidden for requester-reviewer | `TEST-39c` | UI | `tests/unit/review-buttons.test.tsx` | `verified` |
| `AC-39d` Unassigned reviewer decision submission blocked | `TEST-39d` | UI | `tests/unit/review-buttons.test.tsx` | `verified` |
| `AC-39e` Decision submission on terminal state blocked | `TEST-39e` | UI | `tests/unit/review-buttons.test.tsx` | `verified` |
| `AC-39f` Modal dialog confirms approve/reject action | `TEST-39f` | UI | `tests/unit/review-buttons.test.tsx` | `verified` |
| `AC-39g` Decision comment validation (minimum 5 characters) | `TEST-39g` | UI | `tests/unit/review-buttons.test.tsx` | `verified` |
| `AC-30` Approval journey end-to-end verification | `TEST-E2E-02` | E2E | `tests/e2e/approval-journey.spec.ts` | `verified` (Playwright) |

---

### 3.2 Sprint 2 Features

#### `F-07` Multi-Criteria Search, Filter & Pagination (KaiDaoMuKrobb)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-70` Text search by request number or title | `TEST-70` | API | `tests/api/requests-search-filter.test.ts` | `verified` |
| `AC-71` Filter claims by request status | `TEST-71` | API | `tests/api/requests-search-filter.test.ts` | `verified` |
| `AC-72` Filter claims by expense category | `TEST-72` | API | `tests/api/requests-search-filter.test.ts` | `verified` |
| `AC-73` Filter claims by creation date range | `TEST-73` | API | `tests/api/requests-search-filter.test.ts` | `verified` |
| `AC-74` Filter reviewer queue by requester department | `TEST-74` | API | `tests/api/requests-search-filter.test.ts` | `verified` |
| `AC-75` Combined multi-criteria search and filter | `TEST-75` | API | `tests/api/requests-search-filter.test.ts` | `verified` |
| `AC-76` Sliced pagination with page and limit parameters | `TEST-76` | API | `tests/api/requests-search-filter.test.ts` | `verified` |
| `AC-76b` Filtered query response time under 500ms | `TEST-76b` | API | `tests/api/requests-search-filter.test.ts` | `verified` |
| `AC-77` Interactive search bar and filter badges on UI | Manual UI Check | UI | Production `/requests` and `/reviewer/dashboard` | `verified` |

#### `F-05` Request Return & Resubmission Workflow (siripitch-c)
*Specification: `docs/sprints/sprint-2/F-05-return-resubmit.md` (Issue #45)*
| AC | Test ID | Level | Target Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| `AC-50` Assigned reviewer returns SUBMITTED request | `TEST-50` | API | `tests/api/request-return-resubmit.test.ts` | `verified` |
| `AC-51` Return requires non-empty comment >= 10 chars (BR-07) | `TEST-51` | API | `tests/api/request-return-resubmit.test.ts` | `verified` |
| `AC-52` Return reason exactly at boundary (10 chars) succeeds (BR-07) | `TEST-52` | API | `tests/api/request-return-resubmit.test.ts` | `verified` |
| `AC-53` Unassigned reviewer return refused with 403 (BR-05) | `TEST-53` | API | `tests/api/request-return-resubmit.test.ts` | `verified` |
| `AC-54` Editing reopened while RETURNED (BR-03 narrowed) | `TEST-54`, `TEST-54b` | API | `tests/api/request-return-resubmit.test.ts` | `verified` |
| `AC-55` Non-owner editing or reading returned claim gets 404 (BR-08) | `TEST-55` | API | `tests/api/request-return-resubmit.test.ts` | `verified` |
| `AC-56` Requester resubmits returned claim (RETURNED -> SUBMITTED) | `TEST-56`, `TEST-56b` | API | `tests/api/request-return-resubmit.test.ts` | `verified` |
| `AC-57` Resubmission writes accurate audit history row (RESUBMIT) (BR-08) | `TEST-57` | API | `tests/api/request-return-resubmit.test.ts` | `verified` |
| `AC-58` Editing submitted request refused, BR-03 preserved | `TEST-15` | API | `tests/api/request-crud.test.ts` | `verified` |
| `AC-59` Returning request not in SUBMITTED status refused (BR-02) | `TEST-59` | API | `tests/api/request-return-resubmit.test.ts` | `verified` |

#### `F-06` Second Stage Approval for High Amounts (siripitch-c)
*Specification: `docs/sprints/sprint-2/F-06-second-approval.md` (Issue #47)*
| AC | Test ID | Level | Target Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| `AC-60` A claim of exactly 50,000.00 stays on the single stage path | `TEST-60`, `TEST-60b` | API | `tests/api/requests-second-approval.test.ts` | `verified` |
| `AC-61` A claim above the boundary moves to PENDING_SECOND_APPROVAL | `TEST-61` | API | `tests/api/requests-second-approval.test.ts` | `verified` |
| `AC-62` The named second reviewer approves, and can read the claim | `TEST-62`, `TEST-62b` | API | `tests/api/requests-second-approval.test.ts` | `verified` |
| `AC-63` The first reviewer cannot approve twice, 403 FORBIDDEN under DEC-06 | `TEST-63` | API | `tests/api/requests-second-approval.test.ts` | `verified` |
| `AC-64` Rejection at the second stage moves the claim to REJECTED | `TEST-64` | API | `tests/api/requests-second-approval.test.ts` | `verified` |
| `AC-65` The requester cannot approve at either stage, 403 SELF_APPROVAL | `TEST-65` | API | `tests/api/requests-second-approval.test.ts` | `verified` |
| `AC-66` A high value approval must name a second reviewer, who must hold REVIEWER | `TEST-66`, `TEST-66b` | API | `tests/api/requests-second-approval.test.ts` | `verified` |
| `AC-67` Neither the first reviewer nor the requester may be named | `TEST-67`, `TEST-67b` | API | `tests/api/requests-second-approval.test.ts` | `verified` |
| `AC-68` Both stages are written to the audit trail | `TEST-68` | API | `tests/api/requests-second-approval.test.ts` | `verified` |
| `AC-69` The queue rule holds for the second reviewer alone | `TEST-69` | Unit | `src/lib/review-queue.ts` via `tests/api/requests-second-approval.test.ts`. The helper is not imported by any source file, so this proves the rule and not the screen | `verified` |
| `AC-69` The second reviewer completes the journey on screen | `TEST-69b` | UI | Manual check, dated evidence in `docs/evidence/` | `verified` |

---

### 3.3 Sprint 3 Features

#### `F-08` Department Expense Summaries & Analytics (KaiDaoMuKrobb)
*Implementation & Test Suite: PR #46 (Commit `484a4b3`)*
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-80` Unauthenticated request returns 401 UNAUTHENTICATED | `TEST-80` | API | `tests/api/reports.test.ts` | `verified` |
| `AC-81` Requester role returns 403 FORBIDDEN | `TEST-81` | API | `tests/api/reports.test.ts` | `verified` |
| `AC-82` Reviewer receives 200 OK with summary analytics payload | `TEST-82` | API | `tests/api/reports.test.ts` | `verified` |
| `AC-83` Authoritative aggregation from APPROVED claims only (exact delta 70,000.00 THB over 3 claims) | `TEST-83` | API | `tests/api/reports.test.ts` | `verified` |
| `AC-84` Department totals accumulated via Prisma.Decimal and returned as formatted strings | `TEST-84` | API | `tests/api/reports.test.ts` | `verified` (`SR-04`) |
| `AC-85` Category breakdown percentage calculation and monthly totals structure | `TEST-85` | API | `tests/api/reports.test.ts` | `verified` |
| `AC-86` Interactive analytics dashboard at `/reports` with KPI cards and breakdowns | Manual UI Check | UI | Browser verification at `/reports` | `verified` |

#### `F-09` Financial Report Export (CSV/JSON) (KaiDaoMuKrobb)
*Specification: `docs/sprints/sprint-3/F-09-financial-export.md` (Issue #49)*
| AC | Test ID | Level | Target Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| `AC-90` Export endpoint produces compliant CSV format with headers | `TEST-90` | API | `tests/api/reports-export.test.ts` | `specified` |
| `AC-91` Requester access refused with 403 FORBIDDEN (BR-10) | `TEST-91` | API | `tests/api/reports-export.test.ts` | `specified` |
| `AC-92` Date range filtering strictly scopes exported rows | `TEST-92` | API | `tests/api/reports-export.test.ts` | `specified` |
| `AC-93` Department query parameter limits export scope | `TEST-93` | API | `tests/api/reports-export.test.ts` | `specified` |
| `AC-94` CSV content escaping handles commas and quotes safely | `TEST-94` | API | `tests/api/reports-export.test.ts` | `specified` |
| `AC-95` Content-Disposition header specifies filename with timestamp | `TEST-95` | API | `tests/api/reports-export.test.ts` | `specified` |

#### `F-10` Responsive UI & Hardening (siripitch-c)
*Specification: `docs/sprints/sprint-3/F-10-responsive-hardening.md` (Issue #50)*
| AC | Test ID | Level | Target Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| `AC-100` Mobile viewport layout (375px) renders full workflow | Manual UI | UI | Chrome DevTools emulation | `specified` |
| `AC-101` Tablet viewport layout (768px) maintains readability | Manual UI | UI | Chrome DevTools emulation | `specified` |
| `AC-102` Double submission protection on review action buttons | `TEST-102` | UI | Component test (button disabled on click) | `specified` |
| `AC-103` Accessible color contrast across all status badges | Manual UI | UI | Axe-core accessibility scan | `specified` |
| `AC-104` Complete regression suite executes cleanly under CI | `TEST-104` | CI | GitHub Actions workflow | `specified` |

---

## 4. Verification Summary, Coverage & Explicit Gaps

### 4.1 Specification vs Verification Coverage

In accordance with Deliverable 2 §3.4 and §5, coverage distinguishes between **Specification Coverage** (requirements mapped to formal contracts) and **Execution Coverage** (requirements proven by executed, passing automated test suites).

| Category | Total Defined | Contract Specified | Executed & Verified | Specification Coverage | Execution Coverage |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Functional Requirements (FR)** | 10 | 10 | 9 (`FR-01` .. `FR-09`) | **100.0%** (10/10) | **90.0%** (9/10) |
| **Business Rules (BR)** | 11 | 11 | 10 (`BR-01` .. `BR-09`) | **100.0%** (11/11) | **90.9%** (10/11) |
| **Non-Functional Requirements (NFR)** | 5 | 5 | 4 (`NFR-01` .. `NFR-03`, `NFR-05`) | **100.0%** (5/5) | **80.0%** (4/5) |
| **System Responsibilities (SR)** | 5 | 5 | 5 (`SR-01` .. `SR-05`) | **100.0%** (5/5) | **100.0%** (5/5) |

### 4.2 Explicit Coverage Gaps & Deferred Verification

The following requirements have complete specifications committed in repository contracts, but their automated verification is deferred to upcoming sprint milestones:

| Requirement | Feature | Owner | Target Test Suite | Scheduled Milestone |
| :--- | :--- | :--- | :--- | :--- |
| `FR-10` Financial report export (CSV) | `F-09` | `KaiDaoMuKrobb` | `tests/api/reports-export.test.ts` (`TEST-90` .. `TEST-95`) | Sprint 3 Candidate |
| `BR-10` Financial export role restriction (Reviewer only) | `F-09` | `KaiDaoMuKrobb` | `tests/api/reports-export.test.ts` (`TEST-91`) | Sprint 3 Candidate |
| `NFR-04` Responsive layout (mobile/tablet/desktop) | `F-10` | `siripitch-c` | Chrome DevTools viewport audit (`AC-100` .. `AC-101`) | Sprint 3 Candidate |

---

## 5. Approved Scope & Architectural Changes (Change Register)

This register records every agreed scope modification, technical architectural decision, and defect correction throughout the project lifecycle.

| Date | ID | Category | Summary & Technical Rationale | Authority |
| :--- | :--- | :--- | :--- | :--- |
| 03 Nov 2026 | `DEC-07` | Scope Reduction | **Request Deletion Excluded from Scope:** Deleting requests removed from Sprint 1 scope. `BR-03` immutability is preserved via terminal state lifecycle. Eliminating the endpoint keeps rules falsifiable. | Team Agreement |
| 04 Nov 2026 | Realignment | Scope Clarification | **F-09 Formalized as Financial Report Export:** Aligned `F-09` with `FR-10` and `BR-10` from baseline SRS, replacing unnecessary department-scoped authorization. | Team Agreement |
| 03 Nov 2026 | `BR-04` | Validation Rule | **Mandatory Line Items:** Requests must contain at least one line item prior to submission, preventing zero-amount claims. | Team Agreement |
| 24 Nov 2026 | `DEC-02 v2.0` | Invariant Fix | **Refusal of Self-Assignment at Submission:** Submission with requester as assigned reviewer is refused with HTTP 400 `SELF_ASSIGNMENT`. Resolves Lab 6 UAT finding K-2 (orphan claim lock). | Approved by Course TA, Issue #39, PR #40, #42, #44 |
| 26 Nov 2026 | `DEF-01` | Controlled Defect | **Controlled Boundary Enforcement:** Line item amounts capped at 100,000.00 THB maximum boundary. Tested and proven via `TEST-11b`. | PR #38 |
| 27 Nov 2026 | `DEC-08` | Scope Revision | **BR-09 Dual Control Approval Threshold Calibration:** Calibrated high-value approval threshold to strictly `> 50,000.00 THB` (initial 10,000.00 THB was a Sprint 1 placeholder example). Ordinary operating expenditures (routine domestic travel, departmental supplies) routinely reach 10,000.00 to 50,000.00 THB; requiring dual executive approval for standard expenses creates an operational bottleneck without risk justification. Setting the threshold at `> 50,000.00 THB` enforces dual control for material non-routine expenditures while claims `<= 50,000.00 THB` complete review in a single stage. Status enum confirmed as `PENDING_SECOND_APPROVAL`. | Team Consultation, `docs/sprints/sprint-2/F-06-second-approval.md` |

---

## 6. Maintenance Protocol

1. **Atomic Commits:** Any change to requirements, business rules, or test specifications updates this file in the same pull request as the code or contract change.
2. **Result Synchronisation:** Test counts and pass statuses reflect full regression suite runs (`npm test`) on the latest candidate commit.
3. **Audit Trail:** Approved scope revisions, defect resolutions, and architectural decisions are logged in the project change register and reflected here without deleting prior history.
