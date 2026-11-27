# F-07: Multi-Criteria Filtering, Search & Pagination

> **Feature Engineering Contract (Part E)** · Sprint 2 · Owner: **KaiDaoMuKrobb (Pattarawadee Thanapoomthakul)** · Issue #43  
> Branch: `feat/F-07-search-filter`  
> Target Branch: `staging`  
> Repository path: `docs/sprints/sprint-2/F-07-search-filter.md`  
> Reviewer: **siripitch-c (Siripitch Chaiyabutra)**  
>
> Written **before** implementation as mandated by Lab 7 §3.1 and Deliverable 2. Commit this specification before any implementation commit.

---

## 1. Requirements & System Context

| Type | ID | Statement |
| :--- | :--- | :--- |
| FR | `FR-08` | Multi-criteria filtering & search across both requester claims and reviewer queue |
| BR | `BR-05` | Access isolation strictly preserved: search/filter queries never disclose unauthorized entities across user boundaries |
| NFR | `NFR-02` | Unauthenticated requests receive HTTP 401 `UNAUTHENTICATED` with zero entity leakage |
| NFR | `NFR-03` | Filtered queries respond within 500 ms on seeded dataset |
| DEC | `DEC-03` | Zero-knowledge security: return HTTP 404 Not Found for unauthorized resource viewing |
| DEC | `DEC-06` | Invariant guard evaluation order: `401 UNAUTHENTICATED` $\rightarrow$ `404 NOT_FOUND` $\rightarrow$ `403 FORBIDDEN` $\rightarrow$ `400 VALIDATION_ERROR` |

---

## 2. Scope & Behavioral Specification

### 2.1 Functional Capabilities
`F-07` enhances `GET /api/requests` and the client dashboard screens with comprehensive query capabilities:
1. **Status Filtering (`status`):** Filter by one or more valid lifecycle states (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `RETURNED`). Note: `STAGE1_APPROVED` arrives with `F-06` multi-stage approval.
2. **Category Filtering (`category`):** Filter by itemized expense category (`TRAVEL`, `MEALS`, `SUPPLIES`, `EQUIPMENT`, `OFFICE_SUPPLIES`, `OTHER`) across request line items. Unrecognized categories return HTTP 400 `VALIDATION_ERROR`.
3. **Date Range Filtering (`from`, `to`):** Filter by request creation timestamp (`createdAt`) using ISO-8601 calendar date bounds (`YYYY-MM-DD`). Inverted dates (`from > to`) or malformed strings return HTTP 400 `VALIDATION_ERROR`.
4. **Keyword Search (`search`):** Case-insensitive substring matching against `requestNumber`, `title`, `description`, and `requester.name`.
5. **Deterministic Pagination (`page`, `pageSize`):** Page number (default 1) and page size (default 10, maximum cap 100). Non-positive or non-integer values return HTTP 400 `VALIDATION_ERROR`. Returns standard pagination metadata (`page`, `pageSize`, `totalCount`, `totalPages`). `totalPages` evaluates to `0` when `totalCount` is 0.
6. **Reviewer Queue Filtering (`queue=true`):** Reviewers can query specifically their active review queue (`assignedReviewerId == user.id AND requesterId != user.id AND status == 'SUBMITTED'`) directly at the database layer without client-side row truncation.
7. **Accurate Dashboard Statistics (`stats`):** Computes exact status breakdown counts (`drafts`, `submitted`, `approved`, `rejected`) via database-level `groupBy` aggregation, avoiding client-side pagination limits.
8. **Strict Access Isolation (`BR-05`):** All search and filter predicates are evaluated as a logical `AND` within the caller's existing security boundary (`requesterId == user.id` for requesters; `requesterId == user.id OR assignedReviewerId == user.id` for reviewers).

---

## 3. Layer Specifications

### 3.1 Data Layer
**No schema migration required.** The existing PostgreSQL indexes on `ExpenseRequest`:
- `requesterId` (B-tree index)
- `assignedReviewerId` (B-tree index)
- `status` (B-tree index)

support multi-criteria filtering under user boundary constraints. Line items category filtering uses join relation on `ExpenseItem.requestId`.

### 3.2 API Layer Specification (`GET /api/requests`)

