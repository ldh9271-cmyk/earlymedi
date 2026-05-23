import { test, expect } from '@playwright/test';

test.describe('Phase 1 — 5-step middleware + auth flows', () => {
  test('marketing landing page renders brand wordmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Early');
    await expect(page.locator('h1')).toContainText('Medi');
  });

  test('unauthenticated visit to /agency redirects to /login', async ({ page }) => {
    await page.goto('/agency/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated visit to /medical redirects to /login', async ({ page }) => {
    await page.goto('/medical/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page shows the 4-category signup matrix', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: '회원가입' }).click();
    await expect(page.getByText('유치업체 (Agency)')).toBeVisible();
    await expect(page.getByText('프리랜서')).toBeVisible();
    await expect(page.getByText('의료기관')).toBeVisible();
    await expect(page.getByText('비의료 파트너')).toBeVisible();
  });

  test('pricing page lists all 8 plans', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('Agency Starter')).toBeVisible();
    await expect(page.getByText('Agency Growth')).toBeVisible();
    await expect(page.getByText('Agency Pro')).toBeVisible();
    await expect(page.getByText('Medical Pay-as-you-go')).toBeVisible();
    await expect(page.getByText('Medical Committed (연간)')).toBeVisible();
    await expect(page.getByText('Partner Listing')).toBeVisible();
    await expect(page.getByText('Partner Active')).toBeVisible();
    await expect(page.getByText('Freelancer Free')).toBeVisible();
  });
});
