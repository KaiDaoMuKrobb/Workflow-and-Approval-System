# Feature Contract: F-06 Second Stage Approval for High Amounts

> **Deliverable 2: Sprint 2 Feature Specification**  
> **Feature ID:** `F-06`  
> **Associated Requirements:** `FR-07`, `BR-09`  
> **Owner (Author):** Siripitch Chaiyabutra (`siripitch-c`)  
> **Reviewer:** Pattarawadee Thanapoomthakul (`KaiDaoMuKrobb`)  
> **Target Release:** Sprint 2 Candidate (`v0.3.0`)  
> **Design Threshold:** `50,000.00 THB`  

---

## 1. Feature Overview & User Stories

### 1.1 Problem Statement
In Sprint 1, every expense claim followed single-stage approval regardless of value. In an enterprise financial workflow, high-value expenditures introduce corporate liability and fraud risk. High-value claims must require two distinct managerial approvals to enforce dual control and segregation of duties.

### 1.2 User Story
- **As a financial controller / organization**, I want expense claims exceeding 50,000.00 THB to require two distinct reviewers before reimbursement is approved, so that high expenditures undergo dual managerial scrutiny.
- **As a second reviewer**, I want to inspect claims that have passed first-stage review, review previous approval notes, and grant or reject final approval.

---

## 2. Invariants & Business Rules

1. **`BR-09` Dual Control Threshold (50,000.00 THB):**
   - **Claims <= 50,000.00 THB (Standard Workflow):**
     - A single approval by the assigned reviewer moves the claim directly from `SUBMITTED` to `APPROVED`.
   - **Claims > 50,000.00 THB (Two-Stage Workflow):**
     - First approval by the assigned reviewer moves the claim from `SUBMITTED` to `PENDING_SECOND_APPROVAL`.
     - Second approval by a distinct second reviewer moves the claim to `APPROVED`.
     - Rejection at either stage by the assigned reviewer immediately moves the claim to `REJECTED`.
2. **Segregation of Duties & Separation of Roles:**
   - **Rule A (BR-01):** Neither Reviewer 1 nor Reviewer 2 can be the Requester (HTTP 403 `SELF_APPROVAL`).
   - **Rule B (Dual Control Invariant):** Reviewer 2 cannot be Reviewer 1. The same person cannot grant both first and second stage approval on the same claim (HTTP 400 `DUPLICATE_APPROVER`).
3. **Audit History Tracking:**
   - First-stage approval appends an `ApprovalHistory` row recording `SUBMITTED -> PENDING_SECOND_APPROVAL` with action `APPROVE_STAGE_1`.
   - Second-stage approval appends an `ApprovalHistory` row recording `PENDING_SECOND_APPROVAL -> APPROVED` with action `APPROVE_STAGE_2`.

---

## 3. State Transition Model

```
Standard Claim (<= 50,000.00 THB):
[ SUBMITTED ] ---- (Reviewer 1 Approve) ----> [ APPROVED ]
              ---- (Reviewer 1 Reject)  ----> [ REJECTED ]

High-Value Claim (> 50,000.00 THB):
[ SUBMITTED ] ---- (Reviewer 1 Approve) ----> [ PENDING_SECOND_APPROVAL ]
              ---- (Reviewer 1 Reject)  ----> [ REJECTED ]

[ PENDING_SECOND_APPROVAL ] ---- (Reviewer 2 Approve) ----> [ APPROVED ]
                            ---- (Reviewer 2 Reject)  ----> [ REJECTED ]
```

---

## 4. API & Database Specifications

### 4.1 Schema Impact (Prisma Migration)
- **Enum `RequestStatus`:** Add `PENDING_SECOND_APPROVAL`.
- **Model `ExpenseRequest`:**
  - Add `secondReviewerId String?`
  - Add relation `secondReviewer User? @relation("SecondReviewer", fields: [secondReviewerId], references: [id])`
