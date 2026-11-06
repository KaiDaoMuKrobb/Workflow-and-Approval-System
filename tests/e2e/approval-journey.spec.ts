import { test, expect } from '@playwright/test';

/**
 * TEST-E2E-02 — the reviewer inspection and approval journey from agreement
 * section 10.
 *
 * The script there starts with Carol signing in and finding a request from Alice
 * already waiting. `prisma/seed.ts` seeds users only, no requests, so the
 * journey raises its own request as Alice first rather than depending on
 * TEST-E2E-01 having run before it. Playwright orders spec files
 * alphabetically, so approval-journey runs first and could not rely on it.
 */
test.describe('E2E-02: Reviewer Inspection & Approval Journey', () => {
  test('Carol opens the request assigned to her and approves it', async ({ page }) => {
    const uniqueTitle = `Client Meeting Expenses ${Date.now()}`;

    // ---- Prerequisite: Alice raises and submits a claim to Carol ----------
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alice.req@test.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/requests/);

    await page.click('a[href="/requests/new"]');
    await expect(page.locator('h1')).toContainText('Create New Expense Claim');

    await page.fill('input[placeholder*="Client Onsite"]', uniqueTitle);
    await page.fill('textarea[placeholder*="business reason"]', 'Quarterly client meeting in Bangkok');
    await page.locator('select').first().selectOption('TRAVEL');
    await page.fill('input[placeholder*="Train Ticket"]', 'Airport transfer');
    await page.fill('input[placeholder="0.00"]', '1500.00');

    await page.click('button:has-text("Submit Claim for Review")');
    await expect(page).toHaveURL(/\/requests/);
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible();

    // ---- Step 1: sign in as Carol -----------------------------------------
    await page.context().clearCookies();
    await page.goto('/login');
    await page.fill('input[type="email"]', 'carol.rev@test.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // ---- Step 2: the reviewer dashboard shows the claim from Alice ---------
    await expect(page).toHaveURL(/\/reviewer\/dashboard/);
    const row = page.locator('[data-testid="reviewer-queue-row"]', { hasText: uniqueTitle });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Alice Requester');

    // ---- Step 3: open the detail page -------------------------------------
    await row.locator('a:has-text("Open")').click();
    await expect(page).toHaveURL(/\/requests\/[0-9a-f-]+$/);
    await expect(page.locator('h1')).toContainText(uniqueTitle);
    await expect(page.locator('text=SUBMITTED').first()).toBeVisible();

    // ---- Step 4: type the reason and approve ------------------------------
    const panel = page.locator('[data-testid="review-decision-panel"]');
    await expect(panel).toBeVisible();
    await page.fill('[data-testid="review-comment"]', 'Approved for client meeting expenses');
    await page.click('[data-testid="review-approve"]');

    // ---- Step 5: the screen shows APPROVED and the new history row --------
    await expect(page.locator('text=APPROVED').first()).toBeVisible();
    const history = page.locator('[data-testid="history-entry"]');
    await expect(history.filter({ hasText: 'Approved for client meeting expenses' })).toBeVisible();
    await expect(history.filter({ hasText: 'APPROVE' })).toBeVisible();

    // The controls are gone, because the request is no longer decidable.
    // AC-39 asserts the same thing at component level in TEST-39.
    await expect(panel).toBeHidden();
  });
});
