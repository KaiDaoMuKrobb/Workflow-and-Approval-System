# ExpenseFlow: Deliverable 2 Work Plan & Execution Roadmap

> **CPE 334 Software Engineering (Semester 1/2026, Section 31)**  
> **Team ID:** EN-011 (Theme 5: Workflow and Approval System)  
> **Deliverable 2 Due Date:** 29 November 2026 at 23:59 ICT (70 points / 7% of course grade)  
> **Final Product Delivery Due Date:** 13 December 2026  
> **Authors:**  
> - Pattarawadee Thanapoomthakul (67070503435, @KaiDaoMuKrobb) - Student A  
> - Siripitch Chaiyabutra (67070503440, @siripitch-c) - Student B  
> **Repository:** https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System  

---

## 1. Executive Summary & Goals

Deliverable 2 evaluates team discipline across Sprint 2 completion, genuine Sprint 3 progress, and a deployed, integrated release candidate on Google Cloud Run. This work plan coordinates our remaining tasks over the final 3 days (27 to 29 November 2026) so we hit all rubric requirements without last minute rushes.

### Rubric Breakdown (70 Points Total)
| Part | Title | Points | Key Deliverables & Evidence |
| :--- | :--- | :---: | :--- |
| **Part A** | Sprint 1 Continuity & Change Status | 5 | Sprint 1 journey verification on candidate, Change/Defect Register (K-2, DEF-CONTROLLED, DEC-02 v2.0). |
| **Part B** | Sprint 2 Contracts & Working Increment | 25 | Contracts, AC, STS, and working code for F-05, F-06, F-07. Completion table, TDD logs, peer reviews. |
| **Part C** | Sprint 3 Contracts & Working Progress | 15 | Contracts for F-08, F-09, F-10. Working implementation and passing tests for F-08. Remaining-work table. |
| **Part D** | Updated Requirements & Traceability | 10 | Updated SRS, feature inventory, SDS, and complete Requirements-to-Test Traceability Matrix. |
| **Part E** | Integrated Release Candidate | 15 | Deployed candidate on GCP (Cloud Run), build/regression/smoke outputs, post-deploy checks, completion plan for 13 Dec. |

---

## 2. Current Baseline & Status (As of 26 Nov 2026, 23:30 ICT)

1. **Sprint 1 Baseline:**
   - Commit `3cd8c45` (Tag `v0.1.0`) accepted and verified.
2. **Maintenance Baseline (Lab 7):**
   - Approved `DEC-02 v2.0` (self-assignment refusal) merged into `main` via PR #44 at commit `918c02a` (Tag `v0.2.0`).
   - Active Cloud Run revision: `expenseflow-00008-lxv` (100% healthy, 5 post-deployment checks verified).
