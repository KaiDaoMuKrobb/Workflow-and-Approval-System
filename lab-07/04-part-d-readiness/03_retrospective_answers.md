# Part D.3: Three Brief Retrospective Questions

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  
> **Format:** 1–2 sentences per question, strictly tied to observed engineering work  

---

### 1. What Helped?
Formalizing contract updates and obtaining teammate peer review *before* writing code (PR #40 preceding PR #42) ensured that both engineers were 100% aligned on invariant guard order, error codes, and preserved behaviors, resulting in a zero-defect implementation on the very first try.

### 2. What Hurt?
Relying on manual UI screenshot verification for Acceptance Criteria (such as `AC-77` and `AC-18e`) created repetitive friction during PR review rounds and delayed merge readiness.

### 3. What Will Change for the Final Release?
For the remaining Sprint 2 and Sprint 3 features, we will wire automated Playwright headless browser assertions directly into our GitHub Actions CI pipeline on every PR so that visual regression checks are validated automatically without manual screenshot capture.
