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
| `FR-02` Create a request with line items | `F-02` | 1 | `AC-10` .. `AC-13` | `TEST-10` .. `TEST-19` | `pass` — 62/62 on `npm test` |
| `FR-03` Submit to a named reviewer | `F-02` | 1 | `AC-16` .. `AC-18`, `AC-18b`, `AC-18c` | within `TEST-10` .. `TEST-19` | `pass` — 62/62 on `npm test` |
| `FR-04` Reviewer sees assigned requests | `F-03` | 1 | `AC-20`, `AC-21`, `AC-22`, `AC-24`, `AC-28` | `TEST-20`, `TEST-21`, `TEST-22`, `TEST-24`, `TEST-28`, `TEST-28d` .. `TEST-28g` | `pass` — 62/62 on `npm test` · `TEST-28d` .. `TEST-28g` were added with `F-04`, which found the queue was not filtering by status as `FR-04` requires |
| `FR-05` Approve or reject with a reason | `F-04` | 1 | `AC-30`, `AC-36` | `TEST-30`, `TEST-30b`, `TEST-30c`, `TEST-36`, `TEST-E2E-02` | `pass` — 62/62 on `npm test` · the reason is mandatory for **both** decisions, as `FR-05` states · `TEST-E2E-02` written, `not run` |

### Business Rules

| Requirement | Feature | Sprint | Acceptance criteria | Tests | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `BR-01` No self-approval | `F-04` | 1 | **`AC-31`**, `AC-38` | `TEST-31`, `TEST-38`, `TEST-39c` | `pass` — 62/62 on `npm test` · `TEST-38` is the one that proves the guard order |
| `BR-02` Valid state transitions only | `F-04` | 1 | **`AC-32`** | `TEST-32`, `TEST-32b`, `TEST-39e`, `TEST-39f` | `pass` — 62/62 on `npm test` |
| `BR-03` Immutable after submission | `F-02` | 1 | `AC-15` | `TEST-15` | `pass` — 62/62 on `npm test` |
| `BR-04` Total and line item validation | `F-02` | 1 | `AC-11`, `AC-12` | `TEST-11`, `TEST-12` | `pass` — 62/62 on `npm test` |
| `BR-05` Access isolation — read | `F-03` | 1 | `AC-21`, `AC-26`, `AC-27`, **`AC-34`** | `TEST-21`, `TEST-26`, `TEST-27`, `TEST-34` | `pass` — 62/62 on `npm test` · `TEST-34` landed with `F-04`, which also gave this rule one named home in `src/lib/authorization.ts`. The decide endpoint deliberately does not use it — `AC-33` needs `403` where this needs `404`; see `F-04` contract §7 |
| `BR-05` Access isolation — decide | `F-04` | 1 | **`AC-33`** | `TEST-33`, `TEST-33b`, `TEST-39d` | `pass` — 62/62 on `npm test` |
| `BR-06` Request number generation | `F-02` | 1 | `AC-10` | `TEST-10`, `TEST-10b` | `pass` — 62/62 on `npm test` |

> The four criteria in bold are fixed by the team agreement §9.4 because the course requires each of those
> rules to carry an automated test. Their numbers must not change.

### Non-Functional Requirements

