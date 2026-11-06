# Feature Inventory

> **Deliverable 1 — Part B** · Owner: **siripitch-c**
> Repository path: `docs/features.md`
> Product: ExpenseFlow — Corporate Expense Reimbursement System (Theme 5, Workflow and Approval)
>
> Companion document: `docs/traceability.md` maps every requirement to the feature that delivers it and the
> tests that verify it. This file defines the features themselves.

---

## 0. Team

| GitHub | Name | Student ID |
| :--- | :--- | :--- |
| `KaiDaoMuKrobb` | Pattarawadee Thanapoomthakul | 67070503435 |
| `siripitch-c` | Siripitch Chaiyabutra | 67070503440 |

Ownership below is recorded by GitHub handle so it matches the author and reviewer names on every commit,
Pull Request and Issue without needing a second document to decode it.

---

## 1. How to read this file

A **feature** is a bounded unit of work with one owner, one branch and one engineering contract. Features
are numbered `F-01` upward and the number never changes once allocated.

A **system responsibility** is behaviour that no single feature owns because it applies everywhere —
authorization ordering, the error envelope, the audit trail. These are listed in §3 and each names the
feature that establishes it and the sprint in which it is verified.

---

## 2. Feature inventory

### Sprint 1 — delivered for Deliverable 1

| ID | Title | What it delivers | Requirements | Depends on | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `F-01` | Authentication and session | Sign in, sign out, current user. Passwords hashed with bcrypt. Session carried in an `HttpOnly` cookie. Seed accounts and the first migration | `FR-01`, `NFR-01`, `NFR-02` | — | KaiDaoMuKrobb |
| `F-02` | Expense request and line items | Create a request with its line items in `DRAFT`, edit it while it remains `DRAFT`, and submit it to a named reviewer. Server computes the total and allocates the request number | `FR-02`, `FR-03`, `BR-03`, `BR-04`, `BR-06` | `F-01` | KaiDaoMuKrobb |
| `F-03` | Reviewer dashboard and assigned view | The request list scoped to the caller, the detail view with line items and history, and the reviewer dashboard. Owns the read half of access isolation | `FR-04`, `BR-05` (read), `NFR-03` | `F-01` | siripitch-c |
| `F-04` | Approval workflow and business rule guards | The review endpoint accepting approve or reject with a reason, the three guards that enforce the rules, and the append-only history row written on every decision | `FR-05`, `BR-01`, `BR-02`, `BR-05` (decide) | `F-03` (API half) | siripitch-c |

### Sprint 2 — planned

| ID | Title | What it delivers | Requirements | Depends on |
| :--- | :--- | :--- | :--- | :--- |
| `F-05` | Return and resubmission | A reviewer returns a request with a reason, moving it to `RETURNED`. The requester corrects and resubmits. Both moves are recorded in the history | `FR-06`, `BR-07`, `BR-08` | `F-04` |
| `F-06` | Second approval stage | A request at or above the threshold reaches `STAGE1_APPROVED` on the first approval and needs a second, different approver before `APPROVED`. `BR-09` introduces that status; the schema adds it in Sprint 2 | `FR-07`, `BR-09` | `F-04` |
| `F-07` | Search, filter and paging | Both lists can be filtered by status, category, date range and department, searched by request number or title, and paged | `FR-08` | `F-03` |

### Sprint 3 — planned

| ID | Title | What it delivers | Requirements | Depends on |
| :--- | :--- | :--- | :--- | :--- |
| `F-08` | Department summaries and analytics | Aggregated expense metrics by department, monthly totals and category distribution, computed from the authoritative tables at request time | `FR-09` | `F-04`, `F-05` |
| `F-09` | Financial report export | A reviewer exports a verified reimbursement report as CSV or JSON for accounting. A requester attempting a department-wide export is refused | `FR-10`, `BR-10` | `F-08` |
| `F-10` | Hardening and regression | Consistent loading, empty, error and forbidden states on every screen; duplicate-submit protection; responsive and accessibility checks at three widths; the full regression suite green | No requirement of its own — it verifies `NFR-01` to `NFR-03` and the whole rule set under regression | all |

> Every functional requirement in `docs/srs.md` is allocated to exactly one feature. `F-10` is the only
> feature without a requirement of its own, because hardening is cross-cutting rather than a capability.
> The acceptance criteria and executable tests for Sprint 2 and Sprint 3 features are elaborated when each
> sprint begins; the allocation above is fixed now, as Part B requires.

---

## 3. System responsibilities

