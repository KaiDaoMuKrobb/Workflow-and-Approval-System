# Three-Sprint Plan

> **Deliverable 1 — Part D** · Owner: **siripitch-c**
> Repository path: `docs/sprints/plan.md`
> Product: ExpenseFlow — Corporate Expense Reimbursement System (Theme 5, Workflow and Approval)

---

## 1. How the product is divided

The product is delivered in three sprints. Sprint 1 proves the spine end to end — identity, one domain
transaction, one enforced business rule and the authorization around them. Sprint 2 completes the workflow
the stakeholder brief describes. Sprint 3 finishes the remaining features and hardens the whole product for
release.

| Sprint | Goal | Checkpoint |
| :--- | :--- | :--- |
| **1** | A small working slice: authentication, permissions, persistence, and one complete approval decision | **Deliverable 1 — 8 November 2026** |
| **2** | The core expansion: return and resubmission, a second approval stage, and finding requests | **Deliverable 2 — 29 November 2026** |
| **3** | Remaining features, integration, failure handling, regression and release | Progress shown at **29 November**, complete by **13 December 2026** |

The sprint allocation and the feature split recorded here were agreed by the pair before Sprint 1 work
began, and issues `#1` to `#5` were opened from them. This document carries that allocation into the
repository as the Part D deliverable; it does not revise it.

---

## 2. Sprint 1 — Working slice

**Goal.** A signed-in employee raises an expense request, submits it to a named reviewer, and that reviewer
approves or rejects it with a reason that is permanently recorded. Every rule is enforced by the server, not
by the interface.

| Feature | Title | Owner | Requirements covered |
| :--- | :--- | :--- | :--- |
| `F-01` | Authentication and session | KaiDaoMuKrobb | `FR-01`, `NFR-01`, `NFR-02` |
| `F-02` | Expense request and line items, create and submit | KaiDaoMuKrobb | `FR-02`, `FR-03`, `BR-03`, `BR-04`, `BR-06` |
| `F-03` | Reviewer dashboard and assigned view | siripitch-c | `FR-04`, `BR-05` (read), `NFR-03` |
| `F-04` | Approval workflow and business rule guards | siripitch-c | `FR-05`, `BR-01`, `BR-02`, `BR-05` (decide) |

**Dependencies.**
`F-01` has none and must land first, because every other feature needs the current user.
`F-02` and `F-03` depend on `F-01` only, and can proceed in parallel once it merges.
`F-04` depends on the API half of `F-03`, because both apply the same visibility check; that check is
written once in `F-03` and reused.

**Completion outcome.** The journey runs end to end through UI, API and database. The four rules the course
requires to be tested are proven by automated tests: self-approval refused, an invalid transition refused,
an unrelated reviewer refused, and a requester unable to read another's request. Two Playwright journeys
cover the critical paths. The release runs locally from documented setup steps.

**Explicitly not in Sprint 1.** Return and resubmission, multi-stage approval, search and filtering,
reporting, receipt attachments, deleting a request, and any rule based on `department`.

---

## 3. Sprint 2 — Core expansion

**Goal.** Complete the approval workflow the stakeholder brief describes: a reviewer can send a request back
for correction, large amounts need a second approver, and users can find a request among many.

| Feature | Title | Scope |
| :--- | :--- | :--- |
| `F-05` | Return and resubmission | A reviewer returns a request with a reason, moving it to `RETURNED`. The requester edits it and resubmits. The history records both moves. Activates the `RETURNED` status reserved in Sprint 1 |
| `F-06` | Second approval stage | A request whose total exceeds an agreed threshold requires a second, different approver before it reaches `APPROVED`. A single approver may never satisfy both stages |
| `F-07` | Search, filter and paging | Both the requester list and the reviewer queue can be filtered by status, category and date range, searched by request number or title, and paged |

**Dependencies.** All three build on Sprint 1. `F-05` extends the state machine `F-04` enforces, so the
transition table is edited in one place and the existing guard tests must still pass. `F-06` changes what
`APPROVED` means and therefore touches `F-04` as well. `F-07` extends the queries `F-03` owns.

**Completion outcome.** Sprint 2 is complete at Deliverable 2 on 29 November, deployed to GCP as a release
candidate, with the Sprint 1 journey still passing unchanged.

