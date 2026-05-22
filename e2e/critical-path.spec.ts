/**
 * Critical-path smoke tests for Briter.
 *
 * These tests run serially and assume a fresh (unconfigured) instance.
 * The webServer in playwright.config.ts starts `bun run dev` on port 3075.
 *
 * NOTE: The setup wizard only appears when the app has not yet been configured
 * (storage/config.json missing or configured=false AND no adminPasswordHash).
 * In CI this is guaranteed. Locally, clear storage/ before running.
 */

import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const ADMIN_PASSWORD = 'playwright-test-secret-pw';

test('setup wizard completes successfully', async ({ page }) => {
  // Admin page redirects to /setup when not configured
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/setup/);

  // Fill setup form using placeholder-based selectors (the form has no ids)
  await page.getByPlaceholder('Site name').fill('Playwright Test Site');
  await page.getByPlaceholder('Site description').fill('E2E test blog');
  await page.getByPlaceholder('Author name').fill('Test Author');
  await page.getByPlaceholder('Admin password').fill(ADMIN_PASSWORD);
  // Leave TOTP unchecked (default)

  await page.getByRole('button', { name: 'Complete setup' }).click();

  // After setup, a "Continue to login" link appears
  await expect(page.getByRole('link', { name: 'Continue to login' })).toBeVisible({ timeout: 10000 });
});

test('login works after setup', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  await page.getByPlaceholder('Admin password').fill(ADMIN_PASSWORD);
  // TOTP not enabled — leave TOTP field empty
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Successful login redirects to /admin
  await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
});

test('create and publish a post', async ({ page }) => {
  // Log in first
  await page.goto('/login');
  await page.getByPlaceholder('Admin password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

  // Navigate to the new post editor
  await page.goto('/write/new');
  await expect(page).toHaveURL(/\/write\/new/);

  // Fill title using id="title"
  await page.locator('#title').fill('Hello from Playwright');

  // Fill body textarea (placeholder text used as selector)
  await page.getByPlaceholder('Write in Markdown or MDX. Paste screenshots directly.').fill(
    'This post was created by the Playwright smoke test.',
  );

  // Click Publish
  await page.getByRole('button', { name: 'Publish' }).click();

  // After publish, the status message should update and the URL may change to the slug
  await expect(
    page.getByText('Saved. The worker can pick up the queued sync job.'),
  ).toBeVisible({ timeout: 15000 });
});

test('post appears in public reader', async ({ page }) => {
  await page.goto('/posts');
  // At least one post-title link should be visible
  await expect(page.locator('.post-title').first()).toBeVisible({ timeout: 10000 });
});

test('RSS feed returns 200 with XML content', async ({ page }) => {
  const response = await page.goto('/feed.xml');
  expect(response?.status()).toBe(200);
  const contentType = response?.headers()['content-type'] ?? '';
  expect(contentType).toMatch(/xml/);
  const body = await response?.text();
  expect(body).toContain('<?xml');
  expect(body).toContain('<rss');
});
