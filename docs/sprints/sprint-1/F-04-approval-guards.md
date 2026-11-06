# F-04 — Approval Workflow & Business Rule Guards

> **Feature Engineering Contract (Part E)** · Sprint 1 · Owner: **siripitch-c** · Issue #4
> Branch: `feat/F-04-approval-guards`
> Repository path: `docs/sprints/sprint-1/F-04-approval-guards.md`
>
> Written **before** implementation as D1 §3.5 requires. Commit this file before any implementation commit.
> This feature carries three of the project's six business rules and is the most heavily assessed piece of
> Sprint 1.

---

## 1. Requirements this feature satisfies

| Type | ID | Statement |
| :--- | :--- | :--- |
| FR | `FR-05` | A Reviewer approves or rejects an assigned request with a reason, recorded in `ApprovalHistory` |
| BR | `BR-01` | Nobody may decide a request they raised → `403 SELF_APPROVAL` |
| BR | `BR-02` | Only transitions the state machine permits → `400 INVALID_TRANSITION` |
| BR | `BR-05` | A reviewer who is not assigned may not **decide** → `403 FORBIDDEN` (the **read** half lives in `F-03`) |
| DEC | `DEC-06` | The fixed check order `401 → 404 → 403 → 400` is enforced at this endpoint |
| E2E | `E2E-02` | A reviewer opens an assigned request and approves it successfully |

---

## 2. Scope and behaviour

### 2.1 What this feature delivers
1. `POST /api/requests/:id/review`, accepting `APPROVE` or `REJECT`
2. The three guards enforcing `BR-01`, `BR-02` and `BR-05`
3. One `ApprovalHistory` row written on every successful decision
4. **Approve and Reject controls plus a comment field, added to the existing `/requests/[id]` page built by
   `F-03`** — not a new page
5. The Playwright journey `E2E-02`

### 2.2 Check order — the heart of this feature

The guards must run in exactly this order, as `DEC-06` fixes, because this is what makes both students'
code produce the same answer.

```
1. no session                              -> 401 UNAUTHENTICATED
2. request does not exist                  -> 404 NOT_FOUND
3. caller raised this request              -> 403 SELF_APPROVAL      (BR-01)
4. caller is not the assigned reviewer     -> 403 FORBIDDEN          (BR-05)
5. status is not SUBMITTED                 -> 400 INVALID_TRANSITION (BR-02)
6. action is neither APPROVE nor REJECT,
   or the comment is shorter than 5 chars  -> 400 VALIDATION_ERROR   (FR-05)
7. all checks pass -> status + ApprovalHistory row, in one transaction
                   -> 200
                   -> unless the request stopped being SUBMITTED in the
                      meantime, which is 400 INVALID_TRANSITION again
```

> **Why step 3 precedes step 4** — a reviewer who raised the request fails both checks. The answer must be
> `SELF_APPROVAL` because it is the more specific reason and the rule the course requires to be tested.
>
> **Why step 5 comes after steps 3 and 4** — a caller without permission must not learn whether the request
> has already been decided.
>
> **Why step 2 asks only whether the request exists, and not whether the caller may see it.** The read
> endpoint answers `404` to anyone who is neither the owner nor the assigned reviewer, so that refusal and
> absence are indistinguishable (`DEC-03`). This endpoint cannot do the same. `AC-33` is locked in
> agreement §9.4 and requires an **unrelated reviewer who tries to decide** to receive `403 FORBIDDEN`;
> agreement §6 states the same in the state matrix, and §7.4 lists `403` among the errors this endpoint may
> return while listing only `401` and `404` for `GET /api/requests/:id`. An unrelated reviewer cannot see
> the request, so if step 2 asked about visibility it would answer `404` and `AC-33` could never pass —
> `403 FORBIDDEN` would be unreachable at every endpoint in the product.
>
> What this costs: an authenticated caller who guesses a real id learns it is real, because an id that
> exists answers `403` and one that does not answers `404`. It discloses no field of the request and
> nothing at all to an anonymous caller, since step 1 precedes both. **This is not a local decision** —
> `docs/srs.md` `BR-05` and the access matrix in `docs/system-sds.md` §4 both state the split between the
> read path and the decide path explicitly. §9.5 lists exactly where.

