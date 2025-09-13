const { test, expect } = require('@playwright/test');

test.describe('Skills Browser', () => {
  test('should display skills listing page', async ({ page }) => {
    await page.goto('/browse');
    
    // Check page structure
    await expect(page.locator('h1')).toContainText('Browse Skills');
    
    // Check skill cards are present
    await expect(page.locator('text=Guitar Lessons')).toBeVisible();
    await expect(page.locator('text=Web Development')).toBeVisible();
    await expect(page.locator('text=Digital Art')).toBeVisible();
    
    // Check prices are displayed
    await expect(page.locator('text=$25/hour')).toBeVisible();
    await expect(page.locator('text=$50/hour')).toBeVisible();
    await expect(page.locator('text=$30/hour')).toBeVisible();
  });

  test('should have functional View Details buttons', async ({ page }) => {
    await page.goto('/browse');
    
    // Set up dialog handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Skill Details');
      expect(dialog.message()).toContain('guitar-lessons');
      await dialog.accept();
    });
    
    // Click first View Details button
    await page.click('button:has-text("View Details"):first');
  });

  test('should show different skill details for different skills', async ({ page }) => {
    await page.goto('/browse');
    
    // Test Web Development skill
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('web-development');
      await dialog.accept();
    });
    
    // Click the web development View Details button
    const webDevButton = page.locator('.container div:has-text("Web Development") button:has-text("View Details")');
    await webDevButton.click();
  });

  test('should navigate back to home from skills page', async ({ page }) => {
    await page.goto('/browse');
    
    await page.click('button:has-text("← Back to Home")');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Welcome to Skill Swap');
  });

  test('should navigate to dashboard from skills page', async ({ page }) => {
    await page.goto('/browse');
    
    // Handle authentication dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('sign in');
      await dialog.accept();
    });
    
    await page.click('button:has-text("Go to Dashboard")');
    await expect(page).toHaveURL('/login');
  });

  test('should display skill cards with proper layout', async ({ page }) => {
    await page.goto('/browse');
    
    // Check that skill cards have proper structure
    const skillCards = page.locator('[style*="background: white"][style*="padding: 20px"]');
    await expect(skillCards).toHaveCount(3);
    
    // Each card should have title, description, price, and button
    for (let i = 0; i < 3; i++) {
      const card = skillCards.nth(i);
      await expect(card.locator('h3')).toBeVisible();
      await expect(card.locator('p')).toBeVisible();
      await expect(card.locator('button')).toBeVisible();
    }
  });
});