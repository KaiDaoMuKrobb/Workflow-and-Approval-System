# F-05: Request Return & Resubmission Workflow

> **Feature Engineering Contract (Part B)** · Sprint 2 · Owner: **siripitch-c (Siripitch Chaiyabutra)** · Issue #45  
> Branch: `feat/F-05-return-resubmit`  
> Target Branch: `staging`  
> Repository path: `docs/sprints/sprint-2/F-05-return-resubmit.md`  
> Reviewer: **KaiDaoMuKrobb (Pattarawadee Thanapoomthakul)**  
>
> Written **before** implementation as mandated by Deliverable 2 section 3.2 Part B, which requires teams to
> *"Preserve versioned contract/test-design history before implementation"* and lists *"All Sprint 2
> contracts/AC/STS/DoD"* among the material that Part B assesses. Commit this specification, and
> obtain the reviewer's approval, before any implementation commit.

---

## 1. Requirements & System Context

| Type | ID | Statement |
| :--- | :--- | :--- |
| FR | `FR-06` | Reviewer returns a submitted request for revision (`SUBMITTED` $\rightarrow$ `RETURNED`); the requester corrects its line items and resubmits (`RETURNED` $\rightarrow$ `SUBMITTED`) |
| BR | `BR-07` | Return Reason Requirement: the return comment must be non-empty and at least **10 characters** |
| BR | `BR-08` | Resubmission Authorization: only the original requester may edit and resubmit a request in `RETURNED` status, and the resubmission appends an `ApprovalHistory` entry |
| BR | `BR-02` | State Transition Validation: status changes follow the declared state machine, and terminal states (`APPROVED`, `REJECTED`) are immutable; any disallowed transition answers HTTP 400 `INVALID_TRANSITION` |
| BR | `BR-03` | Immutability After Submission: a `SUBMITTED` request cannot be modified (HTTP 400 `IMMUTABLE_AFTER_SUBMIT`). **This feature narrows, but does not remove, that rule** |
| BR | `BR-05` | Access isolation: an unassigned reviewer deciding a request receives HTTP 403 `FORBIDDEN`; a non-owner reading or editing receives HTTP 404 |
| DEC | `DEC-02 v2.0` | Self-assignment is refused at submit with HTTP 400 `SELF_ASSIGNMENT`. Resubmission reuses the submit endpoint, so this rule applies to it unchanged |
| DEC | `DEC-03` | Zero-knowledge security: HTTP 404 Not Found for unauthorized resource viewing |
| DEC | `DEC-06` | Invariant guard evaluation order: `401 UNAUTHENTICATED` $\rightarrow$ `404 NOT_FOUND` $\rightarrow$ `403 FORBIDDEN` $\rightarrow$ `400 VALIDATION_ERROR` |

---

## 2. Scope & Behavioral Specification

### 2.1 Functional Capabilities

`F-05` completes the review loop that Sprint 1 left open. Until now a reviewer could only approve or reject; a claim that merely needed correction had to be rejected outright, and the requester had no way to amend and resend it.

1. **Return action (`RETURN`).** `POST /api/requests/:id/review` accepts a third action alongside `APPROVE` and `REJECT`. The assigned reviewer returns a `SUBMITTED` claim, its status becomes `RETURNED`, and the reason is stored on the audit row.
2. **Mandatory return reason (`BR-07`).** The comment accompanying `RETURN` must be non-empty after trimming and at least 10 characters. This threshold is **separate from** `MIN_DECISION_COMMENT_LENGTH`, which governs `APPROVE` and `REJECT` and stays at 5.
3. **Editing reopened only while `RETURNED` (`BR-03` narrowed).** `PUT /api/requests/:id` currently refuses any status other than `DRAFT`. It will accept `DRAFT` **or** `RETURNED`. Every other status, `SUBMITTED` included, is still refused with HTTP 400 `IMMUTABLE_AFTER_SUBMIT`.
4. **Resubmission (`BR-08`).** `POST /api/requests/:id/submit` currently refuses any status other than `DRAFT`. It will accept `DRAFT` **or** `RETURNED`, and the resulting transition returns the claim to `SUBMITTED`.
5. **Faithful audit trail (`BR-08`).** The submit handler presently hard-codes `fromStatus: DRAFT` on the history row. It must record the actual previous status, so a resubmission is written as `RETURNED` $\rightarrow$ `SUBMITTED` with action `RESUBMIT`, and a first submission remains `DRAFT` $\rightarrow$ `SUBMITTED` with action `SUBMIT`.
6. **Ownership unchanged.** Only the original requester may edit or resubmit. A different account receives HTTP 404 under `DEC-03`, exactly as it does today.

