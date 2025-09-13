const { test, expect } = require('@playwright/test');

test.describe('Homepage Tests', () => {
  test('should load homepage correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Skill Swap/);
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Welcome to Skill Swap');
    
    // Check navigation elements
    await expect(page.locator('.navbar')).toBeVisible();
    await expect(page.locator('.logo')).toContainText('Skill Swap');
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Test Browse Skills navigation
    await page.click('text=Browse Skills');
    await expect(page).toHaveURL('/browse');
    await expect(page.locator('h1')).toContainText('Browse Skills');
    
    // Test Home navigation
    await page.click('text=Home');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Welcome to Skill Swap');
  });

  test('should show authentication buttons for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Check auth buttons are visible
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('button:has-text("Get Started")')).toBeVisible();
    await expect(page.locator('button:has-text("Upgrade to Pro")')).toBeVisible();
  });

  test('should navigate to login page when Sign In is clicked', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Sign In to Skill Swap');
  });

  test('should navigate to register page when Get Started is clicked', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button:has-text("Get Started")');
    await expect(page).toHaveURL('/register');
    await expect(page.locator('h1')).toContainText('Create Your Account');
  });

  test('should navigate to upgrade page when Upgrade to Pro is clicked', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button:has-text("Upgrade to Pro")');
    await expect(page).toHaveURL('/upgrade');
    await expect(page.locator('h1')).toContainText('Upgrade to Skill Swap Pro');
  });

  test('should have responsive design', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.navbar')).toBeVisible();
    await expect(page.locator('.hero')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('.navbar')).toBeVisible();
    await expect(page.locator('.hero')).toBeVisible();
  });
});