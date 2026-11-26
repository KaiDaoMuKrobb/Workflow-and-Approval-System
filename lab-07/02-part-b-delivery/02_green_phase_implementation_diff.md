# Part B.2: Bounded Implementation Diff & GREEN Phase Evidence

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  
> **Requirement:** 3.2 Part B &mdash; Implement and show green  

---

## 1. GREEN Phase Implementation Overview

Following the RED test failure, the bounded maintenance fix was implemented across both the API validation layer and the UI presentation layer:

- **GREEN Fix Commit:** [`6ab7290dc402c95df64b7b2a2b0e8f4c7538808d`](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/commit/6ab7290)
- **Commit Date:** 24 November 2026, 23:32 ICT
- **Author:** Siripitch Chaiyabutra (@siripitch-c)
- **Files Modified:** 4 files (+53 insertions, -8 deletions)
  1. `src/app/api/requests/[id]/submit/route.ts` (API guard)
  2. `src/app/requests/new/page.tsx` (UI filtering & explanatory feedback)
  3. `src/types/index.ts` (Error code vocabulary extension)
  4. `tests/api/review-guards.test.ts` (Documentation clarification)

---

## 2. Actual Code Diff

### 2.1 API Route Guard (`src/app/api/requests/[id]/submit/route.ts`)
```diff
@@ -51,6 +51,20 @@ export async function POST(
       return jsonError('Assigned reviewer is required for submission', 'VALIDATION_ERROR', 400);
     }
 
+    // DEC-02 v2.0 (AC-18): a requester cannot name themselves as the reviewer.
+    // Checked here, before the reviewer is loaded, so that a REQUESTER who names
+    // themselves is told the specific reason instead of the generic role error.
+    // Nothing has been written at this point, so the request is left in DRAFT with
+    // no ApprovalHistory row. The BR-01 guard at POST /review is a second layer and
+    // is unchanged.
+    if (assignedReviewerId.trim() === existingRequest.requesterId) {
+      return jsonError(
+        'You cannot assign this request to yourself. Please choose a different reviewer.',
+        'SELF_ASSIGNMENT',
+        400
+      );
+    }
+
     // Verify reviewer exists and holds REVIEWER role
     const reviewer = await prisma.user.findUnique({
       where: { id: assignedReviewerId.trim() },
```

### 2.2 UI Form Filtering & Feedback (`src/app/requests/new/page.tsx`)
```diff
@@ -48,13 +49,26 @@ function NewRequestForm() {
   useEffect(() => {
     async function init() {
       try {
-        // Fetch eligible reviewers
+        // Who is signed in. AC-18e needs this to keep the requester out of the
+        // reviewer list: under DEC-02 v2.0 a request cannot be assigned to oneself.
+        let signedInId = '';
+        const meRes = await fetch('/api/auth/me');
+        if (meRes.ok) {
+          const meData = await meRes.json();
+          signedInId = meData.data.user.id;
+          setCurrentUserId(signedInId);
+        }
+
+        // Fetch eligible reviewers. GET /api/reviewers still returns every
+        // REVIEWER account (AC-18c); the caller is removed here, on the screen.
         const revRes = await fetch('/api/reviewers');
         if (revRes.ok) {
           const revData = await revRes.json();
-          setReviewers(revData.data.reviewers);
-          if (revData.data.reviewers.length > 0) {
-            setSelectedReviewerId(revData.data.reviewers[0].id);
+          const all: Reviewer[] = revData.data.reviewers;
+          setReviewers(all);
+          const selectable = all.filter((rev) => rev.id !== signedInId);
+          if (selectable.length > 0) {
+            setSelectedReviewerId(selectable[0].id);
           }
         }
@@ -398,12 +417,23 @@ function NewRequestForm() {
                 onChange={(e) => setSelectedReviewerId(e.target.value)}
                 className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
               >
-                {reviewers.map((rev) => (
+                {selectableReviewers.map((rev) => (
                   <option key={rev.id} value={rev.id}>
                     {rev.name} ({rev.role} — {rev.department}) — {rev.email}
                   </option>
                 ))}
               </select>
+              {ownAccountExcluded && (
+                <p className="text-xs text-amber-600 mt-1">
+                  Your own account is not listed. A request cannot be assigned to
+                  yourself, because the reviewer who decides it must be someone else.
+                </p>
+              )}
```

### 2.3 Shared Error Code Extension (`src/types/index.ts`)
```diff
 export type ErrorCode =
   | 'NOT_FOUND'
   | 'FORBIDDEN'
   | 'SELF_APPROVAL'
+  | 'SELF_ASSIGNMENT'
   | 'INVALID_TRANSITION'
   | 'IMMUTABLE_AFTER_SUBMIT'
```

---

## 3. Passing Test Execution Output (GREEN Execution)

Re-running the automated test on commit `6ab7290`:

```
$ npx vitest run tests/api/request-crud.test.ts -t "TEST-18"

 RUN  v2.1.9 C:/Users/Asus/Downloads/Project SE

 ✓ tests/api/request-crud.test.ts (19 tests | 1 passed | 18 skipped) 942ms
   ✓ Feature F-02: Expense Request and Line Items Management > TEST-18 / AC-18: refuses self-assignment at submit with 400 and keeps claim in DRAFT (DEC-02 v2.0)

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  23:33:10
   Duration  1.82s
```

All assertions passed:
- `res.status === 400`
- `body.error === 'SELF_ASSIGNMENT'`
- Database record remains in `DRAFT` status
- Zero `ApprovalHistory` rows created
