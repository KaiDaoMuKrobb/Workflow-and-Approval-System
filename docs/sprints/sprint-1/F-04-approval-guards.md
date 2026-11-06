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
1. no session                                      -> 401 UNAUTHENTICATED
2. request not found,
   or caller is neither owner nor assigned reviewer -> 404 NOT_FOUND
3. caller raised this request                       -> 403 SELF_APPROVAL      (BR-01)
4. caller may see it but is not the assigned reviewer -> 403 FORBIDDEN        (BR-05)
5. current status is not SUBMITTED                  -> 400 INVALID_TRANSITION (BR-02)
6. action is not APPROVE or REJECT,
   or REJECT carries no comment                     -> 400 VALIDATION_ERROR
7. all checks pass -> change status + write ApprovalHistory -> 200
```

> **Why step 3 precedes step 4** — a reviewer who raised the request fails both checks. The answer must be
> `SELF_APPROVAL` because it is the more specific reason and the rule the course requires to be tested.
>
> **Why step 5 comes after steps 3 and 4** — a caller without permission must not learn whether the request
> has already been decided.

### 2.3 On a successful decision

Both writes happen in **one transaction**.

| Write | Value |
| :--- | :--- |
| `ExpenseRequest.status` | `APPROVED` or `REJECTED` |
| New `ApprovalHistory` row | `fromStatus = SUBMITTED` · `toStatus` = the new status · `actorId` = the caller · `action` = `APPROVE` or `REJECT` · `comment` |

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
// comment: required when action is "REJECT", minimum 5 characters
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
| Bad `action`, or `REJECT` without a reason | `400` | `VALIDATION_ERROR` |

> Step 2 of the order — *may this user see this request?* — is not written again here. The endpoint
> calls `canViewRequest` from `src/lib/authorization.ts`, the function this feature extracts from the
> read handler for the reason in §7, so the two endpoints cannot answer `AC-26` and `AC-34` differently.

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
| **`AC-35`** | **Given** Carol is the assigned reviewer and the status is `SUBMITTED`<br>**When** she posts `{ action: "REJECT" }` with no comment<br>**Then** `400` · `code = VALIDATION_ERROR` · the status is unchanged |
| **`AC-36`** | **Given** the same conditions<br>**When** she posts `{ action: "REJECT", comment: "Receipts incomplete" }`<br>**Then** `200` · status becomes `REJECTED` · the history row keeps the reason |
| **`AC-37`** | **Given** no session<br>**When** the endpoint is called<br>**Then** `401` · `UNAUTHENTICATED` · nothing in the database changes |
| **`AC-38`** | **Given** David is both the requester and the assigned reviewer of the same request<br>**When** he posts a decision<br>**Then** `403` · `code = SELF_APPROVAL`, **not** `FORBIDDEN` — confirming `BR-01` is checked before `BR-05` |
| **`AC-39`** | **Given** Carol is the assigned reviewer and `/requests/[id]` is open<br>**When** the status is `APPROVED`<br>**Then** the Approve and Reject controls are absent |

> **`AC-38` is the most important criterion in this contract.** It is the only one that proves `DEC-06` was
> actually implemented. If the guards are written in the wrong order this test returns `FORBIDDEN` and
> fails, while every other test would still pass and the defect would go unnoticed.

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
| `TEST-38` | `AC-38` | API | Sign in as David · request where he is both requester and assigned reviewer | `403` · **`SELF_APPROVAL`**, not `FORBIDDEN` |
| `TEST-39` | `AC-39` | UI | Render the detail page as Carol with a request in status `APPROVED` | Approve and Reject controls are not in the document |
| `TEST-E2E-02` | `AC-30`, `AC-39` | E2E | Follow the `E2E-02` script in agreement §10 | Status on screen reads `APPROVED` · a new history row appears · the controls disappear |

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

- [ ] This contract is committed **before** any implementation commit
- [ ] `TEST-30` .. `TEST-39` and `TEST-E2E-02` are written and **have been run and failed first**, with the terminal output captured
- [ ] The implementation makes every test pass, with the passing output captured
- [ ] **`TEST-38` passes**, confirming the guard order matches `DEC-06`
- [ ] Every error path is proved to leave **no side effect** — status and history row count unchanged
- [ ] A successful decision writes the status and the history row in one transaction
- [ ] The decision controls are hidden in every case listed in §3.3
- [ ] The visibility check exists **once**, in `src/lib/authorization.ts`, and both the read handler and
      this endpoint call it — with `TEST-24` .. `TEST-27` still passing afterwards
- [ ] A Pull Request is opened into `sprint-1-staging` and **KaiDaoMuKrobb reviews it naming a specific check**
- [ ] Any incomplete work is stated rather than left silent

---

## 7. Dependencies, sequencing and the shared visibility check

`F-04` depends on the API half of `F-03`, because step 2 of the order in §2.2 is the same question
`GET /api/requests/:id` already answers: *may this user see this request?*

**Decision — the check is extracted into one function, and `F-04` does it.** The draft of this contract
proposed extracting it and left the owner open. `F-03` shipped without extracting it: the predicate is
written inline at `src/app/api/requests/[id]/route.ts:43-49`. Writing it a second time here would leave two
copies of the same rule in the codebase, and `AC-26` and `AC-34` — which must return the same answer —
would be free to drift apart. So this feature adds

```
src/lib/authorization.ts     canViewRequest(request, userId): boolean
```

and changes the existing read handler to call it, rather than copying the condition into the new endpoint.
This is the only change `F-04` makes to a file another feature shipped, it removes a duplicated rule rather
than adding behaviour, and `TEST-24` .. `TEST-27` from `F-03` already cover the handler it touches, so a
mistake in the extraction fails an existing test rather than passing silently.

---

## 8. Version history

Deliverable 1 Part E requires revisions to remain visible and justified, so every change to this contract
after it was first written is recorded here rather than left to the Git log alone.

| Version | Date | Change | Reason |
| :--- | :--- | :--- | :--- |
| 1.0 | 5 Nov 2026 | Contract drafted: requirements, check order, API and UI specifications, `AC-30`..`AC-39`, STS and Definition of Done | Drafted while `F-03` was in review so that no implementation would begin without a contract, as Part E requires |
| 1.1 | 6 Nov 2026 | §7 rewritten: the open proposal to extract the visibility check became a decision, with `F-04` named as the owner and `src/lib/authorization.ts` named as the file; §3.2 records that the new endpoint calls that function; §6 gained the matching Definition of Done item; §8 and §9 added | The proposal was written before `F-03` was implemented. `F-03` shipped the predicate inline, so the question the draft left open had to be answered before any code was written here, or the rule would exist in two places. Part E also asks for a version history on every contract, which the draft did not have |

---

## 9. Coordination needed with KaiDaoMuKrobb before implementation

1. **`src/app/api/requests/[id]/route.ts` is edited by this feature.** The change is one condition
   replaced by a call to `canViewRequest`, with no change in behaviour, for the reason in §7. No other file
   belonging to `F-01` or `F-02` is touched.

2. **Ownership of the Request Detail page.** Settled in `F-03` §8.3: `F-04` adds the Approve and Reject
   controls to `/requests/[id]`, it does not create a second page.

3. **`AC-34` is a read-path criterion inside F-04's number range.** Its test is written here, as agreement
   §9.4 fixes the number, and it does not duplicate `AC-26`; see the note at the end of §4.

4. **Agreement §6 and §2.2 of this contract agree, and both were checked.** The state matrix says a caller
   without permission acting on a terminal-state request receives `403`, not `400`, because the permission
   guard always precedes the state guard. That is steps 3 and 4 before step 5 here.
