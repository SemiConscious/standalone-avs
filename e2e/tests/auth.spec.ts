import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login prompt for unauthenticated users on home page', async ({ page }) => {
    await page.goto('/');
    
    // Should see the welcome message for unauthenticated users
    await expect(page.getByRole('heading', { name: 'Welcome to AVS Platform' })).toBeVisible();
    // The "Sign in with Salesforce" link is inside a Button
    await expect(page.getByText('Sign in with Salesforce')).toBeVisible();
  });

  test('should redirect protected routes to login', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/users');
    
    // Should be redirected to login
    await expect(page).toHaveURL('/auth/login');
  });

  test('should display login form on auth/login page', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Should see the login heading
    await expect(page.getByRole('heading', { name: 'Welcome to AVS Platform' })).toBeVisible();
    // Should see the Salesforce login button
    await expect(page.getByRole('button', { name: /Sign in with Salesforce/i })).toBeVisible();
  });
});

test.describe('Theme Toggle', () => {
  test('should be able to switch themes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and click the theme toggle button
    const themeButton = page.getByRole('button', { name: /Change theme/i });
    await expect(themeButton).toBeVisible();
    
    // Click the theme button
    await themeButton.click();
    
    // Wait a moment for state to update
    await page.waitForTimeout(200);
    
    // The dropdown should now be visible
    const themeDropdown = page.locator('.theme-toggle-container [role="listbox"]');
    await expect(themeDropdown).toBeVisible({ timeout: 3000 });
    
    // Check theme options are present
    await expect(page.getByRole('option', { name: 'Light' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Dark' })).toBeVisible();
    
    // Select dark theme
    await page.getByRole('option', { name: 'Dark' }).click();
    
    // Verify theme was applied
    await expect(page.locator('html')).toHaveClass(/theme-dark/);
  });
});
