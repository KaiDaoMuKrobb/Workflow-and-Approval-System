# Requirements Traceability Matrix

> **Deliverable 1 — Part B** · Owner: **siripitch-c**
> Repository path: `docs/traceability.md`
> Companion documents: `docs/features.md` (what each feature is), `docs/srs.md` (what each requirement says),
> `docs/sprints/sprint-1/F-0*.md` (acceptance criteria and test specifications in full)

---

## 1. How to read this file

Traceability runs in both directions.

**Forward** — §2 takes every requirement and names the feature that delivers it, the sprint it lands in, and
the acceptance criteria and tests that prove it.

**Backward** — §3 takes every Sprint 1 acceptance criterion and names the test that verifies it, the file
that test lives in, and its current result.

A requirement with no verification is listed in §4 rather than left out. Identifiers follow the ranges
reserved in the team agreement §9.2 and never change once allocated.

| Status | Meaning |
| :--- | :--- |
| `verified` | The tests are written, executed and passing on `sprint-1-staging` |
| `specified` | The acceptance criteria and test specification are written in the feature contract |
| `pending` | The feature is allocated but its contract is not yet written |
| `planned` | Allocated to a later sprint; criteria are elaborated when that sprint begins |

---

## 2. Requirement → Feature → Sprint → Verification

### Functional Requirements

| Requirement | Feature | Sprint | Acceptance criteria | Tests | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FR-01` Sign in and sign out | `F-01` | 1 | `AC-01` .. `AC-04` | `TEST-01` .. `TEST-04` | `verified` — merged in PR #6 |
| `FR-02` Create a request with line items | `F-02` | 1 | `AC-10` .. `AC-19` | `TEST-10` .. `TEST-19` | `pending` — KaiDaoMuKrobb |
| `FR-03` Submit to a named reviewer | `F-02` | 1 | within `AC-10` .. `AC-19` | within `TEST-10` .. `TEST-19` | `pending` — KaiDaoMuKrobb |
| `FR-04` Reviewer sees assigned requests | `F-03` | 1 | `AC-20`, `AC-21`, `AC-22`, `AC-24`, `AC-28` | `TEST-20`, `TEST-21`, `TEST-22`, `TEST-24`, `TEST-28` | `specified` |
| `FR-05` Approve or reject with a reason | `F-04` | 1 | `AC-30`, `AC-36` | `TEST-30`, `TEST-36`, `TEST-E2E-02` | `specified` |

### Business Rules

| Requirement | Feature | Sprint | Acceptance criteria | Tests | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `BR-01` No self-approval | `F-04` | 1 | **`AC-31`**, `AC-38` | `TEST-31`, `TEST-38` | `specified` |
| `BR-02` Valid state transitions only | `F-04` | 1 | **`AC-32`** | `TEST-32` | `specified` |
| `BR-03` Immutable after submission | `F-02` | 1 | within `AC-10` .. `AC-19` | within `TEST-10` .. `TEST-19` | `pending` — KaiDaoMuKrobb |
| `BR-04` Total and line item validation | `F-02` | 1 | within `AC-10` .. `AC-19` | within `TEST-10` .. `TEST-19` | `pending` — KaiDaoMuKrobb |
| `BR-05` Access isolation — read | `F-03` | 1 | `AC-21`, `AC-26`, `AC-27`, **`AC-34`** | `TEST-21`, `TEST-26`, `TEST-27`, `TEST-34` | `specified` |
| `BR-05` Access isolation — decide | `F-04` | 1 | **`AC-33`** | `TEST-33` | `specified` |
| `BR-06` Request number generation | `F-02` | 1 | within `AC-10` .. `AC-19` | within `TEST-10` .. `TEST-19` | `pending` — KaiDaoMuKrobb |

> The four criteria in bold are fixed by the team agreement §9.4 because the course requires each of those
> rules to carry an automated test. Their numbers must not change.

### Non-Functional Requirements

| Requirement | Feature | Sprint | Acceptance criteria | Tests | Verification method | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NFR-01` Passwords hashed, never plaintext | `F-01` | 1 | within `AC-01` .. `AC-04` | within `TEST-01` .. `TEST-04` | Unit test asserts the `hashPassword` result carries a bcrypt prefix and differs from the plaintext | partly `verified` — see §4 gap 1 |
| `NFR-02` Unauthenticated requests refused | `F-01`, enforced by `SR-01` | 1 | `AC-23`, `AC-37`, and within `AC-01` .. `AC-04` | `TEST-23`, `TEST-37` | API test calls each protected endpoint with no cookie and asserts `401` with no entity data | partly `specified` |
| `NFR-03` List endpoints within 500 ms | `F-03` | 1 | `AC-29` | `TEST-29` | Timer assertion on the second call, after one warm-up call, against seed data | `specified` |

### System responsibilities

| Responsibility | Feature | Sprint | Verified by | Status |
| :--- | :--- | :--- | :--- | :--- |
| `SR-01` Authorization check order `401 → 404 → 403 → 400` | `F-04` | 1 | `AC-38` proves the order; `AC-23`, `AC-26`, `AC-31`, `AC-33`, `AC-37` each exercise one step | `specified` |
| `SR-02` Shared error envelope and codes | `F-01` | 1 | Every negative criterion asserts the `code` as well as the status | `specified` |
| `SR-03` Append-only audit history | `F-02`, `F-04` | 1 | `AC-30`, `AC-36` assert a row appears; `AC-31`, `AC-32`, `AC-33` assert none does | `specified` |
| `SR-04` Monetary precision as `Decimal` | `F-01`, `F-02` | 1 | within `AC-10` .. `AC-19` | `pending` — KaiDaoMuKrobb |
| `SR-05` Rules enforced server-side | `F-04` | 1 | Every guard has an API-level test that no screen is involved in | `specified` |

