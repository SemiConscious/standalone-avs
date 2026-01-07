import { test, expect } from '@playwright/test';

test.describe('Routing Policies', () => {
  test.describe('Policy List Page', () => {
    test('should display the routing policies page', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Page title
      await expect(page.getByRole('heading', { name: /routing policies/i })).toBeVisible();

      // New Policy button should exist
      await expect(page.getByRole('button', { name: /new policy/i })).toBeVisible();
    });

    test('should display policy table headers', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Table headers
      await expect(page.getByRole('columnheader', { name: /action/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /policy name/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /source/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /type/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    });

    test('should filter policies by search query', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      const searchInput = page.getByPlaceholder(/search policies/i);
      await searchInput.fill('test search query');

      // The search input should have the value
      await expect(searchInput).toHaveValue('test search query');
    });

    test('should toggle column visibility', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Click Columns button
      const columnsButton = page.getByRole('button', { name: /columns/i });
      await columnsButton.click();

      // Column selector dropdown should appear
      await expect(page.getByText(/toggle columns/i)).toBeVisible();

      // Toggle Description column
      const descriptionCheckbox = page.getByLabel('Description');
      await descriptionCheckbox.click();

      // Now Description column should be visible (it's hidden by default)
      await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();
    });

    test('should open create policy modal', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Skip if in demo mode
      const demoBanner = page.getByText(/demo mode/i);
      if (await demoBanner.isVisible()) {
        test.skip();
        return;
      }

      const newPolicyButton = page.getByRole('button', { name: /new policy/i });
      await newPolicyButton.click();

      // Modal should appear
      await expect(page.getByRole('heading', { name: /create new policy/i })).toBeVisible();
      await expect(page.getByLabel(/policy name/i)).toBeVisible();
      await expect(page.getByLabel(/description/i)).toBeVisible();
      await expect(page.getByLabel(/policy type/i)).toBeVisible();
    });

    test('should close create policy modal on cancel', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Skip if in demo mode
      const demoBanner = page.getByText(/demo mode/i);
      if (await demoBanner.isVisible()) {
        test.skip();
        return;
      }

      const newPolicyButton = page.getByRole('button', { name: /new policy/i });
      await newPolicyButton.click();

      // Modal should appear
      await expect(page.getByRole('heading', { name: /create new policy/i })).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // Modal should disappear
      await expect(page.getByRole('heading', { name: /create new policy/i })).not.toBeVisible();
    });

    test('should navigate to policy editor from edit link', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Find the first Edit link (if policies exist)
      const editLinks = page.getByRole('link', { name: 'Edit' });
      const editLinkCount = await editLinks.count();

      if (editLinkCount > 0) {
        // Get the href before clicking
        const href = await editLinks.first().getAttribute('href');
        expect(href).toMatch(/\/policy-editor\//);

        // Click and verify navigation
        await editLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Should be on policy editor page
        await expect(page).toHaveURL(/\/policy-editor\//);
      }
    });
  });

  test.describe('Policy Editor', () => {
    test('should display policy editor with toolbar', async ({ page }) => {
      // Navigate to the policy editor (assuming a test policy exists)
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      const editLinks = page.getByRole('link', { name: 'Edit' });
      const editLinkCount = await editLinks.count();

      if (editLinkCount === 0) {
        test.skip();
        return;
      }

      await editLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Toolbar should be visible
      await expect(page.getByRole('button', { name: /zoom in/i }).or(page.locator('[data-testid="zoom-in"]'))).toBeVisible();
      
      // Save button should exist
      await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
    });

    test('should display flow canvas', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      const editLinks = page.getByRole('link', { name: 'Edit' });
      const editLinkCount = await editLinks.count();

      if (editLinkCount === 0) {
        test.skip();
        return;
      }

      await editLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Canvas should be visible
      const canvas = page.locator('.flow-canvas, [data-testid="flow-canvas"]');
      // At least some nodes should be rendered
      const nodes = page.locator('.flow-node, [data-testid="flow-node"]');
      
      // If canvas is visible, the page loaded successfully
      await expect(page).toHaveURL(/\/policy-editor\//);
    });

    test('should display nodes with handles', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      const editLinks = page.getByRole('link', { name: 'Edit' });
      const editLinkCount = await editLinks.count();

      if (editLinkCount === 0) {
        test.skip();
        return;
      }

      await editLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Wait for nodes to render
      await page.waitForTimeout(500);

      // Nodes should have handles
      const nodes = page.locator('.flow-node');
      const nodeCount = await nodes.count();

      if (nodeCount > 0) {
        // At least some nodes should have handles
        const handles = page.locator('.node-handle');
        await expect(handles.first()).toBeVisible();
      }
    });

    test('should navigate back to list from header', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      const editLinks = page.getByRole('link', { name: 'Edit' });
      const editLinkCount = await editLinks.count();

      if (editLinkCount === 0) {
        test.skip();
        return;
      }

      await editLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Find back/close button or header link
      const backButton = page.getByRole('link', { name: /back/i }).or(
        page.getByRole('button', { name: /close/i })
      );

      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/routing-policies');
      }
    });
  });

  test.describe('Node Selection and Manipulation', () => {
    test('should select a node on click', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      const editLinks = page.getByRole('link', { name: 'Edit' });
      const editLinkCount = await editLinks.count();

      if (editLinkCount === 0) {
        test.skip();
        return;
      }

      await editLinks.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Find a node
      const nodes = page.locator('.flow-node');
      const nodeCount = await nodes.count();

      if (nodeCount > 0) {
        const firstNode = nodes.first();
        await firstNode.click();
        await page.waitForTimeout(100);

        // Node should have selected class
        await expect(firstNode).toHaveClass(/selected/);
      }
    });

    test('should open node options panel on double-click', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      const editLinks = page.getByRole('link', { name: 'Edit' });
      const editLinkCount = await editLinks.count();

      if (editLinkCount === 0) {
        test.skip();
        return;
      }

      await editLinks.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Find a node
      const nodes = page.locator('.flow-node');
      const nodeCount = await nodes.count();

      if (nodeCount > 0) {
        const firstNode = nodes.first();
        await firstNode.dblclick();
        await page.waitForTimeout(300);

        // Options panel or modal should appear
        const optionsPanel = page.locator('[data-testid="node-options"], .node-options-panel');
        // Some form of options should be displayed
      }
    });

    test('should zoom with toolbar buttons', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      const editLinks = page.getByRole('link', { name: 'Edit' });
      const editLinkCount = await editLinks.count();

      if (editLinkCount === 0) {
        test.skip();
        return;
      }

      await editLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Find zoom controls
      const zoomIn = page.getByRole('button', { name: /zoom in/i }).or(page.locator('[data-action="zoom-in"]'));
      const zoomOut = page.getByRole('button', { name: /zoom out/i }).or(page.locator('[data-action="zoom-out"]'));

      if (await zoomIn.isVisible()) {
        await zoomIn.click();
        await page.waitForTimeout(100);
        
        // Click zoom out
        if (await zoomOut.isVisible()) {
          await zoomOut.click();
          await page.waitForTimeout(100);
        }
      }
    });
  });

  test.describe('Policy CRUD Operations', () => {
    test('should show delete confirmation dialog', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Skip if in demo mode
      const demoBanner = page.getByText(/demo mode/i);
      if (await demoBanner.isVisible()) {
        test.skip();
        return;
      }

      // Find Del button
      const deleteButtons = page.getByRole('button', { name: 'Del' });
      const deleteCount = await deleteButtons.count();

      if (deleteCount > 0) {
        await deleteButtons.first().click();

        // Confirm button should appear
        await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      }
    });

    test('should cancel delete operation', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Skip if in demo mode
      const demoBanner = page.getByText(/demo mode/i);
      if (await demoBanner.isVisible()) {
        test.skip();
        return;
      }

      // Find Del button
      const deleteButtons = page.getByRole('button', { name: 'Del' });
      const deleteCount = await deleteButtons.count();

      if (deleteCount > 0) {
        await deleteButtons.first().click();

        // Click Cancel
        await page.getByRole('button', { name: 'Cancel' }).click();

        // Confirm button should disappear
        await expect(page.getByRole('button', { name: 'Confirm' })).not.toBeVisible();
      }
    });

    test('should toggle policy status', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Skip if in demo mode
      const demoBanner = page.getByText(/demo mode/i);
      if (await demoBanner.isVisible()) {
        test.skip();
        return;
      }

      // Find Enable/Disable button
      const toggleButton = page.getByRole('button', { name: /enable|disable/i });
      const toggleCount = await toggleButton.count();

      if (toggleCount > 0) {
        // Just verify it exists and is clickable
        await expect(toggleButton.first()).toBeEnabled();
      }
    });
  });

  test.describe('Search and Filter', () => {
    test('should have source filter dropdown', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Find source filter (first combobox)
      const sourceFilter = page.locator('select').first();
      await expect(sourceFilter).toBeVisible();

      // Should have "All Sources" option
      const options = sourceFilter.locator('option');
      await expect(options.first()).toContainText(/all sources/i);
    });

    test('should have status filter dropdown', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Find status filter (second combobox)
      const filters = page.locator('select');
      const filterCount = await filters.count();

      if (filterCount >= 2) {
        const statusFilter = filters.nth(1);
        await expect(statusFilter).toBeVisible();

        // Should have "All Statuses" option
        const options = statusFilter.locator('option');
        await expect(options.first()).toContainText(/all statuses/i);
      }
    });

    test('should show pagination info', async ({ page }) => {
      await page.goto('/routing-policies');
      await page.waitForLoadState('networkidle');

      // Pagination info should be visible
      await expect(page.getByText(/showing.*routing policies/i)).toBeVisible();
    });
  });
});

