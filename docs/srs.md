# Software Requirements Specification (SRS)
**Project:** Corporate Expense Reimbursement System (ExpenseFlow)  
**Deliverable:** CPE 334 Project Deliverable 1 (Part A: 10 Points)  
**Theme:** Theme 5 — Workflow and Approval System  
**Document Status:** Approved Baseline (Sprints 1–3)  
**Author / Maintainer:** KaiDaoMuKrobb  
**Reviewer:** siripitch-c  

---

## 1. Stakeholder Problem & Context

### 1.1 Stakeholder Problem
In corporate environments, employees routinely incur out-of-pocket expenses for legitimate business operations, such as client travel, business meals, and office supplies. Traditional paper-based or unstructured email reimbursement processes suffer from critical inefficiencies:
- **Processing Delays and Document Loss:** Unstructured submissions lead to lost receipts, delayed approvals, and administrative overhead.
- **Lack of Transparency & Auditability:** Stakeholders cannot trace who approved or rejected a transaction, why decisions were made, or the exact timestamps of review actions.
- **Authority Abuse & Conflict of Interest:** Traditional systems frequently fail to restrict managers from approving their own expense submissions (Self-Approval), creating significant financial and compliance risks.
- **Calculation Inaccuracies:** Manual entry errors in itemized expenses, line-item sums, and decimal precision lead to ledger discrepancies.

### 1.2 Chosen Context
**ExpenseFlow** is an enterprise-grade web application engineered to govern the corporate expense reimbursement lifecycle. The system enforces a strict finite state machine, server-side role-based authorization, immutable financial audit records, and automated business rule verification across three developmental sprints.

---

## 2. Actors & Responsibilities

| Actor | Responsibilities | Data Access Scope |
| :--- | :--- | :--- |
| **Requester**<br>*(General Employee)* | • Create new expense reimbursement requests in `DRAFT` status.<br>• Add, modify, or remove itemized expenses (`ExpenseItem`).<br>• Select an authorized reviewer and submit (`SUBMIT`) the request.<br>• Resubmit returned requests after revision (Sprint 2).<br>• Inspect request status, authoritative totals, and approval history. | Access restricted **strictly to own submitted requests**. Access attempts to other users' requests return **HTTP 404 Not Found**. |
| **Reviewer**<br>*(Manager / Approver)* | • Inspect incoming submitted requests assigned to them (`assignedReviewerId`).<br>• Decide whether to **Approve (`APPROVE`)**, **Reject (`REJECT`)**, or **Return (`RETURN`)** with mandatory comments.<br>• Participate in multi-stage approval for high-value claims (Sprint 2).<br>• Access department expense summaries and analytics (Sprint 3).<br>• Eligible to submit personal expense requests as an employee, but **strictly prohibited from approving or rejecting their own requests**. | Access restricted to **assigned submitted requests** and **own personal requests**. Unrelated review attempts return **HTTP 403 Forbidden**. |

---

## 3. Scope & Explicit Exclusions

### 3.1 Product Scope (Sprint 1 Baseline to Sprint 3 Completion)
1. **Request Lifecycle Management (Sprints 1–2):** Creation, line-item itemization, submission, return/revision, and state tracking.
2. **Reviewer Assignment & Multi-Stage Governance (Sprints 1–2):** Direct reviewer designation in Sprint 1, expanding to tiered two-stage approval for high-value claims in Sprint 2.
3. **Workflow State Machine:** Rigorous state governance:
   $$\text{DRAFT} \longleftrightarrow \text{SUBMITTED} \longleftrightarrow \text{RETURNED} \longrightarrow \text{APPROVED} \mid \text{REJECTED}$$
4. **Audit & Decision History (Sprints 1–3):** Immutable recording of every state transition, actor ID, and review comment in `ApprovalHistory`.
5. **Search, Analytics & Reporting (Sprints 2–3):** Multi-criteria filtering, department spending analytics, and financial report export.
6. **Security & Server-side Authorization:** Cookie-based session identity, `bcryptjs` password hashing, and server-side authorization boundaries.

### 3.2 Explicit Exclusions
- **No Real Payment Gateway Integration:** Actual financial disbursements are outside scope; payment completion is represented via synthetic domain state transitions.
- **No Multi-Currency Support:** All monetary values are recorded, calculated, and persisted in Thai Baht (THB) only.
- **No Physical Receipt / Image Uploads:** Expenses are described textually with categories and amounts.
- **No Public Self-Registration or Password Recovery:** User authentication relies strictly on seeded test accounts.
- **No Request Deletion in Sprint 1:** Unwanted drafts remain in `DRAFT` status to eliminate cascading deletion complexity in Sprint 1 (`DEC-07`).

---

## 4. Significant Assumptions

- **`ASM-01` (Pre-seeded Accounts):** All platform users are initialized via reproducible database seeds.
- **`ASM-02` (Single Organization Boundary):** All users belong to the same enterprise boundary; multi-tenant isolation is not required.
- **`ASM-03` (Staged Workflow Evolution):** Single-stage approval is established in Sprint 1. Multi-stage approvals and request returns are added in Sprint 2.
- **`ASM-04` (Uniform Timezone):** All server timestamps and client interactions operate consistently in UTC+7 (Asia/Bangkok).

