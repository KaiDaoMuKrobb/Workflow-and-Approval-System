# F-03 — Reviewer Dashboard & Assigned View

> **Feature Engineering Contract (Part E)** · Sprint 1 · Owner: **siripitch-c** · Issue #3
> Branch: `feat/F-03-reviewer-dashboard`
> Repository path: `docs/sprints/sprint-1/F-03-reviewer-dashboard.md`
>
> Written **before** implementation as D1 §3.5 requires. Commit this file before any implementation commit.

---

## 1. Requirements this feature satisfies

| Type | ID | Statement |
| :--- | :--- | :--- |
| FR | `FR-04` | A Reviewer can see the `SUBMITTED` requests assigned to them |
| BR | `BR-05` | Access isolation — **read path** (`404` for a request that is neither their own nor assigned to them) |
| NFR | `NFR-02` | No session → `401`, and no entity data in the body |
| NFR | `NFR-03` | `GET /api/requests` and `GET /api/requests/:id` answer within 500 ms on seed data |
| DEC | `DEC-03`, `DEC-06` | `404` rather than `403` on reads · check order `401 → 404 → 403 → 400` |

---

## 2. Scope and behaviour

### 2.1 What this feature delivers
1. `GET /api/requests` — the request list, scoped to the caller
2. `GET /api/requests/:id` — one request with its line items and decision history
3. **Reviewer Dashboard** page — the requests waiting for this reviewer
4. **Request Detail** page — header, line items, and Approval History

### 2.2 Visibility rules (`BR-05`, read path)

| Caller | What `GET /api/requests` returns |
| :--- | :--- |
| Any authenticated user | Requests where they are the `requesterId` |
| A user holding role `REVIEWER` | Their own requests **and** requests where `assignedReviewerId` is them |
| No session | `401` |

`GET /api/requests/:id` answers `200` only for the **owner** or the **assigned reviewer**. Every other case
answers `404`, not `403`, as `DEC-03` requires.

### 2.3 Screen flow

```
Reviewer signs in
  -> /dashboard          table of SUBMITTED requests assigned to them
  -> clicks a row
  -> /requests/[id]      header, line items, approval history
```

The Approve and Reject controls are **not part of this feature** — they belong to `F-04`.
F-03 renders a read-only view and leaves room for F-04 to add them to the same page.

---

## 3. Layer specifications

### 3.1 Data layer

**No schema change.** This feature reads the tables `F-01` creates from agreement §5. The main query reads
`ExpenseRequest` with its `ExpenseItem` and `ApprovalHistory` rows, plus the `requester` and
`assignedReviewer` relations.

> `NFR-03` needs an index on `assignedReviewerId` and on `requesterId`. Both exist: `F-01` added them in
> `prisma/migrations/20261103150948_add_performance_indexes`, together with one on `status`. No migration
> is created by this feature.

### 3.2 API layer

> **Both handlers already exist.** `F-02` shipped `src/app/api/requests/route.ts` and
> `src/app/api/requests/[id]/route.ts` in PR #8, because its own screens needed them. `F-03` extends those
> files rather than creating new ones, and owns the reviewer half of the visibility rules together with
> `AC-20`..`AC-27`. The shapes below are the shipped shapes, not a proposal.

**`GET /api/requests`**

No query parameters in Sprint 1. Filtering and paging belong to Sprint 2.

```jsonc
// 200
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "requestNumber": "EXP-2026-0001",
        "title": "Client visit travel, October",
        "totalAmount": "1500.00",
        "status": "SUBMITTED",
        "requester":        { "id": "uuid", "name": "Alice Requester" },
        "assignedReviewer": { "id": "uuid", "name": "Carol Manager" },
        "createdAt": "2026-11-03T10:00:00.000Z"
      }
    ]
  }
}
```

**`GET /api/requests/:id`**

