# F-09: Financial Reimbursement Report Export

> **Feature Engineering Contract** : Sprint 3 : Owner: **KaiDaoMuKrobb (Pattarawadee Thanapoomthakul)**  
> Target Branch: `staging`  
> Repository path: `docs/sprints/sprint-3/F-09-financial-export.md`  
> Reviewer: **siripitch-c (Siripitch Chaiyabutra)**  
>
> Written before implementation as mandated by Deliverable 2 Handout Section 3.3.

---

## 1. Requirements & System Context

| Type | ID | Statement |
| :--- | :--- | :--- |
| FR | `FR-10` | Export verified reimbursement reports as CSV or JSON for accounting reconciliation |
| BR | `BR-10` | Report export authorization: restricted to `REVIEWER` or `ADMIN` roles. Requesters are refused |
| NFR | `NFR-02` | Unauthenticated requests receive HTTP 401 `UNAUTHENTICATED` with zero entity leakage |
| DEC | `DEC-06` | Invariant guard evaluation order: `401 UNAUTHENTICATED` -> `403 FORBIDDEN` -> `400 VALIDATION_ERROR` -> `200 SUCCESS` |

---

## 2. Scope & Behavioral Specification

### 2.1 Functional Capabilities
`F-09` provides financial data export endpoints (`GET /api/reports/export`) enabling accounting and audit personnel to download verified expense records:
1. **Multiple Formats:** Supports CSV (`format=csv`) and JSON (`format=json`). Default format is CSV.
2. **Filtering Parameters:** Allows filtering exports by date range (`from`, `to`), department (`department`), and status (`status`). By default, only `APPROVED` records are exported unless explicitly specified.
3. **Audit Trail Completeness:** Exported rows include complete metadata: `requestNumber`, `requesterName`, `requesterDepartment`, `submittedAt`, `decidedAt`, `reviewerName`, `itemCount`, `totalAmount`, and line item breakdown.
4. **CSV Header Formatting:** Standardized headers with comma-separated values, RFC 4180 quotation escaping for strings containing commas or quotes.
5. **Role-Based Protection (`BR-10`):** Only authenticated users with `REVIEWER` or `ADMIN` role can download financial exports. Standard requesters receive HTTP 403 `FORBIDDEN`.

---

## 3. Layer Specifications

### 3.1 Data Layer
**No schema changes required.** Queries utilize existing indexes on `ExpenseRequest(status, createdAt)` and join `User(name, department)`.

### 3.2 API Layer Specification (`GET /api/reports/export`)

#### Supported Query Parameters
| Parameter | Type | Validation / Constraints | Default |
| :--- | :--- | :--- | :--- |
| `format` | string | `csv` or `json` | `csv` |
| `from` | string | ISO date string (`YYYY-MM-DD`) | None |
| `to` | string | ISO date string (`YYYY-MM-DD`); must be >= `from` | None |
| `department` | string | Filter by requester department | None |
| `status` | string | Valid `RequestStatus` enum value | `APPROVED` |

#### Error Responses
- **401 Unauthorized:** Missing or invalid session token (`UNAUTHENTICATED`).
- **403 Forbidden:** User role is `REQUESTER` (`FORBIDDEN`).
- **400 Bad Request:** Invalid format or malformed date bounds (`VALIDATION_ERROR`).

#### Successful Response Format (HTTP 200 OK)
- **CSV:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="expense-report-YYYY-MM-DD.csv"`
- **JSON:** `Content-Type: application/json`

---

## 4. Acceptance Criteria (AC)

- **`AC-90` (Unauthenticated Export Guard):**  
  *Given* an unauthenticated request to `GET /api/reports/export`  
  *When* evaluated by server  
  *Then* server returns HTTP 401 with code `UNAUTHENTICATED`.

- **`AC-91` (Requester Role Refusal - BR-10):**  
  *Given* a user signed in as `REQUESTER` (e.g. `alice.req@test.com`)  
  *When* requesting `GET /api/reports/export`  
  *Then* server returns HTTP 403 with code `FORBIDDEN`.

- **`AC-92` (Reviewer Export Access):**  
  *Given* an authenticated user with role `REVIEWER`  
  *When* requesting `GET /api/reports/export?format=csv`  
  *Then* server returns HTTP 200 with CSV payload and attachment headers.

- **`AC-93` (Date Range Filtered Export):**  
  *Given* approved claims spanning multiple months  
  *When* export is requested with `from=2026-11-01&to=2026-11-30`  
  *Then* only records within the range are included in the export.

- **`AC-94` (CSV RFC 4180 Escaping):**  
  *Given* a claim title containing commas or quotes (e.g. `Dinner, Team "A"`)  
  *When* exported as CSV  
  *Then* the field is properly quoted and escaped according to RFC 4180.

- **`AC-95` (JSON Export Format):**  
  *Given* valid export request with `format=json`  
  *When* processed by server  
  *Then* server returns HTTP 200 with structured JSON array of reimbursement items.

- **`AC-96` (Empty Result Set Handling):**  
  *Given* search criteria matching zero claims  
  *When* export is requested  
  *Then* CSV returns header row only without errors; JSON returns empty array `[]`.

---

## 5. Software Test Specification (STS)

| Test ID | AC | Level | Description | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **`TEST-90`** | `AC-90` | API | Unauthenticated export attempt | HTTP 401 `UNAUTHENTICATED` |
| **`TEST-91`** | `AC-91` | API | Requester role export attempt | HTTP 403 `FORBIDDEN` |
| **`TEST-92`** | `AC-92` | API | Reviewer role CSV export download | HTTP 200, text/csv content type |
| **`TEST-93`** | `AC-93` | API | Date-filtered export accuracy | HTTP 200, records bounded by date params |
| **`TEST-94`** | `AC-94` | Unit | CSV string escaping utility | Special characters correctly escaped |
| **`TEST-95`** | `AC-95` | API | JSON format export download | HTTP 200, application/json content type |
| **`TEST-96`** | `AC-96` | API | Export with zero matching records | HTTP 200, clean empty output |

---

## 6. Definition of Done (DoD)
1. Contract reviewed and approved by peer engineer.
2. Verified against `BR-10` authorization requirements.
3. Tests defined and ready for Sprint 3 implementation phase.
