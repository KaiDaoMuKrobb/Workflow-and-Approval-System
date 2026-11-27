# Feature Contract: F-06 Second Stage Approval for High Amounts

> **Deliverable 2: Sprint 2 Feature Specification (Part B)**
> **Feature ID:** `F-06`
> **Associated Requirements:** `FR-07`, `BR-09`
> **Owner (Author):** Siripitch Chaiyabutra (`siripitch-c`)
> **Reviewer:** Pattarawadee Thanapoomthakul (`KaiDaoMuKrobb`)
> **Target Release:** Sprint 2 Candidate (`v0.3.0`)
> **Design Threshold:** `50,000.00 THB`, strict, recorded as `DEC-08`
> **Tracking Issue:** #47

Every line number quoted in this document was verified against `origin/staging`.

---

## 1. Feature Overview & User Stories

### 1.1 Problem Statement

In Sprint 1 every expense claim followed single stage approval regardless of value. In an enterprise
financial workflow, high value expenditure carries corporate liability and fraud risk, so a claim
above the threshold must collect two distinct managerial approvals before it is reimbursed.

### 1.2 User Story

- **As a financial controller**, I want claims above 50,000.00 THB to require two distinct reviewers
  before approval, so that high expenditure receives dual scrutiny.
- **As a second reviewer**, I want to find the claims waiting on me, read what the first reviewer
  wrote, and approve or reject them.

---

## 2. Invariants & Business Rules

1. **`BR-09` Dual control threshold, 50,000.00 THB.**
   - A claim whose `totalAmount` is **at or below** 50,000.00 THB keeps the Sprint 1 path: one
     approval by the assigned reviewer moves it from `SUBMITTED` straight to `APPROVED`.
   - A claim whose `totalAmount` is **strictly above** 50,000.00 THB takes the two stage path: the
     first approval moves it from `SUBMITTED` to `PENDING_SECOND_APPROVAL`, and a second approval by
     a distinct reviewer moves it to `APPROVED`.
   - The comparison is on `totalAmount`, which the server calculates (`BR-04`). A claim of exactly
     50,000.00 THB is a single stage claim. `DEC-08` fixed this value and its strictness.
   - **The comparison is made on the `Decimal`, never on a number converted from it.**
     `target.totalAmount.gt(50000)`, not `Number(target.totalAmount) > 50000`. `SR-04` and `DEC-04`
     keep money as `Decimal` end to end for exactly this reason, and a boundary fixed to the satang
     is the one place where a float conversion would be both wrong and hard to find: `TEST-60` at
     50,000.00 and `TEST-61` at 50,000.01 are a single satang apart.
2. **Segregation of duties.**
   - **`BR-01` holds at both stages.** Neither the first nor the second reviewer may be the
     requester. HTTP 403 `SELF_APPROVAL`.
   - **Dual control.** The second reviewer may not be the first reviewer. The refusal code and its
     place in the guard order are specified in section 4.4, because the obvious answer is wrong.
   - The second reviewer must hold the `REVIEWER` role, the same condition `submit` already applies
     to the first (`submit/route.ts:80`).
3. **`BR-05` extends to the second stage.** Only the reviewer named for a stage may act on that
   stage. A reviewer who is named for neither is refused exactly as they are today.
4. **Audit trail.** Each stage appends one `ApprovalHistory` row:
   - stage one approval: `SUBMITTED` to `PENDING_SECOND_APPROVAL`, action `APPROVE_STAGE_1`
   - stage two approval: `PENDING_SECOND_APPROVAL` to `APPROVED`, action `APPROVE_STAGE_2`
   - rejection at either stage: the status the claim was in, to `REJECTED`, action `REJECT`
   A single stage approval keeps action `APPROVE` and is unchanged, so `TEST-30` and `TEST-36` stay
   green untouched.
5. **Reason length.** Every stage two decision carries a reason of at least
   `MIN_DECISION_COMMENT_LENGTH` characters, the same 5 that governs approve and reject today
   (`src/lib/review-rules.ts:13`). `BR-07`'s higher threshold belongs to `RETURN` alone and is not
   extended here.

---

## 3. State Transition Model

```
Claim at or below 50,000.00 THB
[ SUBMITTED ] -- reviewer 1 approves --> [ APPROVED ]
              -- reviewer 1 rejects  --> [ REJECTED ]

Claim above 50,000.00 THB
[ SUBMITTED ] -- reviewer 1 approves --> [ PENDING_SECOND_APPROVAL ]
              -- reviewer 1 rejects  --> [ REJECTED ]

[ PENDING_SECOND_APPROVAL ] -- reviewer 2 approves --> [ APPROVED ]
                            -- reviewer 2 rejects  --> [ REJECTED ]
```