### 2.3 On a successful decision

Both writes happen in **one transaction**.

| Write | Value |
| :--- | :--- |
| `ExpenseRequest.status` | `APPROVED` or `REJECTED` |
| New `ApprovalHistory` row | `fromStatus = SUBMITTED` · `toStatus` = the new status · `actorId` = the caller · `action` = `APPROVE` or `REJECT` · `comment` = the reason, which `FR-05` makes mandatory for both |

`ApprovalHistory` is **append only**. No endpoint in this product updates or deletes a row in it.

---

## 3. Layer specifications

### 3.1 Data layer

**No schema change.** This feature writes to `ExpenseRequest` and `ApprovalHistory` as `F-01` creates them
from agreement §5.

### 3.2 API layer

**`POST /api/requests/:id/review`**

```jsonc
// request
{ "action": "APPROVE", "comment": "Approved against the attached receipts" }
// action:  "APPROVE" | "REJECT"
// comment: REQUIRED for both actions, minimum 5 characters after trimming
```

```jsonc
// 200
{
  "success": true,
  "data": {
   "request": {
    "id": "uuid",
    "requestNumber": "EXP-2026-0001",
    "status": "APPROVED",
    "history": [
      { "action": "SUBMIT",  "fromStatus": "DRAFT",     "toStatus": "SUBMITTED",
        "comment": null, "actor": { "name": "Alice Requester" }, "createdAt": "..." },
      { "action": "APPROVE", "fromStatus": "SUBMITTED", "toStatus": "APPROVED",
        "comment": "Approved against the attached receipts",
        "actor": { "name": "Carol Manager" }, "createdAt": "..." }
    ]
   }
  }
}
```

> Nested under `data.request` to match the shape `F-02` shipped for every other request endpoint. One
> envelope convention across the API is what `SR-02` asks for.

| Situation | HTTP | `code` |
| :--- | :--- | :--- |
| No session | `401` | `UNAUTHENTICATED` |
| Not found, or not visible to the caller | `404` | `NOT_FOUND` |
| The caller raised this request | `403` | `SELF_APPROVAL` |
| A reviewer who is not the assigned one | `403` | `FORBIDDEN` |
| Status is not `SUBMITTED` | `400` | `INVALID_TRANSITION` |
| Bad `action`, or a decision without a reason | `400` | `VALIDATION_ERROR` |

> Step 2 here is **not** the question `GET /api/requests/:id` asks. The read handler asks *may this user
> see this request?* and answers `404` when the answer is no. This endpoint asks only *does this request
> exist?*, and lets steps 3 and 4 decide what the caller is entitled to do, because `AC-33` requires
> `403 FORBIDDEN` where the read handler requires `404`. The reasoning is in §2.2 and the baseline that
> fixes it is in §9.5. `canViewRequest` from `src/lib/authorization.ts` is therefore deliberately **not**
> called here — see §7.

### 3.3 UI layer

These controls are added to the `/requests/[id]` page that `F-03` builds.

| Condition | What the page shows |
| :--- | :--- |
| Viewer is the assigned reviewer and status is `SUBMITTED` | A comment field with **Approve** and **Reject** buttons |
| Viewer raised the request | **No decision controls at all** |
| Status is already `APPROVED` or `REJECTED` | No controls · the decision and its reason read from the history |
| While the request is in flight | The buttons are disabled so a second click cannot submit |
| On an error response | A safe message, no stack trace, and whatever was typed is still there |

> Hiding a button is **not** authorization. The course states that *"hiding a button does not prove
> authorization"*. Every guard lives in the API; the page merely avoids inviting a click that would be
> refused.

#### Two defects this feature found by opening the running page

Neither was visible to any test, and both were in screens `F-03` had already shipped and merged. They are
repaired here because `F-04` is what put a requester in front of these screens often enough to notice.

