import { readFile } from 'node:fs/promises';
import { expect, type Locator, type Page, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';

// These scenarios exercise several downloads and rebuilds on shared CI/VPS hosts.
test.setTimeout(120_000);

// Deliberately synthetic values, with entropy above the default threshold.
const tabSecret = 'SYNTHETIC-tab-0123456789-abcdefghijklmnopqrstuvwxyz'; // ubs:ignore — synthetic privacy test marker, never a live credential.
const nodeSecret = 'SYNTHETIC-node-9876543210-zyxwvutsrqponmlkjihgfedcba'; // ubs:ignore — synthetic privacy test marker, never a live credential.
const flow = [
  { id: 'tab1', type: 'tab', label: tabSecret },
  { id: 'n1', type: 'http request', z: 'tab1', name: nodeSecret, x: 100, y: 100, wires: [] },
  { id: 'n2', type: 'http request', z: 'tab1', name: 'Safe output', x: 200, y: 100, wires: [] },
];

const download = async (page: Page, button: Locator) => {
  const pending = page.waitForEvent('download');
  await button.click();
  const file = await pending;
  const path = await file.path();
  if (!path) throw new Error('Download did not complete');
  return readFile(path);
};

test('redacts preview, clipboard, individual downloads and every bundle member', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'synthetic-privacy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(flow)),
  });
  const risks = page.getByTestId('risk-findings-panel');
  const affected = risks
    .locator('article')
    .filter({ hasText: 'No catch node' })
    .getByRole('button');
  await expect(affected).toHaveCount(2);
  await affected.nth(0).click();
  await affected.nth(1).click();
  const preview = page.getByTestId('context-preview-panel').locator('pre');
  await expect(preview).toContainText('Selected nodes: 2');
  await expect(preview).toContainText('Safe output');
  const previewText = await preview.innerText();

  const exports = page.getByTestId('export-panel');
  await exports.getByTestId('copy-context-button').click();
  await expect(exports.getByTestId('export-status')).toHaveText('Copied to clipboard');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(previewText);
  const prompt = await download(
    page,
    exports.getByRole('button', { name: /^Download prompt-context/ }),
  );
  expect(prompt.toString()).toBe(previewText);

  const zip = unzipSync(
    await download(page, exports.getByRole('button', { name: /^Download support-bundle/ })),
  );
  expect(Object.keys(zip).sort()).toEqual([
    'about-my-flows.json',
    'bundle-manifest.json',
    'capability-manifest.json',
    'prompt-context.md',
    'risk-findings.json',
  ]);
  expect(strFromU8(zip['prompt-context.md'])).toBe(previewText);
  for (const name of [
    'about-my-flows.json',
    'prompt-context.md',
    'risk-findings.json',
    'capability-manifest.json',
  ]) {
    const individual = await download(page, exports.getByRole('button', { name, exact: true }));
    expect(individual.toString()).toBe(strFromU8(zip[name]));
  }
  for (const output of [
    previewText,
    clipboard,
    await risks.innerText(),
    ...Object.values(zip).map((bytes) => strFromU8(bytes)),
  ]) {
    expect.soft(output).not.toContain(tabSecret);
    expect.soft(output).not.toContain(nodeSecret);
  }
});

test('privacy setting changes rebuild output and clear unredacted diff history', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'synthetic-options.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(flow)),
  });
  const affected = page
    .getByTestId('risk-findings-panel')
    .locator('article')
    .filter({ hasText: 'No catch node' })
    .getByRole('button');
  await expect(affected).toHaveCount(2);
  await affected.nth(0).click();
  const previewPanel = page.getByTestId('context-preview-panel');
  const preview = previewPanel.locator('pre');
  await expect(preview).toContainText('SECRET_');
  await expect(page.locator('.redaction-panel__report-count')).toHaveText('2 items');

  const strict = page.getByLabel('Strict mode (entropy scanning)');
  await strict.uncheck();
  await expect(preview).toContainText(nodeSecret);
  await expect(page.locator('.redaction-panel__report-count')).toHaveText('0 items');
  await strict.check();
  await expect(preview).toContainText('SECRET_');
  await expect(preview).not.toContainText(nodeSecret);

  const threshold = page.getByRole('spinbutton', { name: 'Entropy threshold' });
  await threshold.fill('6');
  await threshold.press('Enter');
  await expect(preview).toContainText(nodeSecret);
  await threshold.fill('4.5');
  await threshold.press('Enter');
  await expect(preview).toContainText('SECRET_');

  await page.getByLabel('Enable redaction (recommended)').uncheck();
  await page.getByRole('button', { name: 'I understand, disable anyway' }).click();
  await expect(preview).toContainText(nodeSecret);
  const exports = page.getByTestId('export-panel');
  await expect(exports).toContainText('Redaction disabled');
  const unredactedZip = unzipSync(
    await download(page, exports.getByRole('button', { name: /^Download support-bundle/ })),
  );
  expect(strFromU8(unredactedZip['prompt-context.md'])).toContain(nodeSecret);
  expect(
    JSON.parse(strFromU8(unredactedZip['bundle-manifest.json'])).parameters.redactionEnabled, // ubs:ignore — malformed downloaded JSON must fail this test.
  ).toBe(false);

  // Establish a diff containing unredacted labels before re-enabling privacy.
  await affected.nth(1).click();
  await expect(preview).toContainText('Selected nodes: 2');
  await page.getByRole('button', { name: 'Re-enable redaction' }).click();
  await expect(preview).toContainText('SECRET_');
  await expect(preview).not.toContainText(nodeSecret);
  await previewPanel.getByRole('button', { name: 'Diff mode:' }).click();
  await expect(previewPanel).toContainText('No previous context to diff');
  await expect(previewPanel).not.toContainText(nodeSecret);
  await expect(previewPanel).not.toContainText(tabSecret);
  await previewPanel.getByRole('button', { name: 'Diff mode:' }).click();

  await exports.getByTestId('copy-context-button').click();
  await expect(exports.getByTestId('export-status')).toHaveText('Copied to clipboard');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await preview.innerText());
  const redactedZip = unzipSync(
    await download(page, exports.getByRole('button', { name: /^Download support-bundle/ })),
  );
  const manifest = JSON.parse(strFromU8(redactedZip['bundle-manifest.json'])); // ubs:ignore — malformed downloaded JSON must fail this test.
  expect(manifest.parameters).toEqual({
    redactionEnabled: true,
    strictMode: true,
    entropyThreshold: 4.5,
    flattenSubflows: true,
  });
  for (const bytes of Object.values(redactedZip)) {
    expect(strFromU8(bytes)).not.toContain(nodeSecret);
    expect(strFromU8(bytes)).not.toContain(tabSecret);
  }
});
