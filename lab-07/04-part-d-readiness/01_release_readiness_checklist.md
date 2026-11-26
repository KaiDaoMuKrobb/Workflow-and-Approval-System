# Part D.1: Release Readiness Checklist

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  
> **Evaluation Scope:** Maintained Sprint 1 Scope (under `DEC-02 v2.0`)  

---

## 1. Readiness Determination

> ### **RELEASE STATUS: READY**
> **Scope:** The maintained Sprint 1 functionality &mdash; including the approved `DEC-02 v2.0` self-assignment prevention rule, the unaffected line-item lifecycle, access isolation, and the two-layer `BR-01` self-approval defense &mdash; is certified **READY** for integration and release.

---

## 2. Release Readiness Checklist Table

| Dimension / Category | Assessed Item | Status | Evidence & Verification Detail |
|---|---|:---:|---|
| **Version Baseline** | Accepted Sprint 1 Baseline | **VERIFIED** | `3cd8c4518753077d7802842da545f1d4a7c73db5` (`v0.1.0`) |
| **Pre-Change Version** | Deployed Pre-change Implementation | **VERIFIED** | `5636e54407dc8f7402acf1b9d173c4c949faad41` (`expenseflow-00007-nv7`) |
| **Submitted Version** | Maintained Production Release Commit | **VERIFIED** | `918c02a8837c5eea16df0458c0c3e66ffc87468c` (`v0.2.0`, PR #44 merge commit on `main`) |
| **Deployed Revision** | Active Google Cloud Run Revision | **VERIFIED** | `expenseflow-00008-lxv` (100% traffic, GitHub Actions Run ID: `45832964439`) |
| **Defect Backlog** | Critical (P0) / High (P1) Defects | **ZERO** | 0 open P0/P1 defects; UAT limitation `K-2` fully closed via PR #42 & PR #44. |
| **Automated Tests** | Full Regression Suite on Release | **PASS** | 71 passed, 0 failed, 0 skipped across 11 test files (`npm test`). |
| **Selected User Tests** | Form Self-Assignment Refusal (`AC-18e`) | **PASS** | Form dropdown omits caller account; informative notice displayed. |
| **Preserved Behavior** | Defense-in-Depth Self-Approval (`BR-01`) | **PASS** | `TEST-31` & `TEST-38` verify 403 Forbidden remains active. |
| **Configuration & Secrets** | Keyless Authentication & Secret Isolation | **SECURE** | WIF provider used on GCP; zero API keys or secrets committed to Git. |
| **Documentation & Run** | Contracts & Setup Guide Synchronized | **COMPLETE** | `docs/srs.md`, `F-02-request-crud.md`, and README run commands updated. |
| **Deployment Pipeline** | Automated Cloud Run Deployment & Smoke | **VERIFIED** | GitHub Actions `deploy.yml` Run #45832964439 green; `deploy/smoke_test.py` passed live. |

---

## 3. Scope Boundary Clarification

In accordance with Lab 7 Handout §3.4:
> *"Later-sprint features may coexist in the deployed project but must not be mistaken for completed Sprint 1 maintenance evidence."*

Sprint 2 backlog features (such as `F-07` search/filter/pagination and upcoming `F-05`/`F-06`) coexist on the evolving `staging` branch, but the readiness evaluation above strictly isolates and assesses the **maintained Sprint 1 boundary**. Unfinished or future sprint features do not invalidate the maintained Sprint 1 readiness status.
