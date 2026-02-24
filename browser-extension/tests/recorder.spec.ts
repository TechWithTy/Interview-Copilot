import { test as base, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({ }, use) => {
    const pathToExtension = path.join(import.meta.dirname, '../extension/chrome');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        `--use-fake-ui-for-media-stream`, // Auto-accept media stream
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

test.describe('Audio Extension Tests', () => {
  test('Popup launches options dashboard', async ({ context, extensionId }) => {
    const page = await context.newPage();
    // Navigate to popup page
    await page.goto(`chrome-extension://${extensionId}/Popup/popup.html`);
    
    // Check if launch button is there
    const launchBtn = page.getByRole('button', { name: 'Open Recorder Dashboard' });
    await expect(launchBtn).toBeVisible();

    // Click launch button which uses browser.tabs.create
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      launchBtn.click()
    ]);
    
    await newPage.waitForLoadState('domcontentloaded');

    // Make sure we load the Options page
    expect(newPage.url()).toContain('/Options/options.html');
    
    // Make sure the record button is visible
    const recordBtn = newPage.getByTestId('start-recording');
    await expect(recordBtn).toBeVisible();
    await expect(recordBtn).toHaveText('Start Recording');
  });

  test('Recorder can start media capture', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/Options/options.html`);
    
    // Check if launch button is there
    const recordBtn = page.getByTestId('start-recording');
    await expect(recordBtn).toBeVisible();

    // Start recording
    await recordBtn.click();

    // With --use-fake-ui-for-media-stream, the prompt is auto-accepted.
    const stopBtn = page.getByTestId('stop-recording');
    await expect(stopBtn).toBeVisible({ timeout: 5000 });
    await expect(stopBtn).toHaveText('Stop Recording');

    // Stop recording
    await stopBtn.click();

    // We should see the download section
    const downloadLink = page.getByTestId('download-link');
    await expect(downloadLink).toBeVisible({ timeout: 5000 });
  });
});
