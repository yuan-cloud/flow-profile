import { expect, type Page, test } from '@playwright/test';

const loadSampleFlow = async (page: Page) => {
  const button = page.getByTestId('sample-flow-button');
  await button.click();
};

const waitForFlowLoaded = async (page: Page) => {
  const tokenMeter = page.locator('#controls-panel').getByTestId('token-meter');
  await expect(tokenMeter).toBeVisible({ timeout: 30_000 });
};

const uploadFlow = async (page: Page, name: string, flow: unknown[]) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(flow)),
  });
};

const resetToDropzone = async (page: Page) => {
  await page.getByRole('button', { name: 'Load Another Flow' }).click();
  await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 10_000 });
};

/** Generate a flow with N nodes wired sequentially. */
const generateFlow = (nodeCount: number) => {
  const nodes: Record<string, unknown>[] = [
    { id: 'tab1', type: 'tab', label: `Flow with ${nodeCount} nodes` },
  ];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      type: 'inject',
      z: 'tab1',
      name: `Node ${i}`,
      x: (i % 20) * 200,
      y: Math.floor(i / 20) * 80,
      wires: i < nodeCount - 1 ? [[`node-${i + 1}`]] : [[]],
    });
  }
  return nodes;
};

test.describe('Performance and stress tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('200-node flow loads within 10 seconds', async ({ page }) => {
    const flow = generateFlow(200);
    const start = Date.now();

    await uploadFlow(page, 'big-200.json', flow);
    await waitForFlowLoaded(page);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10_000);
  });

  test('500-node flow loads without crashing', async ({ page }) => {
    const flow = generateFlow(500);

    await uploadFlow(page, 'big-500.json', flow);

    // Should either load or show error — not crash
    const tokenMeter = page.locator('#controls-panel').getByTestId('token-meter');
    const errorMessage = page.getByTestId('dropzone-error');
    await expect(tokenMeter.or(errorMessage)).toBeVisible({ timeout: 30_000 });
  });

  test('rapid flow switching — 5 loads in sequence', async ({ page }) => {
    const flowSizes = [10, 50, 20, 80, 30];
    const start = Date.now();

    for (let i = 0; i < flowSizes.length; i++) {
      if (i === 0) {
        // First load via dropzone
        await uploadFlow(page, `flow-${i}.json`, generateFlow(flowSizes[i]));
      } else {
        // Subsequent loads: reset then upload
        await resetToDropzone(page);
        await uploadFlow(page, `flow-${i}.json`, generateFlow(flowSizes[i]));
      }
      await waitForFlowLoaded(page);
    }

    const elapsed = Date.now() - start;
    // 5 sequential loads should complete within 30 seconds
    expect(elapsed).toBeLessThan(30_000);
  });

  test('sample flow loads within 5 seconds', async ({ page }) => {
    const start = Date.now();

    await loadSampleFlow(page);
    await waitForFlowLoaded(page);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5_000);
  });

  test('UI remains responsive during flow processing', async ({ page }) => {
    const flow = generateFlow(200);

    await uploadFlow(page, 'responsive-test.json', flow);

    // While processing, the page should still respond to basic queries
    const title = await page.title();
    expect(title).toBeTruthy();

    await waitForFlowLoaded(page);

    // After load, verify UI elements are interactive
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('no JavaScript errors during normal usage', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await loadSampleFlow(page);
    await waitForFlowLoaded(page);

    // Click around the UI
    const copyButton = page.locator('#controls-panel').getByTestId('copy-context-button');
    await expect(copyButton).toBeVisible({ timeout: 5_000 });
    await expect(copyButton).toBeEnabled({ timeout: 5_000 });
    await copyButton.scrollIntoViewIfNeeded();
    await copyButton.click({ force: true });

    const exportStatus = page.locator('#controls-panel').getByTestId('export-status');
    await expect(exportStatus).toBeVisible({ timeout: 5_000 });

    expect(jsErrors).toEqual([]);
  });

  test('no console errors during flow load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await loadSampleFlow(page);
    await waitForFlowLoaded(page);

    expect(consoleErrors).toEqual([]);
  });
});