| Defect | What was happening | Fix |
| :--- | :--- | :--- |
| `/reviewer/dashboard` had no role guard | A requester who reached it was shown a page headed **Reviewer Dashboard**, with their own name and the role `REQUESTER` beneath it, and the empty state *"No requests are waiting for your review"* | The page now sends anyone who is not a `REVIEWER` to `/requests` before rendering |
| The review queue was not filtering by status | A request stayed in **ASSIGNED TO YOU** after it had been approved. `FR-04` says the queue is the *`SUBMITTED`* requests assigned to a reviewer, so this queue could never empty, and the empty state promising *"No requests are waiting for your review"* could only ever be seen by a reviewer who had never been assigned anything | The rule moved out of the page into `src/lib/review-queue.ts` and gained `TEST-28d` .. `TEST-28g`, the first of which is the success case. Seen by approving a claim and watching it stay in the table |
| The detail page always linked back to the reviewer dashboard | Both the header link and the not-found link were the fixed string `/reviewer/dashboard`, so a requester opening their own claim and pressing back landed on a screen built for somebody else | The destination and its label now follow the viewer: **Back to my claims** → `/requests` for a requester, **Back to dashboard** → `/reviewer/dashboard` for a reviewer. Until `/api/auth/me` resolves the claim list is used, because every account has one |

> The queue repair does have tests: `TEST-28d` (a `SUBMITTED` request assigned to the reviewer **is** in
> the queue — the success case), `TEST-28e` (`APPROVED`, `REJECTED` and `DRAFT` are not), `TEST-28f`
> (assigned elsewhere, raised by the reviewer, or unassigned are not) and `TEST-28g` (a mixed list keeps
> only the qualifying rows, in order), all in `tests/unit/review-queue.test.ts`.
>
> The other two have none. Both live in page components that fetch on mount, and this project has no
> request-mocking layer, which is why `F-03` moved the queue into a presentational component to make
> `AC-28` testable at all. Both were verified by signing in as Alice and as Carol against the running
> application, and the verification is recorded here rather than claimed as test coverage. **This is a
> known limitation of the suite**, not of the behaviour.

---

## 4. Acceptance Criteria

> Reserved range: `AC-30` .. `AC-39` · **`AC-31` to `AC-34` are fixed in agreement §9.4 and must not be
> renumbered**

| AC | Criterion |
| :--- | :--- |
| **`AC-30`** | **Given** Carol is the assigned reviewer of request X with status `SUBMITTED`<br>**When** she posts `{ action: "APPROVE", comment: "..." }` to `/api/requests/X/review`<br>**Then** `200` · status becomes `APPROVED` · a new `ApprovalHistory` row exists with `actorId = Carol` |
| **`AC-31`** 🔒 | **Given** David raised a request and assigned it to himself, status `SUBMITTED`<br>**When** he posts `APPROVE`<br>**Then** `403` · `code = SELF_APPROVAL` · **the status is still `SUBMITTED`** · no history row is added |
| **`AC-32`** 🔒 | **Given** request X is already `APPROVED` and Carol is its assigned reviewer<br>**When** she posts a decision again<br>**Then** `400` · `code = INVALID_TRANSITION` · the status is unchanged |
| **`AC-33`** 🔒 | **Given** request X is assigned to Carol, and David is a different reviewer<br>**When** David posts a decision<br>**Then** `403` · `code = FORBIDDEN` · the status is unchanged |
| **`AC-34`** 🔒 | **Given** Alice and Bob are different requesters<br>**When** Alice calls `GET /api/requests/{Bob's request}`<br>**Then** `404` · `code = NOT_FOUND` |
| **`AC-35`** | **Given** Carol is the assigned reviewer and the status is `SUBMITTED`<br>**When** she posts `{ action: "REJECT" }` with no comment<br>**Then** `400` · `code = VALIDATION_ERROR` · the status is unchanged. `FR-05` requires the reason on an **approval** too, which `TEST-30c` covers |
| **`AC-36`** | **Given** the same conditions<br>**When** she posts `{ action: "REJECT", comment: "Receipts incomplete" }`<br>**Then** `200` · status becomes `REJECTED` · the history row keeps the reason |
| **`AC-37`** | **Given** no session<br>**When** the endpoint is called<br>**Then** `401` · `UNAUTHENTICATED` · nothing in the database changes |
| **`AC-38`** | **Given** David, who holds the `REVIEWER` role, raised request X and assigned it to **Carol**, status `SUBMITTED`<br>**When** David posts a decision<br>**Then** `403` · `code = SELF_APPROVAL`, **not** `FORBIDDEN` — he fails `BR-01` and `BR-05` at the same time, so the answer names whichever guard ran first |
| **`AC-39`** | **Given** Carol is the assigned reviewer and `/requests/[id]` is open<br>**When** the status is `APPROVED`<br>**Then** the Approve and Reject controls are absent |