### 2.2 Lifecycle After This Feature

```
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED
                     │  ▲     ──reject──► REJECTED
            return   │  │  resubmit
                     ▼  │
                  RETURNED ──edit (PUT)──► RETURNED
```

`RETURNED` is not a terminal state and is not reachable from `APPROVED` or `REJECTED`.

### 2.3 Invariant Guard Order for `RETURN`

`POST /api/requests/:id/review` keeps the order already established by `F-04` and `DEC-06`; `RETURN` enters the existing sequence without reordering it.

1. `401 UNAUTHENTICATED`: no session.
2. `404 NOT_FOUND`: the request does not exist. Visibility is deliberately not evaluated here, so that step 4 can answer 403.
3. `403 SELF_APPROVAL` (`BR-01`): the caller raised the request.
4. `403 FORBIDDEN` (`BR-05`): the caller is not the assigned reviewer.
5. `400 INVALID_TRANSITION` (`BR-02`): the request is not `SUBMITTED`.
6. `400 VALIDATION_ERROR`: the action is unrecognised, or the comment fails the length rule for the chosen action.
7. `200 OK`: status written and `ApprovalHistory` row appended inside one transaction.

---

## 3. Layer Specifications

### 3.1 Data Layer

**No schema migration is required.** Verified against `prisma/schema.prisma` on `staging`:

- `RequestStatus` already contains `RETURNED` (line 20, annotated *"Reserved for Sprint 2"*).
- `ApprovalHistory.action` is a `String` (line 78), not an enum, so the new action names `RETURN` and `RESUBMIT` need no migration. Only the explanatory comment on that line is extended from `// SUBMIT, APPROVE, REJECT`.
- `ApprovalHistory.fromStatus` and `toStatus` are already typed `RequestStatus`, so both new transitions are representable.

### 3.2 API Layer

#### `POST /api/requests/:id/review`: extended

| Field | Type | Validation | Notes |
| :--- | :--- | :--- | :--- |
| `action` | string | One of `APPROVE`, `REJECT`, `RETURN` | Anything else: HTTP 400 `VALIDATION_ERROR` |
| `comment` | string | `APPROVE` / `REJECT`: $\ge$ 5 characters after trimming. `RETURN`: $\ge$ 10 characters after trimming | HTTP 400 `VALIDATION_ERROR` |

Resulting status: `APPROVE` $\rightarrow$ `APPROVED`, `REJECT` $\rightarrow$ `REJECTED`, `RETURN` $\rightarrow$ `RETURNED`. The audit row records `fromStatus: SUBMITTED`, `toStatus: RETURNED`, `action: 'RETURN'` and the trimmed comment.

Three details of the existing handler are confirmed correct for `RETURN` and are **not** changed, because step 5 already guarantees the claim is `SUBMITTED` before the transaction opens: the transactional re-check `updateMany({ where: { id, status: SUBMITTED } })`, the hard-coded `fromStatus: SUBMITTED` on the audit row, and the `DEC-06` ordering itself. One string does change: the `AlreadyDecidedError` handler answers *"Only a submitted request can be approved or rejected"*, which stops being accurate once a third decision exists.

