# Part A.3: Contract Revisions & Pre-Implementation Teammate Review

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  
> **PR Reference:** [PR #40](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/pull/40)  

---

## 1. Contract Specification Revisions (Before vs. After)

### 1.1 Decision Record (`DEC-02`) in `docs/srs.md`

#### Sprint 1 Version (`DEC-02 v1.0` &mdash; Baseline `3cd8c45`):
```markdown
### DEC-02: Self-Assignment at Submit Boundary
Allow self-assignment at submit, but enforce rejection with 403 Forbidden at review boundary.
Alternative considered: block self-selection at submit time (400).
Rationale: blocking at submit prevents creating a testable state where requesterId == assignedReviewerId.
```

#### Lab 7 Revised Version (`DEC-02 v2.0` &mdash; Contract Commit `00082be`):
```markdown
### DEC-02: Self-Assignment Refusal at Submit Boundary (Revised for Lab 7)
Refuse self-assignment at submit time with HTTP 400 Bad Request and error code `SELF_ASSIGNMENT`.
The create/submit form filters the signed-in user out of the reviewer selection dropdown and displays
an informative notice (`AC-18e`). The review boundary guard `BR-01` (403 Forbidden) is retained as
a second defensive layer.
Rationale: Resolves independent UAT defect K-2 where self-assigned claims became permanently stuck
in SUBMITTED status without a resolution path. Test fixtures for BR-01 are constructed directly via
Prisma, rendering the original Sprint 1 rationale obsolete.
```

---

### 1.2 Acceptance Criteria in `docs/sprints/sprint-1/F-02-request-crud.md`

#### Original Acceptance Criterion:
```markdown
- **`AC-18` (Submit with Self-Assignment, Sprint 1)**
  *Given* an authenticated user holding both REQUESTER and REVIEWER roles with a DRAFT request
  *When* the user submits the request specifying their own user ID as `assignedReviewerId`
  *Then* the server accepts the submission with HTTP 200 OK and status transitions to `SUBMITTED`.
  Enforcement is deferred to `BR-01` upon review attempt.
```

#### Revised Acceptance Criteria:
```markdown
- **`AC-18` (Self-Assignment Refusal, Lab 7 Revision)**
  *Given* an authenticated owner with a DRAFT request containing at least one item
  *When* `POST /api/requests/:id/submit` specifies the caller's own ID as `assignedReviewerId`
  *Then* the server refuses with HTTP 400 Bad Request and error code `SELF_ASSIGNMENT`,
  the claim remains in `DRAFT`, and zero `ApprovalHistory` rows are created.

- **`AC-18d` (Normal Submission Unaffected)**
  *Given* the same DRAFT request
  *When* `POST /api/requests/:id/submit` specifies another valid account with role `REVIEWER`
  *Then* submission succeeds with HTTP 200 OK and status transitions to `SUBMITTED`.

- **`AC-18e` (Form Prevents Selection & Explains)**
  *Given* an authenticated user on the request creation screen
  *When* the user holds the `REVIEWER` role
  *Then* their own account is omitted from the reviewer dropdown, and a clear visual notice states:
  *"You are signed in as a reviewer. Self-assignment is prohibited (DEC-02)."*
```

---

## 2. Pre-Implementation Teammate Review (PR #40)

To fulfill the rigorous course requirement that *"The impact analysis, revised contract and review precede implementation in recorded history"*, Siripitch authored the contract and specification changes in branch `docs/lab7-dec02-contract` and submitted Pull Request #40 to `staging`.

Pattarawadee Thanapoomthakul (@KaiDaoMuKrobb) formally conducted the peer review and approved the PR before any implementation code was written.

### 2.1 Pull Request #40 Details
- **Title:** `docs: revise DEC-02 to refuse self-assignment at submit (#39)`
- **Author:** Siripitch Chaiyabutra (@siripitch-c)
- **Reviewer:** Pattarawadee Thanapoomthakul (@KaiDaoMuKrobb)
- **Source Branch:** `docs/lab7-dec02-contract` (Commit `00082be`)
- **Target Branch:** `staging`
- **Merged At:** 25 November 2026, 17:41 UTC (00:41 ICT) via Merge Commit `8fb15b3`

### 2.2 Verifiable Sequence in Git History

```
Commit 00082be : docs: revise DEC-02 to refuse self-assignment at submit (#39)
       │
       ▼
Commit 8fb15b3 : Merge pull request #40 into staging (Contract Officially Approved)
       │
       ▼ [Implementation Begins]
Commit 3975dc5 : test: assert self-assignment refusal at submit (#39) [RED Phase]
       │
       ▼
Commit 6ab7290 : feat(submit): refuse self-assignment under DEC-02 v2.0 (#39) [GREEN Phase]
```

This sequence objectively proves in recorded Git history that the engineering specification was revised, reviewed, and merged **prior** to the start of TDD test writing and implementation code.