> **`AC-38` is the most important criterion in this contract**, and the only one that proves `DEC-06` was
> actually implemented. Every other criterion trips exactly one guard, so each would pass whatever order the
> guards are written in. `AC-38` trips two at once: David raised the request, which fails `BR-01`, and he is
> not the reviewer it was assigned to, which fails `BR-05`. Only the guard that runs first can name itself
> in the response, so the body it returns reports the order the code was written in. Written the wrong way
> round this test returns `FORBIDDEN` and fails, while the other nine still pass.
>
> This requires David to hold the `REVIEWER` role and to have assigned the request to **someone else**. If
> he had assigned it to himself he would satisfy `BR-05`, only `BR-01` would fire, and the test would return
> `SELF_APPROVAL` whichever order the guards were in — proving nothing. That is the scenario `AC-31` already
> covers, and keeping it here as well is what version 1.2 of this contract corrected.

### A note on `AC-34`

`AC-34` exercises the **read** path, whose implementation lives in `F-03`, but its number is fixed inside
F-04's range by agreement §9.4, so its test is written here. It does not duplicate `AC-26` of `F-03`: the
actors differ — `AC-26` is an **unrelated reviewer**, `AC-34` is **another requester**.

---

## 5. Software Test Specification

| Test ID | AC | Level | Precondition / input | Expected result |
| :--- | :--- | :--- | :--- | :--- |
| `TEST-30` | `AC-30` | API | Sign in as Carol · request assigned to her, `SUBMITTED` · `APPROVE` with comment | `200` · `status = APPROVED` · `history` one row longer · new row has `actorId = Carol` |
| `TEST-31` | `AC-31` | API | Sign in as David · request he raised and assigned to himself · `APPROVE` | `403` · `SELF_APPROVAL` · re-read shows `status` still `SUBMITTED` · history row count unchanged |
| `TEST-32` | `AC-32` | API | Sign in as Carol · request already `APPROVED` · `APPROVE` again | `400` · `INVALID_TRANSITION` · status unchanged |
| `TEST-33` | `AC-33` | API | Sign in as David · request assigned to Carol · `APPROVE` | `403` · `FORBIDDEN` · status unchanged |
| `TEST-34` | `AC-34` | API | Sign in as Alice · `GET` Bob's request | `404` · `NOT_FOUND` |
| `TEST-35` | `AC-35` | API | Sign in as Carol · `REJECT` with no comment | `400` · `VALIDATION_ERROR` |
| `TEST-36` | `AC-36` | API | Sign in as Carol · `REJECT` with a comment | `200` · `status = REJECTED` · history keeps the comment |
| `TEST-37` | `AC-37` | API | Send no cookie | `401` · `UNAUTHENTICATED` · status in the database unchanged |
| `TEST-38` | `AC-38` | API | Sign in as David · request David raised but **Carol** is assigned to · `APPROVE` | `403` · **`SELF_APPROVAL`**, not `FORBIDDEN` · status unchanged |
| `TEST-39` | `AC-39` | UI | Render the detail page as Carol with a request in status `APPROVED` | Approve and Reject controls are not in the document |
| `TEST-E2E-02` | `AC-30`, `AC-39` | E2E | Follow the `E2E-02` script in agreement §10 | Status on screen reads `APPROVED` · a new history row appears · the controls disappear |