```jsonc
// 200
{
  "success": true,
  "data": {
   "request": {
    "id": "uuid",
    "requestNumber": "EXP-2026-0001",
    "title": "Client visit travel, October",
    "description": "Travelled to the client head office",
    "totalAmount": "1500.00",
    "status": "SUBMITTED",
    "requester":        { "id": "uuid", "name": "Alice Requester", "department": "Engineering" },
    "assignedReviewer": { "id": "uuid", "name": "Carol Manager" },
    "items": [
      { "id": "uuid", "category": "TRAVEL", "description": "Taxi both ways", "amount": "850.00" },
      { "id": "uuid", "category": "MEALS",  "description": "Client meal",    "amount": "650.00" }
    ],
    "history": [
      { "id": "uuid", "action": "SUBMIT", "fromStatus": "DRAFT", "toStatus": "SUBMITTED",
        "actor": { "id": "uuid", "name": "Alice Requester" }, "comment": null,
        "createdAt": "2026-11-03T10:00:00.000Z" }
    ],
    "createdAt": "...", "updatedAt": "..."
   }
  }
}
```

> The detail payload is nested under `data.request`, and the list under `data.requests`. Both are the
> shapes `F-02` shipped and its tests already assert; this contract follows them rather than renaming them.

**Error responses** — envelope and codes follow agreement §7.1 and §7.3.

| Situation | HTTP | `code` |
| :--- | :--- | :--- |
| No session | `401` | `UNAUTHENTICATED` |
| The id does not exist | `404` | `NOT_FOUND` |
| Neither owner nor assigned reviewer | `404` | `NOT_FOUND` |

> `totalAmount` and `amount` are serialised as **strings** because they are `Decimal`. They must not be
> converted to `number` before sending, which would discard the precision `DEC-04` exists to protect.

> **Payload weight.** The shipped list handler includes every `items` row and the whole `history` for each
> request. `AC-29` holds the list to 500 ms on seed data, so if that measurement comes close to the limit
> this feature trims the list projection to the fields the table actually renders and leaves the full
> detail to `GET /api/requests/:id`. The decision is recorded here once measured, not assumed now.

### 3.3 UI layer

| Page | Route | Content |
| :--- | :--- | :--- |
| Reviewer Dashboard | `/dashboard` | Table: request number · title · requester · total · status · submitted date. A row opens the detail page |
| Request Detail | `/requests/[id]` | Header fields · line item table · total · Approval History oldest first |

> **Decision — what the dashboard shows.** `GET /api/requests` returns everything the caller may see:
> their own requests **and**, for a reviewer, the ones assigned to them. That is `AC-22` and it is a property
> of the endpoint. The dashboard is the review queue, so it renders only the second group and drops rows the
> signed-in reviewer raised themselves. Their own requests already have a home at `/requests`. This keeps a
> reviewer from meeting an Approve control on their own work in `F-04`; `BR-01` is still enforced in the
> route handler regardless, because hiding a control is never the enforcement (`SR-05`).

States both pages must handle:

- **Loading** — a skeleton or an explicit loading message
- **Empty** — "No requests are waiting for your review", never a bare empty table
- **Failure** — a safe message with a retry control, no stack trace
- **Not found** (from a `404`) — "Request not found" with a link back to the dashboard

---

## 4. Acceptance Criteria

> Reserved range: `AC-20` .. `AC-29` (agreement §9.2)

| AC | Criterion |
| :--- | :--- |
| **`AC-20`** | **Given** Carol is signed in and a request from Alice has `assignedReviewerId = Carol` with status `SUBMITTED`<br>**When** she calls `GET /api/requests`<br>**Then** the response is `200` and the list contains that request |
| **`AC-21`** | **Given** Carol is signed in and a request from Bob is assigned to David<br>**When** she calls `GET /api/requests`<br>**Then** the response is `200` and the list does **not** contain that request |
| **`AC-22`** | **Given** Carol has one request she raised herself and one assigned to her<br>**When** she calls `GET /api/requests`<br>**Then** both appear |
| **`AC-23`** | **Given** no session<br>**When** `GET /api/requests` is called<br>**Then** the response is `401` `UNAUTHENTICATED` and the body carries no request data |
| **`AC-24`** | **Given** Carol is the assigned reviewer of request X<br>**When** she calls `GET /api/requests/X`<br>**Then** the response is `200` with `items` and `history` present |
| **`AC-25`** | **Given** Alice raised request X<br>**When** she calls `GET /api/requests/X`<br>**Then** the response is `200` |
| **`AC-26`** | **Given** David is a reviewer but is **not** assigned request X<br>**When** he calls `GET /api/requests/X`<br>**Then** the response is `404` `NOT_FOUND`, not `403` |
| **`AC-27`** | **Given** an id that exists nowhere in the database<br>**When** `GET /api/requests/:id` is called<br>**Then** the response is `404` `NOT_FOUND`, **byte for byte identical to `AC-26`** |
| **`AC-28`** | **Given** Carol has no assigned requests<br>**When** she opens `/dashboard`<br>**Then** she sees the empty-state message, not an empty table and not an error |
| **`AC-29`** | **Given** the seeded database<br>**When** `GET /api/requests` is called after one warm-up call<br>**Then** it answers within 500 ms |

