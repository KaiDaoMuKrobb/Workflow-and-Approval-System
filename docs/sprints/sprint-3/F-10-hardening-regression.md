# F-10: System Hardening, Concurrency & Full Regression

> **Feature Engineering Contract** : Sprint 3 : Owner: **siripitch-c (Siripitch Chaiyabutra)**  
> Target Branch: `staging`  
> Repository path: `docs/sprints/sprint-3/F-10-hardening-regression.md`  
> Reviewer: **KaiDaoMuKrobb (Pattarawadee Thanapoomthakul)**  
>
> Written before implementation as mandated by Deliverable 2 Handout Section 3.3.

---

## 1. Requirements & System Context

| Type | ID | Statement |
| :--- | :--- | :--- |
| NFR | `NFR-01` | Passwords hashed using bcrypt with salt rounds >= 10 |
| NFR | `NFR-02` | Unauthenticated requests receive HTTP 401 with zero entity leakage |
| NFR | `NFR-03` | Core API query latency responds within 500 ms on seeded dataset |
| NFR | `NFR-04` | Concurrency and duplicate-submit prevention across state transitions |
| NFR | `NFR-05` | Responsive layout and accessible contrast across 3 screen widths (375px, 768px, 1280px) |

---

## 2. Scope & Behavioral Specification

### 2.1 Functional Capabilities
`F-10` hardens the ExpenseFlow application across resilience, concurrency, and accessibility before final release:
1. **Duplicate Submit Protection (Double-Click Debounce):** Disables submit and decision buttons immediately upon first click. Prevents race conditions and duplicate HTTP requests when a user double-clicks.
2. **Database Concurrency Protection:** Utilizes optimistic locking or status checks in Prisma transactions so concurrent review decisions on the same claim do not produce corrupted histories.
3. **Global Error Boundaries:** Catches unexpected client-side rendering crashes, displaying a recovery button to return to the dashboard rather than a white screen.
4. **Empty and Loading States:** Every list and queue component renders distinct, accessible empty states (e.g. "No claims pending your review") and loading skeleton bars.
5. **Multi-Viewport Responsiveness:** Ensures table scrolling, sticky headers, and modal dialogs render properly on mobile (375px), tablet (768px), and desktop (1280px).
6. **Automated CI Browser Smoke Tests:** Configures headless Playwright smoke tests in GitHub Actions (`ci-docker.yml`), executing on every PR to verify critical user journeys.

---

## 3. Layer Specifications

### 3.1 Client Layer
- Form buttons implement `isSubmitting` state tracking.
- Next.js `error.tsx` boundary wraps page routes.
- Tailwind CSS responsive utilities (`sm:`, `md:`, `lg:`) applied to tables and forms.

### 3.2 Server Layer
- Review and submit routes enforce strict status precondition checks inside Prisma transactions.
- Concurrent updates returning state mismatch respond with HTTP 409 `CONFLICT` or HTTP 400 `IMMUTABLE_AFTER_SUBMIT`.

---

## 4. Acceptance Criteria (AC)

- **`AC-100` (Double-Click Prevention on Submit):**  
  *Given* a user submitting an expense claim  
  *When* the user double-clicks the submit button rapidly  
  *Then* the button disables immediately upon the first click, and only one HTTP POST request is dispatched.

- **`AC-101` (Double-Click Prevention on Review Decision):**  
  *Given* a reviewer deciding a claim  
  *When* the Approve or Reject button is clicked  
  *Then* decision buttons enter loading state immediately, preventing duplicate decision dispatch.

- **`AC-102` (Concurrent Review Race Condition Guard):**  
  *Given* two simultaneous decision requests on the same claim  
  *When* evaluated by the backend  
  *Then* only the first request succeeds; the second receives HTTP 400 `IMMUTABLE_AFTER_SUBMIT` or 409 `CONFLICT`.

- **`AC-103` (Global Error Boundary Recovery):**  
  *Given* an unexpected client-side exception during rendering  
  *When* caught by the React error boundary  
  *Then* user sees a graceful error alert with a "Try Again" or "Return Home" button.

- **`AC-104` (Empty State Rendering):**  
  *Given* a user with zero expense claims or an empty review queue  
  *When* visiting `/requests` or `/reviewer/dashboard`  
  *Then* user sees an informative empty state illustration and action button rather than broken tables.

- **`AC-105` (Responsive Layout at 375px, 768px, 1280px):**  
  *Given* viewing the application on mobile, tablet, or desktop  
  *When* resizing the browser viewport  
  *Then* navigation, tables, and forms adapt without horizontal overflow or overlapping text.

- **`AC-106` (Full Regression Suite Green):**  
  *Given* the complete codebase across Sprints 1, 2, and 3  
  *When* running the automated test suite  
  *Then* 100% of unit, API, and E2E tests pass with zero failures.

---

## 5. Software Test Specification (STS)

| Test ID | AC | Level | Description | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **`TEST-100`** | `AC-100` | UI | Submit button debounce on double click | Only 1 request sent; button disabled |
| **`TEST-101`** | `AC-101` | UI | Decision buttons debounce during review | Buttons disabled on click |
| **`TEST-102`** | `AC-102` | API | Concurrent decision collision check | Second request returns 400 or 409 |
| **`TEST-103`** | `AC-103` | UI | Error boundary recovery fallback render | Error UI displays gracefully |
| **`TEST-104`** | `AC-104` | UI | Empty state component render test | Empty message and icon rendered |
| **`TEST-105`** | `AC-105` | E2E | Viewport rendering across 3 breakpoints | Visual elements fit within viewport |
| **`TEST-106`** | `AC-106` | Suite | Full regression test suite execution | All tests pass (0 failures) |

---

## 6. Definition of Done (DoD)
1. Contract reviewed and approved by peer engineer.
2. Verified against non-functional requirements (`NFR-01` to `NFR-05`).
3. Automated regression suite green before final release.

---

## 7. Revision History
| Version | Date | Author | Summary of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 25 Nov 2026 | siripitch-c | Initial contract specification for `F-10` Responsive Hardening & Regression before implementation. |
| 1.1 | 26 Nov 2026 | siripitch-c | Detailed multi-viewport breakpoint specifications (375px, 768px, 1280px) and debounce invariants under `NFR-01` to `NFR-04`. |
