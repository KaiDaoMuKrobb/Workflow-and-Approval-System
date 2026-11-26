# F-08: Department Expense Summaries & Analytics

> **Feature Engineering Contract** : Sprint 3 : Owner: **KaiDaoMuKrobb (Pattarawadee Thanapoomthakul)**  
> Target Branch: `staging`  
> Repository path: `docs/sprints/sprint-3/F-08-department-analytics.md`  
> Reviewer: **siripitch-c (Siripitch Chaiyabutra)**  
>
> Written before implementation as mandated by Deliverable 2 Handout Section 3.3.

---

## 1. Requirements & System Context

| Type | ID | Statement |
| :--- | :--- | :--- |
| FR | `FR-09` | Aggregated expense metrics by department, monthly totals, and category distribution |
| BR | `BR-05` | Access isolation: financial summaries restricted to authorized managerial roles (`REVIEWER`, `ADMIN`) |
| NFR | `NFR-02` | Unauthenticated requests receive HTTP 401 `UNAUTHENTICATED` with zero entity leakage |
| NFR | `NFR-03` | Summary query latency responds within 500 ms on seeded dataset |
| DEC | `DEC-06` | Invariant guard evaluation order: `401 UNAUTHENTICATED` -> `403 FORBIDDEN` -> `400 VALIDATION_ERROR` -> `200 SUCCESS` |

---

## 2. Scope & Behavioral Specification

### 2.1 Functional Capabilities
`F-08` introduces authoritative aggregation endpoints (`GET /api/reports/summary`) to compute organizational spend analytics:
1. **Authoritative Calculation:** Every metric is computed at request time by querying the database rows where `status = 'APPROVED'`. Draft, submitted, returned, and rejected claims are strictly excluded from approved budget totals.
2. **Departmental Aggregation (`byDepartment`):** Groups approved claims by the requester's assigned department, returning total expenditure amount (Decimal sum) and count of approved claims per department.
3. **Category Distribution (`byCategory`):** Aggregates approved line items by expense category (`TRAVEL`, `MEALS`, `SUPPLIES`, `EQUIPMENT`, `OFFICE_SUPPLIES`, `OTHER`), calculating both the total amount spent and its percentage of the overall approved budget.
4. **Monthly Breakdown (`monthlyTotals`):** Aggregates approved claims by calendar year and month (based on `updatedAt` / approval timestamp), tracking monthly spend trends.
5. **High-Level KPI Summary (`summary`):** Provides top-level executive counters: `totalApprovedAmount`, `totalApprovedClaims`, and `activeDepartmentCount`.
6. **Role-Based Access Control (`BR-05`):** Access is restricted to accounts with `REVIEWER` or `ADMIN` roles. Standard employee accounts (`REQUESTER` role only) receive HTTP 403 `FORBIDDEN`.

---

## 3. Layer Specifications

### 3.1 Data Layer
**No schema migration required.** The existing PostgreSQL schema provides all required relational associations:
- `ExpenseRequest.status` index for fast filtering of `APPROVED` claims.
- `ExpenseRequest.requesterId` join to `User.department`.
- `ExpenseItem.requestId` join for line items category summation.

### 3.2 API Layer Specification (`GET /api/reports/summary`)

#### Authentication & Authorization Guards
1. Caller must present a valid JWT session cookie. Unauthenticated requests return HTTP 401 `UNAUTHENTICATED`.
2. Caller role must be `REVIEWER` or `ADMIN`. Requesters return HTTP 403 `FORBIDDEN` with error code `FORBIDDEN_ROLE`.