| Requirement | Feature | Sprint | Acceptance criteria | Tests | Verification method | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NFR-01` Passwords hashed, never plaintext | `F-01` | 1 | within `AC-01` .. `AC-04` | within `TEST-01` .. `TEST-04` | API test reads the stored `passwordHash` back from the database and asserts the `$2a$`/`$2b$` prefix and that it differs from the submitted password | `verified` — closed in PR #8 |
| `NFR-02` Unauthenticated requests refused | `F-01`, enforced by `SR-01` | 1 | `AC-23`, `AC-37`, and within `AC-01` .. `AC-04` | `TEST-23`, `TEST-37`, `TEST-37b` | API test calls each protected endpoint with no cookie and asserts `401` with no entity data | `pass` — 62/62 on `npm test` |
| `NFR-03` List endpoints within 500 ms | `F-03` | 1 | `AC-29` | `TEST-29` | Timer assertion on the second call, after one warm-up call, against seed data | `pass` — 62/62 on `npm test` |

### System responsibilities

| Responsibility | Feature | Sprint | Verified by | Status |
| :--- | :--- | :--- | :--- | :--- |
| `SR-01` Authorization check order `401 → 404 → 403 → 400` | `F-04` | 1 | `AC-38` proves the order; `AC-23`, `AC-26`, `AC-31`, `AC-33`, `AC-37` each exercise one step, and `TEST-33b`, `TEST-34b`, `TEST-37b` cover the boundaries between them | `pass` — 62/62 on `npm test` · step 2 at `POST /review` is an existence check only, see gap 4 |
| `SR-02` Shared error envelope and codes | `F-01` | 1 | Every negative criterion asserts the `code` as well as the status | `pass` — 62/62 on `npm test` · every refusal test asserts `error.code`, not only the status |
| `SR-03` Append-only audit history | `F-02`, `F-04` | 1 | `AC-30`, `AC-36` assert a row appears; `AC-31`, `AC-32`, `AC-33` assert none does; `TEST-30b` asserts the earlier `SUBMIT` row survives the decision | `pass` — 62/62 on `npm test` · every refusal test re-reads the record, so a guard that wrote before refusing would fail |
| `SR-04` Monetary precision as `Decimal` | `F-01`, `F-02`, `F-03` | 1 | `TEST-12`, `TEST-20b`, `TEST-28c` | `pass` — 62/62 on `npm test` |
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

Filled as each contract is written. The result column records the **most recent full run of the suite**,
not the run that first turned a row green, so every row that passes carries the same figure. It is
completed after each feature lands and carried into the Deliverable 1 report. The figure below is
`npm test` on `feat/F-04-approval-guards`: **62 tests in 10 files, all passing**.

### `F-03` Reviewer dashboard and assigned view — siripitch-c

| AC | Test | Level | Test file | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-20` | `TEST-20` | API | `tests/api/requests-list.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-20` | `TEST-20b` | API | `tests/api/requests-list.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-21` | `TEST-21` | API | `tests/api/requests-list.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-22` | `TEST-22` | API | `tests/api/requests-list.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-23` | `TEST-23` | API | `tests/api/requests-list.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-23` | `TEST-23b` | API | `tests/api/requests-detail.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-24` | `TEST-24` | API | `tests/api/requests-detail.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-25` | `TEST-25` | API | `tests/api/requests-detail.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-26` | `TEST-26` | API | `tests/api/requests-detail.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-27` | `TEST-27` | API | `tests/api/requests-detail.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-28` | `TEST-28` | UI | `tests/unit/dashboard-empty.test.tsx` | `pass` — 62/62 on `npm test` |
| `AC-28` | `TEST-28b` | UI | `tests/unit/dashboard-empty.test.tsx` | `pass` — 62/62 on `npm test` |
| `AC-28` | `TEST-28c` | UI | `tests/unit/dashboard-empty.test.tsx` | `pass` — 62/62 on `npm test` |
| `FR-04` | `TEST-28d` .. `TEST-28g` | UI | `tests/unit/review-queue.test.ts` | `pass` — 62/62 on `npm test`, added with `F-04` |
| `AC-29` | `TEST-29` | API | `tests/api/requests-list.test.ts` | `pass` — 62/62 on `npm test` |

> `GET /api/requests` and `GET /api/requests/:id` were implemented by `F-02` in PR #8, because its own
> screens needed them. `F-03` owns the reviewer half of the visibility rules over those same handlers and
> extends the files in place rather than creating new ones. `AC-26` and `AC-27` compare the two response
> bodies as text, so a difference in wording alone would fail.

### `F-04` Approval workflow and business rule guards — siripitch-c