### 5.1 Supplementary tests

These are written alongside the criteria above and exist in the same files. They are listed because a test
that exists only in the code is not specified, and because most of them are the **success** direction of a
rule whose refusal is already covered — a suite made only of refusals passes even when the feature does
nothing at all.

| Test ID | Covers | Level | Why it exists |
| :--- | :--- | :--- | :--- |
| `TEST-30b` | `DEC-04`, `SR-03` | API | The decision response must keep `totalAmount` a string, and must return the `SUBMIT` row as well as the new `APPROVE` row — proving the history was appended to, not replaced |
| `TEST-30c` | `FR-05` | API | `AC-35` only covers a rejection without a reason. `FR-05` in `docs/srs.md` says a reviewer decides *“with a mandatory comment”*, with no exception for approval, so an approval without one must be refused as well |
| `TEST-32b` | `BR-02` | API | `AC-32` only covers a terminal state. `DRAFT → APPROVED` is also not a permitted transition, and nothing else refuses it |
| `TEST-33b` | `DEC-06` | API | Agreement §6: an unrelated reviewer acting on a request already decided must get `403`, not `400`, because the permission guard precedes the state guard |
| `TEST-34b` | §2.2 step 2 | API | The one case where this endpoint answers `404`: an id that does not exist. It is what distinguishes step 2 from step 4 now that step 2 no longer asks about visibility |
| `TEST-35b` | §3.2 | API | `AC-35` covers `REJECT` with no reason. An `action` that is neither `APPROVE` nor `REJECT` is the other half of the same validation |
| `TEST-37b` | `DEC-06` | API | Step 1 precedes step 2, so an anonymous caller must get `401` for an id that does not exist — otherwise the difference between `401` and `404` tells them which ids are real |
| `TEST-39b` | `AC-39` success case | UI | The assigned reviewer of a `SUBMITTED` request **must** see the comment field and both buttons. Without this, a panel that renders nothing would pass every other UI test |
| `TEST-39c` | `BR-01` | UI | The person who raised the request sees no controls, even when they are also the assigned reviewer — the screen half of `AC-31` |
| `TEST-39d` | `BR-05` | UI | A reviewer who is not the assigned one sees no controls — the screen half of `AC-33` |
| `TEST-39e` | `BR-02` | UI | `AC-39` names `APPROVED`. `REJECTED` is the other terminal state and must behave identically |
| `TEST-39f` | `BR-02` | UI | A `DRAFT` request offers nothing to decide |
| `TEST-39g` | §3.3 | UI | The viewer is learned from `/api/auth/me` after the first paint. Until it resolves, no controls are offered, so a button never flashes at a viewer who may not use it |

> None of these replaces an API guard. Every case above is also refused by the endpoint in
> `tests/api/review-guards.test.ts`; the UI rows only prove the page does not invite a click that would be
> refused.

Test files

```
tests/api/review-success.test.ts     TEST-30, TEST-36
tests/api/review-guards.test.ts      TEST-31 .. TEST-35, TEST-37, TEST-38
tests/unit/review-buttons.test.tsx   TEST-39
tests/e2e/approval-journey.spec.ts   TEST-E2E-02
```

> `TEST-31`, `TEST-32`, `TEST-33` and `TEST-37` must **re-read the record from the database after the
> error** to prove there was no side effect. Asserting the status code alone is not enough.

---

## 6. Definition of Done

- [x] This contract is committed **before** any implementation commit — `ed77e62`, then the tests in
      `7755910`, then the implementation
- [x] `TEST-30` .. `TEST-39` and `TEST-E2E-02` are written and **have been run and failed first** —
      `3 failed | 6 passed (9)`, with the 35 pre-existing tests still green, captured from the terminal
