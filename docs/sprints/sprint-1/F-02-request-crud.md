# Feature Engineering Contract: F-02 Expense Request & Line Items Management
**Feature ID:** `F-02`  
**Sprint:** Sprint 1  
**Owner:** KaiDaoMuKrobb  
**Reviewer:** siripitch-c  
**Status:** Specified & Ready for Implementation  

---

## 1. Feature SDS & Domain Behavior

### 1.1 Purpose & Workflow
`F-02` provides the core requester domain workflow for ExpenseFlow: creating itemized expense claims, managing line items, editing drafts, and submitting requests for managerial review.

1. **Draft Creation (`POST /api/requests`):**  
   An authenticated user (any role per `DEC-02`) creates an expense reimbursement request in `DRAFT` status. The submission accepts a title, description, and an array of itemized expense items (`category`, `description`, `amount`).
   - The server validates line items: every line item must have amount $> 0$ and at least one item must be present (`BR-04`).
   - The server generates an authoritative, sequential request number formatted as `EXP-{YYYY}-{NNNN}` (e.g. `EXP-2026-0001`) with collision prevention (`BR-06`).
   - The server computes the authoritative `totalAmount` by summing line items using PostgreSQL `Decimal(12, 2)`. Any client-provided `totalAmount` is discarded.

2. **Draft Modification (`PUT /api/requests/:id`):**  
   The request owner can update header fields and replace line items while the request remains in `DRAFT` status.
   - Guard order: `401 UNAUTHENTICATED` $\rightarrow$ `404 NOT_FOUND` (if request does not exist or caller is not owner per `DEC-03` / `BR-05`) $\rightarrow$ `400 IMMUTABLE_AFTER_SUBMIT` (if `status !== DRAFT` per `BR-03`) $\rightarrow$ `400 VALIDATION_ERROR` (if items are invalid).
   - The server recalculates `totalAmount` from the updated items in a transaction.

3. **Request Submission (`POST /api/requests/:id/submit`):**  
   The request owner submits the draft to a designated reviewer (`assignedReviewerId`).
   - Guard order: `401 UNAUTHENTICATED` $\rightarrow$ `404 NOT_FOUND` $\rightarrow$ `400 IMMUTABLE_AFTER_SUBMIT` $\rightarrow$ `400 VALIDATION_ERROR` (if `assignedReviewerId` is missing/nonexistent or request has 0 items).
   - In accordance with `DEC-02`, assigning self as reviewer (`assignedReviewerId == requesterId`) is permitted at submission to enable downstream verification of `BR-01` (`SELF_APPROVAL`) rejection at review boundary.
   - On successful submission, the request status transitions from `DRAFT` to `SUBMITTED`, locking further edits, and a record is appended to `ApprovalHistory` (`action: 'SUBMIT'`, `fromStatus: 'DRAFT'`, `toStatus: 'SUBMITTED'`).

4. **Requester Dashboard & Overview (`GET /api/requests`):**  
   Requesters view a list of their own requests with status badges, item counts, and formatted total amounts.

### 1.2 Linked Requirements & Architecture Decisions
- **`FR-02`**: Expense Request & Line Items Creation.
- **`FR-03`**: Request Submission with Reviewer Assignment.
- **`BR-03`**: Immutability After Submission (`IMMUTABLE_AFTER_SUBMIT`, HTTP 400).
- **`BR-04`**: Authoritative Amount Calculation & Line Item Validation (`VALIDATION_ERROR`, HTTP 400; amount $> 0$, items $\ge 1$).
- **`BR-06`**: Sequential Request Number Format `EXP-{YYYY}-{NNNN}`.
- **`DEC-02`**: Self-assignment allowed at submit time (checked later at review boundary `BR-01`).
- **`DEC-03`**: Return HTTP 404 Not Found for unauthorized resource access attempts.
- **`DEC-04`**: Use `Decimal(12, 2)` monetary handling to avoid floating-point rounding errors.
- **`DEC-06`**: Invariant guard order: `401` $\rightarrow$ `404` $\rightarrow$ `403` $\rightarrow$ `400`.
- **`DEC-07`**: Request deletion is excluded from Sprint 1 scope.
- **`E2E-01`**: Requester creation, line item entry, and submission journey.

