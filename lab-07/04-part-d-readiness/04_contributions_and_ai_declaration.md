# Part D.4: Contributions, AI Declaration & Limitations

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  

---

## 1. Student Contributions Table

| Student Name & ID | Role in Lab 7 | Key Deliverables & Activities |
|---|---|---|
| **Siripitch Chaiyabutra**<br>(67070503440, `@siripitch-c`) | **Author & Implementer** | - Drafted TA approval request email and submitted to TA Supachok.<br>- Authored PR #40 (Contract specification updates in `srs.md` and `F-02`).<br>- Authored RED test commit (`3975dc5`) and GREEN fix commit (`6ab7290`).<br>- Implemented API backend guard and form UI feedback in PR #42.<br>- Compiled Technical Debt register and metrics tracking. |
| **Pattarawadee Thanapoomthakul**<br>(67070503435, `@KaiDaoMuKrobb`) | **Peer Reviewer & Release Integrator** | - Peer-reviewed and approved PR #40 before implementation began.<br>- Conducted substantive code review and verified all 4 TA directives on PR #42.<br>- Merged PR #40 and PR #42 into `staging` branch (Commits `8fb15b3` & `3d7235d`).<br>- Implemented Feature F-07 and maintained 100% CI green status.<br>- Formatted Lab 7 master documentation and assembled PDF submission package. |

*Note: All work was executed collaboratively through asynchronous pair review and Git pull request gates.*

---

## 2. Declaration of AI Tool Usage

In accordance with course academic integrity policies:
- **AI Tools Employed:** Google Antigravity Agent (Gemini 2.5 Pro) and Anthropic Claude 3.5 Sonnet.
- **Scope of AI Assistance:**
  - Generating test fixtures and drafting initial markdown documentation templates.
  - Analyzing TypeScript compile errors and verifying invariant guard ordering.
  - Automating Playwright headless screenshot capture scripts.
- **Human Verification & Ownership:** Every architectural decision, business rule formulation, API boundary change, and pull request review was manually inspected, verified, executed, and approved by the team members.

---

## 3. Known System Limitations

1. **Sprint Scope Boundary:** Current release candidate incorporates maintained Sprint 1 functionality and F-07 filtering; advanced features such as multi-stage approval (`F-06`) and expense analytics (`F-08`) belong to upcoming sprint increments.
2. **Reviewer Selection in Single-Reviewer Teams:** If an organization has only one registered reviewer who is also the requester, `AC-18e` correctly blocks self-assignment, displaying an explicit alert that no other reviewer is available until another reviewer is onboarded.
