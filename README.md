# ExpenseFlow - Corporate Expense Reimbursement System

[![Course](https://img.shields.io/badge/Course-CPE%20334%20Software%20Engineering-blue)](https://github.com)
[![Deliverable](https://img.shields.io/badge/Deliverable-Sprint%201%20Baseline-success)](https://github.com)
[![Theme](https://img.shields.io/badge/Theme-5%20Workflow%20%26%20Approval-orange)](https://github.com)

ExpenseFlow is an enterprise-grade full-stack web application developed for **CPE 334 Software Engineering (Semester 1/2026)**. The system governs corporate expense reimbursement claims with server-side role-based access control, a strict finite state machine, and immutable financial audit logging.

---

## Technical Stack

- **Framework:** Next.js 14+ (App Router, TypeScript Strict Mode)
- **Database:** PostgreSQL (Containerized via Docker)
- **ORM:** Prisma ORM with exact `Decimal(12, 2)` monetary handling
- **Security:** `bcryptjs` password hashing (salt rounds = 10), JWT in `HttpOnly` session cookies
- **Testing:** Vitest (Unit & Route Integration) + Playwright (End-to-End)
- **Styling:** Tailwind CSS + Lucide Icons

---

## Local Setup & Quickstart

### Prerequisites
- Node.js >= 20.x and npm
- Docker Desktop (for containerized PostgreSQL)

### 1. Start Database Container
```bash
docker compose up -d
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Apply Database Migrations & Seed Accounts
```bash
npx prisma migrate dev
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Accounts (Seeded)

All seeded test accounts share the standard password: `Password123!`

| Email | Role | Department | Testing Purpose |
| :--- | :--- | :--- | :--- |
| `alice.req@test.com` | `REQUESTER` | Engineering | Standard employee request creation & submission |
| `bob.req@test.com` | `REQUESTER` | Marketing | Data isolation verification (404 on cross-access) |
| `carol.rev@test.com` | `REVIEWER` | Engineering | Assigned reviewer queue & approval actions |
| `david.both@test.com` | `REVIEWER` | Marketing | Self-approval prevention (`BR-01`) & unrelated reviewer restriction (`BR-05`) |

---

## Running Automated Tests

```bash
# Run unit & API integration tests
npm test

# Run Playwright End-to-End tests
npx playwright test
```

---

## Engineering Documentation

- [Part A: Software Requirements Specification (SRS)](docs/srs.md)
- [Part C: System-Level Software Design Specification (SDS)](docs/system-sds.md)
- [Sprint 1 Feature Contracts](docs/sprints/sprint-1/)

