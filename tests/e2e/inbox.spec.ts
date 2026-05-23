import { test, expect } from '@playwright/test';

test.describe('Phase 2 — Inbox UI', () => {
  test('unauthenticated /agency/inbox redirects to /login', async ({ page }) => {
    await page.goto('/agency/inbox');
    await expect(page).toHaveURL(/\/login/);
  });

  // NOTE: full inbox E2E requires a seeded DB + magic-link login automation.
  // We expand this spec in Phase 6 once Stripe-test login fixtures land.
});