> **Membership, not length.** Vitest runs test files in parallel and `F-02`'s `TEST-16` also assigns a
> request to Carol, so asserting the size of her list makes the result depend on which files happen to be
> running. Every criterion here asserts that a named fixture request is present or absent instead, which is
> what the rule actually says and does not change meaning under parallel runs.

> **`AC-26` and `AC-27` must produce the same response.** Any difference, even in the message, tells an
> outsider that the request exists — which is precisely what `DEC-03` is written to prevent.

---

## 5. Software Test Specification

| Test ID | AC | Level | Precondition / input | Expected result |
| :--- | :--- | :--- | :--- | :--- |
| `TEST-20` | `AC-20` | API | Sign in as Carol · seed holds Alice's request assigned to Carol, status `SUBMITTED` | `200` · the array contains that `requestNumber` |
| `TEST-21` | `AC-21` | API | Sign in as Carol · seed holds Bob's request assigned to David | `200` · the array does not contain Bob's request |
| `TEST-22` | `AC-22` | API | Sign in as Carol · one request she raised, one assigned to her | `200` · **both fixture request numbers are present** |
| `TEST-23` | `AC-23` | API | Send no cookie | `401` · `code = UNAUTHENTICATED` · body has no `requests` key |
| `TEST-24` | `AC-24` | API | Sign in as Carol · GET a request assigned to her | `200` · `items` length ≥ 1 · `history` length ≥ 1 |
| `TEST-25` | `AC-25` | API | Sign in as Alice · GET her own request | `200` |
| `TEST-26` | `AC-26` | API | Sign in as David · GET a request assigned to Carol | `404` · `code = NOT_FOUND` |
| `TEST-27` | `AC-27` | API | Sign in as David · GET a random non-existent id | `404` · `code = NOT_FOUND` · body equal to the one from `TEST-26` |
| `TEST-28` | `AC-28` | UI | Render the dashboard with an empty result array | The empty-state message is present · no table row elements |
| `TEST-29` | `AC-29` | API | Discard one call, then time the second | Elapsed time under 500 ms |

Test files

```
tests/api/requests-list.test.ts      TEST-20 .. TEST-23, TEST-29
tests/api/requests-detail.test.ts    TEST-24 .. TEST-27
tests/unit/dashboard-empty.test.tsx  TEST-28
```

---

## 6. Definition of Done

- [ ] This contract is committed **before** any implementation commit
- [ ] `TEST-20` .. `TEST-29` are written and **have been run and failed first**, with the terminal output captured
- [ ] The implementation makes every test pass, with the passing output captured
- [ ] `AC-26` and `AC-27` return identical responses
- [ ] The dashboard handles all four states: loading, empty, failure, not found
- [ ] `totalAmount` and `amount` remain strings end to end and are never cast to `number`
- [ ] A Pull Request is opened into `sprint-1-staging` and **KaiDaoMuKrobb reviews it naming a specific check**
- [ ] Any incomplete work is stated rather than left silent

---

## 7. Coordination needed with KaiDaoMuKrobb before implementation

1. ~~`GET /api/requests/:id` belongs to F-03 but `E2E-01` depends on it.~~ **Settled.** `F-02` implemented
   both read handlers in PR #8 so it was never blocked. `F-03` extends them in place and adds the reviewer
   visibility criteria `AC-20`..`AC-27`.

2. ~~Indexes on `assignedReviewerId` and `requesterId`.~~ **Settled.** `F-01` shipped them in
   `20261103150948_add_performance_indexes`.

3. **Ownership of the Request Detail page.** F-03 builds it read-only; F-04 adds the Approve and Reject
   controls to the same page rather than creating a second one.