`RETURN` is not offered at the second stage. `F-05` defines it as a transition out of `SUBMITTED`
only, and a claim that has already collected one approval cannot be sent back for revision without
invalidating that approval. This is a deliberate exclusion, not an omission.

---

## 4. Specifications

### 4.1 How the second reviewer is named

This is the question version 1.0 left open, and leaving it open would have shipped the feature stuck.
`secondReviewerId` was specified as a nullable column with nothing to fill it, so a claim would reach
`PENDING_SECOND_APPROVAL` with the field still null and no caller would ever satisfy the stage two
guard. That is the same shape of defect as `TD-05` in `F-05`, where two seeded claims can never be
returned because no caller can pass the guards.

Three designs were considered.

| design | why not |
| :--- | :--- |
| The requester names both reviewers at submit time | Forces every requester to predict whether their claim crosses a threshold they do not calculate, since `BR-04` makes the server the authority on `totalAmount`. Also changes the submit contract for all claims to serve a minority of them |
| Any reviewer who is neither the requester nor the first reviewer may approve stage two | Removes the stuck claim, but also removes dual control as an assignment: nobody is accountable for the second decision and `BR-05` stops meaning anything at stage two |
| **The first reviewer names the second when approving stage one** | **Chosen** |

**Chosen design.** When the assigned reviewer approves a claim above the threshold, the request body
carries `secondReviewerId`. The server validates that the named user exists, holds `REVIEWER`, is not
the requester, and is not the caller, then writes the status and the field in the same transaction.
The decision stays with the person who has just read the claim, and the field is never null while the
status is `PENDING_SECOND_APPROVAL`.

This mirrors `DEC-02 v2.0`, which already makes the submitting requester name their reviewer and
refuses self assignment. The validation here is the same shape and reuses the same error codes.

This changes the request body of an endpoint, so it was settled with the reviewer before any code
was written. The closing section of this document records the decision and who made it.

### 4.2 Schema impact