> **Requires KaiDaoMuKrobb's confirmation:** the threshold value that triggers the second approval
> stage. `docs/srs.md` gives 10,000.00 THB as an example only. It is a stakeholder decision and must be
> recorded as a design decision before `F-06` is specified. The requirements themselves are already in
> place: `FR-06` with `BR-07` and `BR-08` for `F-05`, `FR-07` with `BR-09` for `F-06`, and `FR-08` for
> `F-07`.

---

## 4. Sprint 3 — Completion and hardening

**Goal.** Finish the reporting the brief asks for, then harden everything built so far.

| Feature | Title | Scope |
| :--- | :--- | :--- |
| `F-08` | Department summaries and analytics | Aggregated expense metrics by department, monthly totals and category distribution. Every number is a query against the authoritative tables at request time (`FR-09`) |
| `F-09` | Financial report export | A reviewer exports a verified reimbursement report as CSV or JSON for accounting reconciliation. A requester attempting a department-wide export is refused with 403 (`FR-10`, `BR-10`) |
| `F-10` | Hardening and regression | Consistent loading, empty, error and forbidden states on every screen; duplicate-submit protection; responsive and accessibility checks at three widths; the full regression suite green |

**Dependencies.** `F-08` depends on the complete history produced by `F-04` and `F-05`. `F-09` exports
what `F-08` computes, so it follows it. `F-10` touches every screen and must come last.

**Completion outcome.** The whole baseline is implemented and verified, the regression suite passes on
`main`, the deployed version matches the submitted tag, and the Final Delivery evidence is complete.

---

## 5. Requirement coverage across the three sprints

Every requirement in the baseline is allocated to exactly one sprint. Nothing is left without a sprint, and
nothing is deferred without being recorded here.

| Requirement | Feature | Sprint |
| :--- | :--- | :--- |
| `FR-01` Login and logout | `F-01` | 1 |
| `FR-02` Create a request with line items | `F-02` | 1 |
| `FR-03` Submit to a named reviewer | `F-02` | 1 |
| `FR-04` Reviewer sees assigned requests | `F-03` | 1 |
| `FR-05` Approve or reject with a reason | `F-04` | 1 |
| `BR-01` No self-approval | `F-04` | 1 |
| `BR-02` Valid state transitions only | `F-04` | 1 |
| `BR-03` Immutable after submission | `F-02` | 1 |
| `BR-04` Total and line item validation | `F-02` | 1 |
| `BR-05` Access isolation | `F-03` (read), `F-04` (decide) | 1 |
| `BR-06` Request number generation | `F-02` | 1 |
| `NFR-01` Passwords hashed | `F-01` | 1 |
| `NFR-02` Unauthenticated requests refused | `F-01` | 1 |
| `NFR-03` List endpoints within 500 ms | `F-03` | 1 |
| `FR-06` Return and resubmission | `F-05` | 2 |
| `FR-07` Second approval stage | `F-06` | 2 |
| `FR-08` Search, filter and paging | `F-07` | 2 |
| `FR-09` Department summaries and analytics | `F-08` | 3 |
| `FR-10` Financial report export | `F-09` | 3 |
| `BR-07`, `BR-08` Return reason and resubmission authority | `F-05` | 2 |
| `BR-09` High-value approval threshold | `F-06` | 2 |
| `BR-10` Report export authorization | `F-09` | 3 |
| Hardening and regression (no requirement of its own) | `F-10` | 3 |

The full requirement-to-feature-to-test mapping, including acceptance criteria and test identifiers, is in
`docs/traceability.md`.

---

## 6. Scope control

Scope is reduced or moved only by recording the change, never by quiet omission.

- A feature moved between sprints is recorded in the change log of the team agreement with the reason.
- A requirement that will not be built at all is moved to the exclusions list in `docs/srs.md`, not deleted.
- New work discovered mid-sprint becomes a new feature identifier and is allocated to a sprint before it is
  implemented.

---

## 7. Open items needing KaiDaoMuKrobb

1. The amount threshold that triggers the second approval stage in `F-06` is an unresolved stakeholder
   question. It should be decided and recorded as a design decision before Sprint 2 planning closes.
2. Whether receipt attachments return to scope in Sprint 3, or stay excluded for the whole product.