---

## 2. API & Data Specifications

### 2.1 Route Handlers

#### `POST /api/requests`
- **Access:** Authenticated (Any Role)
- **Request Body:**
  ```json
  {
    "title": "Client Onsite Workshop Travel",
    "description": "Travel and meals for technical kickoff",
    "items": [
      { "category": "TRAVEL", "description": "Roundtrip Train Ticket", "amount": 850.50 },
      { "category": "MEALS", "description": "Team Working Lunch", "amount": 420.00 }
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "request": {
        "id": "uuid",
        "requestNumber": "EXP-2026-0001",
        "title": "Client Onsite Workshop Travel",
        "description": "Travel and meals for technical kickoff",
        "totalAmount": "1270.50",
        "status": "DRAFT",
        "requesterId": "user-uuid",
        "assignedReviewerId": null,
        "items": [
          { "id": "item-uuid-1", "category": "TRAVEL", "description": "Roundtrip Train Ticket", "amount": "850.50" },
          { "id": "item-uuid-2", "category": "MEALS", "description": "Team Working Lunch", "amount": "420.00" }
        ],
        "createdAt": "2026-11-04T12:00:00.000Z",
        "updatedAt": "2026-11-04T12:00:00.000Z"
      }
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "success": false, "error": { "message": "Authentication required", "code": "UNAUTHENTICATED" } }`
  - `400 Bad Request`: `{ "success": false, "error": { "message": "Line item amount must be positive", "code": "VALIDATION_ERROR" } }`

#### `PUT /api/requests/:id`
- **Access:** Authenticated (Owner only)
- **Request Body:**
  ```json
  {
    "title": "Updated Title",
    "description": "Updated Description",
    "items": [
      { "category": "SUPPLIES", "description": "Office Stationery", "amount": 350.00 }
    ]
  }
  ```
- **Success Response (200 OK):** Returns updated request object with recalculated `totalAmount: "350.00"`.
- **Error Responses:**
  - `401 Unauthorized`: code `UNAUTHENTICATED`
  - `404 Not Found`: code `NOT_FOUND` (if request does not exist or caller is not owner per `DEC-03`)
  - `400 Bad Request`: code `IMMUTABLE_AFTER_SUBMIT` (if `status !== 'DRAFT'`)
  - `400 Bad Request`: code `VALIDATION_ERROR` (if items array empty or item amount $\le 0$)