#### Supported Query Parameters
| Parameter | Type | Validation / Constraints | Default |
| :--- | :--- | :--- | :--- |
| `search` | string | Trimmed string, max 100 chars; matches `requestNumber`, `title`, `description`, `requester.name` | None |
| `status` | string | Must be valid `RequestStatus` enum value | None |
| `category` | string | Must be valid `VALID_EXPENSE_CATEGORIES` value | None |
| `from` | string | ISO date string (`YYYY-MM-DD` or ISO-8601) | None |
| `to` | string | ISO date string (`YYYY-MM-DD` or ISO-8601); must be $\ge$ `from` | None |
| `page` | integer | Positive integer $\ge 1$ | `1` |
| `pageSize` | integer | Positive integer $\ge 1$; capped at `100` | `10` |
| `queue` | boolean | Set to `true` to filter specifically for reviewer queue items | `false` |

#### Successful Response Format (HTTP 200 OK)
```jsonc
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "requestNumber": "EXP-2026-0001",
        "title": "Client visit travel",
        "description": "Travel and accommodation",
        "totalAmount": "1270.50",
        "status": "SUBMITTED",
        "createdAt": "2026-11-18T10:00:00.000Z",
        "requester": {
          "id": "uuid",
          "name": "Alice Requester",
          "email": "alice.req@test.com",
          "department": "ENGINEERING"
        },
        "assignedReviewer": {
          "id": "uuid",
          "name": "Carol Manager",
          "email": "carol.rev@test.com"
        },
        "items": [
          {
            "id": "uuid",
            "category": "TRAVEL",
            "description": "Flight",
            "amount": "850.50"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalCount": 1,
      "totalPages": 1
    },
    "stats": {
      "drafts": 0,
      "submitted": 1,
      "approved": 0,
      "rejected": 0
    }
  }
}
```

#### Error Response Format (HTTP 400 Bad Request)
Returned when validation constraints are violated:
```jsonc
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters: status must be a recognized RequestStatus"
  }
}
```

---

## 4. Acceptance Criteria (AC-70 to AC-77)

- **`AC-70` (Filter by Status):**  
  *Given* an authenticated user with multiple requests in various statuses  
  *When* `GET /api/requests?status=SUBMITTED` is requested  
  *Then* server returns HTTP 200 and every returned request has `status: 'SUBMITTED'`.

- **`AC-71` (Filter by Expense Category):**  
  *Given* an authenticated user with requests containing diverse line items  
  *When* `GET /api/requests?category=MEALS` is requested  
  *Then* server returns HTTP 200 and every returned request contains at least one line item with `category: 'MEALS'`.

- **`AC-72` (Filter by Date Range):**  
  *Given* an authenticated user with requests created across different dates  
  *When* `GET /api/requests?from=2026-11-01&to=2026-11-20` is requested  
  *Then* server returns HTTP 200 and all returned requests have `createdAt` between `2026-11-01T00:00:00.000Z` and `2026-11-20T23:59:59.999Z`.

- **`AC-73` (Search by Keyword):**  
  *Given* an authenticated user with requests in the system  
  *When* `GET /api/requests?search=Client` or `GET /api/requests?search=EXP-2026-0001` is requested  
  *Then* server returns HTTP 200 with requests whose `title`, `description`, `requestNumber`, or `requester.name` contains the search term case-insensitively.

- **`AC-74` (Pagination Bounds & Slicing):**  
  *Given* an authenticated user with multiple requests  
  *When* `GET /api/requests?page=2&pageSize=2` is requested  
  *Then* server returns HTTP 200 with exactly the second page slice, and `pagination` contains accurate `page`, `pageSize`, `totalCount`, and `totalPages`. Requesting `pageSize > 100` is capped at 100.

- **`AC-75` (Multi-Criteria Combined Filtering):**  
  *Given* an authenticated user with various requests  
  *When* `GET /api/requests?status=SUBMITTED&category=TRAVEL&search=Client` is requested  
  *Then* server returns HTTP 200 with requests satisfying all predicates simultaneously (`AND` semantics).

- **`AC-76` (Strict Access Isolation Under Search/Filter - BR-05):**  
  *Given* user Bob has requests matching search term `Confidential`  
  *When* user Alice requests `GET /api/requests?search=Confidential`  
  *Then* server returns HTTP 200 with empty list (`[]`), never disclosing Bob's requests.

