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

### Status Vocabulary
| Status | Definition |
| :--- | :--- |
| `pass` / `verified` | Automated test suite or manual UI check executed and passing on candidate (100% green). |
| `specified` | Acceptance criteria (AC) and test specifications (STS) fully defined in committed engineering contracts. |
| `in-progress` | Implementation or code review currently active on a dedicated feature branch. |
| `planned` | Allocated to a sprint; criteria and schema will be elaborated as that increment starts. |

---

## 2. Requirement -> Feature -> Sprint -> Verification

### 2.1 Functional Requirements

| Requirement | Feature | Sprint | Acceptance Criteria | Tests | Status |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `FR-01` Sign in and sign out | `F-01` | 1 | `AC-01` .. `AC-04` | `TEST-01` .. `TEST-04` | `pass` - 87/87 on `npm test` (PR #6) |
| `FR-02` Create request with line items | `F-02` | 1 | `AC-10` .. `AC-13` | `TEST-10` .. `TEST-19` | `pass` - 87/87 on `npm test` (PR #8) |
| `FR-03` Submit to named reviewer | `F-02` | 1 | `AC-16` .. `AC-18`, `AC-18b` .. `AC-18e` | `TEST-16` .. `TEST-19`, `TEST-18d` | `pass` - 87/87 on `npm test`; updated under `DEC-02 v2.0` (400 `SELF_ASSIGNMENT`, PR #42, #44) |
| `FR-04` Reviewer sees assigned requests | `F-03` | 1 | `AC-20` .. `AC-24`, `AC-28` .. `AC-28g` | `TEST-20` .. `TEST-24`, `TEST-28` .. `TEST-28g` | `pass` - 87/87 on `npm test` (PR #11) |
| `FR-05` Approve or reject with reason | `F-04` | 1 | `AC-30`, `AC-36` | `TEST-30` .. `TEST-30c`, `TEST-36`, `TEST-E2E-02` | `pass` - 87/87 on `npm test`; reason mandatory for both outcomes (PR #14) |
| `FR-06` Return and resubmission workflow | `F-05` | 2 | `AC-50` .. `AC-55` | `TEST-50` .. `TEST-55` | `specified` - Contract defined; implementation in progress (Issue #45) |
| `FR-07` Second stage approval for high amounts | `F-06` | 2 | `AC-60` .. `AC-65` | `TEST-60` .. `TEST-65` | `specified` - Threshold agreed at 50,000.00 THB; dual control logic |
| `FR-08` Multi-criteria search, filter, and pagination | `F-07` | 2 | `AC-70` .. `AC-77` | `TEST-70` .. `TEST-76b`, `TEST-78`, `TEST-79` | `pass` - 10/10 tests pass; UI filters verified (PR #41, #44) |
| `FR-09` Department expense summaries and analytics | `F-08` | 3 | `AC-80` .. `AC-86` | `TEST-80` .. `TEST-85` | `pass` - 6/6 tests pass; interactive UI dashboard at `/reports` (PR #46) |
| `FR-10` Financial report export (CSV/JSON) | `F-09` | 3 | `AC-90` .. `AC-95` | `TEST-90` .. `TEST-95` | `specified` - Contract committed in `docs/sprints/sprint-3/F-09-financial-export.md` |

### 2.2 Business Rules

| Rule | Feature | Sprint | Acceptance Criteria | Tests | Status |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `BR-01` No self-approval | `F-04` | 1 | `AC-31`, `AC-38` | `TEST-31`, `TEST-38`, `TEST-39c` | `pass` - 403 `SELF_APPROVAL` enforced |
| `BR-02` Valid state transitions only | `F-04` | 1 | `AC-32` | `TEST-32`, `TEST-32b`, `TEST-39e`, `TEST-39f` | `pass` - Terminal states immutable |
| `BR-03` Immutable after submission | `F-02` | 1 | `AC-15` | `TEST-15` | `pass` - Edits refused once submitted |
| `BR-04` Line item and total validation | `F-02` | 1 | `AC-11`, `AC-12` | `TEST-11`, `TEST-12` | `pass` - Line item <= 100,000 THB boundary |
| `BR-05` Access isolation (read) | `F-03` | 1 | `AC-21`, `AC-26`, `AC-27`, `AC-34` | `TEST-21`, `TEST-26`, `TEST-27`, `TEST-34` | `pass` - 404 zero-knowledge privacy |
| `BR-05` Access isolation (decide) | `F-04` | 1 | `AC-33` | `TEST-33`, `TEST-33b`, `TEST-39d` | `pass` - 403 assigned reviewer only |
| `BR-06` Sequential request numbering | `F-02` | 1 | `AC-10` | `TEST-10`, `TEST-10b` | `pass` - Prefix EXP-YYYYMM-XXXX |
| `BR-07` Return requires explanatory reason | `F-05` | 2 | `AC-51` | `TEST-51` | `specified` - Min 5 characters trimmed |
| `BR-08` Return access isolation | `F-05` | 2 | `AC-53` | `TEST-53` | `specified` - Only assigned reviewer can return |
| `BR-09` Dual control threshold (> 50,000 THB) | `F-06` | 2 | `AC-61`, `AC-62` | `TEST-61`, `TEST-62` | `specified` - Stage 1 to Stage 2 transition |
| `BR-10` Financial export role restriction | `F-09` | 3 | `AC-91` | `TEST-91` | `specified` - Reviewer/Admin only; 403 on requester |

### 2.3 Non-Functional Requirements & Cross-Cutting Responsibilities

| Requirement | Scope | Sprint | Acceptance Criteria | Verification Method | Status |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `NFR-01` Passwords hashed with bcrypt | `F-01` | 1 | `AC-01` .. `AC-04` | Automated test asserts `$2a$` or `$2b$` prefix | `pass` - 87/87 on `npm test` |
| `NFR-02` Unauthenticated access refused | `SR-01` | 1 | `AC-23`, `AC-37`, `AC-80` | Automated tests verify 401 on protected routes | `pass` - 87/87 on `npm test` |
| `NFR-03` List endpoints respond under 500ms | `F-03`, `F-07` | 1, 2 | `AC-29`, `AC-76b` | Vitest timer assertions against seeded DB | `pass` - 87/87 on `npm test` |
| `NFR-04` Responsive layout (mobile/tablet/desktop) | `F-10` | 3 | `AC-104` | Tailwind viewport checks (375px, 768px, 1280px) | `specified` |
| `NFR-05` Sub-second aggregated analytics | `F-08` | 3 | `AC-86` | Vitest API execution time measured at 227ms | `pass` - Execution well within 1.0s |
| `SR-01` Auth check order (401 -> 404 -> 403 -> 400) | Core | 1 | `AC-38` | Proven by `TEST-38`, `TEST-33b`, `TEST-34b` | `pass` - Universal guard ordering |
| `SR-02` Standard error envelope | Core | 1 | All negative AC | `{ success: false, error: { message, code } }` | `pass` - Universal error schema |
| `SR-03` Append-only audit history | Core | 1 | `AC-30`, `AC-36` | `ApprovalHistory` rows created, never deleted | `pass` - Audit trail integrity |
| `SR-04` Monetary precision (`Decimal(12,2)`) | Core | 1 | `TEST-12`, `TEST-20b` | Prisma Decimal mapping; no float inaccuracy | `pass` - Accurate money calculations |

---

## 3. Detailed Acceptance Criteria to Test Mappings

### 3.1 Sprint 1 Features

#### `F-01` Authentication & Session Management (KaiDaoMuKrobb)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-01` .. `AC-04` | `TEST-01` .. `TEST-04` | API, Unit | `tests/api/auth.test.ts`, `tests/unit/auth.test.ts` | `pass` - 87/87 on `npm test` |

#### `F-02` Expense Request & Line Items (KaiDaoMuKrobb)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-10` .. `AC-19` | `TEST-10` .. `TEST-19`, `TEST-10b` | API | `tests/api/request-crud.test.ts` | `pass` - 87/87 on `npm test` |
| `AC-18` (revised), `AC-18d` | `TEST-18`, `TEST-18d` | API | `tests/api/request-crud.test.ts` | `pass` - 400 `SELF_ASSIGNMENT` under DEC-02 v2.0 |
| `AC-18e` | Manual UI Check | UI | Reviewer dropdown omits signed-in reviewer | `pass` - Verified in production bundle |
| `AC-10` .. `AC-19` | `TEST-E2E-01` | E2E | `tests/e2e/requester-journey.spec.ts` | `pass` - Playwright verified (19.1s) |

#### `F-03` Reviewer Dashboard & Assigned View (siripitch-c)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-20` .. `AC-24` | `TEST-20` .. `TEST-24` | API | `tests/api/requests-list.test.ts`, `requests-detail.test.ts` | `pass` - 87/87 on `npm test` |
| `AC-25` .. `AC-27` | `TEST-25` .. `TEST-27` | API | `tests/api/requests-detail.test.ts` | `pass` - Read isolation verified |
| `AC-28` .. `AC-28c` | `TEST-28` .. `TEST-28c` | UI | `tests/unit/dashboard-empty.test.tsx` | `pass` - Empty states verified |
| `FR-04` Queue filter | `TEST-28d` .. `TEST-28g` | Unit | `tests/unit/review-queue.test.ts` | `pass` - Status queue filter |
| `AC-29` Performance | `TEST-29` | API | `tests/api/requests-list.test.ts` | `pass` - Sub-500ms execution |

#### `F-04` Approval Workflow & Business Rule Guards (siripitch-c)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-30`, `AC-36` | `TEST-30`, `TEST-30b`, `TEST-36` | API | `tests/api/review-success.test.ts` | `pass` - Approve/reject with reason |
| `AC-31`, `AC-38` | `TEST-31`, `TEST-38` | API | `tests/api/review-guards.test.ts` | `pass` - Guard order & no self-approval |
| `AC-32`, `AC-33` | `TEST-32`, `TEST-33`, `TEST-33b` | API | `tests/api/review-guards.test.ts` | `pass` - State transition & isolation |
| `AC-34`, `AC-37` | `TEST-34`, `TEST-37`, `TEST-37b` | API | `tests/api/review-guards.test.ts` | `pass` - 404 and 401 error guards |
| `AC-39` .. `AC-39g` | `TEST-39` .. `TEST-39g` | UI | `tests/unit/review-buttons.test.tsx` | `pass` - Decision button interactions |
| `AC-30`, `AC-39` | `TEST-E2E-02` | E2E | `tests/e2e/approval-journey.spec.ts` | `pass` - Playwright verified (6.5s) |

---

### 3.2 Sprint 2 Features

#### `F-07` Multi-Criteria Search, Filter & Pagination (KaiDaoMuKrobb)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-70` | `TEST-70` | API | `tests/api/requests-search-filter.test.ts` | `pass` - Text search by request number or title |
| `AC-71` | `TEST-71` | API | `tests/api/requests-search-filter.test.ts` | `pass` - Status filter validation |
| `AC-72` | `TEST-72` | API | `tests/api/requests-search-filter.test.ts` | `pass` - Category filter across line items |
| `AC-73` | `TEST-73` | API | `tests/api/requests-search-filter.test.ts` | `pass` - Date range boundary filtering |
| `AC-74` | `TEST-74` | API | `tests/api/requests-search-filter.test.ts` | `pass` - Department filter on reviewer queue |
| `AC-75` | `TEST-75` | API | `tests/api/requests-search-filter.test.ts` | `pass` - Multi-criteria combined query |
| `AC-76` | `TEST-76` | API | `tests/api/requests-search-filter.test.ts` | `pass` - Pagination metadata & slicing |
| `AC-76b` | `TEST-76b` | API | `tests/api/requests-search-filter.test.ts` | `pass` - Sub-500ms response time |
| `AC-77` | Manual UI Check | UI | Interactive search bar and filter badges on `/requests` & `/reviewer/dashboard` | `pass` - Released on main candidate |

---

### 3.3 Sprint 3 Features (Tested Progress)

#### `F-08` Department Expense Summaries & Analytics (KaiDaoMuKrobb)
| AC | Test ID | Level | Test File | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-80` | `TEST-80` | API | `tests/api/reports.test.ts` | `pass` - 401 `UNAUTHENTICATED` when session cookie is absent |
| `AC-81` | `TEST-81` | API | `tests/api/reports.test.ts` | `pass` - 403 `FORBIDDEN` when caller is standard `REQUESTER` |
| `AC-82` | `TEST-82` | API | `tests/api/reports.test.ts` | `pass` - 200 OK with summary payload for `REVIEWER` |
| `AC-83` | `TEST-83` | API | `tests/api/reports.test.ts` | `pass` - Authoritative metrics from `APPROVED` claims only |
| `AC-84` | `TEST-84` | API | `tests/api/reports.test.ts` | `pass` - Department grouping and amount sorting |
| `AC-85` | `TEST-85` | API | `tests/api/reports.test.ts` | `pass` - Category totals with percentage calculation summing to 100% |
| `AC-86` | Manual UI Check | UI | Interactive dashboard at `/reports` with KPI cards, progress bars, and history table | `pass` - Verified in browser and component build |

---

## 4. Coverage Summary and Explicit Gaps

All baseline functional requirements, business rules, and non-functional requirements are mapped to features. No requirement is unallocated.

| Category | Total Defined | Verified / Passing | Specified in Contract | Planned | Coverage Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Functional Requirements (FR)** | 10 | 7 (`FR-01` .. `FR-05`, `FR-08`, `FR-09`) | 3 (`FR-06`, `FR-07`, `FR-10`) | 0 | **100%** |
| **Business Rules (BR)** | 11 | 7 (`BR-01` .. `BR-06`) | 4 (`BR-07` .. `BR-10`) | 0 | **100%** |
| **Non-Functional Requirements (NFR)** | 5 | 4 (`NFR-01` .. `NFR-03`, `NFR-05`) | 1 (`NFR-04`) | 0 | **100%** |
| **System Responsibilities (SR)** | 5 | 5 (`SR-01` .. `SR-05`) | 0 | 0 | **100%** |

### Explicit Checkpoint Gaps (Actions Scheduled for 30 Nov - 13 Dec 2026)
1. **`F-05` Return and Resubmission:** Contract completed; backend implementation and PR review underway by Siripitch.
2. **`F-06` Second Approval Stage:** Threshold confirmed at 50,000.00 THB; Prisma migration and dual approval handlers scheduled for Sprint 2 release candidate.
3. **`F-09` Financial Report Export:** Contract completed; CSV generation utility and date bounds filter to be implemented in Sprint 3.
4. **`F-10` Hardening & Regression:** Contract completed; responsive viewport checks and duplicate submission protection scheduled for final hardening sprint.

---

## 5. Maintenance Protocol

1. **Atomic Commits:** Any change to requirements, business rules, or test specifications updates this file in the same pull request as the code or contract change.
2. **Result Synchronisation:** Test counts and pass statuses reflect full regression suite runs (`npm test`) on the latest candidate commit.
3. **Audit Trail:** Approved scope revisions, defect resolutions, and architectural decisions are logged in the project change register and reflected here without deleting prior history.