- [x] The implementation makes every test pass — `10 passed (10)`, `62 passed (62)`
- [x] **`TEST-38` passes**, confirming the guard order matches `DEC-06` — and `AC-38` was rewritten in v1.2
      so that it can actually fail when the order is wrong
- [x] Every error path is proved to leave **no side effect** — every refusal test calls `expectNoSideEffect`,
      which re-reads the status and counts the history rows
- [x] A successful decision writes the status and the history row in one transaction — and the write repeats
      the `SUBMITTED` condition, so a second decision arriving between the check and the write changes
      nothing and is answered `400 INVALID_TRANSITION`
- [x] The decision controls are hidden in every case listed in §3.3 — `TEST-39`, `TEST-39c` .. `TEST-39g`,
      and `TEST-39b` proves they appear when they should
- [x] The read-side visibility rule has **one named home**, `canViewRequest` in `src/lib/authorization.ts`,
      and `GET /api/requests/:id` calls it — `TEST-24` .. `TEST-27` still pass. This endpoint deliberately
      does not call it, because step 2 here is an existence check; §7 says why, §2.2 and §9.5 say on whose
      authority
- [ ] A Pull Request is opened into `sprint-1-staging` and **KaiDaoMuKrobb reviews it naming a specific check**
- [x] The running application was opened and each case in §3.3 confirmed on screen, as a reviewer and as a
      requester — which is how the two defects recorded in §3.3 were found
- [x] Any incomplete work is stated rather than left silent — §9.6, and gaps 1, 4 and 5 in
      `docs/traceability.md` §4

---

## 7. Dependencies, sequencing and the shared visibility check

`F-04` depends on the API half of `F-03`: both endpoints work on the same record and the same statuses.

### The visibility check, and why this endpoint does not use it

The draft of this contract proposed extracting *may this user see this request?* into one function on the
grounds that `F-04` would need the same answer at step 2, and left the owner of the extraction open.
**Implementing the endpoint showed that premise to be wrong.** This endpoint does not ask that question at
all: `AC-33` requires an unrelated reviewer who tries to decide to receive `403 FORBIDDEN`, whereas the read
handler must answer `404` to the same person. Step 2 here is an existence check and nothing more.

The extraction was still made, and is still worth making, but for a narrower reason than the draft gave:

```
src/lib/authorization.ts     canViewRequest(request, userId): request is T
```

| | |
| :--- | :--- |
| **What it is** | The single named home of the read-side rule in `BR-05` and the zero-knowledge `404` of `DEC-03` |
| **Who calls it today** | `GET /api/requests/:id` only. `POST /api/requests/:id/review` deliberately does not |
| **Why extract it for one caller** | The rule had no name and no docstring while it sat inline in a route another feature owned. `F-05` (return and resubmission) asks exactly this question again, and the alternative was for it to copy the condition a second time |
| **What it is not** | A second copy removed. There was no duplicate to remove — the premise the draft was written on |

One place still expresses the same rule in another form: `GET /api/requests` (the list) states it as a
Prisma `where` clause rather than a predicate over a loaded row, so it cannot call this function. The two
agree today, and `TEST-21` .. `TEST-23` and `TEST-26`, `TEST-27` hold them to the same answers. **They are
not identical in shape, though:** the list branches on `role === 'REVIEWER'` while `canViewRequest` does
not look at the role at all. They cannot disagree while the submit endpoint refuses to assign a reviewer
who does not hold the `REVIEWER` role, which it does. Recorded here rather than unified, because unifying a
`where` clause and a predicate means a query builder, which is more machinery than the rule is worth.

Editing `src/app/api/requests/[id]/route.ts` is the only change `F-04` makes to a file another feature
shipped, it replaces one condition with one call and changes no behaviour, and `TEST-24` .. `TEST-27`
already cover that handler, so a mistake in the extraction fails an existing test rather than passing
silently.

---

## 8. Version history

Deliverable 1 Part E requires revisions to remain visible and justified, so every change to this contract
after it was first written is recorded here rather than left to the Git log alone.