#### `PUT /api/requests/:id`: guard narrowed

| Current | Revised |
| :--- | :--- |
| `status !== DRAFT` $\rightarrow$ 400 `IMMUTABLE_AFTER_SUBMIT` | `status !== DRAFT && status !== RETURNED` $\rightarrow$ 400 `IMMUTABLE_AFTER_SUBMIT` |

`PUT` has two write paths: one that replaces the line items inside a transaction and one that updates header fields only. The widened guard precedes both, so both become available while `RETURNED`. Neither path writes `status`, so editing a `RETURNED` claim leaves it `RETURNED`; only an explicit resubmission moves it.

#### `POST /api/requests/:id/submit`: guard narrowed and audit row corrected

| Current | Revised |
| :--- | :--- |
| `status !== DRAFT` $\rightarrow$ 400 `IMMUTABLE_AFTER_SUBMIT` | `status !== DRAFT && status !== RETURNED` $\rightarrow$ 400 `IMMUTABLE_AFTER_SUBMIT` |
| `fromStatus: RequestStatus.DRAFT` hard-coded | `fromStatus: existingRequest.status` |
| `action: 'SUBMIT'` | `'SUBMIT'` from `DRAFT`, `'RESUBMIT'` from `RETURNED` |

Every other guard on this route is untouched, including the `DEC-02 v2.0` self-assignment refusal and the reviewer-role check.

### 3.3 Shared Rules Module

`src/lib/review-rules.ts` gains the `BR-07` threshold and its message, beside the existing `MIN_DECISION_COMMENT_LENGTH`. The two values are declared separately and neither reuses the other.

### 3.4 UI Layer

The string union `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'` is written out by hand in **five files** and omits `RETURNED`. Widening it is a compile-time prerequisite, not a cosmetic change: in
`src/app/requests/[id]/page.tsx` the union keys a `Record<RequestDetail['status'], string>`, so the
compiler will demand the new entry once the union grows.

Two behavioural facts were verified and need **no** change. `GET /api/requests` validates `status`
against `Object.values(RequestStatus)` (`route.ts:34`), so `?status=RETURNED` is already accepted.
`ReviewDecisionPanel` returns `null` unless the status is `SUBMITTED` (`:47`) and `review-queue.ts:33`
filters the queue to `SUBMITTED`, so a returned claim correctly leaves the reviewer queue and the
Return control correctly never appears on a claim that is not under review.

The work itself, and who owns each file:

| File and location | Change | Owner |
| :--- | :--- | :--- |
| `src/components/ReviewDecisionPanel.tsx` `:12`, `:47`+ | Widen the union; add the **Return for revision** control beside Approve and Reject, with its own comment field stating the 10-character requirement before submission | siripitch-c |
| `src/app/requests/[id]/page.tsx` `:37`, `:48` | Widen the union; add the `RETURNED` entry to `STATUS_STYLES`. The return reason itself already renders: `:265`..`:273` list `request.history` and `GET /api/requests/:id` already includes it, so `AC-57` is verifiable through the API with no new read path | siripitch-c |
| `src/lib/review-queue.ts` `:15` | Widen the union only; the `:33` `SUBMITTED` filter is already correct | siripitch-c |
| `src/app/requests/page.tsx` `:541` | **Blocks the feature.** The requester's list offers *Edit / Submit* only when `r.status === 'DRAFT'` and otherwise renders *Locked*, so a returned claim has no route to the edit screen and the user journey cannot be completed from the UI | **request from KaiDaoMuKrobb** |
| `src/app/requests/page.tsx` `:38`, `:151`, `:328`..`:331` | Widen the union; add a `RETURNED` case to `getStatusBadge`, which would otherwise fall through; add a `RETURNED` option to the `F-07` status filter | **request from KaiDaoMuKrobb** |
| `src/components/ReviewerQueue.tsx` `:9`, `:18` | Widen the union, and add the `RETURNED` entry to the status-to-class map beside it | **request from KaiDaoMuKrobb** |
| `src/app/api/requests/route.ts` `:199`..`:209` | The `F-07` statistics object carries `drafts`, `submitted`, `approved`, `rejected` only. The `groupBy` counts a `RETURNED` row and the mapping loop then drops it, so returned claims are invisible in the stat tiles. Needs a `returned` field | **request from KaiDaoMuKrobb**, the `GET` half of a shared file |
| `src/app/requests/new/page.tsx` | The edit screen loads by `?id=` with no status gate found, so it is expected to work unchanged. To be confirmed by its owner | **confirm with KaiDaoMuKrobb** |

