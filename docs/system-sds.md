# System-Level Software Design Specification (System-Level SDS)
**Project:** Corporate Expense Reimbursement System (ExpenseFlow)  
**Deliverable:** CPE 334 Project Deliverable 1 (Part C: 15 Points)  
**Theme:** Theme 5 — Workflow and Approval System  
**Document Status:** Approved Baseline (Sprint 1)  
**Author / Maintainer:** KaiDaoMuKrobb  
**Reviewer:** siripitch-c  

---

## 1. System Architecture & Component Responsibilities

### 1.1 Architectural Pattern
ExpenseFlow is engineered as a **Modular Monolith** powered by **Next.js 14+ (App Router)**. Presentation logic, API route handlers, and business rule evaluation execute within a unified server runtime, interfacing with an external **PostgreSQL** relational database managed via **Prisma ORM**.

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser)"]
        UI["React Server & Client Components\n(Tailwind CSS + Lucide Icons)"]
    end

    subgraph Server["Application / API Tier (Next.js Node.js Runtime)"]
        AuthM["Session & Auth Middleware\n(Cookie Token Validation)"]
        RouteH["Next.js Route Handlers (/api/*)"]
        BRGuard["Business Rule & Authorization Guards\n(BR-01 .. BR-06, DEC-06)"]
        PrismaClient["Prisma ORM Data Access Layer"]
        
        AuthM --> RouteH
        RouteH --> BRGuard
        BRGuard --> PrismaClient
    end

    subgraph Database["Data Tier (Persistent Storage)"]
        Postgres[("PostgreSQL Relational Database\n(Schema & Migrations)")]
    end

    UI <-->|HTTP / JSON via fetch| AuthM
    PrismaClient <-->|TCP / SQL Connection| Postgres