These are not features. Each is behaviour that every endpoint or screen must honour, established by one
feature and verified across several.

| ID | Responsibility | Established by | Verified by | Sprint |
| :--- | :--- | :--- | :--- | :--- |
| `SR-01` | **Authorization check order.** Every endpoint evaluates `401 → 404 → 403 → 400` in that fixed order, so that two implementations of the same rule cannot disagree. Fixed by `DEC-06` | `F-04` | `AC-38` proves the order directly; `AC-23`, `AC-26`, `AC-31`, `AC-33`, `AC-37` each exercise one step | 1 |
| `SR-02` | **Error envelope.** Every failure answers `{ success: false, error: { message, code } }` using the shared error code vocabulary in `docs/system-sds.md` §4.3. No stack trace, SQL or file path reaches a client | `F-01` | Every negative acceptance criterion asserts the `code`, not only the status | 1 |
| `SR-03` | **Append-only audit history.** Every status change writes one `ApprovalHistory` row. No endpoint updates or deletes a row in that table | `F-02` (the `SUBMIT` row), `F-04` (decision rows) | `AC-30`, `AC-36` assert a row is added; `AC-31`, `AC-32`, `AC-33` assert none is added on refusal | 1 |
| `SR-04` | **Monetary precision.** Amounts are `Decimal(12,2)` in the database and strings on the wire. They are never cast to a floating point number. Fixed by `DEC-04` | `F-01` (schema), `F-02` (totals) | `BR-04` tests in `F-02` | 1 |
| `SR-05` | **Server-side enforcement.** A rule is enforced in the route handler. Hiding a control in the interface is never the enforcement | `F-04` | Each guard has an API-level test independent of any screen | 1 |

---

## 4. Coverage check

Every requirement in `docs/srs.md` maps to at least one feature. Nothing is unallocated.

| Requirement | Feature | Sprint | Covered |
| :--- | :--- | :--- | :--- |
| `FR-01` | `F-01` | 1 | yes |
| `FR-02` | `F-02` | 1 | yes |
| `FR-03` | `F-02` | 1 | yes |
| `FR-04` | `F-03` | 1 | yes |
| `FR-05` | `F-04` | 1 | yes |
| `FR-06` | `F-05` | 2 | yes |
| `FR-07` | `F-06` | 2 | yes |
| `FR-08` | `F-07` | 2 | yes |
| `FR-09` | `F-08` | 3 | yes |
| `FR-10` | `F-09` | 3 | yes |
| `BR-01` | `F-04` | 1 | yes |
| `BR-02` | `F-04` | 1 | yes |
| `BR-03` | `F-02` | 1 | yes |
| `BR-04` | `F-02` | 1 | yes |
| `BR-05` | `F-03` (read) and `F-04` (decide) | 1 | yes, split across two features |
| `BR-06` | `F-02` | 1 | yes |
| `BR-07` | `F-05` | 2 | yes |
| `BR-08` | `F-05` | 2 | yes |
| `BR-09` | `F-06` | 2 | yes |
| `BR-10` | `F-09` | 3 | yes |
| `NFR-01` | `F-01` | 1 | yes |
| `NFR-02` | `F-01`, enforced by `SR-01` everywhere | 1 | yes |
| `NFR-03` | `F-03` | 1 | yes |

**Uncovered requirements: none.**

**Open item.** `FR-07` and `BR-09` describe the second approval stage as triggering at a threshold, and
`docs/srs.md` gives 10,000.00 THB only as an example. The value is a stakeholder decision and must be
recorded as a design decision before `F-06` can be specified.

---

## 5. Approved changes to scope

Changes are recorded here as they are approved. None are silent.

| Date | Change | Reason | Recorded in |
| :--- | :--- | :--- | :--- |
| 3 Nov 2026 | Deleting a request is out of scope for Sprint 1 | `BR-03` referred to deletion but no endpoint existed to test it. Removing the capability keeps the rule testable and the sprint achievable | Team agreement `DEC-07` |
| 4 Nov 2026 | `F-09` is **Financial report export** (`FR-10`, `BR-10`) instead of department-scoped authorization | Department scoping is not a requirement in `docs/srs.md`, while `FR-10` and `BR-10` had no feature. The change gives every functional requirement exactly one feature and removes a feature the baseline never asked for | This table; `docs/sprints/plan.md` §4 |
| 3 Nov 2026 | A request must carry at least one line item before it can be submitted | Without it a request with a zero total could be submitted, which `BR-04` did not previously prevent | Team agreement `BR-04` |