| Version | Date | Change | Reason |
| :--- | :--- | :--- | :--- |
| 1.0 | 5 Nov 2026 | Contract drafted: requirements, check order, API and UI specifications, `AC-30`..`AC-39`, STS and Definition of Done | Drafted while `F-03` was in review so that no implementation would begin without a contract, as Part E requires |
| 1.1 | 6 Nov 2026 | §7 rewritten: the open proposal to extract the visibility check became a decision, with `F-04` named as the owner and `src/lib/authorization.ts` named as the file; §3.2 records that the new endpoint calls that function; §6 gained the matching Definition of Done item; §8 and §9 added | The proposal was written before `F-03` was implemented. `F-03` shipped the predicate inline, so the question the draft left open had to be answered before any code was written here, or the rule would exist in two places. Part E also asks for a version history on every contract, which the draft did not have |
| 1.2 | 6 Nov 2026 | `AC-38` and `TEST-38` rewritten: David now assigns the request to Carol instead of to himself, and must hold the `REVIEWER` role; the note explaining why `AC-38` matters was rewritten with the arithmetic of which guards fire | As drafted, `AC-38` described the same situation as the locked `AC-31` — David raising a request and assigning it to himself — and the claim attached to it was false. In that situation David **is** the assigned reviewer, so `BR-05` never fires, only `BR-01` does, and the endpoint answers `SELF_APPROVAL` no matter which order the guards are written in. The one criterion the contract calls its most important would have passed over a wrong implementation. `AC-38` is not in the locked set in agreement §9.4, so the scenario could be corrected rather than the number |
| 1.3 | 6 Nov 2026 | §5.1 added, specifying the twelve supplementary tests written alongside the ten criteria | `F-03` shipped four tests that existed in the code but in no document, so the specification did not describe everything the suite verified. Writing them down as they were written avoids repeating that. Six of the twelve are success cases or second halves of a rule whose refusal was already covered |
| 1.4 | 6 Nov 2026 | Step 2 of the check order in §2.2 narrowed from *“not found, or not visible to the caller”* to *“does not exist”*, with the reasoning recorded beneath it; `TEST-34b` repointed at a non-existent id; §9.5 added | As drafted, step 2 made the locked `AC-33` impossible to satisfy. An unrelated reviewer cannot see the request, so a visibility test at step 2 answers `404` and the `403 FORBIDDEN` that agreement §6, §7.4 and §9.4 all require would never be reachable. The contradiction is in the shared agreement, not only in this contract, so the resolution is recorded here and raised with KaiDaoMuKrobb rather than decided quietly |
| 1.5 | 6 Nov 2026 | §3.3 gained a subsection recording two defects found on the running screen and their repairs, both in files `F-03` had already merged; §6 gained a Definition of Done item requiring the screen to be opened | The implementation was complete and all 57 tests were green when the pages were opened as Alice and as Carol. A requester was being shown a screen headed *Reviewer Dashboard* describing itself as their review queue, and the back link on the detail page sent every viewer to that same screen. Neither is the kind of fault a component test can see, which is the point of the Definition of Done item now added |
| 1.6 | 6 Nov 2026 | The decision comment became mandatory for **both** `APPROVE` and `REJECT`, in §3.2, in the endpoint and in the panel; `TEST-30c` added; §9.5 rewritten after the baseline documents were re-read | `FR-05` in `docs/srs.md` reads *“can approve or reject a submitted request **with a mandatory comment**”* and draws no distinction between the two. This contract had narrowed it to rejection only, which would have shipped approvals with no recorded reason — the opposite of what `FR-05` and `SR-03` exist for. Found by re-reading the baseline against the finished code rather than by any test |
| 1.7 | 6 Nov 2026 | A third screen defect recorded in §3.3: the reviewer queue was not filtering by status. The rule moved to `src/lib/review-queue.ts` with `TEST-28d` .. `TEST-28g` | `FR-04` in `docs/srs.md` reads *“all **`SUBMITTED`** requests specifically assigned to them”*, and the dashboard filtered only on the assignment. An approved claim stayed in the queue, which also made the `AC-28` empty state unreachable in any normal demonstration. Found by approving a claim and looking at the dashboard afterwards. No test could have caught it: `TEST-28` and `TEST-28b` render the queue component directly and never see the selection, which is why the selection now has its own |
| 1.8 | 6 Nov 2026 | §7 rewritten again, §3.2's note inverted, and the matching Definition of Done item corrected | All three said the decision endpoint calls `canViewRequest`, and it does not. Version 1.1 made that decision before the endpoint existed, on the premise that step 2 would ask the same question as the read handler; v1.4 then established that it must not, and the three statements were left behind saying the opposite of what the code does. The extraction is kept, with the narrower justification it actually has, and the one place that still states the rule in another form — the list query — is named rather than left implied |