```

### 1.2 Component Responsibilities by Layer

| Layer | Primary Technology | Responsibilities |
| :--- | :--- | :--- |
| **Presentation Tier (UI)** | Next.js React Components, Tailwind CSS | • Role-adaptive interfaces for Requesters and Reviewers.<br>• Client-side input validation and dynamic line-item forms.<br>• Standardized Loading, Empty, and Error UI state rendering. |
| **Application & API Tier** | Next.js Route Handlers (`src/app/api/*`) | • Session extraction and credential verification (`NFR-02`).<br>• **Sole authority for Business Rules and state transition enforcement**.<br>• Exact monetary arithmetic using PostgreSQL `Decimal(12,2)`.<br>• Audit trail creation upon every workflow transition. |
| **Persistence Tier** | PostgreSQL, Prisma ORM | • Durable, ACID-compliant storage capable of surviving container redeployments.<br>• Foreign key relational constraints and cascading deletes.<br>• Strict unique constraints (`User.email`, `ExpenseRequest.requestNumber`). |

---

## 2. Data Architecture & Entity Relationship

### 2.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ EXPENSE_REQUEST : "submits (requester)"
    USER ||--o{ EXPENSE_REQUEST : "assigned to (reviewer)"
    USER ||--o{ APPROVAL_HISTORY : "acts as (actor)"
    EXPENSE_REQUEST ||--|{ EXPENSE_ITEM : "contains"
    EXPENSE_REQUEST ||--o{ APPROVAL_HISTORY : "records"

    USER {
        string id PK "UUID"
        string email UK "Unique Email"
        string passwordHash "bcrypt hashed"
        string name "Display Name"
        enum role "REQUESTER | REVIEWER"
        string department "Department Name"
        datetime createdAt
        datetime updatedAt
    }

    EXPENSE_REQUEST {
        string id PK "UUID"
        string requestNumber UK "EXP-YYYY-NNNN"
        string title "Short summary"
        string description "Details"
        decimal totalAmount "Decimal(12,2)"
        enum status "DRAFT | SUBMITTED | APPROVED | REJECTED | RETURNED"
        string requesterId FK "User.id"
        string assignedReviewerId FK "User.id (optional)"
        datetime createdAt
        datetime updatedAt
    }

    EXPENSE_ITEM {
        string id PK "UUID"
        string requestId FK "ExpenseRequest.id (Cascade)"
        string category "TRAVEL | MEALS | SUPPLIES | OTHER"
        string description "Item explanation"
        decimal amount "Decimal(12,2)"
        datetime createdAt
    }

    APPROVAL_HISTORY {
        string id PK "UUID"
        string requestId FK "ExpenseRequest.id (Cascade)"
        string actorId FK "User.id"
        enum fromStatus "RequestStatus"
        enum toStatus "RequestStatus"
        string action "SUBMIT | APPROVE | REJECT"
        string comment "Reviewer or Submitter note"
        datetime createdAt
    }
```

### 2.2 Data Integrity & Precision Constraints
1. **Referential Integrity & Cascading:**
   - Every `ExpenseRequest` is strictly anchored to its creator (`requesterId`).
   - Automated tests and data cleanups utilize `onDelete: Cascade` on `ExpenseItem` and `ApprovalHistory`.
2. **Monetary Precision (`DEC-04`):**
   - Monetary values (`totalAmount`, `amount`) are stored as `Decimal @db.Decimal(12, 2)`. This prevents IEEE-754 floating-point truncation and rounding inaccuracies.
3. **Database Indexes & Query Performance (`DEC-08`, `NFR-03`):**
   - B-Tree indexes are explicitly defined on foreign keys and frequently queried filter columns:
     - `ExpenseRequest(requesterId)`: Accelerates requester personal dashboard queries.
     - `ExpenseRequest(assignedReviewerId)`: Accelerates reviewer queue inspection (`FR-04`).
     - `ExpenseRequest(status)`: Optimizes state-based filtering.
     - `ExpenseItem(requestId)` and `ApprovalHistory(requestId, actorId)`: Ensures sub-millisecond relational joins.
4. **Database Migrations & Reproducible Seed Data:**
   - Schema evolutions are tracked via Prisma Migrate (`prisma migrate dev`).
   - A dedicated seeding script (`prisma/seed.ts`) idempotently seeds 4 standard test accounts with pre-hashed credentials.

---

## 3. UI Conventions & Screen Flow

### 3.1 Navigation Workflow

```mermaid
flowchart LR
    Login["/login\n(Authentication Gateway)"]

    subgraph RequesterView["Requester Navigation Workspace"]
        ReqDash["/requests\n(Personal Requests List)"]
        ReqNew["/requests/new\n(Create Request & Dynamic Items)"]
    end

    subgraph ReviewerView["Reviewer Navigation Workspace"]
        RevDash["/reviewer/dashboard\n(Assigned Approvals Queue)"]
    end

    Detail["/requests/[id]\n(Shared Request Detail & Decision)"]

    Login -->|Role: REQUESTER| ReqDash
    Login -->|Role: REVIEWER| RevDash
    ReqDash --> ReqNew
    ReqDash --> Detail
    RevDash --> Detail
    Detail -->|Back: REQUESTER| ReqDash
    Detail -->|Back: REVIEWER| RevDash
```

> **One detail page, not two.** An earlier revision of this diagram drew a separate
> `/reviewer/requests/[id]`. `F-03` built a single page at `/requests/[id]` and `F-04` added the decision
> controls to it rather than duplicating the screen: the two would have shared every field, every state and
> the same `GET /api/requests/:id` call. What the page offers follows the viewer — the Approve and Reject
> controls appear only for the assigned reviewer of a `SUBMITTED` request, and the back link returns each
> viewer to the list they came from. `TEST-39` and `TEST-39b` .. `TEST-39g` verify both directions. Hiding
> the controls is not the authorization: every one of those cases is also refused by
> `POST /api/requests/:id/review` (`SR-05`).

### 3.2 Shared UI Behaviors & States
- **Validation State:** Client forms provide immediate visual validation (e.g., negative amounts highlight red, missing reviewer disables submit).
- **Loading State:** Form buttons transition to disabled spinner states upon submission to prevent accidental duplicate clicks.
- **Empty State:** Lists with zero items render an informative illustration and a primary call-to-action button (*"No expense requests found"*).
- **Error Feedback:** Server error responses (such as 403 `SELF_APPROVAL`) trigger an accessible top-level alert banner explaining the exact violation.

---

## 4. API Design & Security Conventions

### 4.1 REST API Architectural Conventions
- Endpoints use plural REST nouns (`/api/requests`, `/api/auth`).
- All responses conform to a predictable envelope:
  ```jsonc
  // Success Envelope
  {
    "success": true,
    "data": { /* Resource Payload */ }
  }

  // Error Envelope
  {
    "success": false,
    "error": {
      "message": "Human-readable explanation",
      "code": "MACHINE_READABLE_ERROR_CODE"
    }
  }
  ```

### 4.2 Security & Guard Enforcement Hierarchy (`DEC-06`)
Every route handler executes an invariant 4-tier evaluation pipeline before accessing persistent data:

```
[Inbound HTTP Request]
          │
          ▼