- **`AC-77` (Interactive UI Search, Filter & Pagination Controls):**  
  *Given* an authenticated user on the requests dashboard (`/requests` or `/reviewer/dashboard`)  
  *When* the user inputs search text, selects category, chooses date bounds, or clicks pagination buttons  
  *Then* the claims table updates dynamically, displaying active filter tags and interactive pagination controls across pages without client-side cap truncation.

---

## 5. Software Test Specification (STS)

| Test ID | AC | Type | Description | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **`TEST-70`** | `AC-70` | API | Filter by status (`status=SUBMITTED`) | HTTP 200, all returned items have status `SUBMITTED` |
| **`TEST-71`** | `AC-71` | API | Filter by category (`category=MEALS`) | HTTP 200, all returned items contain `MEALS` |
| **`TEST-72`** | `AC-72` | API | Filter by date range (`from=...&to=...`) | HTTP 200, items fall within specified range |
| **`TEST-73`** | `AC-73` | API | Search by keyword in title, request number, and requester name | HTTP 200, matches query case-insensitively |
| **`TEST-74`** | `AC-74` | API | Pagination slicing and upper cap | HTTP 200, page 2 items distinct from page 1, pageSize 200 capped at 100 |
| **`TEST-75`** | `AC-75` | API | Multi-criteria combined query | HTTP 200, satisfies intersection of all filters |
| **`TEST-76`** | `AC-76` | API | Access isolation verification under search | HTTP 200, cross-user search returns empty list |
| **`TEST-76b`** | `AC-76` | API | Reviewer review queue endpoint (`?queue=true`) | HTTP 200, returns pending assigned claims only without client cap |
| **`TEST-77`** | `AC-77` | UI | UI search, filter, active tags & pagination controls | Manual UI check / interactive controls on `/requests` & `/reviewer/dashboard` |
| **`TEST-78`** | `AC-70`..`74` | API | Invalid query parameter validation | HTTP 400 `VALIDATION_ERROR` on invalid status, category, date, or page |
| **`TEST-79`** | `NFR-03` | API | Filtered multi-criteria query latency benchmark | HTTP 200, response within 500 ms |

---

## 6. Revision History
| Version | Date | Author | Summary of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 24 Nov 2026 | KaiDaoMuKrobb | Initial contract specification for `F-07` Multi-criteria search, filter, and pagination before implementation. |
| 1.1 | 25 Nov 2026 | KaiDaoMuKrobb | Revised under PR #41 peer review: added `queue=true` server-side reviewer queue support, database `groupBy` exact stats, strict category/page validation, renumbered `TEST-78`/`TEST-79`, added `NFR-03` latency benchmark, corrected schema index statements, and pointed to Issue #43. |
| 1.2 | 28 Nov 2026 | KaiDaoMuKrobb | Added explicit Definition of Done checklist in Section 7 per Deliverable 2 Section 3.2 Part B criteria. |

---

## 7. Definition of Done (DoD)

1. Contract specified and approved under peer review (PR #41) prior to implementation.
2. TDD automated test suite implemented covering single-criteria, multi-criteria, access isolation, validation, and performance (`TEST-70` to `TEST-76b`, `TEST-78`, `TEST-79`).
3. Database indexes established on frequently filtered columns (`status`, `requesterId`, `assignedReviewerId`) satisfying `NFR-03`.
4. Multi-criteria query builder supporting case-insensitive keyword search, category matching, date boundaries, and pagination implemented in `src/app/api/requests/route.ts`.
5. Strict `DEC-06` error envelopes returning 400 `VALIDATION_ERROR` on malformed query parameters.
6. Zero-knowledge privacy maintained under search (`BR-05`, `AC-76`).
7. Interactive client-side UI filters, active filter chips, search input, and responsive pagination integrated into `/requests` and `/reviewer/dashboard`.
8. Performance benchmark verified under 500 ms response latency (`NFR-03`, `TEST-79`).
9. Requirements Traceability Matrix updated with bidirectional mappings for `FR-08` and `AC-70` to `AC-77`.
10. Code review completed, PR #41 merged into `staging`, and released on `main` under PR #44 (`v0.2.0`).