---

## 9. Coordination needed with KaiDaoMuKrobb before implementation

1. **`src/app/api/requests/[id]/route.ts` is edited by this feature.** The change is one condition
   replaced by a call to `canViewRequest`, with no change in behaviour, for the reason in §7. No other
   file belonging to `F-01` or `F-02` is touched. Two files `F-03` shipped are also changed, for the three
   defects recorded in §3.3.

2. **Ownership of the Request Detail page.** Settled in `F-03` §8.3: `F-04` adds the Approve and Reject
   controls to `/requests/[id]`, it does not create a second page.

3. **`AC-34` is a read-path criterion inside F-04's number range.** Its test is written here, as agreement
   §9.4 fixes the number, and it does not duplicate `AC-26`; see the note at the end of §4.

4. **Agreement §6 and §2.2 of this contract agree, and both were checked.** The state matrix says a caller
   without permission acting on a terminal-state request receives `403`, not `400`, because the permission
   guard always precedes the state guard. That is steps 3 and 4 before step 5 here.

5. **Agreement §7.2 step 2 reads as though it applies to this endpoint, and it does not.** Taken
   literally — *“not found **or not entitled to see that it exists**”* — it would answer `404` to an
   unrelated reviewer and make `403 FORBIDDEN` unreachable everywhere, contradicting the locked `AC-33`.
   The baseline documents in this repository are not ambiguous about it and were re-read before the code
   was written:

   | Where | What it says |
   | :--- | :--- |
   | `docs/srs.md`, `BR-05` | *“An unassigned reviewer attempting to **view** a request receives 404”* and *“An unassigned reviewer attempting to **decide** on a request receives 403 Forbidden”* — the split in one rule |
   | `docs/system-sds.md` §4, access matrix | `/api/requests/:id/review` answers **403** to Requester (Owner), Requester (Other) and Unrelated Reviewer alike, while `/api/requests/:id` (View) answers **404** to the same callers |
   | Agreement §6, §7.4, §9.4 | The state matrix, the endpoint error list and the locked `AC-33` all say `403` |

   So this is **not an open question** and nothing needs deciding here. The implementation follows the
   baseline: at `POST /review` step 2 asks only whether the request exists, and `GET /api/requests/:id` is
   untouched and still answers `404` to a stranger, which `AC-34` and `TEST-27` assert. What is worth
   raising with KaiDaoMuKrobb is only that **agreement §7.2 is a summary and reads as if it overrides
   them** — one clause there would stop the next person re-deriving this.

6. **What is knowingly left undone.**
   - `TEST-E2E-02` is written but has not been run. Running Playwright requires the development server and
     a seeded database, and the reviewer of this Pull Request is the natural person to run it — as happened
     with `TEST-E2E-01` during the review of PR #13. Gap 1 in `docs/traceability.md` records it.
   - The two repairs in §3.3 have no automated test. Both live in page components that fetch on mount and
     this project has no request-mocking layer; they were verified against the running application instead,
     as reviewer and as requester. Stated here rather than counted as coverage.
   - `docs/system-sds.md` §3.1 still draws two detail routes, `/requests/[id]` and `/reviewer/requests/[id]`.
     `F-03` built one shared page and `F-04` added the controls to it. Recorded as gap 5.