1. Authentication Guard       ──(No valid cookie/session)───> 401 UNAUTHENTICATED
          │
          ▼
2. Resource Existence Guard   ──(Resource not found/hidden)─> 404 NOT_FOUND
          │
          ▼
3. Role & Ownership Guard     ──(Self-approval attempt)─────> 403 SELF_APPROVAL
                              ──(Unassigned reviewer access)─> 403 FORBIDDEN
          │
          ▼
4. Domain State Machine Guard ──(Illegal state transition)───> 400 INVALID_TRANSITION
                              ──(Edit submitted request)────> 400 IMMUTABLE_AFTER_SUBMIT
                              ──(Invalid item/zero amount)───> 400 VALIDATION_ERROR
                              ──(Invalid login credentials)──> 400 INVALID_CREDENTIALS
          │
          ▼
[Execute Domain Logic & Commit Transaction] (Unhandled Server Exceptions ──> 500 INTERNAL_ERROR)
```

### 4.3 Shared Error Code Vocabulary

| `code` | When Used | HTTP | Linked Rule / Requirement |
| :--- | :--- | :---: | :--- |
| `UNAUTHENTICATED` | Missing or expired session cookie | 401 | `NFR-02` |
| `NOT_FOUND` | Resource not found or requester has no permission to know it exists | 404 | `BR-05`, `DEC-03` |
| `FORBIDDEN` | Authenticated but unauthorized to perform this action | 403 | `BR-05` |
| `SELF_APPROVAL` | Reviewer attempting to decide on their own submitted request | 403 | `BR-01`, `DEC-02` |
| `INVALID_TRANSITION` | Disallowed state machine transition attempt | 400 | `BR-02` |
| `IMMUTABLE_AFTER_SUBMIT` | Attempting to modify a request after submission | 400 | `BR-03` |
| `VALIDATION_ERROR` | Missing required fields, zero/negative line item amount | 400 | `BR-04` |
| `INVALID_CREDENTIALS` | Incorrect email or password during login | 400 | `FR-01`, `AC-02` |
| `INTERNAL_ERROR` | Unhandled server exception or database failure | 500 | Robustness |

### 4.4 Role & Permission Matrix

| Endpoint | Method | Public | Requester (Owner) | Requester (Other) | Assigned Reviewer | Unrelated Reviewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/auth/login` | POST | ✅ | — | — | — | — |
| `/api/auth/logout` | POST | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/me` | GET | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/api/requests` (Create) | POST | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/api/requests` (List) | GET | ❌ | ✅ (Own items) | ❌ | ✅ (Assigned + Own) | ❌ |
| `/api/requests/:id` (View) | GET | ❌ | ✅ | **404** | ✅ | **404** |
| `/api/requests/:id` (Update) | PUT | ❌ | ✅ (`DRAFT` only) | **404** | ❌ (400) | **404** |
| `/api/requests/:id/submit` | POST | ❌ | ✅ (`DRAFT` only) | **404** | ❌ (400) | **404** |
| `/api/requests/:id/review` | POST | ❌ | ❌ (403) | ❌ (403) | ✅ (**No Self-Approval**) | **403** |

---

## 5. Authentication & Credential Architecture

1. **Password Hashing:**
   - User passwords are encrypted using `bcryptjs` with 10 salt rounds before storage.
   - Plaintext passwords never enter logs, database fields, or API responses (`NFR-01`).
2. **Session Lifecycle:**
   - Successful authentication issues a cryptographically signed JWT containing `id`, `email`, `role`, and `department`.
   - The token is transmitted exclusively via an `HttpOnly`, `SameSite=Lax`, `Path=/` cookie (`expense_session`), expiring in 24 hours (86,400s).
3. **Logout Workflow:**
   - `POST /api/auth/logout` sets cookie `Max-Age=0`, ensuring immediate client-side token discard.

---

## 6. Configuration & Deployment Architecture

### 6.1 Environment Configuration (`.env`)
```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expenseflow?schema=public"

# Authentication Secret
JWT_SECRET="super-secret-jwt-key-for-development-cpe334"

# Node Environment
NODE_ENV="development"
```

### 6.2 Deployment Strategy (GCP Cloud Run Ready for Lab 5)
- Next.js is configured with `output: 'standalone'` in `next.config.mjs`, producing a lightweight, reproducible Docker container (~120MB).
- The external PostgreSQL connection ensures zero state is held on the ephemeral container disk, satisfying the persistence requirements of Lab 5 and GCP Cloud Run.
