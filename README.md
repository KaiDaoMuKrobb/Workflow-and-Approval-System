# ExpenseFlow - Corporate Expense Reimbursement System

[![Course](https://img.shields.io/badge/Course-CPE%20334%20Software%20Engineering-blue)](https://github.com)
[![Deliverable](https://img.shields.io/badge/Deliverable-Sprint%202%20Completion%20(v0.3.0)-success)](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/releases/tag/v0.3.0)
[![Tests](https://img.shields.io/badge/Tests-112%20passed%20%7C%2015%20files-brightgreen)](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/actions)
[![Deployment](https://img.shields.io/badge/Deploy-Cloud%20Run%20(expenseflow--00009--44r)-blueviolet)](https://expenseflow-231151010524.asia-southeast1.run.app)
[![Theme](https://img.shields.io/badge/Theme-5%20Workflow%20%26%20Approval-orange)](https://github.com)

ExpenseFlow is an enterprise-grade full-stack web application developed for **CPE 334 Software Engineering (Semester 1/2026, Section 31, Team EN-011)**. The system governs corporate expense reimbursement claims with server-side role-based access control, a strict finite state machine, dual-control second-stage approval, and immutable financial audit logging.

- **Live Deployed Service:** https://expenseflow-231151010524.asia-southeast1.run.app
- **Target Release Candidate:** `v0.3.0` (commit `e75a306`, PR #58)
- **Active Cloud Run Revision:** `expenseflow-00009-44r` (serving 100% traffic)

---

## Technical Stack

- **Framework:** Next.js 14+ (App Router, TypeScript Strict Mode)
- **Database:** PostgreSQL (Google Cloud SQL in Production, Containerized PostgreSQL via Docker locally)
- **ORM:** Prisma ORM 5.22 with exact `Decimal(12, 2)` monetary handling
- **Security:** `bcryptjs` password hashing (salt rounds = 10), JWT in `HttpOnly` session cookies (`expense_session`)
- **Testing:** Vitest (Unit & Route Integration) + Playwright (End-to-End) - **112 tests passing across 15 files**
- **Styling:** Tailwind CSS + Lucide Icons
- **Cloud Infrastructure:** Google Cloud Run, Cloud SQL for PostgreSQL, Artifact Registry, GitHub Actions CI/CD with Workload Identity Federation (WIF)

---

## Local Setup & Quickstart

### Prerequisites
- Node.js >= 20.x and npm
- Docker Desktop (for containerized PostgreSQL)

### 1. Configure Environment Variables
Copy the template. Prisma reads `DATABASE_URL` from `.env`, and the application refuses to sign a session without `JWT_SECRET`, so every step below fails until this file exists. `.env` is git-ignored and never committed.

On Linux / macOS:
```bash
cp .env.example .env
```

On Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

### 2. Start Database Container
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Apply Database Migrations & Seed Accounts
```bash
npx prisma generate
npx prisma migrate dev
npm run db:seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Accounts (Seeded Synthetic Accounts)

> **Security Note:** In compliance with security standards, production credentials and secret tokens are not committed to the repository. The demonstration password for deployed environments is held securely in Google Secret Manager (`DEMO_USER_PASSWORD`) and handed over via private course channels. For local testing, default seed values in `.env` are used.

| Email | Role | Department | Testing Purpose |
| :--- | :--- | :--- | :--- |
| `alice.req@test.com` | `REQUESTER` | Engineering | Standard employee request creation, line items, and resubmission |
| `bob.req@test.com` | `REQUESTER` | Marketing | Data isolation verification (404 zero-knowledge privacy) |
| `carol.rev@test.com` | `REVIEWER` | Engineering | Assigned reviewer queue, approval, and return for revision |
| `david.both@test.com` | `REVIEWER` / `REQUESTER` | Marketing | Dual-role testing: self-approval prevention (`BR-01`) and second-stage approval (`F-06`) |

---

## Running Automated Tests

```bash
# Run unit & API integration tests (112 tests in 15 files)
npm test

# Run Playwright End-to-End tests
npx playwright test
```

---

## Engineering Documentation

- [Software Requirements Specification (SRS)](docs/srs.md)
- [Feature Inventory](docs/features.md)
- [System-Level Software Design Specification (SDS)](docs/system-sds.md)
- [Requirements Traceability Matrix (Bidirectional)](docs/traceability.md)
- [Sprint 1 Feature Contracts (`F-01` .. `F-04`)](docs/sprints/sprint-1/)
- [Sprint 2 Feature Contracts (`F-05` Return, `F-06` Second Approval, `F-07` Search)](docs/sprints/sprint-2/)
- [Sprint 3 Feature Contracts (`F-08` Analytics, `F-09` Export, `F-10` Hardening)](docs/sprints/sprint-3/)
- [Visual Evidence Index (20 Captures)](docs/evidence/)
