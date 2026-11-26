# Feature Contract: F-05 Request Return and Resubmission Workflow

> **Deliverable 2: Sprint 2 Feature Specification**  
> **Feature ID:** `F-05`  
> **Associated Requirements:** `FR-06`, `BR-07`, `BR-08`  
> **Owner (Author):** Siripitch Chaiyabutra (`siripitch-c`)  
> **Reviewer:** Pattarawadee Thanapoomthakul (`KaiDaoMuKrobb`)  
> **Target Release:** Sprint 2 Candidate (`v0.3.0`)  
> **GitHub Issue:** #45  

---

## 1. Feature Overview & User Stories

### 1.1 Problem Statement
In Sprint 1, a reviewer could only `APPROVE` or `REJECT` a submitted expense claim (`FR-05`). If a claim contained a minor mistake (e.g. incorrect line item category, missing receipt description, or slight arithmetic discrepancy), the reviewer had to reject the claim outright. The requester was then forced to create an entirely new request from scratch, re-entering all line items and losing continuity.

### 1.2 User Story
- **As a reviewer**, I want to return a submitted expense claim with questions or requested corrections, so that the requester can update specific line items rather than starting over from scratch.
- **As a requester**, I want to receive returned claims with explanatory reviewer notes, edit the line items while preserving the request number and history, and resubmit for approval.

---

## 2. Invariants & Business Rules

1. **`BR-07` Return Reason Requirement:**
   - A return action must include an explanatory reason (`returnReason`).
   - The reason must be a string with a minimum trimmed length of 10 characters (distinct from `MIN_DECISION_COMMENT_LENGTH = 5` for approve/reject).
   - If missing, whitespace-only, or fewer than 10 characters, the request is rejected with HTTP 400 `VALIDATION_ERROR`.
2. **`BR-08` Resubmission & Audit History:**
   - Only the original requester may edit and resubmit a `RETURNED` claim.
   - Returning a claim appends an `ApprovalHistory` row recording `SUBMITTED -> RETURNED` with action `RETURN`.
   - Resubmitting a claim appends an `ApprovalHistory` row recording `RETURNED -> SUBMITTED` with action `RESUBMIT`.
   - Editing a returned claim recalculates totals and preserves the existing request number.
3. **Preserved Invariants:**
   - `BR-03` Immutability: Editing a `SUBMITTED` claim is still refused with HTTP 400 `IMMUTABLE_AFTER_SUBMIT`.
   - `BR-01` Separation of Duties: Reviewer cannot be requester (HTTP 403 `SELF_APPROVAL`).
   - `DEC-02 v2.0` Self-Assignment Refusal: Resubmission with `assignedReviewerId === requesterId` is refused with HTTP 400 `SELF_ASSIGNMENT`.
   - `DEC-03` / `BR-05` Access Isolation: A non-participant requester receives HTTP 404 `NOT_FOUND`.
   - `DEC-06` Universal Authorization Order: `401 -> 404 -> 403 -> 400`.

---

## 3. State Transition Model

```
           [ DRAFT ]
               |
          submit (F-02)
               v
         [ SUBMITTED ] <-----------------------+
          /         \                           |
    approve         reject                      |
      (F-04)        (F-04)                      |
        v             v                         |
   [ APPROVED ]  [ REJECTED ]                   | resubmit
                                                |  (F-05)
                                                |
         [ SUBMITTED ]                          |
               |                                |
          return (F-05, BR-07)                  |
               v                                |
         [ RETURNED ] --------------------------+
               |
         edit (PUT /api/requests/:id, F-05)
```

---

## 4. API & Data Specifications

### 4.1 Schema Impact (Zero Migration)
- `RequestStatus.RETURNED` already exists in `prisma/schema.prisma:20`.
- `ApprovalHistory.action` is a `String` (`prisma/schema.prisma:78`), permitting `RETURN` and `RESUBMIT`.
- Zero database migration is required.

### 4.2 Route Handlers

#### `POST /api/requests/:id/review` (Return Action)
- **Request Body:**
  ```json
  {
    "action": "RETURN",
    "comment": "Please attach detailed description for the hotel receipt."
  }
  ```
- **Validation:**
  - `action` must be one of `APPROVE`, `REJECT`, `RETURN`.
  - For `RETURN`, `comment` must have trimmed length >= 10.