---

## 5. Functional Requirements (FR) Across Sprints 1–3

### Sprint 1 Requirements (Baseline Slice)
| Requirement ID | Name | Observable Behavior | Associated Role | Sprint |
| :--- | :--- | :--- | :--- | :---: |
| **`FR-01`** | **User Authentication & Session Management** | Users authenticate via email and password. The system issues an `HttpOnly` session cookie upon successful verification and provides a secure logout endpoint to invalidate the session. | Public / All Users | Sprint 1 |
| **`FR-02`** | **Expense Request & Line Items Creation** | Any authenticated user can create an expense request in `DRAFT` status with one or more itemized line items (category, description, positive amount). | Authenticated Users | Sprint 1 |
| **`FR-03`** | **Request Submission with Reviewer Assignment** | The request owner can submit a `DRAFT` request by specifying an `assignedReviewerId`. Submission transitions status to `SUBMITTED`, locks editing, and calculates authoritative total amount. | Request Owner (`DRAFT` only) | Sprint 1 |
| **`FR-04`** | **Reviewer Assigned Queue Inspection** | Reviewers can query and view all `SUBMITTED` requests specifically assigned to them. | Assigned Reviewer | Sprint 1 |
| **`FR-05`** | **Review Decision & Audit Logging** | An assigned reviewer can approve or reject a submitted request with a mandatory comment. The system transitions the request to `APPROVED` or `REJECTED` and appends a record to `ApprovalHistory`. | Assigned Reviewer | Sprint 1 |

### Sprint 2 Requirements (Core Expansion)
| Requirement ID | Name | Observable Behavior | Associated Role | Sprint |
| :--- | :--- | :--- | :--- | :---: |
| **`FR-06`** | **Request Return & Resubmission Workflow** | Reviewer can return a submitted request for revision (`SUBMITTED` $\rightarrow$ `RETURNED`). Requester can edit itemized lines and resubmit (`RETURNED` $\rightarrow$ `SUBMITTED`). | Reviewer / Requester | Sprint 2 |
| **`FR-07`** | **Two-Stage Approval for High-Value Requests** | Requests with total amount exceeding the company threshold require secondary approval (e.g. Department Head / Finance) before transitioning to `APPROVED`. | Senior Reviewer / Finance | Sprint 2 |
| **`FR-08`** | **Multi-criteria Filtering & Search** | Users can search and filter requests by status, date range, department, and expense category. | All Authenticated Users | Sprint 2 |

### Sprint 3 Requirements (Hardening & Reporting)
| Requirement ID | Name | Observable Behavior | Associated Role | Sprint |
| :--- | :--- | :--- | :--- | :---: |
| **`FR-09`** | **Department Spending Summary & Analytics** | Aggregated expense metrics by department, monthly burn, and category spending distributions. | Reviewer / Management | Sprint 3 |
| **`FR-10`** | **Financial Report Export** | Authorized reviewers can export verified reimbursement reports into tabular formats (CSV/JSON) for accounting reconciliation. | Reviewer / Management | Sprint 3 |

---

## 6. Business Rules (BR) Across Sprints 1–3

All business rules are enforced exclusively at the **Application / Server Layer (Route Handlers)**:

### Sprint 1 Rules
- **`BR-01 (Self-Approval Prevention)`**:  
  A reviewer is **strictly forbidden from approving or rejecting their own expense request**. If `request.requesterId == currentUserId`, the server must reject the operation with **HTTP 403 Forbidden** and error code `SELF_APPROVAL` (`DEC-02`).
- **`BR-02 (State Transition Validation)`**:  
  Status changes must strictly follow the defined state machine:
  $$\text{DRAFT} \longleftrightarrow \text{SUBMITTED} \longrightarrow \text{APPROVED} \mid \text{REJECTED}$$
  Requests in terminal states (`APPROVED` or `REJECTED`) are immutable. Any transition attempt on a terminal request must be rejected with **HTTP 400 Bad Request** (`INVALID_TRANSITION`).
- **`BR-03 (Immutability After Submission)`**:  
  Once a request transitions to `SUBMITTED`, the requester cannot modify, add, or remove line items or request header fields. Modification attempts must be rejected with **HTTP 400 Bad Request** (`IMMUTABLE_AFTER_SUBMIT`).
- **`BR-04 (Authoritative Amount Calculation & Line Item Validation)`**:  
  - The request `totalAmount` must be calculated on the server by summing `ExpenseItem.amount`. Client-submitted totals are ignored.
  - Every line item amount must be strictly greater than zero ($amount > 0$).
  - A request must contain at least one line item ($\ge 1$) to be submitted.
- **`BR-05 (Access Isolation & Unrelated Reviewer Restriction)`**:  
  - A requester attempting to view another user's request receives **HTTP 404 Not Found** (`DEC-03`).
  - An unassigned reviewer attempting to view a request receives **HTTP 404 Not Found**.
  - An unassigned reviewer attempting to decide on a request receives **HTTP 403 Forbidden** (`FORBIDDEN`).
