import { expect, type Page, test } from '@playwright/test';

/** Known external domains that the app legitimately loads (web fonts). */
const KNOWN_EXTERNAL_DOMAINS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

const loadSampleFlow = async (page: Page) => {
  const button = page.getByTestId('sample-flow-button');
  await button.click();
};

const waitForFlowLoaded = async (page: Page) => {
  const tokenMeter = page.locator('#controls-panel').getByTestId('token-meter');
  await expect(tokenMeter).toBeVisible({ timeout: 30_000 });
};

const isLocalOrKnown = (hostname: string) =>
  hostname === '127.0.0.1' || hostname === 'localhost' || KNOWN_EXTERNAL_DOMAINS.has(hostname);

test.describe('Network request validation', () => {
  test('only known external requests are Google Fonts', async ({ page }) => {
    const externalRequests: string[] = [];

    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
        externalRequests.push(request.url());
      }
    });

    await page.goto('/');
    await loadSampleFlow(page);
    await waitForFlowLoaded(page);

    // All external requests should be from known font CDN domains only
    for (const req of externalRequests) {
      const hostname = new URL(req).hostname;
      expect(KNOWN_EXTERNAL_DOMAINS.has(hostname)).toBe(true);
    }
    // At least verify the font requests are present (documents the dependency)
    expect(externalRequests.length).toBeGreaterThan(0);
  });

  test('no unknown external requests during file upload', async ({ page }) => {
    const unknownExternal: string[] = [];

    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!isLocalOrKnown(url.hostname)) {
        unknownExternal.push(request.url());
      }
    });

    await page.goto('/');

    const validFlow = JSON.stringify([
      { id: 'tab1', type: 'tab', label: 'Test Flow' },
      { id: 'n1', type: 'inject', z: 'tab1', name: 'Start', x: 100, y: 100, wires: [] },
    ]);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-flow.json',
      mimeType: 'application/json',
      buffer: Buffer.from(validFlow),
    });

    await waitForFlowLoaded(page);

    expect(unknownExternal).toEqual([]);
  });

  test('copy-to-clipboard produces no network requests', async ({ page }) => {
    const requestsAfterLoad: string[] = [];
    let tracking = false;

    page.on('request', (request) => {
      if (!tracking) return;
      requestsAfterLoad.push(request.url());
    });

    await page.goto('/');
    await loadSampleFlow(page);
    await waitForFlowLoaded(page);

    // Start tracking after flow is fully loaded
    tracking = true;

    // Scope to #controls-panel to avoid duplicate testid
    const copyButton = page.locator('#controls-panel').getByTestId('copy-context-button');
    await copyButton.click();

    const exportStatus = page.locator('#controls-panel').getByTestId('export-status');
    await expect(exportStatus).toBeVisible({ timeout: 5_000 });

    // No requests should fire — clipboard is local
    expect(requestsAfterLoad).toEqual([]);
  });

  test('all page resources come from localhost or known CDN', async ({ page }) => {
    const resourceOrigins = new Set<string>();

    page.on('response', (response) => {
      const url = new URL(response.url());
      resourceOrigins.add(url.hostname);
    });

    await page.goto('/');
    await loadSampleFlow(page);
    await waitForFlowLoaded(page);

    for (const origin of resourceOrigins) {
      expect(isLocalOrKnown(origin)).toBe(true);
    }
  });

  test('HTML page response has correct content type', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    const contentType = response?.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/html');
  });
});