- Migration file: `prisma/migrations/<timestamp>_add_second_approval_stage/migration.sql`.

### 4.2 Endpoint Specifications

#### `POST /api/requests/:id/review`
- If status is `SUBMITTED`:
  - If `totalAmount <= 50000.00`: Action `APPROVE` sets status to `APPROVED`.
  - If `totalAmount > 50000.00`: Action `APPROVE` sets status to `PENDING_SECOND_APPROVAL`.
- If status is `PENDING_SECOND_APPROVAL`:
  - Caller must be assigned `secondReviewerId` (or an authorized secondary reviewer).
  - Caller cannot be `requesterId` (`BR-01`).
  - Caller cannot be `assignedReviewerId` (first reviewer).
  - Action `APPROVE` sets status to `APPROVED`.
  - Action `REJECT` sets status to `REJECTED`.

---

## 5. Acceptance Criteria (AC)

- **`AC-60` (Single Approval for Boundary Amount <= 50,000.00 THB):**  
  *Given* a submitted claim with total amount exactly 50,000.00 THB  
  *When* the assigned reviewer approves the claim  
  *Then* claim status transitions directly to `APPROVED` in a single step.

- **`AC-61` (First Approval for Boundary Amount > 50,000.00 THB):**  
  *Given* a submitted claim with total amount 50,000.01 THB or higher  
  *When* the assigned reviewer approves the claim  
  *Then* claim status transitions to `PENDING_SECOND_APPROVAL`.

- **`AC-62` (Second Approval Success by Distinct Reviewer):**  
  *Given* a claim in `PENDING_SECOND_APPROVAL` status  
  *When* an authorized second reviewer (distinct from requester and first reviewer) approves  
  *Then* claim status transitions to `APPROVED`, and history row records final decision.

- **`AC-63` (Refusal of Duplicate Approver - Dual Control):**  
  *Given* a claim in `PENDING_SECOND_APPROVAL` approved in stage 1 by Reviewer A  
  *When* Reviewer A attempts to submit second-stage review  
  *Then* server returns HTTP 400 with code `DUPLICATE_APPROVER`.

- **`AC-64` (Rejection at Second Stage):**  
  *Given* a claim in `PENDING_SECOND_APPROVAL`  
  *When* the second reviewer rejects the claim with a valid reason  
  *Then* status transitions to `REJECTED`.

- **`AC-65` (Refusal of Requester as Second Reviewer):**  
  *Given* a claim in `PENDING_SECOND_APPROVAL`  
  *When* the original requester attempts to approve at stage 2  
  *Then* server returns HTTP 403 `SELF_APPROVAL` (`BR-01`).

---

## 6. Software Test Specification (STS)

| Test ID | AC | Level | Description | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **`TEST-60`** | `AC-60` | API | Boundary test: claim at exactly 50,000.00 THB approved | HTTP 200, status `APPROVED` directly |
| **`TEST-61`** | `AC-61` | API | Boundary test: claim at 50,000.01 THB approved | HTTP 200, status `PENDING_SECOND_APPROVAL` |
| **`TEST-62`** | `AC-62` | API | Distinct second reviewer approves high claim | HTTP 200, status `APPROVED` |
| **`TEST-63`** | `AC-63` | API | First reviewer attempts second approval | HTTP 400 `DUPLICATE_APPROVER` |
| **`TEST-64`** | `AC-64` | API | Second reviewer rejects high claim | HTTP 200, status `REJECTED` |
| **`TEST-65`** | `AC-65` | API | Requester attempts second approval | HTTP 403 `SELF_APPROVAL` |

---

## 7. Definition of Done (DoD)

1. Contract reviewed and approved by peer.
2. Prisma migration applied adding `PENDING_SECOND_APPROVAL` and `secondReviewerId`.
3. TDD automated tests covering boundary (50,000.00 vs 50,000.01 THB) and separation of duties.
4. Route handlers updated and tested.
5. Peer review completed and merged into `staging`.