- **`BR-06 (Authoritative Request Number Generation)`**:  
  The server automatically assigns a sequential, collision-free identifier formatted as `EXP-{YYYY}-{NNNN}` (e.g., `EXP-2026-0001`), enforced via a database `@unique` constraint.

### Sprint 2 Rules
- **`BR-07 (Return Reason Requirement)`**:  
  A reviewer executing a `RETURN` action must provide a non-empty comment explaining the required correction ($\ge 10$ characters).
- **`BR-08 (Resubmission Authorization)`**:  
  Only the original requester can edit and resubmit a request in `RETURNED` status. Resubmission transitions the status back to `SUBMITTED` and appends an entry to `ApprovalHistory`.
- **`BR-09 (High-Value Approval Threshold Rule)`**:  
  If a request's `totalAmount` $\ge$ threshold (e.g. 10,000.00 THB), initial approval moves status to `STAGE1_APPROVED`. The request requires a distinct secondary reviewer action before reaching `APPROVED`.

### Sprint 3 Rules
- **`BR-10 (Report Export Authorization)`**:  
  Export of department-wide expense summaries is restricted to users with the `REVIEWER` role. Requesters attempting to access aggregated department exports receive **HTTP 403 Forbidden**.

---

## 7. Non-Functional Requirements (NFR)

| NFR ID | Attribute | Measurable Target | Practical Verification Method | Target Sprint |
| :--- | :--- | :--- | :--- | :---: |
| **`NFR-01`** | **Password Security** | All stored passwords must be hashed using `bcryptjs` with salt rounds $\ge 10$. Plaintext passwords must never appear in database records, HTTP responses, or server logs. | **Automated Unit / DB Test:** Query raw user record from database and assert the hash prefix is `$2a$` or `$2b$` and strictly not equal to the plaintext input. | Sprint 1 |
| **`NFR-02`** | **Authentication Barrier & Data Isolation** | All protected endpoints accessed without an active session cookie must return **HTTP 401 Unauthorized** with zero private entity data returned. | **Automated API Integration Test:** Execute requests to all protected routes without cookies and assert HTTP status 401 and empty payload. | Sprint 1 |
| **`NFR-03`** | **API Response Latency** | Request retrieval endpoints (`GET /api/requests` and `GET /api/requests/:id`) must respond within **500 ms** under seeded data. Database indexes on foreign keys ensure scalability. | **Automated Performance Test:** Measure response time of query endpoints in test runner following one warm-up cycle; assert duration $< 500\text{ ms}$. | Sprint 1 |

---

## 8. Significant Design Decisions (DEC)

| ID | Design Decision | Alternative Considered | Rationale & Trade-off Resolution |
| :--- | :--- | :--- | :--- |
| **`DEC-01`** | Adopt **PostgreSQL** as primary database from Day 1 | SQLite | CPE 334 Lab 5 requires containerized GCP deployment with durable persistence surviving container restarts. SQLite on Cloud Run ephemeral storage violates this criterion. |
| **`DEC-02`** | Allow self-assignment at submit, but enforce **rejection with 403 Forbidden at review boundary** | Block self-selection at submit time (400) | Blocking at submit prevents creating a testable state where `requesterId == assignedReviewerId`. Allowing it verifies backend authorization enforcement (`BR-01`) directly and decouples submission from reviewer validation. |
| **`DEC-03`** | Return **HTTP 404 Not Found** for unauthorized resource viewing | Return HTTP 403 Forbidden | Returning 403 leaks metadata confirming the resource exists, exposing the system to ID enumeration attacks. Returning 404 provides zero-knowledge security. |
| **`DEC-04`** | Use **`Decimal(12, 2)`** for monetary values instead of `Float` | Float / Double | Standard IEEE-754 floats introduce arithmetic precision errors (e.g. `0.1 + 0.2 = 0.30000000000000004`), causing false test failures in `BR-04` total amount assertions. |
| **`DEC-05`** | Implement as a **Modular Monolith using Next.js App Router** | Separate Frontend & Backend repositories | Next.js App Router co-locates UI and server-side route handlers in a single repository, sharing TypeScript types cleanly and streamlining Lab 5 container deployment. |
| **`DEC-06`** | Enforce fixed **Authorization Guard Order: 401 $\rightarrow$ 404 $\rightarrow$ 403 $\rightarrow$ 400** | Validate entity state before checking permissions | Eliminates ambiguous conflicting errors between partners' implementations and ensures unauthorized users cannot infer internal resource states. |
| **`DEC-07`** | **Exclude request deletion** from Sprint 1 scope | Implement `DELETE /api/requests/:id` | Keeps Sprint 1 focused on the critical vertical slice (create $\rightarrow$ submit $\rightarrow$ approve/reject) and removes cascading deletion complexity. |
| **`DEC-08`** | Establish **foreign key and query indexes** in initial migration | Add indexes in Sprint 2 | Indexing `requesterId`, `assignedReviewerId`, and `status` early guarantees `NFR-03` compliance and prevents migration drift between team members. |
