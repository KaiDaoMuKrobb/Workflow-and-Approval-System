# Part B.1: Test-First RED Phase Evidence

> **Lab 7: Software Maintenance Metrics and Release Readiness**  
> **Course:** CPE 334 Introduction to Software Engineering (Semester 1/2026, Section 31)  
> **Team:** EN-011 (ExpenseFlow &mdash; Theme 5: Workflow and Approval System)  
> **Requirement:** 3.2 Part B &mdash; Show the new behavior failing on old code  

---

## 1. Test-Driven Development (RED Phase) Overview

To adhere strictly to test-driven engineering discipline, the automated test asserting the approved new behavior was authored and executed **against the pre-change codebase** (`5636e54`) before implementing any fix.

- **RED Test Commit:** [`3975dc5aaa1ffc4d2ac3789882120e507f91f2d9`](https://github.com/KaiDaoMuKrobb/Workflow-and-Approval-System/commit/3975dc5)
- **Commit Date:** 24 November 2026, 23:20 ICT
- **Tested Baseline:** Commit `5636e54` (Actual pre-change implementation, deployed as `expenseflow-00007-nv7`)
- **Test File:** `tests/api/request-crud.test.ts` (lines 524–590)
- **Test Identifier:** `TEST-18 / AC-18`

---

## 2. Test Setup and Assertions

The test was revised from the Sprint 1 expectation (which previously expected HTTP 200 OK) to strictly assert the new boundary requirement:

```typescript
it('TEST-18 / AC-18: refuses self-assignment at submit with 400 and keeps claim in DRAFT (DEC-02 v2.0)', async () => {
  // 1. Setup: Authenticated user holding both REQUESTER and REVIEWER roles (David)
  const davidCookie = signSessionCookie({
    userId: davidId,
    email: 'david.both@test.com',
    role: Role.REVIEWER,
  });

  // 2. Create a valid DRAFT request owned by David with 1 line item
  const draft = await prisma.expenseRequest.create({
    data: {
      requestNumber: 'EXP-2026-TEST18',
      title: 'Self-assignment boundary check',
      description: 'Testing DEC-02 v2.0 self-assignment rejection',
      status: RequestStatus.DRAFT,
      totalAmount: 1200.0,
      requesterId: davidId,
      items: {
        create: [
          {
            description: 'Conference ticket',
            category: 'TRAVEL',
            amount: 1200.0,
          },
        ],
      },
    },
  });

  // 3. Action: Submit specifying David's own ID as assignedReviewerId
  const submitReq = new NextRequest(
    `http://localhost:3000/api/requests/${draft.id}/submit`,
    {
      method: 'POST',
      headers: { cookie: davidCookie },
      body: JSON.stringify({ assignedReviewerId: davidId }),
    }
  );

  const res = await submitRequestHandler(submitReq, { params: { id: draft.id } });
  const body = await res.json();

  // 4. Assertions: Must reject with HTTP 400 Bad Request and error code SELF_ASSIGNMENT
  expect(res.status).toBe(400);
  expect(body.error).toBe('SELF_ASSIGNMENT');

  // Verify persistence invariant: status remains DRAFT, no history rows created
  const fresh = await prisma.expenseRequest.findUnique({
    where: { id: draft.id },
    include: { history: true },
  });
  expect(fresh?.status).toBe(RequestStatus.DRAFT);
  expect(fresh?.history).toHaveLength(0);
});
```

---

## 3. Actual Failure Execution Output (RED Execution)

When executed against the pre-change codebase (`5636e54`), the test legitimately failed because the old implementation executed Sprint 1 `DEC-02 v1.0` logic and accepted the self-assignment with HTTP 200 OK:

```
$ npx vitest run tests/api/request-crud.test.ts -t "TEST-18"

 RUN  v2.1.9 C:/Users/Asus/Downloads/Project SE

 ❯ tests/api/request-crud.test.ts (19 tests | 1 failed | 18 skipped) 1240ms
   × Feature F-02: Expense Request and Line Items Management > TEST-18 / AC-18: refuses self-assignment at submit with 400 and keeps claim in DRAFT (DEC-02 v2.0)
     → expected 200 to be 400 // Object.is equality

- Expected: 400
+ Received: 200

      at C:/Users/Asus/Downloads/Project SE/tests/api/request-crud.test.ts:568:26
      at processTicksAndRejections (node:internal/process/task_queues:104:5)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized API Response on Pre-Change Implementation:
{
  "success": true,
  "data": {
    "id": "cm3v0...draft",
    "requestNumber": "EXP-2026-TEST18",
    "status": "SUBMITTED",
    "assignedReviewerId": "cm3v0...davidId"
  }
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed (1)
      Tests  1 failed | 18 skipped (19)
   Start at  23:21:05
   Duration  2.41s
```

### 3.1 Failure Validity Affirmation
- The failure was **not** caused by a compile error, missing dependency, or invalid syntax.
- The failure was **not** caused by a corrupted fixture or database connectivity problem.
- The failure was **strictly** due to the missing business rule implementation: the old backend answered `200 SUBMITTED` instead of the newly specified `400 SELF_ASSIGNMENT`.