| AC | Test | Level | Test file | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-30` | `TEST-30`, `TEST-30b`, `TEST-30c` | API | `tests/api/review-success.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-31` | `TEST-31` | API | `tests/api/review-guards.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-32` | `TEST-32`, `TEST-32b` | API | `tests/api/review-guards.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-33` | `TEST-33`, `TEST-33b` | API | `tests/api/review-guards.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-34` | `TEST-34` | API | `tests/api/review-guards.test.ts` | `pass` — 62/62 on `npm test` |
| §2.2 step 2 | `TEST-34b` | API | `tests/api/review-guards.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-35` | `TEST-35`, `TEST-35b` | API | `tests/api/review-guards.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-36` | `TEST-36` | API | `tests/api/review-success.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-37` | `TEST-37`, `TEST-37b` | API | `tests/api/review-guards.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-38` | `TEST-38` | API | `tests/api/review-guards.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-39` | `TEST-39`, `TEST-39b` .. `TEST-39g` | UI | `tests/unit/review-buttons.test.tsx` | `pass` — 62/62 on `npm test` |
| `AC-30`, `AC-39` | `TEST-E2E-02` | E2E | `tests/e2e/approval-journey.spec.ts` | `not run` — written, awaiting a Playwright run |

> The suite was run and **failed first**: with the tests committed and neither `review/route.ts` nor
> `ReviewDecisionPanel` written, `npm test` reported `3 failed | 6 passed (9)` with the 35 pre-existing
> tests still green. The implementation took it to `10 passed (10)` and `62 passed (62)`. The thirteen
> supplementary tests are specified in §5.1 of the `F-04` contract.

### `F-01` Authentication and session — KaiDaoMuKrobb

| AC | Test | Level | Test file | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-01` .. `AC-04` | `TEST-01` .. `TEST-04` | API, Unit | `tests/api/auth.test.ts`, `tests/unit/auth.test.ts` | `verified` — merged in PR #6 |

### `F-02` Expense request and line items — KaiDaoMuKrobb

| AC | Test | Level | Test file | Result |
| :--- | :--- | :--- | :--- | :--- |
| `AC-10` .. `AC-19`, `AC-18b`, `AC-18c`, `AC-19b` | `TEST-10` .. `TEST-19`, `TEST-10b`, `TEST-18b`, `TEST-18c`, `TEST-19b` | API | `tests/api/request-crud.test.ts` | `pass` — 62/62 on `npm test` |
| `AC-10` .. `AC-19` | `TEST-E2E-01` | E2E | `tests/e2e/requester-journey.spec.ts` | `pass` — 1 passed in 19.1 s, run by KaiDaoMuKrobb while reviewing PR #13 |

---

## 4. Gaps, stated explicitly

Part B requires uncovered requirements to be shown rather than omitted. These are the open items as of
6 November 2026. Every requirement in `docs/srs.md` is allocated to a feature and a sprint; the gaps
below are in elaboration, not in coverage.

| # | Gap | Effect | Owner |
| :--- | :--- | :--- | :--- |
| 1 | `TEST-E2E-02` is written but has not been run. `tests/e2e/approval-journey.spec.ts` exists; `npm run test:e2e` has not been executed against it | The `F-04` end-to-end row in §3 reads `not run`. `TEST-E2E-01` was executed and passed during the review of PR #13 | whoever reviews the `F-04` Pull Request |
| 2 | The threshold that triggers the second approval stage is given in `docs/srs.md` only as an example (10,000.00 THB) | `F-06` cannot be specified until the value is agreed and recorded as a design decision | both |
| 3 | Sprint 2 and Sprint 3 acceptance criteria are not yet allocated | The later-sprint rows in §2 name requirements and features but no `AC` or `TEST` identifiers | both, at each sprint start |
| 5 | `docs/system-sds.md` §3.1 draws two detail routes, `/requests/[id]` for a requester and `/reviewer/requests/[id]` for a reviewer. `F-03` built **one** shared page at `/requests/[id]` and `F-04` added the decision controls to it, which the contracts record but the SDS does not | No functional difference: the same page serves both, and what it offers follows the viewer, which `AC-39` and `TEST-39b` .. `TEST-39g` verify. The SDS diagram is out of date | siripitch-c — update the SDS diagram, or record the single-page decision in it, before the release PR |
| 4 | Agreement §7.2, the four-line summary of the check order, says step 2 answers `404` when the caller is *“not entitled to see that it exists”*. Read literally that applies to `POST /review` as well, where it would make `403 FORBIDDEN` unreachable | None in the code. `docs/srs.md` `BR-05` and the `docs/system-sds.md` §4 access matrix both state the view/decide split explicitly, and `F-04` follows them. Only the agreement summary is loose | KaiDaoMuKrobb — one clarifying clause in agreement §7.2, so the next person does not re-derive it |

No requirement in the Sprint 1 baseline is without an allocated feature.

---

## 5. Maintenance

This matrix is updated in the same Pull Request as the change that affects it, never afterwards.

- A new acceptance criterion adds a row to §2 and §3 in the same commit as the contract that introduces it.
- A test result is recorded in §3 after the Sprint 1 run, and the same values are carried into the
  Deliverable 1 report so the two cannot disagree.
- A requirement moved between sprints is recorded in the change log of the team agreement, and its row here
  is updated to match.
