const { test, expect } = require('@playwright/test');

test.describe('Interview Copilot Home Page Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto('/');
  });

  test('should load the home page correctly', async ({ page }) => {
    // Check if the Start Copilot button is visible
    const startButton = page.locator('button', { hasText: 'Start Copilot' });
    await expect(startButton).toBeVisible();

    // Check if sections are visible
    await expect(page.getByText('Speech Recognition Results', { exact: true })).toBeVisible();
    await expect(page.getByText('Manual Input', { exact: true })).toBeVisible();
    await expect(page.getByText('GPT Answer', { exact: true })).toBeVisible();
  });

  test('should allow typing manual input and clearing it', async ({ page }) => {
    const manualInput = page.locator('.manual_content_input textarea');
    await manualInput.fill('This is a test question.');

    const submitBtn = page.locator('button', { hasText: 'Submit Manual Input' });
    await submitBtn.click();

    const asrOutput = page.locator('.asr_content_input textarea');
    await expect(asrOutput).toHaveValue(/This is a test question./);

    const clearBtn = page.locator('button', { hasText: 'Clear' });
    await clearBtn.click();

    await expect(asrOutput).toHaveValue('');
  });

  test('should check GPT controls visibility', async ({ page }) => {
    // Click settings button to show controls
    const settingsBtn = page.locator('button', { hasText: 'Settings' });
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
    }
    
    // Check auto ask toggle
    await expect(page.locator('text=Auto Ask GPT')).toBeVisible();
    
    // Check personalization toggle
    await expect(page.locator('text=Use Context/Persona')).toBeVisible();
    
    // Check Ask GPT button
    const askGptBtn = page.locator('button', { hasText: 'Ask GPT' });
    await expect(askGptBtn).toBeVisible();
  });

});