- **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "data": {
      "id": "clx...",
      "requestNumber": "EXP-202611-0001",
      "status": "RETURNED",
      "updatedAt": "2026-11-27T08:00:00.000Z"
    }
  }
  ```

#### `PUT /api/requests/:id` (Edit Returned Request)
- **Guard Update:** Permits editing when `status === 'DRAFT' || status === 'RETURNED'`.
- Replaces line items and recalculates `totalAmount`.
- Status remains `RETURNED`.

#### `POST /api/requests/:id/submit` (Resubmit Request)
- **Guard Update:** Permits submission when `status === 'DRAFT' || status === 'RETURNED'`.
- Status transitions to `SUBMITTED`.
- Logs audit history row with `action: 'RESUBMIT'`, `fromStatus: 'RETURNED'`, `toStatus: 'SUBMITTED'`.
- Enforces `DEC-02 v2.0` (cannot assign to self).

---

## 5. Acceptance Criteria (AC)

- **`AC-50` (Successful Return Transition):**  
  *Given* a request in `SUBMITTED` status assigned to Reviewer B  
  *When* Reviewer B submits `POST /api/requests/:id/review` with `action: "RETURN"` and comment >= 10 characters  
  *Then* status becomes `RETURNED`, and an `ApprovalHistory` row is appended with action `RETURN`.

- **`AC-51` (Return Comment Boundary Refusal - BR-07):**  
  *Given* a request in `SUBMITTED` status  
  *When* the reviewer submits `action: "RETURN"` with comment length 9 characters  
  *Then* server returns HTTP 400 with code `VALIDATION_ERROR`, and status remains `SUBMITTED`.

- **`AC-52` (Return Comment Boundary Acceptance - BR-07):**  
  *Given* a request in `SUBMITTED` status  
  *When* the reviewer submits `action: "RETURN"` with comment length exactly 10 characters  
  *Then* server returns HTTP 200, and status transitions to `RETURNED`.

- **`AC-53` (Return Authorization Isolation - BR-05):**  
  *Given* a request in `SUBMITTED` status assigned to Reviewer B  
  *When* Reviewer C (unassigned reviewer) attempts to return the request  
  *Then* server returns HTTP 403 `FORBIDDEN`.

- **`AC-54` (Requester Editing of Returned Request):**  
  *Given* a request in `RETURNED` status owned by Requester A  
  *When* Requester A sends `PUT /api/requests/:id` with revised line items  
  *Then* server returns HTTP 200, updates line items and recalculates total, and status remains `RETURNED`.

- **`AC-55` (Resubmission Flow & History - BR-08):**  
  *Given* a request in `RETURNED` status  
  *When* Requester A sends `POST /api/requests/:id/submit` specifying an eligible reviewer  
  *Then* status transitions to `SUBMITTED`, an `ApprovalHistory` row with action `RESUBMIT` is recorded, and `DEC-02 v2.0` is enforced.

---

## 6. Software Test Specification (STS)

| Test ID | AC | Level | Description | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **`TEST-50`** | `AC-50` | API | Reviewer returns `SUBMITTED` request with valid reason | HTTP 200, status `RETURNED`, history row logged |
| **`TEST-51`** | `AC-51` | API | Reviewer returns with 9-char reason (`BR-07` boundary) | HTTP 400 `VALIDATION_ERROR`, status unchanged |
| **`TEST-52`** | `AC-52` | API | Reviewer returns with 10-char reason (`BR-07` boundary) | HTTP 200, status `RETURNED` |
| **`TEST-53`** | `AC-53` | API | Unassigned reviewer attempts return | HTTP 403 `FORBIDDEN` |
| **`TEST-54`** | `AC-54` | API | Requester updates line items on `RETURNED` claim | HTTP 200, line items replaced, total updated |
| **`TEST-55`** | `AC-55` | API | Requester resubmits `RETURNED` claim | HTTP 200, status `SUBMITTED`, `RESUBMIT` history |
| **`TEST-55b`**| `AC-55` | API | Non-requester attempts to edit or resubmit | HTTP 404 `NOT_FOUND` (DEC-03) |
| **`TEST-55c`**| `AC-55` | API | Requester resubmits assigning self as reviewer | HTTP 400 `SELF_ASSIGNMENT` (DEC-02 v2.0) |

---

## 7. Definition of Done (DoD)

1. Contract reviewed and approved by peer.
2. TDD red tests written and committed before implementation changes.
3. Route handlers updated (`review/route.ts`, `[id]/route.ts`, `submit/route.ts`).
4. Full regression test suite passing (all pre-existing tests + F-05 tests).
5. Peer review completed and merged into `staging`.
