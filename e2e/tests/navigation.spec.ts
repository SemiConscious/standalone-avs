import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/');
    
    // Desktop viewport should show sidebar
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForLoadState('networkidle');
    
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // Check navigation groups by their heading elements
    await expect(sidebar.locator('h3', { hasText: 'MANAGEMENT' })).toBeVisible();
    await expect(sidebar.locator('h3', { hasText: 'CALL FLOWS' })).toBeVisible();
    await expect(sidebar.locator('h3', { hasText: 'ANALYTICS' })).toBeVisible();
    await expect(sidebar.locator('h3', { hasText: 'SETTINGS' })).toBeVisible();
    
    // Check navigation links
    await expect(sidebar.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Groups' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Devices' })).toBeVisible();
  });

  test('should toggle mobile sidebar', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Sidebar should be hidden on mobile by default
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);
    
    // Click menu button to open sidebar
    const menuButton = page.getByRole('button', { name: /Toggle menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    
    // Wait for animation and state update
    await page.waitForTimeout(300);
    
    // Sidebar should now have translate-x-0 class
    await expect(sidebar).toHaveClass(/translate-x-0/);
    
    // Click close button in sidebar
    const closeButton = sidebar.getByRole('button', { name: /Close/i });
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    
    // Wait for animation
    await page.waitForTimeout(300);
    
    // Sidebar should be hidden again
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });
});
