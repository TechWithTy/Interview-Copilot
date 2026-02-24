const { test, expect } = require('@playwright/test');

test.describe('Interview Copilot Settings Page Tests', () => {

  test('should save and display settings properly with redactions', async ({ page }) => {
    // Navigate straight to the settings page
    await page.goto('/#/setting');

    // Fill in values for both configuration keys to trigger standard update
    const openaiInput = page.locator('div.el-input', { hasText: 'API Key:' }).locator('input');
    await openaiInput.fill('sk-test-token-12345');
    await openaiInput.blur();

    const azureInput = page.locator('div.el-input', { hasText: 'Azure token:' }).locator('input');
    await azureInput.fill('azure-test-token-abc');
    await azureInput.blur();

    // Check visually UI redaction (ensure users cannot shoulder-surf sensitive payload secrets)
    await expect(openaiInput).toHaveValue('sk-t....2345');
    await expect(azureInput).toHaveValue('azur....-abc');

    // Verify localStorage has the fully clear values securely without the '....'
    const localStorageVals = await page.evaluate(() => {
      return {
        openai_key: localStorage.getItem('openai_key'),
        azure_token: localStorage.getItem('azure_token')
      };
    });

    expect(localStorageVals.openai_key).toBe('sk-test-token-12345');
    expect(localStorageVals.azure_token).toBe('azure-test-token-abc');
  });

});
