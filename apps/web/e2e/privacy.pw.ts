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
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeInViewport({ ratio: 1 });
  const pending = page.waitForEvent('download');
  await button.click();
  const file = await pending;
  const path = await file.path();
  if (!path) throw new Error('Download did not complete');
  return readFile(path);
};

test('discards a ZIP when selection changes before its hashes finish', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'synthetic-export-race.json',
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
  const preview = page.getByTestId('context-preview-panel').locator('pre');
  await expect(preview).toContainText('Selected nodes: 1');
  await expect(page.getByText('Analysis complete', { exact: true })).toBeHidden();

  // Hold real hashing and freeze the 120ms selection debounce to make the race deterministic.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(() => {
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    (window as unknown as { releasePrivacyHash: () => void }).releasePrivacyHash = () => {
      crypto.subtle.digest = digest;
      release();
    };
    crypto.subtle.digest = async (...args) => {
      await gate;
      return digest(...args);
    };
  });
  const exports = page.getByTestId('export-panel');
  const bundle = exports.getByRole('button', { name: /^Download support-bundle/ });
  // DOM clicks target the real handlers without animation/scroll waits advancing the race.
  await bundle.evaluate((button: HTMLButtonElement) => button.click());
  await expect(bundle).toContainText('Generating...');
  await affected.nth(1).evaluate((button: HTMLButtonElement) => button.click());
  const pendingDownload = page.waitForEvent('download', { timeout: 1000 }).catch(() => null);
  await page.evaluate(() => {
    (window as unknown as { releasePrivacyHash: () => void }).releasePrivacyHash();
  });
  await expect(bundle).toContainText('Download all');
  expect(await pendingDownload).toBeNull();
  await expect(exports.getByTestId('copy-context-button')).toBeDisabled();
  await expect(bundle).toBeDisabled();

  await page.clock.runFor(121);
  await expect(preview).toContainText('Selected nodes: 2');
  await page.clock.resume();
  const zip = unzipSync(await download(page, bundle));
  expect(strFromU8(zip['prompt-context.md'])).toBe(await preview.innerText());
});

test('keeps prototype metadata out of output and expands redacted subflows', async ({ page }) => {
  await page.goto('/');
  const input = JSON.parse(`[
    {"id":"tab1","type":"tab","__proto__":{"label":"SYNTHETIC inherited tab"}},
    {"id":"fedcba9876543210","type":"subflow","name":"Safe subflow","in":[],"out":[]},
    {"id":"a","type":"debug","z":"fedcba9876543210","x":0,"y":0},
    {"id":"b","type":"debug","z":"fedcba9876543210","x":100,"y":0},
    {"id":"instance","type":"subflow:fedcba9876543210","z":"tab1","x":200,"y":0},
    {"id":"output","type":"http request","z":"tab1","x":300,"y":0,"__proto__":{"name":"SYNTHETIC inherited node"}}
  ]`); // ubs:ignore — synthetic JSON tests literal __proto__ keys through the real worker.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'synthetic-structure.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(input)),
  });
  const exports = page.getByTestId('export-panel');
  await expect(exports.getByTestId('copy-context-button')).toBeEnabled();
  const threshold = page.getByRole('spinbutton', { name: 'Entropy threshold' });
  await threshold.fill('3.5');
  await threshold.press('Enter');
  await expect(exports.getByTestId('copy-context-button')).toBeEnabled();
  const zip = unzipSync(
    await download(page, exports.getByRole('button', { name: /^Download support-bundle/ })),
  );
  const about = JSON.parse(strFromU8(zip['about-my-flows.json'])); // ubs:ignore — invalid exported JSON must fail.
  const manifest = JSON.parse(strFromU8(zip['bundle-manifest.json'])); // ubs:ignore — invalid exported JSON must fail.
  expect(manifest.parameters.entropyThreshold).toBe(3.5);
  expect(about.expandedNodeCount).toBe(5);
  for (const bytes of Object.values(zip)) {
    expect(strFromU8(bytes)).not.toContain('SYNTHETIC inherited');
  }
  expect(await page.getByTestId('risk-findings-panel').innerText()).not.toContain(
    'SYNTHETIC inherited',
  );
});

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