### Later sprints

| Requirement | Capability | Feature | Sprint | Status |
| :--- | :--- | :--- | :--- | :--- |
| `FR-06`, `BR-07`, `BR-08` | Return and resubmission | `F-05` | 2 | `planned` |
| `FR-07`, `BR-09` | Second approval stage | `F-06` | 2 | `planned` |
| `FR-08` | Search, filter and paging | `F-07` | 2 | `planned` |
| `FR-09` | Department summaries and analytics | `F-08` | 3 | `planned` |
| `FR-10`, `BR-10` | Financial report export | `F-09` | 3 | `planned` |
| — | Hardening and regression | `F-10` | 3 | `planned` |

---

## 3. Sprint 1 acceptance criteria → tests

Filled as each contract is written. The result column is completed after the Sprint 1 test run and carried
into the Deliverable 1 report.

### `F-03` Reviewer dashboard and assigned view — siripitch-c

| AC | Test | Level | Test file | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-20` | `TEST-20` | API | `tests/api/requests-list.test.ts` | — |
| `AC-21` | `TEST-21` | API | `tests/api/requests-list.test.ts` | — |
| `AC-22` | `TEST-22` | API | `tests/api/requests-list.test.ts` | — |
| `AC-23` | `TEST-23` | API | `tests/api/requests-list.test.ts` | — |
| `AC-24` | `TEST-24` | API | `tests/api/requests-detail.test.ts` | — |
| `AC-25` | `TEST-25` | API | `tests/api/requests-detail.test.ts` | — |
| `AC-26` | `TEST-26` | API | `tests/api/requests-detail.test.ts` | — |
| `AC-27` | `TEST-27` | API | `tests/api/requests-detail.test.ts` | — |
| `AC-28` | `TEST-28` | UI | `tests/unit/dashboard-empty.test.tsx` | — |
| `AC-29` | `TEST-29` | API | `tests/api/requests-list.test.ts` | — |

### `F-04` Approval workflow and business rule guards — siripitch-c

| AC | Test | Level | Test file | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-30` | `TEST-30` | API | `tests/api/review-success.test.ts` | — |
| `AC-31` | `TEST-31` | API | `tests/api/review-guards.test.ts` | — |
| `AC-32` | `TEST-32` | API | `tests/api/review-guards.test.ts` | — |
| `AC-33` | `TEST-33` | API | `tests/api/review-guards.test.ts` | — |
| `AC-34` | `TEST-34` | API | `tests/api/review-guards.test.ts` | — |
| `AC-35` | `TEST-35` | API | `tests/api/review-guards.test.ts` | — |
| `AC-36` | `TEST-36` | API | `tests/api/review-success.test.ts` | — |
| `AC-37` | `TEST-37` | API | `tests/api/review-guards.test.ts` | — |
| `AC-38` | `TEST-38` | API | `tests/api/review-guards.test.ts` | — |
| `AC-39` | `TEST-39` | UI | `tests/unit/review-buttons.test.tsx` | — |
| `AC-30`, `AC-39` | `TEST-E2E-02` | E2E | `tests/e2e/approval-journey.spec.ts` | — |

### `F-01` Authentication and session — KaiDaoMuKrobb

| AC | Test | Level | Test file | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-01` .. `AC-04` | `TEST-01` .. `TEST-04` | API, Unit | `tests/api/auth.test.ts`, `tests/unit/auth.test.ts` | `verified` — merged in PR #6 |

### `F-02` Expense request and line items — KaiDaoMuKrobb

| AC | Test | Level | Test file | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-10` .. `AC-19` | `TEST-10` .. `TEST-19` | — | — | `pending` — contract not yet written (range reserved) |
| `AC-10` .. `AC-19` | `TEST-E2E-01` | E2E | `tests/e2e/submission-journey.spec.ts` | `pending` |

---

## 4. Gaps, stated explicitly

Part B requires uncovered requirements to be shown rather than omitted. These are the open items as of
4 November 2026. Every requirement in `docs/srs.md` is allocated to a feature and a sprint; the gaps
below are in elaboration, not in coverage.

| # | Gap | Effect | Owner |
| :--- | :--- | :--- | :--- |
| 1 | `NFR-01` in `docs/srs.md` asks for the **stored** user record to be read back and asserted against the plaintext. The current test asserts the output of `hashPassword` instead, so the hashing function is verified but the persisted column is not | The requirement is met in behaviour but not by the verification method the baseline specifies | KaiDaoMuKrobb — one assertion added to `tests/api/auth.test.ts` |
| 2 | The acceptance criteria and test specifications for `F-02` are not yet written | `AC-10` .. `AC-19` and `TEST-10` .. `TEST-19` appear as reserved ranges rather than individual rows | KaiDaoMuKrobb |
| 3 | The threshold that triggers the second approval stage is given in `docs/srs.md` only as an example (10,000.00 THB) | `F-06` cannot be specified until the value is agreed and recorded as a design decision | both |
| 4 | Sprint 2 and Sprint 3 acceptance criteria are not yet allocated | The later-sprint rows in §2 name requirements and features but no `AC` or `TEST` identifiers | both, at each sprint start |

No requirement in the Sprint 1 baseline is without an allocated feature.

---

## 5. Maintenance

This matrix is updated in the same Pull Request as the change that affects it, never afterwards.

- A new acceptance criterion adds a row to §2 and §3 in the same commit as the contract that introduces it.
- A test result is recorded in §3 after the Sprint 1 run, and the same values are carried into the
  Deliverable 1 report so the two cannot disagree.
- A requirement moved between sprints is recorded in the change log of the team agreement, and its row here
  is updated to match.