3. **Sprint 2 Features Status:**
   - `F-07` (Search, Filter, Paging): **DONE & MERGED** into staging (PR #41, 10 tests, UI evidence ready).
   - `F-05` (Return & Resubmission): Contract and implementation pending.
   - `F-06` (Second Approval Stage): Threshold decision agreed (50,000.00 THB), contract, migration, and implementation pending.
4. **Sprint 3 Features Status:**
   - `F-08` (Department Summaries & Analytics): Contract and working progress pending.
   - `F-09` (Financial Export): Contract pending.
   - `F-10` (Hardening & Regression): Contract pending.

---

## 3. Team Responsibilities & Ownership Split

To eliminate merge conflicts and enable parallel progress, our work strictly isolates files and responsibilities:

| Feature / Responsibility | Owner | Reviewer | Target File Paths & Scope |
| :--- | :--- | :--- | :--- |
| **F-05: Return and Resubmission** | **Siripitch** | Pattarawadee | Contract: `docs/sprints/sprint-2/F-05-return-resubmission.md`<br>Code: `src/app/api/requests/[id]/return/route.ts`, review action `RETURN`, edit on `RETURNED` status. |
| **F-06: Second Approval Stage** | **Siripitch** | Pattarawadee | Contract: `docs/sprints/sprint-2/F-06-second-approval.md`<br>Schema: Prisma migration for second reviewer field, threshold logic (> 50,000 THB). |
| **F-07: Search, Filter & Paging** | **Pattarawadee** | Siripitch | Contract: `docs/sprints/sprint-2/F-07-search-filter.md`<br>Status: Already merged in PR #41. |
| **F-08: Department Analytics (Sprint 3 Progress)** | **Pattarawadee** | Siripitch | Contract: `docs/sprints/sprint-3/F-08-department-analytics.md`<br>Code: `src/app/api/reports/summary/route.ts`, tests in `tests/api/reports.test.ts`. |
| **F-09: Financial Export (Sprint 3 Contract)** | **Pattarawadee** | Siripitch | Contract: `docs/sprints/sprint-3/F-09-financial-export.md` (Specification, AC, STS, error codes). |
| **F-10: Hardening (Sprint 3 Contract)** | **Siripitch** | Pattarawadee | Contract: `docs/sprints/sprint-3/F-10-hardening-regression.md` (Specification, AC, STS, error boundaries). |
| **Part D: SRS, SDS & Traceability Matrix** | **Pattarawadee** | Siripitch | Update `docs/srs.md`, `docs/system-sds.md`, `docs/traceability.md`. |
| **Part E: Release Candidate & Deployment** | **Both** | Both | PR staging to main, tag `v0.3.0`, Cloud Run deploy, smoke tests, post-deployment checks. |
| **Deliverable 2 Master Report (PDF)** | **Both** | Both | Compile single self-contained PDF, humanized text, zero em-dash, submit to LEB2. |

---

## 4. Detailed 3-Day Execution Timeline (27 to 29 November 2026)

```
[27 Nov Morning] -> Contracts committed (F-05, F-06 by Siripitch; F-08, F-09, F-10 by Pattarawadee)
[27 Nov Afternoon/Night] -> F-05 implementation & review (PR) + F-08 API implementation & tests (PR)
[28 Nov Morning] -> F-06 implementation & Prisma migration (PR)
[28 Nov Afternoon] -> Full regression run on staging -> PR staging to main (Release Candidate v0.3.0)
[28 Nov Night] -> Cloud Run deployment verification & live smoke testing
[29 Nov Morning/Afternoon] -> Traceability Matrix update (Part D) & Report assembly (Parts A to E)
[29 Nov Evening] -> Word to PDF export, final audit against rubric, submit to LEB2 before 23:59 ICT
```

### Day 1: Friday, 27 November 2026 (Contracts & Core Work)

#### Morning (09:00 to 12:00 ICT): Contract Commit Phase (Mandatory Before Implementation)
- **Siripitch:**
  - Write and commit `docs/sprints/sprint-2/F-05-return-resubmission.md` (FR-06, BR-07, BR-08, AC-50 to AC-55, STS-50 to STS-55).
  - Write and commit `docs/sprints/sprint-2/F-06-second-approval.md` (FR-07, BR-09 with 50,000 THB threshold, AC-60 to AC-65, STS-60 to STS-65).
- **Pattarawadee:**
  - Write and commit `docs/sprints/sprint-3/F-08-department-analytics.md` (FR-09, AC-80 to AC-85, STS-80 to STS-85).
  - Write and commit `docs/sprints/sprint-3/F-09-financial-export.md` (FR-10, BR-10, AC-90 to AC-95, STS-90 to STS-95).
  - Write and commit `docs/sprints/sprint-3/F-10-hardening-regression.md` (NFR-01 to NFR-03, AC-100 to AC-105, STS-100 to STS-105).
- **Milestone:** All 5 new contract files committed to Git before any implementation code.

#### Afternoon & Evening (13:00 to 22:00 ICT): Parallel Implementation Phase
- **Siripitch (F-05 implementation):**
  - TDD Red phase: write test in `tests/api/request-lifecycle.test.ts` asserting return transition and reason.
  - Green phase: implement POST `/api/requests/:id/return` or update review route, allow updates on `RETURNED` status in PUT `/api/requests/:id`, write ApprovalHistory record.
  - Open PR for F-05 to `staging`. Pattarawadee reviews and approves.
- **Pattarawadee (F-08 implementation as Sprint 3 progress):**
  - TDD Red phase: write `tests/api/reports.test.ts` asserting aggregated department totals and category distribution.
  - Green phase: create `src/app/api/reports/summary/route.ts` with direct Prisma query against approved claims.
  - Open PR for F-08 to `staging`. Siripitch reviews and approves.

---

### Day 2: Saturday, 28 November 2026 (F-06, Migration & Release Candidate)

#### Morning & Early Afternoon (09:00 to 14:00 ICT): F-06 Implementation & Database Migration
- **Siripitch:**
  - Update `prisma/schema.prisma`: add `secondReviewerId String?` and stage tracking on `ExpenseRequest`.
  - Run `npx prisma migrate dev --name add_second_approval_stage`.
  - Implement two-stage approval logic: claims > 50,000 THB transition to `PENDING_SECOND_APPROVAL` on first approval, and to `APPROVED` only after distinct second reviewer approves. Enforce self-approval prevention (neither reviewer can be requester, reviewer 2 cannot be reviewer 1).
  - Write automated tests covering boundary: 50,000.00 THB (single approval) vs 50,000.01 THB (two-stage approval required).
  - Open PR for F-06 to `staging`. Pattarawadee reviews and approves.

#### Late Afternoon (14:00 to 18:00 ICT): Full Staging Integration & Release Candidate PR
- Run full test suite: `npm test` (all unit and API tests across all features). Target: 90+ tests passing, zero failures.
- Run typecheck and linting: `npm run lint` and `npx tsc --noEmit`.
- Open Release Candidate PR: `staging` -> `main` (PR titled `Release v0.3.0: Deliverable 2 Release Candidate`).
- Formally review, approve, and merge PR. Create immutable tag: `git tag v0.3.0` and push to origin.

#### Night (18:00 to 22:00 ICT): GCP Deployment & Verification
- Monitor GitHub Actions workflow `deploy.yml`: container build, Cloud SQL migration execution, Cloud Run deployment.
- Record deployed Cloud Run revision ID and deployment run ID.
- Perform live verification on deployed URL:
  1. Original Sprint 1 critical journey (login, create draft, submit, reviewer approve).
  2. F-05 Return and Resubmission live flow.
  3. F-06 Second approval stage for claim > 50,000 THB.
  4. F-07 Search, filtering, and pagination controls.
  5. F-08 Department analytics API response.
- Capture DevTools Network and Console screenshots for report evidence.

---

### Day 3: Sunday, 29 November 2026 (Documentation, Audit & LEB2 Submission)

#### Morning & Afternoon (09:00 to 17:00 ICT): Report Assembly (Deliverable 2 PDF)
- **Part A:** Detail Sprint 1 continuity test results, Change/Defect Register table (K-2 UAT finding, DEF-CONTROLLED boundary fix, DEC-02 v2.0 self-assignment rule).
- **Part B:** Feature completion tables for F-05, F-06, F-07, with linked AC, actual test outputs, commit IDs, and UI screenshots.
- **Part C:** Full Sprint 3 contracts (F-08, F-09, F-10), evidence of working F-08 progress, and the exact Remaining Work Plan for 13 December.
- **Part D:** Complete Requirements Traceability Matrix mapping every FR, BR, and NFR to actual test files, lines, and pass status. Updated SRS and SDS excerpts.
- **Part E:** Integrated candidate verification, Cloud Run deployment proof, Docker and setup summary, and dated readiness review.

#### Evening (17:00 to 22:00 ICT): Final Audit & Submission
- Export report from Word to PDF (`final-submissions/deliverable2_sec31_expenseflow.pdf`).
- Verify submission checklist:
  - Total 70 points covered across Parts A, B, C, D, E.
  - Page-based contents navigation table at the beginning.
  - Zero em-dashes (` - `) in text; natural humanized tone.
  - No production secrets or plain passwords in screenshots or tables.
  - Git repository and Cloud Run live URL matching and fully accessible.
- Submit single self-contained PDF to LEB2 before 23:59 ICT.

---

## 5. Specification of Core Features

### 5.1 F-05: Return and Resubmission (Sprint 2 Core)
- **User Story:** As a reviewer, I want to return a claim with questions or requested corrections, so the requester can update it without starting from scratch.
- **Requirements:** `FR-06`, `BR-07`, `BR-08`.
- **Key Invariants:**
  1. Only a designated reviewer can return a `SUBMITTED` claim (`BR-05`).
  2. Return action requires a non-empty `returnReason` string (minimum 5 characters, trimmed).
  3. Status transitions from `SUBMITTED` to `RETURNED`.
  4. Only the original owner can edit a `RETURNED` claim.
  5. Editing recalculates total amount, replaces line items, and keeps status `RETURNED`.
  6. Resubmitting transitions status back to `SUBMITTED`, logs an ApprovalHistory audit record, and reapplies `DEC-02 v2.0` (cannot self-assign).

### 5.2 F-06: Second Stage Approval for High Amounts (Sprint 2 Core)
- **User Story:** As an organization, expense claims exceeding 50,000.00 THB must be approved by two distinct managers to prevent fraud and enforce dual control.
- **Requirements:** `FR-07`, `BR-09`.
- **Design Decision:** Threshold set at **`50,000.00 THB`**.
- **Key Invariants:**
  1. Claims $\le$ 50,000.00 THB: Single approval moves claim directly to `APPROVED`.
  2. Claims > 50,000.00 THB:
     - First approval moves claim to `PENDING_SECOND_APPROVAL`.
     - Second approval by a different reviewer moves claim to `APPROVED`.
  3. Rejection at either stage moves claim immediately to `REJECTED`.
  4. Separation of Duties:
     - Reviewer 1 cannot be the Requester (`BR-01`).
     - Reviewer 2 cannot be the Requester (`BR-01`).
     - Reviewer 2 cannot be Reviewer 1 (dual approval must involve two distinct individuals).
  5. Re-assignment or selection of Reviewer 2 happens when transitioning to Stage 2.

### 5.3 F-08: Department Expense Analytics (Sprint 3 Tested Progress)
- **User Story:** As a manager or executive, I want to see aggregated expense totals by department and monthly category distributions to monitor organizational spend.
- **Requirements:** `FR-09`.
- **Key Invariants:**
  1. Authoritative query: metrics are calculated dynamically from database rows with status `APPROVED`.
  2. Output format: JSON payload at `GET /api/reports/summary`.
  3. Structure:
     - `byDepartment`: array of `{ department, totalAmount, claimCount }`.
     - `byCategory`: array of `{ category, totalAmount, percentage }`.
     - `monthlyTotals`: array of `{ month, year, totalAmount }`.
  4. Access: restricted to authenticated users with `REVIEWER` or `ADMIN` role.

---

## 6. Remaining Work Plan for Final Delivery (30 Nov to 13 Dec 2026)

This table satisfies Deliverable 2 Part C and Part E requirements by outlining the exact path to product completion by 13 December 2026:

| Feature / Defect ID | Current Status at Checkpoint | Remaining Actions to Complete | Owner | Planned Target Date |
| :--- | :--- | :--- | :--- | :--- |
| **F-05** (Return & Resubmit) | Implemented & tested on main candidate | End-to-end browser regression, UI polish on return modal | Siripitch | 04 Dec 2026 |
| **F-06** (Dual Stage Approval) | Implemented & tested on main candidate | Add reviewer 2 email notification trigger and multi-role dashboard filter | Siripitch | 05 Dec 2026 |
| **F-07** (Search & Filter) | Implemented & tested on main candidate | Export filtered search results directly to CSV view | Pattarawadee | 06 Dec 2026 |
| **F-08** (Department Analytics) | Core summary API tested and integrated | Visual charting UI in dashboard using client-side SVG/bars | Pattarawadee | 07 Dec 2026 |
| **F-09** (Financial Export) | Contract defined in Deliverable 2 | Implement CSV/JSON streaming export endpoint with reviewer auth guard | Pattarawadee | 08 Dec 2026 |
| **F-10** (Hardening & Regression) | Contract defined in Deliverable 2 | Add Playwright CI browser tests, debounce double-clicks, accessibility sweep | Siripitch | 10 Dec 2026 |
| **TD-01 to TD-05** (Technical Debt) | Cataloged in Lab 7 | Resolve legacy inconsistent records (TD-05), optimize submit queries (TD-02) | Both | 11 Dec 2026 |
| **Final Video & Submission** | Planning stage | Record 5-minute narrated demo video, verify final release tag v1.0.0, submit Final Report | Both | 12 to 13 Dec 2026 |

---

## 7. Quality Rules & Collaboration Agreement

1. **No Self-Merges:** Every Pull Request must be reviewed and merged by the peer engineer.
2. **Contract First Discipline:** Contracts (`docs/sprints/...`) must be committed to Git prior to any implementation commits.
3. **Deterministic Guard Order:** Maintain fail-fast ordering in API routes (`401` -> `404` -> `400 Immutable` -> `400 Validation` -> `400 Business Guard` -> `200 Success`).
4. **Style & Tone Rule:** All reports and documentation must be written in a natural, humanized tone with **zero em-dashes (` - `)**. Use colons, hyphens (` - `), commas, or parentheses instead.
5. **Security & Secrets:** Never commit real secrets, private keys, or actual user passwords to Git or report screenshots. Always use synthetic seeded accounts (`alice.req@test.com`, `carol.mgr@test.com`, `david.both@test.com`).