Four of these eight sit in files this feature does not own. They are requested with the
file, the line and the expected result named, and the Pull Request description records who granted
what. The API half of `F-05` is complete and testable without them; the UI journey is not.

### 3.5 Documents Requiring Revision

Every line number quoted in this document was verified against `origin/staging` at commit `781bdbf`.
PR #51 rewrites `docs/traceability.md`, so that file's line numbers will move once it merges; the
section and row names below stay correct regardless.

`F-05` narrows two rules that Sprint 1 wrote as absolutes, so several existing statements stop being
true. Each is revised with the reason recorded in that document's revision history, and ownership
decides who makes the edit. `docs/srs.md` and `docs/traceability.md` are shared between the two
authors: each edits only the rows of their own feature, and those edits are committed **separately from the code**, not folded into an implementation commit. A change that falls inside the other
author's feature or file is requested from its owner, or made only with that owner's permission
recorded in the Pull Request description.

Issue #45 lists `docs/srs.md`, `docs/sprints/sprint-1/F-02-request-crud.md` and
`docs/traceability.md` in its Definition of Done. Row 3 below is a contract belonging to `F-02`, so
it is raised as a request to its owner even though the Issue assigns it here. Rows 4 to 7 are additions to that
Definition of Done, found while verifying this contract against the source.

