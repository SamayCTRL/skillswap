const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.describe('Registration', () => {
    test('should register new user successfully', async ({ page }) => {
      await page.goto('/register');
      
      // Fill out registration form
      await page.fill('#registerName', 'E2E Test User');
      await page.fill('#registerEmail', `e2e-${Date.now()}@test.com`);
      await page.fill('#registerPassword', 'testpassword123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message and redirect to dashboard
      await page.waitForFunction(() => 
        window.location.pathname === '/dashboard' || 
        document.body.innerText.includes('successfully')
      );
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/register');
      
      // Try to submit with empty fields
      await page.click('button[type="submit"]');
      
      // Check for HTML5 validation or custom validation
      const nameField = page.locator('#registerName');
      const emailField = page.locator('#registerEmail');
      const passwordField = page.locator('#registerPassword');
      
      await expect(nameField).toBeInvalid();
      await expect(emailField).toBeInvalid();
      await expect(passwordField).toBeInvalid();
    });

    test('should have Google Sign Up button', async ({ page }) => {
      await page.goto('/register');
      
      await expect(page.locator('button:has-text("Sign up with Google")')).toBeVisible();
      
      // Click should show demo message
      await page.click('button:has-text("Sign up with Google")');
      
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Google Sign-Up');
        await dialog.accept();
      });
    });
  });

  test.describe('Login', () => {
    test('should have login form elements', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.locator('#loginEmail')).toBeVisible();
      await expect(page.locator('#loginPassword')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
      await expect(page.locator('button:has-text("Sign in with Google")')).toBeVisible();
    });

    test('should show validation for empty fields', async ({ page }) => {
      await page.goto('/login');
      
      await page.click('button[type="submit"]');
      
      const emailField = page.locator('#loginEmail');
      const passwordField = page.locator('#loginPassword');
      
      await expect(emailField).toBeInvalid();
      await expect(passwordField).toBeInvalid();
    });

    test('should navigate to register page via link', async ({ page }) => {
      await page.goto('/login');
      
      await page.click('text=Sign up here');
      await expect(page).toHaveURL('/register');
    });

    test('should handle Google Sign In demo', async ({ page }) => {
      await page.goto('/login');
      
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Google Sign-In');
        await dialog.accept();
      });
      
      await page.click('button:has-text("Sign in with Google")');
      
      // Should redirect to dashboard after demo login
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Authentication State', () => {
    test('should update header after demo login', async ({ page }) => {
      await page.goto('/login');
      
      // Handle dialog and login
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      await page.click('button:has-text("Sign in with Google")');
      
      // Should show user info in header
      await expect(page.locator('text=Welcome, Demo User')).toBeVisible();
      await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      await page.goto('/login');
      
      // Demo login first
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      await page.click('button:has-text("Sign in with Google")');
      await expect(page).toHaveURL('/dashboard');
      
      // Logout
      await page.click('button:has-text("Logout")');
      
      // Should redirect to home and show auth buttons
      await expect(page).toHaveURL('/');
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    });

    test('should restrict access to protected pages', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should redirect to login for unauthenticated users
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('sign in');
        await dialog.accept();
      });
      
      await expect(page).toHaveURL('/login');
    });
  });
});