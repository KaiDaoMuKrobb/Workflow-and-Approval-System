# Part A.1: Approved Change Request and TA Approval Evidence

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  
> **Authors:** Pattarawadee Thanapoomthakul (67070503435) & Siripitch Chaiyabutra (67070503440)  
> **GitHub Issue:** [#39](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/issues/39)  

---

## 1. Approval Record

| Field | Detail |
|---|---|
| **Approver** | Supachok Deetaweesukh (Tik), Course Teaching Assistant |
| **Request Sent** | 24 November 2026, 17:00 ICT, by Siripitch Chaiyabutra on behalf of Team EN-011 |
| **Approval Received** | 24 November 2026, 19:34 ICT (via email response) |
| **Approval Evidence** | `EVID_TA_01_approval_dec02.jpg` (embedded below and archived in repository) |
| **Associated GitHub Issue** | Issue #39: `[Lab 7] DEC-02: refuse self-assignment at submit time` |

### 1.1 TA Directives & Mandatory Conditions
Course TA Supachok Deetaweesukh approved the change request to `DEC-02` with four explicit technical conditions:
1. **Reject self-assignment at submission with HTTP 400**: Refuse `assignedReviewerId == requesterId` at `POST /api/requests/:id/submit` returning HTTP 400 Bad Request with a clear, machine-verifiable error code (`SELF_ASSIGNMENT`).
2. **Provide clear UI feedback**: The request creation/submission form must prevent self-selection upfront and display an informative notice explaining why the user's own name is omitted from the reviewer list.
3. **Retain the `BR-01` decision-endpoint guard**: The HTTP 403 `SELF_APPROVAL` check at `POST /api/requests/:id/review` must remain completely intact as a robust second line of defense (Defense-in-Depth).
4. **Direct backend test**: Verify the rule via direct API testing to prove that malicious actors or altered clients cannot bypass the check.

Furthermore, before code implementation, the team was instructed to:
- Record the accepted Sprint 1 baseline and pre-change commits.
- Revise the relevant specification contracts and STS test designs.
- Obtain formal peer review from teammate Pattarawadee before writing implementation code.
- Record the approval email as immutable evidence in Issue #39.

### 1.2 Approval Evidence Screenshot
![TA Approval Email](file:///c:/Users/Asus/Downloads/Project%20SE/lab-07/evidence/EVID_TA_01_approval_dec02.jpg)

---

## 2. Version Baseline Identification

| Milestone | Commit SHA / Tag | Date & Time | Deployed Revision / Environment |
|---|---|---|---|
| **Accepted Sprint 1 Baseline** | `3cd8c4518753077d7802842da545f1d4a7c73db5` (`v0.1.0`) | 07 Nov 2026, 20:30 ICT | Deliverable 1 Release Baseline |
| **Actual Pre-change Implementation** | `5636e54407dc8f7402acf1b9d173c4c949faad41` | 21 Nov 2026, 23:45 ICT | Cloud Run: `expenseflow-00007-nv7` |
| **Intervening Development** | Commits between `3cd8c45` and `5636e54` | 08–21 Nov 2026 | Lab 5 CI/CD deployment pipeline, WIF, and Lab 6 boundary bug fix (`BR-EX-01` 100k cap). None of these touched reviewer assignment logic. |

---

## 3. Original Sprint 1 Rule vs. Proposed New Rule

### 3.1 Original Sprint 1 Requirement (`DEC-02 v1.0`)
- **SRS Reference:** `docs/srs.md` §3 (Design Decisions, `DEC-02`) and `docs/sprints/sprint-1/F-02-request-crud.md`.
- **Sprint 1 Rule:** Requesters holding the `REVIEWER` role (e.g. David Dual Role) were allowed to designate themselves as the assigned reviewer during submission. `POST /api/requests/:id/submit` accepted `assignedReviewerId == requesterId`, responded with HTTP 200 OK, and transitioned the claim to `SUBMITTED`.
- **Deferred Enforcement:** Enforcement was deferred to the decision endpoint (`POST /api/requests/:id/review`), where `BR-01` answered HTTP 403 Forbidden (`SELF_APPROVAL`).
- **Sprint 1 Rationale:** To create an accessible, testable state where `requesterId == assignedReviewerId` without direct database manipulation.

### 3.2 Reason for Maintenance Change (Independent UAT Finding)
During the Lab 6 independent User Acceptance Testing, the external partner team recorded limitation **`K-2`**:
> *"When a user holding both roles submits a claim and assigns themselves, the claim transitions to `SUBMITTED`. However, `BR-01` permanently blocks them from approving it, `AC-33` blocks all other reviewers from seeing/deciding it, and `BR-03` prevents editing submitted claims. With no delete feature, the claim is trapped forever in `SUBMITTED` status as a zombie record."*

Because `TEST-31` constructs its test fixture directly via Prisma ORM rather than through the public submission endpoint, the original rationale of `DEC-02` is obsolete. The business requirement legitimately changed from *deferred rejection* to *preventative boundary rejection*.

### 3.3 Proposed New Rule (`DEC-02 v2.0`)
- **API Boundary:** `POST /api/requests/:id/submit` refuses requests where `assignedReviewerId == requesterId` with **HTTP 400 Bad Request** and error code `SELF_ASSIGNMENT`. The claim remains in `DRAFT` status, and zero `ApprovalHistory` rows are created.
- **UI Boundary:** The reviewer selection dropdown in `/requests/new` dynamically filters out the authenticated user's own account. An informative visual notice (`AC-18e`) alerts the user that self-assignment is prohibited.
- **Preserved Defense-in-Depth:** The `BR-01` guard at `POST /api/requests/:id/review` remains strictly in place, answering HTTP 403 Forbidden.

---

## 4. Maintenance Scope Boundary

| In Scope | Out of Scope |
|---|---|
| Validation logic in `POST /api/requests/:id/submit` | `BR-01` decision endpoint guard (retained as layer 2) |
| Reviewer selection dropdown in `src/app/requests/new/page.tsx` | `BR-02`, `BR-03`, `BR-05`, `AC-33` and other Sprint 1 rules |
| Error vocabulary (`SELF_ASSIGNMENT` error code) | Database schema modifications (Prisma schema untouched) |
| Engineering contracts (`docs/srs.md`, `F-02-request-crud.md`, STS) | Sprint 2 / Sprint 3 backlog features (`F-05`, `F-06`, `F-07`) |
