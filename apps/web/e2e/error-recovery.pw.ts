import { expect, type Page, test } from '@playwright/test';

const loadSampleFlow = async (page: Page) => {
  const button = page.getByTestId('sample-flow-button');
  await button.click();
};

const uploadFile = async (
  page: Page,
  name: string,
  content: string,
  mimeType = 'application/json',
) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name,
    mimeType,
    buffer: Buffer.from(content),
  });
};

/** Wait for the app to show flow-loaded state (token meter becomes visible). */
const waitForFlowLoaded = async (page: Page) => {
  // Scope to #controls-panel — MainLayout renders slots in both mobile + desktop containers,
  // creating duplicate testids. Desktop panel (#controls-panel) is visible at default viewport.
  const tokenMeter = page.locator('#controls-panel').getByTestId('token-meter');
  await expect(tokenMeter).toBeVisible({ timeout: 30_000 });
};

test.describe('Error recovery scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('recovers from corrupted JSON upload', async ({ page }) => {
    await uploadFile(page, 'corrupted.json', '{{{invalid json');

    const errorMessage = page.getByTestId('dropzone-error');
    await expect(errorMessage).toBeVisible({ timeout: 10_000 });

    // Recover by loading sample flow
    await loadSampleFlow(page);
    await waitForFlowLoaded(page);
  });

  test('recovers from non-flow JSON upload', async ({ page }) => {
    const notAFlow = JSON.stringify({ name: 'not a flow', data: [1, 2, 3] });
    await uploadFile(page, 'not-a-flow.json', notAFlow);

    const errorMessage = page.getByTestId('dropzone-error');
    await expect(errorMessage).toBeVisible({ timeout: 10_000 });

    // Recover
    await loadSampleFlow(page);
    await waitForFlowLoaded(page);
  });

  test('handles large flow file without crashing', async ({ page }) => {
    // Generate a flow with many nodes
    const nodes: Record<string, unknown>[] = [{ id: 'tab1', type: 'tab', label: 'Large Flow' }];
    for (let i = 0; i < 200; i++) {
      nodes.push({
        id: `node-${i}`,
        type: 'inject',
        z: 'tab1',
        name: `Node ${i}`,
        x: (i % 20) * 200,
        y: Math.floor(i / 20) * 80,
        wires: i < 199 ? [[`node-${i + 1}`]] : [[]],
      });
    }
    const largeFlow = JSON.stringify(nodes);

    await uploadFile(page, 'large-flow.json', largeFlow);

    // Should either load successfully or show error — not crash
    const tokenMeter = page.locator('#controls-panel').getByTestId('token-meter');
    const errorMessage = page.getByTestId('dropzone-error');
    await expect(tokenMeter.or(errorMessage)).toBeVisible({ timeout: 30_000 });
  });

  test('sequential error then success', async ({ page }) => {
    // First: upload invalid file
    await uploadFile(page, 'bad.json', 'not json at all');
    const errorMessage = page.getByTestId('dropzone-error');
    await expect(errorMessage).toBeVisible({ timeout: 10_000 });

    // Second: upload valid flow
    const validFlow = JSON.stringify([
      { id: 'tab1', type: 'tab', label: 'Recovery Flow' },
      { id: 'n1', type: 'inject', z: 'tab1', name: 'Start', x: 100, y: 100, wires: [['n2']] },
      { id: 'n2', type: 'debug', z: 'tab1', name: 'End', x: 300, y: 100, wires: [] },
    ]);
    await uploadFile(page, 'valid-flow.json', validFlow);

    await waitForFlowLoaded(page);
  });

  test('multiple sequential loads work correctly', async ({ page }) => {
    // Load sample flow
    await loadSampleFlow(page);
    await waitForFlowLoaded(page);

    // Reset to dropzone via "Load Another Flow" button
    await page.getByRole('button', { name: 'Load Another Flow' }).click();
    await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 10_000 });

    // Load another flow via file upload
    const flow2 = JSON.stringify([
      { id: 'tab2', type: 'tab', label: 'Second Flow' },
      { id: 'n1', type: 'inject', z: 'tab2', name: 'Test', x: 100, y: 100, wires: [] },
    ]);
    await uploadFile(page, 'flow2.json', flow2);

    // Token meter should be visible (new flow loaded)
    await waitForFlowLoaded(page);
  });

  test('empty array flow handles gracefully', async ({ page }) => {
    await uploadFile(page, 'empty.json', '[]');

    // Should either show flow UI or error — not crash
    const tokenMeter = page.locator('#controls-panel').getByTestId('token-meter');
    const errorMessage = page.getByTestId('dropzone-error');
    await expect(tokenMeter.or(errorMessage)).toBeVisible({ timeout: 15_000 });
  });
});