#### Successful Response Format (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalApprovedAmount": 75400.00,
      "totalApprovedClaims": 4,
      "activeDepartmentCount": 2
    },
    "byDepartment": [
      {
        "department": "Engineering",
        "totalAmount": 54200.00,
        "claimCount": 3
      },
      {
        "department": "Design",
        "totalAmount": 21200.00,
        "claimCount": 1
      }
    ],
    "byCategory": [
      {
        "category": "TRAVEL",
        "totalAmount": 38500.00,
        "percentage": 51.06
      },
      {
        "category": "EQUIPMENT",
        "totalAmount": 24500.00,
        "percentage": 32.49
      },
      {
        "category": "MEALS",
        "totalAmount": 12400.00,
        "percentage": 16.45
      }
    ],
    "monthlyTotals": [
      {
        "year": 2026,
        "month": 11,
        "totalAmount": 75400.00,
        "claimCount": 4
      }
    ]
  }
}
```

---

## 4. Acceptance Criteria (AC)

- **`AC-80` (Unauthenticated Access Guard):**  
  *Given* an unauthenticated request to `GET /api/reports/summary`  
  *When* the request is evaluated  
  *Then* server returns HTTP 401 with code `UNAUTHENTICATED`.

- **`AC-81` (Role Authorization Guard):**  
  *Given* a user signed in as `REQUESTER` (e.g. `alice.req@test.com`)  
  *When* requesting `GET /api/reports/summary`  
  *Then* server returns HTTP 403 with code `FORBIDDEN_ROLE`.

- **`AC-82` (Reviewer and Admin Access):**  
  *Given* a user signed in as `REVIEWER` (e.g. `carol.mgr@test.com`) or dual-role (`david.both@test.com`)  
  *When* requesting `GET /api/reports/summary`  
  *Then* server returns HTTP 200 with complete summary payload.

- **`AC-83` (Strict Inclusion of Approved Claims Only):**  
  *Given* database contains requests in `DRAFT`, `SUBMITTED`, `RETURNED`, `REJECTED`, and `APPROVED` statuses  
  *When* `GET /api/reports/summary` is requested  
  *Then* only requests with `status: 'APPROVED'` contribute to totals. Non-approved amounts are strictly excluded.

- **`AC-84` (Department Breakdown Accuracy):**  
  *Given* multiple approved requests across different departments (Engineering, Marketing, Design)  
  *When* summary is requested  
  *Then* `byDepartment` accurately aggregates total amounts and claim counts mapped by requester department.

- **`AC-85` (Category Percentage Accuracy):**  
  *Given* approved claims itemizing travel, meals, and equipment  
  *When* summary is requested  
  *Then* `byCategory` computes exact sum per category and percentages summing to 100.00% (within decimal rounding tolerance).

- **`AC-86` (Zero Approved Claims Empty State):**  
  *Given* a clean database or department with zero approved claims  
  *When* summary is requested  
  *Then* server returns HTTP 200 with `totalApprovedAmount: 0`, `totalApprovedClaims: 0`, and empty arrays for breakdowns without throwing errors.

---

## 5. Software Test Specification (STS)

| Test ID | AC | Level | Description | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **`TEST-80`** | `AC-80` | API | Unauthenticated request to `/api/reports/summary` | HTTP 401 `UNAUTHENTICATED` |
| **`TEST-81`** | `AC-81` | API | Requester role attempting to read analytics | HTTP 403 `FORBIDDEN_ROLE` |
| **`TEST-82`** | `AC-82` | API | Reviewer role reading analytics | HTTP 200 with summary data structure |
| **`TEST-83`** | `AC-83` | API | Excludes DRAFT, SUBMITTED, and REJECTED claims | HTTP 200, totals reflect APPROVED claims only |
| **`TEST-84`** | `AC-84` | API | Department aggregation calculation | HTTP 200, department totals match sum of claims |
| **`TEST-85`** | `AC-85` | API | Category distribution and percentage calculation | HTTP 200, category breakdown matches sum of item lines |
| **`TEST-86`** | `AC-86` | API | Clean state with zero approved claims | HTTP 200 with zero totals and empty arrays |

---

## 6. Definition of Done (DoD)
1. Contract reviewed and approved by peer engineer.
2. TDD Red phase: automated tests fail against baseline.
3. TDD Green phase: implementation passes all `TEST-80` to `TEST-86`.
4. Zero regression across existing 81 automated tests.
5. Code formatted, linted, and typed with zero errors.