| # | Document and location | Current statement | Required revision | Owner |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `docs/srs.md` `BR-02`, line 99 | State machine written as `DRAFT ⟷ SUBMITTED → APPROVED \| REJECTED` | Add `RETURNED`. **This already contradicts `docs/srs.md` line 41 in the same file, which does include `RETURNED`.** `F-05` resolves the contradiction | siripitch-c, who owns `review/route.ts` where `BR-02` is enforced; committed separately from the code |
| 2 | `docs/srs.md` `BR-03`, lines 101–102 | *"Once a request transitions to `SUBMITTED`, the requester cannot modify, add, or remove line items"* | Taken literally this also forbids editing a claim that has since been returned. Add an explicit carve-out for `RETURNED` under `BR-08` | siripitch-c, who owns `[id]/route.ts` and `submit/route.ts` where `BR-03` is enforced; committed separately from the code |
| 3 | `docs/sprints/sprint-1/F-02-request-crud.md` section 1.1 line 23 **and** section 2.1 line 112 | Guard order for `PUT` given as *"400 `IMMUTABLE_AFTER_SUBMIT` (if `status !== DRAFT` per `BR-03`)"*, and the route specification repeats *"(if `status !== 'DRAFT'`)"* | Both become `status !== DRAFT && status !== RETURNED`. Line 140 (`submit`) reads *"if status already `SUBMITTED`, `APPROVED`, or `REJECTED`"*, which does not list `RETURNED` and therefore stays true as written | request from KaiDaoMuKrobb |
| 4 | `docs/system-sds.md` section 2.1 ERD, line 103 | `string action "SUBMIT \| APPROVE \| REJECT"` | Add `RETURN` and `RESUBMIT` | request from KaiDaoMuKrobb |
| 5 | `docs/system-sds.md` section 4.2 guard hierarchy, line 212 | `──(Edit submitted request)────> 400 IMMUTABLE_AFTER_SUBMIT` | Note that a `RETURNED` claim is editable by its requester | request from KaiDaoMuKrobb |
| 6 | `docs/system-sds.md` section 4.4 role matrix | `PUT` and `submit` rows read *"✅ (`DRAFT` only)"* for the owning requester | Becomes *"✅ (`DRAFT` or `RETURNED`)"* | request from KaiDaoMuKrobb |
| 7 | `docs/system-sds.md` section 4.3 error vocabulary | `VALIDATION_ERROR` linked only to `BR-04` | Add `BR-07`, since a short return reason now raises it | request from KaiDaoMuKrobb |
| 8 | `docs/traceability.md`, the `F-05` row of the *Later sprints* table (line 81 at `781bdbf`) | Status reads `planned` (Issue #45) | Becomes `in progress` in the form the `F-07` row already uses: contract path and Issue #45, then `AC-50`..`AC-59` mapped to `TEST-50`..`TEST-54`, `TEST-54b`, `TEST-55`..`TEST-59`, `TEST-56b`, `TEST-59b`; `pass` with the suite figure once merged | siripitch-c, the owner of this feature's row; committed separately from the code |

No new error code is introduced. A return reason that fails `BR-07` reuses the existing
`VALIDATION_ERROR`, and a return attempted on a non-`SUBMITTED` claim reuses `INVALID_TRANSITION`.

---

## 4. Acceptance Criteria (AC-50 to AC-59)

Issue #45 states eleven acceptance criteria as a checklist numbered `AC-1` to `AC-11`. They are
renumbered here into the project's own range so that nothing is dropped: `AC-1`$\rightarrow$`AC-50`,
`AC-2`$\rightarrow$`AC-51`, `AC-3`$\rightarrow$`AC-52`, `AC-4`$\rightarrow$`AC-53`,
`AC-5`$\rightarrow$`AC-54`, `AC-6`$\rightarrow$`AC-55`, `AC-7`$\rightarrow$`AC-56`,
`AC-8`$\rightarrow$`AC-57`, `AC-9`$\rightarrow$`AC-58`, `AC-10`$\rightarrow$`AC-59`, and the Issue's
`AC-11` (self-assignment on the resubmit path) is covered by `TEST-56b` under `AC-56`.

- **`AC-50` (Return a submitted request):**  
  *Given* a claim in `SUBMITTED` whose assigned reviewer is the caller  
  *When* `POST /api/requests/:id/review` is called with `action: 'RETURN'` and a 20-character comment  
  *Then* the server answers HTTP 200, the claim status becomes `RETURNED`, and the response carries the updated claim.

- **`AC-51` (Return reason below the boundary, `BR-07`):**  
  *Given* the same claim and caller  
  *When* `action: 'RETURN'` is sent with a 9-character comment  
  *Then* the server answers HTTP 400 `VALIDATION_ERROR` and the claim remains `SUBMITTED`.

- **`AC-52` (Return reason exactly at the boundary, `BR-07`):**  
  *Given* the same claim and caller  
  *When* `action: 'RETURN'` is sent with a comment of exactly 10 characters  
  *Then* the server answers HTTP 200 and the claim becomes `RETURNED`.

- **`AC-53` (Unassigned reviewer cannot return, `BR-05`):**  
  *Given* a `SUBMITTED` claim assigned to another reviewer  
  *When* a reviewer who is neither the requester nor the assignee sends `action: 'RETURN'`  
  *Then* the server answers HTTP 403 `FORBIDDEN` and the claim remains `SUBMITTED`.

- **`AC-54` (Requester may edit while returned):**  
  *Given* a claim in `RETURNED` owned by the caller  
  *When* `PUT /api/requests/:id` replaces its line items, or updates header fields only  
  *Then* the server answers HTTP 200, the new items and recalculated `totalAmount` are persisted on the first path, the header change is persisted on the second, and in both cases the status stays `RETURNED`.

- **`AC-55` (Only the original requester may edit or resubmit, `BR-08`):**  
  *Given* a claim in `RETURNED` owned by another user  
  *When* the caller sends `PUT /api/requests/:id` or `POST /api/requests/:id/submit`  
  *Then* the server answers HTTP 404 `NOT_FOUND` under `DEC-03` and nothing is written.

- **`AC-56` (Resubmission returns the claim to review):**  
  *Given* a claim in `RETURNED` owned by the caller, with a valid assigned reviewer  
  *When* `POST /api/requests/:id/submit` is called  
  *Then* the server answers HTTP 200 and the claim status becomes `SUBMITTED`.

- **`AC-57` (Both transitions are audited, `BR-08`):**  
  *Given* a claim that was returned and then resubmitted  
  *When* its `ApprovalHistory` is read  
  *Then* it contains a row `SUBMITTED` $\rightarrow$ `RETURNED` with action `RETURN` carrying the reviewer's reason, and a later row `RETURNED` $\rightarrow$ `SUBMITTED` with action `RESUBMIT`.

- **`AC-58` (`BR-03` preserved for submitted claims):**  
  *Given* a claim in `SUBMITTED`  
  *When* its requester sends `PUT /api/requests/:id`  
  *Then* the server still answers HTTP 400 `IMMUTABLE_AFTER_SUBMIT` and nothing is written.

- **`AC-59` (Returning a claim that is not submitted, `BR-02`):**  
  *Given* a claim in `APPROVED`, `REJECTED`, `DRAFT` or `RETURNED`  
  *When* `action: 'RETURN'` is sent by its assigned reviewer  
  *Then* the server answers HTTP 400 `INVALID_TRANSITION` and the status is unchanged.

---

## 5. Software Test Specification (STS)

All API cases below live in a **new** file, `tests/api/request-return-resubmit.test.ts`, following the
naming `F-07` used for `tests/api/requests-search-filter.test.ts`. A new file is deliberate:
`tests/api/request-crud.test.ts` is shared and append only by agreement between the two authors, and
nothing in it is modified by this feature.

| Test ID | AC | Type | Precondition / Input | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **`TEST-50`** | `AC-50` | API | Alice submits to Carol; Carol sends `RETURN` with a 20-character reason | HTTP 200 · status `RETURNED` |
| **`TEST-51`** | `AC-51` | API | Same claim; comment of 9 characters | HTTP 400 `VALIDATION_ERROR` · status still `SUBMITTED` |
| **`TEST-52`** | `AC-52` | API | Same claim; comment of exactly 10 characters | HTTP 200 · status `RETURNED` |
| **`TEST-53`** | `AC-53` | API | Claim assigned to Carol; David sends `RETURN` | HTTP 403 `FORBIDDEN` · status unchanged |
| **`TEST-54`** | `AC-54` | API | Alice edits her own `RETURNED` claim via `PUT` | HTTP 200 · items replaced · `totalAmount` recalculated · status `RETURNED` |
| **`TEST-54b`** | `AC-54` | API | Alice updates only the title of her own `RETURNED` claim, sending no items | HTTP 200 · header updated · items and `totalAmount` untouched · status `RETURNED` |
| **`TEST-55`** | `AC-55` | API | Bob attempts `PUT` and `submit` on Alice's `RETURNED` claim | HTTP 404 `NOT_FOUND` on both · no write |
| **`TEST-56`** | `AC-56` | API | Alice resubmits her `RETURNED` claim to Carol | HTTP 200 · status `SUBMITTED` |
| **`TEST-56b`** | `AC-56` | API | David (dual role) resubmits a `RETURNED` claim naming himself as reviewer | HTTP 400 `SELF_ASSIGNMENT` · `DEC-02 v2.0` preserved on the resubmit path |
| **`TEST-57`** | `AC-57` | API | Read `ApprovalHistory` after a return and a resubmission | Two rows in order: `SUBMITTED`$\rightarrow$`RETURNED` action `RETURN` with the reason, then `RETURNED`$\rightarrow$`SUBMITTED` action `RESUBMIT` |
| **`TEST-58`** | `AC-58` | API | Alice edits a `SUBMITTED` claim | HTTP 400 `IMMUTABLE_AFTER_SUBMIT`: this is existing `TEST-15`, which must stay green unchanged |
| **`TEST-59`** | `AC-59` | API | Carol sends `RETURN` on an `APPROVED` claim and on a `DRAFT` claim | HTTP 400 `INVALID_TRANSITION` on both · status unchanged |
| **`TEST-59b`** | `AC-50` | UI | Reviewer opens a `SUBMITTED` claim and uses the Return control; requester then sees the claim as editable with the reason shown | Manual UI check on `/requests/[id]`, captured as dated evidence |

**Regression suites that must stay green and are not modified:** `TEST-15` (`BR-03`), `TEST-18` (`DEC-02 v2.0`), `TEST-31` and `TEST-38` (`BR-01`), `TEST-34` (`BR-05` read isolation), `TEST-26` (unassigned reviewer 404), `TEST-70`..`TEST-76`, `TEST-76b`, `TEST-78`, `TEST-79` (`F-07`; there is no `TEST-77`).

**One existing case is revised, and only in the example it uses.** `TEST-35b` in
`tests/api/review-guards.test.ts` proves that an action the endpoint does not recognise is refused,
and it used `RETURN` as that example. `F-05` makes `RETURN` an action the endpoint does recognise, so
the example expired while the rule it guards did not. The case now sends `ESCALATE`, which this system
has no notion of, and every assertion is unchanged: HTTP 400 `VALIDATION_ERROR` and no side effect. It
is committed separately from the implementation so the history shows the code did not edit a test to
make itself pass. This contract should have listed it above and did not; it is recorded here rather
than quietly corrected.

---

## 6. Definition of Done

Required by Deliverable 2 section 3.2 Part B, which assesses *"All Sprint 2 contracts/AC/STS/DoD"*.
`F-05` is done when every line below is true and evidenced.

| # | Condition | Evidence |
| :--- | :--- | :--- |
| 1 | This contract is committed and approved by the reviewer **before** any implementation commit | Commit date of this file precedes the RED commit; PR approval timestamp |
| 2 | `TEST-50`..`TEST-59`, `TEST-54b`, `TEST-56b` are committed **failing** against unmodified code | RED commit id and its captured run, showing the failures by test ID |
| 3 | Implementation makes them pass with no test weakened, deleted or skipped | GREEN commit id and its captured run |
| 4 | The whole suite is green, including the regression list in section 5 | `npm test` output with passed, failed and skipped counts, on the GREEN commit |
| 5 | `TEST-59b` is performed on the running application and dated | Captioned screenshots naming role, starting status, `AC-50`, expected and actual result |
| 6 | The section 3.5 document revisions owned here are made in a **separate commit** from the code | Separate commit id |
| 7 | The requests in section 3.4 and section 3.5 are sent to KaiDaoMuKrobb and either resolved or disclosed as remaining | Message with file, line and expected result; Pull Request description records who granted what |
| 8 | `docs/traceability.md` carries `F-05` as `pass` with the suite figure and the AC-to-test mapping | Updated row, in its own commit |
| 9 | PR into `staging` reviewed substantively by KaiDaoMuKrobb, CI green, and **merged by the reviewer, not the author** | PR id, reviewer, review body, CI run id |
| 10 | Issue #45 closed, referencing the merge | Issue timeline |

`F-05` is **not** done while any UI item in section 3.4 is outstanding without being disclosed: Deliverable 2
section 5 requires that *"Feature and requirement statuses disclose incomplete, failed and skipped work."*

---

## 7. Revision History

| Version | Date | Author | Summary of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 27 Nov 2026 | siripitch-c | Initial contract for `F-05` return and resubmission, written before implementation under Issue #45. Allocates `AC-50`..`AC-59` and `TEST-50`..`TEST-59`, following the feature-number range that `F-07` already uses (`AC-70`..`AC-77`), and maps the Issue's own `AC-1`..`AC-11` onto them. Records that no migration is required and that `BR-07` carries its own 10-character threshold, distinct from `MIN_DECISION_COMMENT_LENGTH`. section 3.5 lists the eight document statements that `F-05` makes untrue, among them the `BR-02` state machine at `docs/srs.md` line 99, which already contradicts line 41 of the same file. |
| 1.1 | 27 Nov 2026 | siripitch-c | Revised before commit after verifying every claim against the source. section 3.4 rewritten: the hand-written status union omits `RETURNED` in five files, and `src/app/requests/page.tsx:541` offers *Edit / Submit* only while `DRAFT`, which blocks the requester's journey until its owner widens it: four of the eight UI items are raised as requests to their owner. Added the `AlreadyDecidedError` message, the second header-only `PUT` write path with `TEST-54b`, the `F-02` revision at line 112, and the test file name. Confirmed unchanged: `?status=RETURNED` already passes `GET` validation, the reviewer queue already filters to `SUBMITTED`, and the detail page already renders `ApprovalHistory`. |
| 1.2 | 27 Nov 2026 | siripitch-c | Checked against the Lab 7 and Deliverable 2 handouts once they were available. Relabelled **Part E to Part B**: Deliverable 2 section 4.1 assigns Sprint 2 contracts to Part B, while Part E is the integrated release candidate. Restored the verbatim section 3.2 requirement, which v1.1 had removed as unverifiable. Added section 6 Definition of Done, required by section 3.2 Part B and previously absent. Dropped the Lab 7 section 3.1 citation: that section governs the `DEC-02 v2.0` maintenance change, not a Sprint 2 feature. |
| 1.3 | 27 Nov 2026 | siripitch-c | Reconciled against a parallel draft and re-verified against `origin/staging`. KaiDaoMuKrobb independently wrote `docs/sprints/sprint-2/F-05-return-resubmission.md`, proposed in PR #51. Its `AC-50` to `AC-54` are equivalent to this document's and are adopted here with credit; the two diverge from `AC-55`, which this document splits into `AC-55` (ownership, 404), `AC-56` (resubmission) and `AC-57` (audit trail), and it adds `AC-58` and `AC-59`, the `submit/route.ts` `fromStatus` defect, the section 3.4 interface work and the section 3.5 document revisions, none of which the other draft covers. **Only one `F-05` contract may exist in the repository**, because two would give `AC-50`..`AC-59` two meanings and break the Part D matrix; whichever file is withdrawn, the decision and its reason are recorded here rather than erased, as Deliverable 2 section 3.3 requires. Also corrected section 3.5 row 8: `docs/traceability.md` line 81 on `origin/staging` reads `planned` (Issue #45), which v1.1 had wrongly restated after checking a stale local working tree. |
| 1.4 | 27 Nov 2026 | siripitch-c | Updated alongside the implementation. **Removed every citation to a team agreement section 6.2, 6.3, 6.4 or 6.6.** Those numbers belong to the pair's private work plan, not to `TEAM_AGREEMENT_v2.3.md`, whose section 6 is the state transition matrix and has no subsections, so this document was citing an authority that does not exist. File ownership is now stated as the fact it is. **Recorded the one existing test this feature revises**, `TEST-35b`, in section 5: it used `RETURN` as its example of an unrecognised action, the rule it guards is unchanged and so is every assertion, and v1.0 to v1.3 failed to foresee it. Noted that `ReviewDecisionPanel.tsx` gives all three decisions one shared comment field, stating the 10 character requirement before submission, rather than a second field for returns alone, so a reviewer cannot type the reason into the wrong box. Em dashes and section signs removed throughout; neither is used in this project's writing. |