#### `POST /api/requests/:id/submit`
- **Access:** Authenticated (Owner only)
- **Request Body:**
  ```json
  {
    "assignedReviewerId": "reviewer-user-uuid"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "request": {
        "id": "uuid",
        "requestNumber": "EXP-2026-0001",
        "status": "SUBMITTED",
        "assignedReviewerId": "reviewer-user-uuid"
      }
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: code `UNAUTHENTICATED`
  - `404 Not Found`: code `NOT_FOUND` (if request not found or caller not owner)
  - `400 Bad Request`: code `IMMUTABLE_AFTER_SUBMIT` (if status already `SUBMITTED`, `APPROVED`, or `REJECTED`)
  - `400 Bad Request`: code `VALIDATION_ERROR` (if `assignedReviewerId` missing, reviewer not found, or items count $< 1$)

---

## 3. Acceptance Criteria (AC)

- **`AC-10` (Draft Request Creation):**  
  *Given* an authenticated user with valid title, description, and $\ge 1$ item  
  *When* `POST /api/requests` is invoked  
  *Then* server creates request in `DRAFT` status, generates sequential `EXP-{YYYY}-{NNNN}`, calculates `totalAmount`, and returns 201 Created.

- **`AC-11` (Line Items Validation - Positive Amounts):**  
  *Given* a request payload with an empty items list or an item with amount $\le 0$  
  *When* `POST /api/requests` or `PUT /api/requests/:id` is invoked  
  *Then* server rejects with HTTP 400 and error code `VALIDATION_ERROR` without writing to database.

- **`AC-12` (Authoritative Server Total Calculation - BR-04):**  
  *Given* a request payload with multiple items and a client-supplied total amount that does not match the sum  
  *When* `POST /api/requests` is invoked  
  *Then* server calculates total purely by summing item amounts using `Decimal(12, 2)`, completely discarding client-provided total.

- **`AC-13` (Draft Request Modification):**  
  *Given* an existing request in `DRAFT` status owned by current user  
  *When* `PUT /api/requests/:id` is invoked with updated items  
  *Then* server replaces items, updates total amount, and returns HTTP 200 with updated entity.

- **`AC-14` (Access Isolation - 404 for Non-Owner Edit - DEC-03 / BR-05):**  
  *Given* an existing draft owned by User A  
  *When* User B attempts `PUT /api/requests/:id` or `POST /api/requests/:id/submit`  
  *Then* server rejects with HTTP 404 and error code `NOT_FOUND` with zero data leakage.

- **`AC-15` (Immutability After Submission - BR-03):**  
  *Given* a request that has transitioned to `SUBMITTED`  
  *When* owner attempts `PUT /api/requests/:id`  
  *Then* server rejects with HTTP 400 and error code `IMMUTABLE_AFTER_SUBMIT`.

- **`AC-16` (Successful Submission & History Audit):**  
  *Given* a draft request with $\ge 1$ item owned by current user  
  *When* `POST /api/requests/:id/submit` is invoked with a valid `assignedReviewerId`  
  *Then* status transitions to `SUBMITTED`, `assignedReviewerId` is saved, and a row is appended to `ApprovalHistory` with action `SUBMIT`.

- **`AC-17` (Reviewer Designation Requirement at Submission):**  
  *Given* a draft request  
  *When* `POST /api/requests/:id/submit` is invoked without `assignedReviewerId` or with an invalid reviewer ID  
  *Then* server rejects with HTTP 400 and error code `VALIDATION_ERROR`.

- **`AC-18` (Self-Assignment Permitted at Submit - DEC-02):**  
  *Given* a reviewer submitting their own expense request  
  *When* `POST /api/requests/:id/submit` specifies their own `id` as `assignedReviewerId`  
  *Then* submission succeeds with HTTP 200 (rejection is deferred to review boundary `BR-01` in F-04).

- **`AC-18b` (Assigned Reviewer Role Enforcement - SR-05):**  
  *Given* a draft request ready for submission  
  *When* `POST /api/requests/:id/submit` specifies an `assignedReviewerId` of a user who does not hold `Role.REVIEWER` (e.g. a `REQUESTER`)  
  *Then* server rejects with HTTP 400 and error code `VALIDATION_ERROR` (`Assigned reviewer must hold REVIEWER role`).

- **`AC-18c` (Reviewers List Constrained to Reviewer Accounts):**  
  *Given* an authenticated user querying reviewer candidates  
  *When* `GET /api/reviewers` is invoked  
  *Then* response contains only users holding `role: REVIEWER` (e.g. Carol, David) and excludes non-reviewer accounts (e.g. Alice, Bob).

- **`AC-19` (Requester Personal Requests Query):**  
  *Given* an authenticated user with requests in the system  
  *When* `GET /api/requests` is queried  
  *Then* response contains only requests created by the caller (`requesterId == caller.id`).

- **`AC-19b` (Reviewer Retains Visibility of Decided Requests):**  
  *Given* a reviewer with assigned requests that have been decided (`APPROVED` or `REJECTED`)  
  *When* `GET /api/requests` is queried by the reviewer  
  *Then* decided requests remain in the result list (not filtered out by status).

---

## 4. Software Test Specification (STS)

> **Prerequisites:** The test suites expect standard seed accounts from `prisma/seed.ts` (`npx prisma db seed`).

| Test ID | Linked AC | Level | Preconditions / Input | Execution Action | Expected Result |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **`TEST-10`** | `AC-10` | Integration | Authenticated user `alice.req@test.com` | `POST /api/requests` with 2 items (850.50, 420.00) | HTTP 201, `EXP-{YYYY}-NNNN`, `status: 'DRAFT'`, `totalAmount: '1270.50'` |
| **`TEST-10b`** | `BR-06` | Integration | Multiple concurrent draft requests | `Promise.all` creating 3 drafts simultaneously | HTTP 201 on all, unique sequential EXP numbers, zero P2002 collision |
| **`TEST-11`** | `AC-11` | Integration | Authenticated user | `POST /api/requests` with item amount `-50.00` | HTTP 400, `VALIDATION_ERROR`, zero records created |
| **`TEST-12`** | `AC-12` | Integration | Authenticated user | `POST /api/requests` with items sum 500, spoofed total 9999 | HTTP 201, `totalAmount: '500.00'` (client total discarded) |
| **`TEST-13`** | `AC-13` | Integration | Draft owned by Alice | `PUT /api/requests/:id` with new items | HTTP 200, items updated, total recalculated |
| **`TEST-14`** | `AC-14` | Integration | Draft owned by Alice, authenticated as Bob | `PUT /api/requests/:id` on Alice's draft | HTTP 404, `NOT_FOUND` |
| **`TEST-15`** | `AC-15` | Integration | Submitted request owned by Alice | `PUT /api/requests/:id` on submitted request | HTTP 400, `IMMUTABLE_AFTER_SUBMIT` |
| **`TEST-16`** | `AC-16` | Integration | Draft with items, valid Carol reviewer ID | `POST /api/requests/:id/submit` | HTTP 200, status `SUBMITTED`, `ApprovalHistory` logged |
| **`TEST-17`** | `AC-17` | Integration | Draft with items | `POST /api/requests/:id/submit` without reviewer ID | HTTP 400, `VALIDATION_ERROR` |
| **`TEST-18`** | `AC-18` | Integration | Reviewer David submitting request | `POST /api/requests/:id/submit` with `assignedReviewerId: david.id` | HTTP 200, status `SUBMITTED`, reviewer set to self (`DEC-02`) |
| **`TEST-18b`** | `AC-18b` | Integration | Draft with items, Bob's ID (`Role.REQUESTER`) | `POST /api/requests/:id/submit` with Bob's ID | HTTP 400, `VALIDATION_ERROR` (`Assigned reviewer must hold REVIEWER role`) |
| **`TEST-18c`** | `AC-18c` | Integration | Authenticated requester | `GET /api/reviewers` | HTTP 200, returns Carol & David, excludes Alice & Bob |
| **`TEST-19`** | `AC-19` | Integration | Alice has 2 requests, Bob has 1 request | `GET /api/requests` as Alice | HTTP 200, returns exactly Alice's 2 requests |
| **`TEST-19b`** | `AC-19b` | Integration | Reviewer David with decided request (`APPROVED`) | `GET /api/requests` as David | HTTP 200, includes the approved request (does not vanish) |
| **`TEST-E2E-01`** | `E2E-01` | E2E (UI) | Seeded Alice and Carol | Playwright: Login Alice $\rightarrow$ Create Draft $\rightarrow$ Add 2 items $\rightarrow$ Submit to Carol $\rightarrow$ Assert `SUBMITTED` | Browser test passes cleanly |

---

## 5. Product Definition of Done (DoD)

- [x] Feature SDS, API contracts, ACs, and STS committed before implementation.
- [x] Automated integration test suite (`tests/api/request-crud.test.ts`) covering `TEST-10`..`TEST-19` executing and passing.
- [x] Tests run and failed first (Red) before implementation, terminal output captured.
- [x] Server-side calculation with `Decimal(12, 2)` verified preventing floating-point rounding errors (`DEC-04`).
- [x] Request number format `EXP-{YYYY}-{NNNN}` generated sequentially with unique constraint (`BR-06`).
- [x] Playwright E2E journey `E2E-01` implemented in `tests/e2e/requester-journey.spec.ts` passing against local dev server.
- [x] Feature implemented on branch `feat/F-02-request-crud` and ready for review via PR into `sprint-1-staging`.
