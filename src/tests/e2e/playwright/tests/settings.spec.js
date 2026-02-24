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

  test('should parse resume and JD from URLs', async ({ page }) => {
    await page.goto('/#/setting');

    // Mock the external CORS proxy for a resume
    await page.route('**/api.allorigins.win/get?url=*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ contents: '<html><body>Mocked Parsed Text</body></html>' })
      });
    });

    // Test Resume URL parsing
    const resumeUrlInput = page.locator('div.el-input', { hasText: 'Resume URL' }).locator('input');
    await resumeUrlInput.fill('https://my-fake-resume.com');
    await resumeUrlInput.blur();

    const parseResumeBtn = page.locator('div.el-input', { hasText: 'Resume URL' }).locator('button', { hasText: 'Parse URL' });
    await parseResumeBtn.click();

    const resumeTextarea = page.locator('textarea[placeholder="Paste your resume content here..."]');
    await expect(resumeTextarea).toHaveValue('Mocked Parsed Text');

    // Test JD URL parsing
    const jdUrlInput = page.locator('div.el-input', { hasText: 'JD URL' }).locator('input');
    await jdUrlInput.fill('https://my-fake-jd.com');
    await jdUrlInput.blur();

    const parseJdBtn = page.locator('div.el-input', { hasText: 'JD URL' }).locator('button', { hasText: 'Parse URL' });
    await parseJdBtn.click();

    const jdTextarea = page.locator('textarea[placeholder="Paste the JD text here..."]');
    await expect(jdTextarea).toHaveValue('Mocked Parsed Text');
  });

});
