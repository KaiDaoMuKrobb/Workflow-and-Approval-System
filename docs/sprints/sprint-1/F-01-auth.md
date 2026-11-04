# Feature Engineering Contract: F-01 User Authentication & Session Management
**Feature ID:** `F-01`  
**Sprint:** Sprint 1  
**Owner:** KaiDaoMuKrobb  
**Reviewer:** siripitch-c  
**Status:** Specified & Ready for Review  

---

## 1. Feature SDS & Domain Behavior

### 1.1 Purpose & Workflow
`F-01` provides identity verification, session persistence, and server-side authorization boundaries for all users of ExpenseFlow.
1. **Login Workflow:** The user submits their email and password to `POST /api/auth/login`. The server verifies user existence, compares the password against the stored `bcrypt` hash, and on success issues a cryptographically signed JWT within an `HttpOnly` cookie.
2. **Current User Inspection:** Client applications query `GET /api/auth/me`. The server extracts and validates the session cookie, returning caller identity (ID, email, name, role, department).
3. **Logout Workflow:** Calling `POST /api/auth/logout` commands the client to discard the session cookie by setting its expiration to immediate zero (`Max-Age=0`).

### 1.2 Linked Requirements
- **`FR-01`**: User Authentication & Session Management.
- **`NFR-01`**: Password Security (`bcryptjs` hashing with salt rounds $\ge 10$; no plaintext storage).
- **`NFR-02`**: Authentication Barrier (Unauthenticated requests to protected endpoints return 401 with zero private data).

---

## 2. API & Data Specifications

### 2.1 API Endpoints

#### `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "alice.req@test.com",
    "password": "Password123!"
  }
  ```
- **Success Response (200 OK):**
  - Sets Cookie: `expense_session=<jwt>; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "email": "alice.req@test.com",
        "name": "Alice Requester",
        "role": "REQUESTER",
        "department": "Engineering"
      }
    }
  }
  ```
- **Error Response (400 Bad Request):**
  ```json
  {
    "success": false,
    "error": {
      "message": "Invalid email or password",
      "code": "INVALID_CREDENTIALS"
    }
  }
  ```

#### `POST /api/auth/logout`
- **Access:** Authenticated
- **Success Response (200 OK):** Clears `expense_session` cookie (`Max-Age=0`).
  ```json
  { "success": true, "data": { "message": "Logged out successfully" } }
  ```
- **Error Response (401 Unauthorized):**
  ```json
  {
    "success": false,
    "error": {
      "message": "Authentication required",
      "code": "UNAUTHENTICATED"
    }
  }
  ```

#### `GET /api/auth/me`
- **Access:** Authenticated
- **Success Response (200 OK):** Returns current user payload.
- **Error Response (401 Unauthorized):**
  ```json
  {
    "success": false,
    "error": {
      "message": "Authentication required",
      "code": "UNAUTHENTICATED"
    }
  }
  ```

---

## 3. Acceptance Criteria (AC)

- **`AC-01` (Successful Login):**  
  *Given* an active registered user with correct email and password  
  *When* `POST /api/auth/login` is invoked  
  *Then* server responds with HTTP 200, user identity payload, and an `HttpOnly` session cookie (`expense_session`).

- **`AC-02` (Invalid Credentials Rejection):**  
  *Given* an invalid password or nonexistent email  
  *When* `POST /api/auth/login` is invoked  
  *Then* server responds with HTTP 400 and error code `INVALID_CREDENTIALS` without issuing a cookie.

- **`AC-03` (Session Logout):**  
  *Given* an authenticated user with an active session cookie  
  *When* `POST /api/auth/logout` is invoked  
  *Then* server responds with HTTP 200 and invalidates the session cookie (`Max-Age=0`). Calling without an active session cookie returns HTTP 401 with code `UNAUTHENTICATED` per `NFR-02`.

- **`AC-04` (Unauthenticated Access Barrier - NFR-02):**  
  *Given* an unauthenticated HTTP request without an active session cookie  
  *When* any protected endpoint (`GET /api/auth/me`, `/api/requests`) is queried  
  *Then* server rejects with HTTP 401 and error code `UNAUTHENTICATED` with zero private entity data leaked.

---

## 4. Software Test Specification (STS)

| Test ID | Linked AC | Test Level | Preconditions / Input | Execution Action | Expected Result |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **`TEST-01`** | `AC-01` | Integration | Seeded user `alice.req@test.com` with `Password123!` | Submit valid login payload | HTTP 200, valid user object, `Set-Cookie` present |
| **`TEST-02`** | `AC-02` | Integration | Existing user with wrong password `WrongPwd!` | Submit invalid login payload | HTTP 400, `INVALID_CREDENTIALS`, no session cookie |
| **`TEST-03`** | `AC-03` | Integration | Active authenticated session | Call `POST /api/auth/logout` | HTTP 200, cookie cleared (`Max-Age=0`) |
| **`TEST-04`** | `AC-04` | Integration | No session cookie header provided | Call `GET /api/auth/me` | HTTP 401, `UNAUTHENTICATED`, data is undefined |

---

## 5. Product Definition of Done (DoD)

- [x] Feature SDS, API contracts, ACs, and STS documented and version-controlled.
- [x] Password hashing verified via `bcryptjs` (salt $\ge 10$) fulfilling `NFR-01`.
- [x] Authentication barrier returns HTTP 401 without leakage fulfilling `NFR-02`.
- [x] Automated unit and integration test suite executing and passing.
- [x] Feature implemented on branch `feat/F-01-auth` and reviewed by peer (@siripitch-c) via PR into `sprint-1-staging`.

