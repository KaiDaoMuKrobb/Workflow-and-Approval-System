import { test, expect } from '@playwright/test';

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'Password123!';

test.describe('E2E-01: Requester Expense Claim Creation & Submission Journey', () => {
  test('Alice logs in, creates a 2-item expense claim, and submits it to Carol', async ({ page }) => {
    // 1. Visit login page
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign in to ExpenseFlow');

    // 2. Fill login credentials as Alice
    await page.fill('input[type="email"]', 'alice.req@test.com');
    await page.fill('input[type="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');

    // 3. Expect redirection to /requests dashboard
    await expect(page).toHaveURL(/\/requests/);
    await expect(page.locator('h1')).toContainText('My Expense Claims');

    // 4. Click New Expense Claim
    await page.click('a[href="/requests/new"]');
    await expect(page).toHaveURL(/\/requests\/new/);
    await expect(page.locator('h1')).toContainText('Create New Expense Claim');

    // 5. Fill claim header
    const uniqueTitle = `Client Workshop Travel ${Date.now()}`;
    await page.fill('input[placeholder*="Client Onsite"]', uniqueTitle);
    await page.fill('textarea[placeholder*="business reason"]', 'Technical kickoff workshop onsite');

    // 6. Fill item #1
    const categorySelects = page.locator('select');
    await categorySelects.first().selectOption('TRAVEL');
    await page.fill('input[placeholder*="Train Ticket"]', 'High-speed Train');
    await page.fill('input[placeholder="0.00"]', '850.50');

    // 7. Add item #2
    await page.click('button:has-text("Add Line Item")');
    const descriptions = page.locator('input[placeholder*="Train Ticket"]');
    const amounts = page.locator('input[placeholder="0.00"]');
    await descriptions.nth(1).fill('Team Working Lunch');
    await amounts.nth(1).fill('420.00');

    // 8. Verify preview sum displays ฿1270.50
    await expect(page.locator('text=฿1270.50')).toBeVisible();

    // 9. Submit claim for review
    await page.click('button:has-text("Submit Claim for Review")');

    // 10. Verify redirect back to /requests and claim appears with Submitted status
    await expect(page).toHaveURL(/\/requests/);
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible();
    await expect(page.locator('text=Submitted').first()).toBeVisible();
    await expect(page.locator('text=฿1270.50').first()).toBeVisible();
  });
});