| change | file | note |
| :--- | :--- | :--- |
| Add `PENDING_SECOND_APPROVAL` to `enum RequestStatus` | `prisma/schema.prisma:15` to `:21` | The enum currently holds `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `RETURNED` |
| Add `secondReviewerId String?` and the `secondReviewer` relation to `ExpenseRequest` | `prisma/schema.prisma` | Named relation, because `User` already relates to `ExpenseRequest` twice |
| Extend the trailing comment on `ApprovalHistory.action` | `prisma/schema.prisma:78` | Now reads `SUBMIT, APPROVE, REJECT, RETURN, RESUBMIT` after `F-05`; add `APPROVE_STAGE_1, APPROVE_STAGE_2` |

A migration is required, unlike `F-05`. `prisma/migrations/<timestamp>_add_second_approval_stage/`.
Both authors agreed that migrations are written by the owner of `F-06` alone, so no second migration
is created in parallel.

### 4.3 What reading the source turned up

These are the reasons this document is longer than a restatement of the Issue. Each was found by
opening `src/app/api/requests/[id]/review/route.ts`, not inferred from the documents.

1. **Step 4, line 72, refuses the second reviewer.** `if (target.assignedReviewerId !== sessionUser.id)`
   answers 403 `FORBIDDEN`. The second reviewer is not `assignedReviewerId`, so stage two is refused
   before anything else is read. The guard has to select the expected actor by status: the assigned
   reviewer while `SUBMITTED`, the second reviewer while `PENDING_SECOND_APPROVAL`.
2. **Step 5, line 82, refuses the status.** `if (target.status !== RequestStatus.SUBMITTED)` answers
   400 `INVALID_TRANSITION`. `PENDING_SECOND_APPROVAL` has to be admitted here, and only for
   `APPROVE` and `REJECT`.
3. **The transaction re-checks `SUBMITTED`, line 154.**
   `updateMany({ where: { id, status: RequestStatus.SUBMITTED } })` would match zero rows at stage
   two and throw `AlreadyDecidedError`, which is answered as 400. The condition has to carry the
   status the caller was authorised against.
4. **`fromStatus` is hard coded at line 179.** `fromStatus: RequestStatus.SUBMITTED` is correct for
   stage one and wrong for stage two, which starts from `PENDING_SECOND_APPROVAL`. This is the same
   defect `F-05` corrected in `submit/route.ts`, where `fromStatus` was hard coded to `DRAFT`, and it
   fails the same way: the status transition would look right while the audit trail recorded a
   transition that never happened.
5. **`AlreadyDecidedError` answers "Only a submitted request can be approved, rejected or returned".**
   `F-05` already widened that sentence once. It stops being accurate again once a claim pending a
   second approval can also be decided.
6. **`canViewRequest` cannot see a second reviewer.** `src/lib/authorization.ts:38` returns
   `request.requesterId === userId || request.assignedReviewerId === userId`. The second reviewer is
   neither, so `DEC-03` answers 404 `NOT_FOUND` and they cannot open the claim they are supposed to
   decide. This blocks the journey in the same way the Locked label on the requester list blocked
   `F-05`, and it was found by KaiDaoMuKrobb while reviewing this contract, not by its author.
7. **Three separate reviewer conditions in `src/app/api/requests/route.ts`.** The queue view at
   `:103` to `:107`, the general list view at `:116` to `:119`, and the statistics `groupBy` at
   `:192` to `:194` each decide independently what a reviewer may see. All three have to learn about
   the second reviewer, and section 5 states exactly how, because getting one of the three wrong
   produces a list and a set of counters that disagree with each other.

Confirmed and deliberately **unchanged**: step 3 at line 63 refuses the requester before any
reviewer check, so `BR-01` covers stage two with no edit; `GET /api/requests` validates `status`
against `Object.values(RequestStatus)`, so `?status=PENDING_SECOND_APPROVAL` needs no API change; and
the detail page already renders `ApprovalHistory`, so both stage rows are visible with no new read
path.

### 4.4 Guard order at the second stage

`DEC-06` fixes the order 401, 404, 403, 400, and the order decides which refusal a caller sees. Version 1.0
specified HTTP 400 `DUPLICATE_APPROVER` for the first reviewer attempting stage two, which the
guard order makes unreachable: the first reviewer is not the named second reviewer, so step 4 answers
403 `FORBIDDEN` before any 400 is considered.

Two options existed and the reviewer chose between them.

| option | result for reviewer 1 at stage 2 | cost |
| :--- | :--- | :--- |
| **A. Accept the guard order** | 403 `FORBIDDEN`, the same answer any unrelated reviewer gets | No new error code, no change to `system-sds.md`, dual control still enforced because the status never moves. The refusal does not say *why* |
| B. Special case before step 4 | 400 `DUPLICATE_APPROVER` | A new code in the shared error vocabulary, a documented exception to `DEC-06`, and a precedent for reordering guards per feature |

**Option A was chosen** and `AC-63` is written against 403 `FORBIDDEN`. `F-04` already set this
precedent: `TEST-38` exists precisely to prove that a caller who fails two guards at once is told
about whichever ran first, and `DEC-06` was written so that answer is predictable rather than decided
per feature. Option B is recorded here because the instinct behind it was sound, and because a later
reader deserves to know the alternative was weighed rather than missed.

### 4.5 Endpoint specification

`POST /api/requests/:id/review`

| step | condition | answer |
| :--- | :--- | :--- |
| 1 | no session | 401 `UNAUTHENTICATED` |
| 2 | claim does not exist | 404 `NOT_FOUND` |
| 3 | caller is the requester | 403 `SELF_APPROVAL` |
| 4 | status `SUBMITTED` and caller is not `assignedReviewerId`, or status `PENDING_SECOND_APPROVAL` and caller is not `secondReviewerId` | 403 `FORBIDDEN` |
| 5 | status is neither `SUBMITTED` nor `PENDING_SECOND_APPROVAL` | 400 `INVALID_TRANSITION` |
| 5b | status is `PENDING_SECOND_APPROVAL` and action is `RETURN` | 400 `INVALID_TRANSITION` |
| 6 | body missing, action unrecognised, or reason shorter than the threshold for the action | 400 `VALIDATION_ERROR` |
| 6b | status `SUBMITTED`, action `APPROVE`, `totalAmount` strictly above the threshold, and `secondReviewerId` is missing, is not a `REVIEWER`, is the requester, or is the caller | 400 `VALIDATION_ERROR` |
| 7 | written | 200 `OK` |

Request body gains one optional field:

```
{ action: 'APPROVE' | 'REJECT' | 'RETURN', comment: string, secondReviewerId?: string }
```

`secondReviewerId` is required **only** in the case at step 6b, and is ignored otherwise. All three
conditions must hold before it is demanded: the action is `APPROVE`, the status is `SUBMITTED`, and
the total is strictly above the threshold. A rejection, a return, a second stage decision, or an
approval of a claim at or below the threshold must not require it. Requiring it on every `APPROVE`
would break single stage approval, which `TEST-30` would catch, and requiring it at stage two would
break `AC-62`.

The refusal at step 6b is 400 `VALIDATION_ERROR` in every case, including when the first reviewer
names themselves. `SELF_ASSIGNMENT` is not reused here: `docs/system-sds.md` defines it as *"Requester
selecting themselves as the assigned reviewer at submission"*, which is about the requester at submit
time, and widening that definition to cover a reviewer at decision time would change the meaning of a
code in the shared error vocabulary for one feature's convenience.

---

## 5. Interface Work

The hand written status union omits `PENDING_SECOND_APPROVAL` in the same five files `F-05` had to
widen. Two of them key a `Record<...['status'], string>`, so the compiler demands the new entry and
those two cannot be missed silently.

| file | work | owner |
| :--- | :--- | :--- |
| `src/components/ReviewDecisionPanel.tsx` | Widen the union. When the claim is `SUBMITTED` and above the threshold, offer a second reviewer selector beside the comment box, populated from `/api/reviewers`, excluding the requester and the viewer. When the claim is `PENDING_SECOND_APPROVAL`, render for the second reviewer only | siripitch-c |
| `src/app/requests/[id]/page.tsx` | Widen the union, add the `PENDING_SECOND_APPROVAL` entry to `STATUS_STYLES`, and show who the second reviewer is | siripitch-c |
| `src/lib/review-queue.ts` | Widen the union and teach `selectReviewQueue` about the second stage. **This does not block anything.** Versions 1.1 and 1.2 of this document said it did, and that was wrong: no file under `src/` imports this helper. The queue a reviewer actually sees is built server side in `src/app/api/requests/route.ts`, and `TD-04` in the Part A register already proposes removing this file for that reason. The change is kept so the helper and its unit test stay truthful while it exists | siripitch-c |
| `src/lib/authorization.ts` `:38` | **Blocks the feature.** `canViewRequest` admits the requester and the assigned reviewer only, so the second reviewer is answered 404 under `DEC-03` and never reaches the claim. Add the second reviewer to the condition. Nothing else about `DEC-03` changes: an unrelated reviewer is still answered 404 | siripitch-c |
| `src/components/ReviewerQueue.tsx` | Widen the union at `:9`, add the status to the class map at `:19` beside the `RETURNED` entry | request from KaiDaoMuKrobb |
| `src/app/requests/page.tsx` | Widen the union at `:38`, add a case to `getStatusBadge`, add the status to the `F-07` filter options | request from KaiDaoMuKrobb |
| `src/app/api/requests/route.ts` `:103`..`:107` | **Blocks the feature.** This is the real queue, not `review-queue.ts`. The reviewer queue selects `{ assignedReviewerId, requesterId: { not: self }, status: SUBMITTED }`. It becomes an `OR` of that and `{ secondReviewerId: self, requesterId: { not: self }, status: PENDING_SECOND_APPROVAL }`. **`requesterId: { not: self }` has to survive on both branches**, or a reviewer meets their own claim in their queue and the `TEST-28` family fails | request from KaiDaoMuKrobb |
| `src/app/api/requests/route.ts` `:116`..`:119` | The general list view for a reviewer is `OR: [{ requesterId: self }, { assignedReviewerId: self }]`, with no status condition. `{ secondReviewerId: self }` joins it as a third branch, otherwise the second reviewer cannot see the claim in their own list either | request from KaiDaoMuKrobb |
| `src/app/api/requests/route.ts` `:171`..`:179` | The list query includes `items`, `requester`, `assignedReviewer` and `history`, but not `secondReviewer`. Correcting the `where` clauses alone returns rows that carry no second reviewer, so neither the screen nor `selectReviewQueue` can tell who a claim is waiting on | request from KaiDaoMuKrobb |
| `src/app/api/requests/route.ts` `:192`..`:194` | The statistics `groupBy` repeats the queue condition inline. It has to be changed in step with `:103`, or the counters on the tiles disagree with the rows underneath them. The statistics object also carries `drafts`, `submitted`, `approved`, `rejected` and `returned` only, so a claim pending a second approval is counted and then dropped by the mapping loop | request from KaiDaoMuKrobb |

The last six are requests, not changes. They are raised with the file, the line and the expected
result, exactly as the four `F-05` requests were, and all four of those were delivered in PR #53.

---

## 6. Document Revisions

Row 9 is the one to read first. `docs/traceability.md` already carries six per criterion rows
for this feature, written from version 1.0, and two of them give `AC-64` and `AC-65` different
meanings from the ones in section 7 below. `F-05` hit exactly this and it took a round of review to
clear, so it is stated here before any code is written rather than discovered afterwards.

| # | document | currently says | becomes | who |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `docs/srs.md` `BR-02` state machine | `DRAFT` to `SUBMITTED` to `APPROVED` or `REJECTED`, plus the `RETURNED` branch `F-05` added | Add the `PENDING_SECOND_APPROVAL` branch | siripitch-c, separate commit |
| 2 | `docs/srs.md` `BR-09` | Set to `> 50,000.00` and `PENDING_SECOND_APPROVAL` by PR #51 | Stays as written. Confirmed correct, no edit | none |
| 3 | `docs/system-sds.md` ERD, `ApprovalHistory.action` | `SUBMIT, APPROVE, REJECT, RETURN, RESUBMIT` after PR #53 | Add `APPROVE_STAGE_1, APPROVE_STAGE_2` | request from KaiDaoMuKrobb |
| 4 | `docs/system-sds.md` ERD, `ExpenseRequest` | No second reviewer | Add `secondReviewerId` | request from KaiDaoMuKrobb |
| 5 | `docs/system-sds.md` role matrix | `/api/requests/:id/review` row describes one reviewer | Describe the second reviewer's row | request from KaiDaoMuKrobb |
| 6 | `docs/features.md` rows for `F-06` (line 46), `FR-07` (line 83) and `BR-09` (line 95) | `specified` | `verified` | siripitch-c, separate commit |
| 7 | `docs/traceability.md` `FR-07` row, line 43 | `AC-60` .. `AC-65`, `TEST-60` .. `TEST-65`, `specified` | `AC-60` .. `AC-69` and the full test list, `verified` | siripitch-c, separate commit |
| 8 | `docs/traceability.md` `BR-09` row, line 61 | `AC-60` .. `AC-63` | Add `AC-66` and `AC-67`, which are the dual control validation, then `verified` | siripitch-c, separate commit |
| 9 | `docs/traceability.md` per criterion rows, lines 188 to 193 | Six rows, `AC-60` to `AC-65` | **`AC-64` and `AC-65` do not mean here what they mean in this contract.** The matrix has `AC-64` as the audit trail and `AC-65` as rejection at the second stage; this contract has `AC-64` as rejection, `AC-65` as the requester refusal and `AC-68` as the audit trail. The six rows are rewritten to match this document and four more are added for `AC-66` to `AC-69` | siripitch-c, separate commit |
| 10 | `docs/traceability.md` `SR-05` row, line 77 | Cites `AC-64` and `TEST-64` for the audit trail | Becomes `AC-68` and `TEST-68`, following row 9 | siripitch-c, separate commit |

---

## 7. Acceptance Criteria (`AC-60` to `AC-69`)

`AC-60` to `AC-65` are taken from the draft by KaiDaoMuKrobb and are adopted here, with `AC-63`
rewritten to match the guard order. `AC-66` to `AC-69` are added.

- **`AC-60` (Exactly at the boundary stays single stage):**
  *Given* a `SUBMITTED` claim whose total is exactly 50,000.00
  *When* the assigned reviewer approves it
  *Then* the status becomes `APPROVED` in one step and no second reviewer is required.

- **`AC-61` (Above the boundary takes two stages):**
  *Given* a `SUBMITTED` claim whose total is 50,000.01 or more
  *When* the assigned reviewer approves it, naming a valid second reviewer
  *Then* the status becomes `PENDING_SECOND_APPROVAL` and `secondReviewerId` is set.

- **`AC-62` (The second reviewer approves):**
  *Given* a claim in `PENDING_SECOND_APPROVAL`
  *When* its named second reviewer approves with a valid reason
  *Then* the status becomes `APPROVED`.

- **`AC-63` (The first reviewer cannot approve twice):**
  *Given* a claim in `PENDING_SECOND_APPROVAL` approved at stage one by reviewer A
  *When* reviewer A attempts the second approval
  *Then* the server answers 403 `FORBIDDEN` under the `DEC-06` order and the status is unchanged.

- **`AC-64` (Rejection at the second stage):**
  *Given* a claim in `PENDING_SECOND_APPROVAL`
  *When* its second reviewer rejects it with a valid reason
  *Then* the status becomes `REJECTED`.

- **`AC-65` (The requester cannot approve at either stage):**
  *Given* a claim in `PENDING_SECOND_APPROVAL`
  *When* its requester attempts to approve
  *Then* the server answers 403 `SELF_APPROVAL`, because step 3 runs before step 4.

- **`AC-66` (A second reviewer must be named for a high value approval):**
  *Given* a `SUBMITTED` claim above the threshold
  *When* the assigned reviewer approves without `secondReviewerId`
  *Then* the server answers 400 `VALIDATION_ERROR` and nothing is written.

- **`AC-67` (The first reviewer cannot name themselves):**
  *Given* the same claim
  *When* the assigned reviewer approves naming themselves as second reviewer
  *Then* the server answers 400 `VALIDATION_ERROR` and nothing is written.

- **`AC-68` (Both stages are audited):**
  *Given* a high value claim carried through both approvals
  *When* its `ApprovalHistory` is read
  *Then* it holds, in order, `SUBMITTED` to `PENDING_SECOND_APPROVAL` with action `APPROVE_STAGE_1`,
  then `PENDING_SECOND_APPROVAL` to `APPROVED` with action `APPROVE_STAGE_2`, each carrying its
  actor and reason.

- **`AC-69` (The second reviewer can find the claim):**
  *Given* a claim in `PENDING_SECOND_APPROVAL`
  *When* its named second reviewer opens the reviewer dashboard
  *Then* the claim is listed, and it is not listed for the first reviewer or any unrelated reviewer.

  The binding evidence for this criterion is `TEST-69b`, the interface check, together with the
  three corrections to `src/app/api/requests/route.ts` in section 5. `TEST-69` exercises
  `selectReviewQueue`, a helper no source file imports, so it documents the rule without proving
  what a reviewer sees.

---

## 8. Software Test Specification

All API cases live in a new file, `tests/api/requests-second-approval.test.ts`. That exact name is
already written into `docs/traceability.md` as this feature's planned suite, so the matrix and this
contract agree from the start. `F-05` used the singular form for its own file; matching the name
already recorded matters more than matching that pattern, because a mismatch is what cost `F-05` a
round of review across fourteen rows. `tests/api/request-crud.test.ts` is shared and append only,
and nothing in it is modified.

| Test ID | AC | Type | Precondition and input | Expected outcome |
| :--- | :--- | :--- | :--- | :--- |
| **`TEST-60`** | `AC-60` | API | Claim of exactly 50,000.00, Carol approves | 200, status `APPROVED`, one history row, action `APPROVE` |
| **`TEST-60b`** | `AC-60` | API | Claim at or below the threshold, Carol approves with no `secondReviewerId` | 200, status `APPROVED`. The field is not demanded below the boundary |
| **`TEST-61`** | `AC-61` | API | Claim of 50,000.01, Carol approves naming David | 200, status `PENDING_SECOND_APPROVAL`, `secondReviewerId` is David |
| **`TEST-62`** | `AC-62` | API | The claim from `TEST-61`, David approves | 200, status `APPROVED` |
| **`TEST-62b`** | `AC-62` | API | The claim from `TEST-61`, David opens it through `GET /api/requests/:id` | 200. `canViewRequest` admits the second reviewer, so `DEC-03` does not hide the claim from its decider |
| **`TEST-63`** | `AC-63` | API | The same claim, Carol attempts the second approval | 403 `FORBIDDEN`, status unchanged, no history row |
| **`TEST-64`** | `AC-64` | API | The same claim, David rejects with a reason | 200, status `REJECTED` |
| **`TEST-65`** | `AC-65` | API | The same claim, Alice the requester attempts to approve | 403 `SELF_APPROVAL`, status unchanged |
| **`TEST-66`** | `AC-66` | API | Claim above the threshold, Carol approves with no `secondReviewerId` | 400 `VALIDATION_ERROR`, status still `SUBMITTED`, no history row |
| **`TEST-66b`** | `AC-66` | API | Same, naming a user who is a `REQUESTER` | 400 `VALIDATION_ERROR` |
| **`TEST-67`** | `AC-67` | API | Same, Carol names Carol | 400 `VALIDATION_ERROR` |
| **`TEST-67b`** | `AC-67` | API | Same, Carol names Alice, the requester | 400 `VALIDATION_ERROR` |
| **`TEST-68`** | `AC-68` | API | Read `ApprovalHistory` after both approvals | Two rows in order with the actions, statuses, actors and reasons of `AC-68` |
| **`TEST-69`** | `AC-69` | Unit | `selectReviewQueue` over a `PENDING_SECOND_APPROVAL` claim, called as David, as Carol, and as an unrelated reviewer | Listed for David only. The helper is not imported by any source file, so this proves the rule, not the screen |
| **`TEST-69b`** | `AC-69` | UI | The second reviewer opens the dashboard and the detail page, decides, and the requester sees the outcome | Manual check, captured as dated evidence |

**Regression suites that must stay green and are not modified:** `TEST-30`, `TEST-30b`, `TEST-30c`
and `TEST-36` (single stage approval and rejection, the decision response, and the reason requirement
on an approval, all on the code path this feature edits), `TEST-31` and `TEST-38` (`BR-01` and the
`DEC-06` order), `TEST-33` and `TEST-34` (`BR-05`), `TEST-35` and `TEST-35b` (reason required,
action validated), `TEST-50` to `TEST-59` (`F-05`), `TEST-70`..`TEST-76`, `TEST-76b`, `TEST-78` and
`TEST-79` (`F-07`; there is no `TEST-77`), and `TEST-80` to `TEST-85` (`F-08`).

`TEST-35b` deserves a second look before the code is written. `F-05` had to revise it once because it
used `RETURN` as its example of an unrecognised action. It now uses `ESCALATE`. `F-06` adds no new
action name to the request body, so the case should stay green untouched, but it is listed here so
the check is deliberate rather than accidental.

---

## 9. Definition of Done

| # | Condition | Evidence |
| :--- | :--- | :--- |
| 1 | This contract is reviewed and approved **before** any implementation commit, and the open design question in section 4.1 and the choice in section 4.4 are both settled in that review | Review timestamp precedes the first code commit |
| 2 | `TEST-60` to `TEST-69`, plus `TEST-60b`, `TEST-62b`, `TEST-66b` and `TEST-67b`, are committed **failing** against unmodified code. `TEST-69b` is the manual check and is not part of this item | Red commit id and its captured run, by test ID |
| 3 | The implementation makes them pass with no test weakened, deleted or skipped | Green commit id and its captured run |
| 4 | The whole suite is green, including the regression list in section 8 | `npm test` output with passed, failed and skipped counts |
| 5 | The migration applies cleanly from an empty database and on top of the current one | Migration name and the output of both runs |
| 6 | `TEST-69b` is performed on the running application and dated | Captioned screenshots naming role, starting status, expected and actual result |
| 7 | The document revisions owned here are made in **separate commits** from the code | Separate commit ids |
| 8 | The requests in sections 5 and 6 are sent to KaiDaoMuKrobb and either resolved or disclosed as remaining | Message with file, line and expected result, and the Pull Request description records what was granted |
| 9 | `docs/traceability.md` carries `F-06` as `pass` with the suite figure and the AC to test mapping | Updated rows, in their own commit |
| 10 | The PR into `staging` is reviewed substantively by KaiDaoMuKrobb, CI is green, and it is **merged by the reviewer, not the author** | PR id, reviewer, review body, CI run id |
| 11 | Issue #47 closed, referencing the merge | Issue timeline |

---

## 10. Revision History

| Version | Date | Author | Summary of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 27 Nov 2026 | KaiDaoMuKrobb | Initial contract, written for `F-06` while its owner was working on `F-05` and proposed in PR #51. Established the problem statement, the two stage model, the 50,000.00 boundary with `AC-60` and `AC-61` either side of it, the dual control invariant, the schema additions and `TEST-60` to `TEST-65`. The structure and most of the acceptance criteria in this document come from that version. |
| 1.1 | 28 Nov 2026 | siripitch-c | Revised by the feature owner after verifying every claim against `origin/staging`. **Answered the open question of who names the second reviewer** in section 4.1: the draft added `secondReviewerId` with nothing to populate it, so a claim would have reached `PENDING_SECOND_APPROVAL` with the field null and no caller able to satisfy the stage two guard, the same shape as `TD-05` in `F-05`. Three designs are compared and the first reviewer names the second at stage one approval, which changes the request body and therefore needs agreement in review. **Rewrote `AC-63`**: the draft specified 400 `DUPLICATE_APPROVER`, which `DEC-06` makes unreachable because step 4 answers 403 first, and the code is not in the shared error vocabulary; section 4.4 sets out both options and specifies the one that needs no new code. **Added section 4.3**, five statements in `review/route.ts` that this feature contradicts, including the hard coded `SUBMITTED` in the transaction re-check at line 154 and in `fromStatus` at line 179, the second of which is the same defect `F-05` corrected in `submit/route.ts`. **Added section 5**, the interface work, including `review-queue.ts:33`, which filters the queue to `SUBMITTED` and would have left every claim awaiting a second approval invisible to the reviewer who has to decide it. **Added section 6**, the document revisions, **`AC-66` to `AC-69`** for the second reviewer validation, the audit trail and queue visibility, **`TEST-66` to `TEST-69b`**, the regression list, and a Definition of Done. Corrected section 2 where rejection at the second stage was attributed to the assigned reviewer, and stated the reason length rule, which was unspecified. |
| 1.2 | 28 Nov 2026 | siripitch-c, from a review by KaiDaoMuKrobb | Both open questions from v1.1 are settled, and four code level risks raised in that review are folded in. **The first reviewer names the second at stage one approval** and **the first reviewer attempting stage two is answered 403 `FORBIDDEN`**, so no new error code is added and `DEC-06` keeps no exception. Two of the four risks were defects this contract had missed and are now sections 4.3 items 6 and 7: `canViewRequest` at `authorization.ts:38` admits only the requester and the assigned reviewer, so the second reviewer would have been answered 404 before ever seeing the claim, and `api/requests/route.ts` decides reviewer visibility in three independent places rather than one. Section 5 names all three with their line ranges and states that `requesterId: { not: self }` has to survive on both branches of the queue condition. Section 2 now requires the threshold comparison to be made on the `Decimal`. Step 6b is tightened: `secondReviewerId` is demanded only when the action is `APPROVE`, the status is `SUBMITTED` and the total is strictly above the threshold, and the refusal is `VALIDATION_ERROR` rather than `SELF_ASSIGNMENT`, since that code is defined for the requester at submit time and widening it for one feature would change a shared definition. Added `TEST-60b`, `TEST-62b` and `TEST-67b` for the boundary case that must not demand a second reviewer, for the second reviewer's read access, and for naming the requester. |
| 1.3 | 28 Nov 2026 | siripitch-c | Corrected after reviewing the implementation against this document. **Section 5 claimed `src/lib/review-queue.ts` blocked the feature. It does not.** No file under `src/` imports that helper: the queue a reviewer sees is built server side in `src/app/api/requests/route.ts`, and `TD-04` already proposes deleting the helper for exactly that reason. Versions 1.1 and 1.2 read the `SUBMITTED` filter in the file and assumed it was the queue without checking who called it, which is the same mistake this document has caught twice in other people's work. The row is corrected, `AC-69` now names `TEST-69b` and the route corrections as its binding evidence, and `TEST-69` is labelled as proving the rule rather than the screen. **Added a sixth request** to section 5: the list query at `:171` to `:179` does not include `secondReviewer`, so correcting the `where` clauses alone would return rows that cannot say who a claim is waiting on. Also records that the stage two `RETURN` refusal was implemented after the reason length check and moved ahead of it to match section 4.5, and that `tests/unit/review-buttons.test.tsx` gains the now required `totalAmount` field with no assertion changed. |

---

## Appendix. How the two open questions were settled

Definition of Done item 1 asks for the design questions to be settled before any code is written.
Both were, in the review conversation on 28 November 2026, and the outcome is recorded here rather
than left to the commit history.

1. **Who names the second reviewer.** The first reviewer names them when approving stage one.
   Agreed by KaiDaoMuKrobb, who also confirmed that this keeps `BR-05` meaningful at the second stage
   and prevents a claim reaching `PENDING_SECOND_APPROVAL` with nobody able to decide it.
2. **What the first reviewer sees when attempting stage two.** 403 `FORBIDDEN`, under the `DEC-06`
   order. Agreed, and `AC-63` and `TEST-63` are written against it. No `DUPLICATE_APPROVER` code is
   added to the shared error vocabulary and `DEC-06` keeps no per feature exception.

The same review raised four code level risks. Two of them, `canViewRequest` and the three reviewer
conditions in `api/requests/route.ts`, were defects in version 1.1 of this document and are now
sections 4.3 items 6 and 7.
