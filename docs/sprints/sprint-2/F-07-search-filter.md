# F-07 — Multi-Criteria Filtering, Search & Pagination

> **Feature Engineering Contract (Part E)** · Sprint 2 · Owner: **KaiDaoMuKrobb (Pattarawadee Thanapoomthakul)** · Issue #41
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
| DEC | `DEC-03` | Zero-knowledge security: unauthorized search parameters return empty sets rather than error metadata |
| DEC | `DEC-06` | Invariant guard evaluation order: `401 UNAUTHENTICATED` $\rightarrow$ `404 NOT_FOUND` $\rightarrow$ `400 VALIDATION_ERROR` |

---

## 2. Scope & Behavioral Specification

### 2.1 Functional Capabilities
`F-07` enhances `GET /api/requests` and the client dashboard screens with comprehensive query capabilities:
1. **Status Filtering (`status`):** Filter by one or more valid lifecycle states (`DRAFT`, `SUBMITTED`, `STAGE1_APPROVED`, `APPROVED`, `REJECTED`, `RETURNED`).
2. **Category Filtering (`category`):** Filter by itemized expense category (`TRAVEL`, `MEALS`, `EQUIPMENT`, `OFFICE_SUPPLIES`, `OTHER`) across request line items.
3. **Date Range Filtering (`from`, `to`):** Filter by request creation timestamp (`createdAt`) using ISO-8601 calendar date bounds (`YYYY-MM-DD`).
4. **Keyword Search (`search`):** Case-insensitive substring matching against `requestNumber`, `title`, and `description`.
5. **Deterministic Pagination (`page`, `pageSize`):** Page number (default 1) and page size (default 10, maximum 100), returning standard pagination metadata.
6. **Strict Access Isolation (`BR-05`):** All search and filter predicates are evaluated as a logical `AND` within the caller's existing security boundary (`requesterId == user.id` for requesters; `requesterId == user.id OR assignedReviewerId == user.id` for reviewers).

---

## 3. Layer Specifications

### 3.1 Data Layer
**No schema migration required.** The existing PostgreSQL indexes on `requesterId`, `assignedReviewerId`, `status`, and `createdAt` support the multi-criteria queries.

### 3.2 API Layer Specification (`GET /api/requests`)

#### Supported Query Parameters
| Parameter | Type | Validation / Constraints | Default |
| :--- | :--- | :--- | :--- |
| `search` | string | Trimmed string, max 100 chars | None |
| `status` | string | Must be valid `RequestStatus` enum value | None |
| `category` | string | Must be valid `ExpenseCategory` enum value | None |
| `from` | string | ISO date string (`YYYY-MM-DD`) | None |
| `to` | string | ISO date string (`YYYY-MM-DD`) | None |
| `page` | integer | Positive integer $\ge 1$ | `1` |
| `pageSize` | integer | Positive integer $1 \le \text{pageSize} \le 100$ | `10` |

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
    }
  }
}
```

#### Error Response Format (HTTP 400 Bad Request)
If an invalid status, invalid category, or malformed date string is provided:
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
  *Then* server returns HTTP 200 with requests whose `title`, `description`, or `requestNumber` contains the search term case-insensitively.

- **`AC-74` (Pagination Bounds & Metadata):**  
  *Given* an authenticated user with 15 requests  
  *When* `GET /api/requests?page=2&pageSize=5` is requested  
  *Then* server returns HTTP 200 with exactly 5 requests, and `pagination` object contains `page: 2`, `pageSize: 5`, `totalCount: 15`, `totalPages: 3`.

- **`AC-75` (Multi-Criteria Combined Filtering):**  
  *Given* an authenticated user with various requests  
  *When* `GET /api/requests?status=SUBMITTED&category=TRAVEL&search=Client` is requested  
  *Then* server returns HTTP 200 with requests satisfying all predicates simultaneously (`AND` semantics).

- **`AC-76` (Strict Access Isolation Under Search/Filter - BR-05):**  
  *Given* user Bob has requests matching search term `Confidential`  
  *When* user Alice requests `GET /api/requests?search=Confidential`  
  *Then* server returns HTTP 200 with empty list (`[]`), never disclosing Bob's requests.

- **`AC-77` (UI Search, Filter & Pagination Controls):**  
  *Given* an authenticated user on the requests dashboard (`/requests` or `/reviewer/dashboard`)  
  *When* the user inputs search text, selects status, or selects category  
  *Then* the claims table updates dynamically, displaying active filter tags and interactive pagination controls.

---

## 5. Software Test Specification (STS)

| Test ID | AC | Type | Description | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **`TEST-70`** | `AC-70` | API | Filter by status (`status=SUBMITTED`) | HTTP 200, all returned items have status `SUBMITTED` |
| **`TEST-71`** | `AC-71` | API | Filter by category (`category=MEALS`) | HTTP 200, all returned items contain `MEALS` |
| **`TEST-72`** | `AC-72` | API | Filter by date range (`from=...&to=...`) | HTTP 200, items fall within specified range |
| **`TEST-73`** | `AC-73` | API | Search by keyword in title and EXP number | HTTP 200, matches query case-insensitively |
| **`TEST-74`** | `AC-74` | API | Pagination metadata verification | HTTP 200, items sliced accurately, metadata matches count |
| **`TEST-75`** | `AC-75` | API | Multi-criteria combined query | HTTP 200, satisfies intersection of all filters |
| **`TEST-76`** | `AC-76` | API | Access isolation verification under search | HTTP 200, cross-user search returns empty list |
| **`TEST-77`** | `AC-70`..`74` | API | Invalid query parameter validation | HTTP 400 `VALIDATION_ERROR` on invalid status or malformed date |

---

## 6. Revision History
| Version | Date | Author | Summary of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 24 Nov 2026 | KaiDaoMuKrobb | Initial contract specification for `F-07` Multi-criteria search, filter, and pagination before implementation. |
