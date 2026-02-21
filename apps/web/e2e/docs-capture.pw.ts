import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const ensureDir = (targetPath: string) => {
  mkdirSync(dirname(targetPath), { recursive: true });
};

const outputPath = (targetPath: string) => {
  ensureDir(targetPath);
  return targetPath;
};

const openCommandPalette = async (
  page: import('@playwright/test').Page,
  consoleMessages: { type: string; text: string }[],
  pageErrors: string[],
) => {
  const palette = page.getByTestId('command-palette-dialog');
  const isVisible = async () => palette.isVisible().catch(() => false);
  if (await isVisible()) return palette;

  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    try {
      localStorage.removeItem('fp.shortcuts');
    } catch {
      // ignore
    }
    try {
      window.focus();
    } catch {
      // ignore
    }
  });
  await page.locator('body').click({ force: true });
  await page.waitForTimeout(50);

  await page.waitForFunction(
    () => {
      const win = window as typeof window & {
        __fpSetCommandPaletteOpen?: (value: boolean) => void;
        __fpGetCommandPaletteOpen?: () => boolean;
        __fpOpenCommandPalette?: () => void;
      };
      return (
        typeof win.__fpSetCommandPaletteOpen === 'function' ||
        typeof win.__fpOpenCommandPalette === 'function' ||
        typeof win.__fpGetCommandPaletteOpen === 'function'
      );
    },
    null,
    { timeout: 10_000 },
  );

  await page.evaluate(() => {
    const win = window as typeof window & {
      __fpSetCommandPaletteOpen?: (value: boolean) => void;
      __fpGetCommandPaletteOpen?: () => boolean;
      __fpOpenCommandPalette?: () => void;
    };
    win.__fpOpenCommandPalette?.();
    win.__fpSetCommandPaletteOpen?.(true);
    window.dispatchEvent(new CustomEvent('fp:command-palette-open'));
  });

  await page.evaluate(() => {
    const trigger = document.querySelector<HTMLButtonElement>(
      '[data-testid="command-palette-trigger"]',
    );
    trigger?.click();
  });

  await page.waitForFunction(
    () => {
      const win = window as typeof window & { __fpGetCommandPaletteOpen?: () => boolean };
      return win.__fpGetCommandPaletteOpen?.() === true;
    },
    null,
    { timeout: 5_000 },
  );

  if (!(await isVisible())) {
    const dispatchShortcut = async () => {
      await page.evaluate(() => {
        const isMac = /mac/i.test(navigator.platform);
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: !isMac,
          metaKey: isMac,
        });
        window.dispatchEvent(event);
      });
    };

    await dispatchShortcut();
    if (!(await isVisible())) {
      await page.waitForTimeout(150);
      await dispatchShortcut();
    }
  }

  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="command-palette-dialog"]')),
    null,
    { timeout: 15_000 },
  );

  try {
    await expect(palette).toBeVisible({ timeout: 15_000 });
  } catch (error) {
    if (process.env.DOCS_CAPTURE) {
      const hookState = await page.evaluate(() => {
        const win = window as typeof window & {
          __fpSetCommandPaletteOpen?: (value: boolean) => void;
          __fpGetCommandPaletteOpen?: () => boolean;
          __fpOpenCommandPalette?: () => void;
        };
        return {
          hasOpenFn: typeof win.__fpOpenCommandPalette === 'function',
          hasSetFn: typeof win.__fpSetCommandPaletteOpen === 'function',
          hasGetFn: typeof win.__fpGetCommandPaletteOpen === 'function',
          openFlag: win.__fpGetCommandPaletteOpen?.() ?? null,
        };
      });
      const diagnostics = {
        activeElement: await page.evaluate(() => document.activeElement?.tagName ?? null),
        paletteCount: await page.locator('[data-testid="command-palette-dialog"]').count(),
        panelCount: await page.locator('.command-palette__panel').count(),
        overlayCount: await page.locator('.command-palette').count(),
        ...hookState,
        consoleMessages,
        pageErrors,
      };
      writeFileSync(
        outputPath('docs/assets/screenshots/command-palette-debug.json'),
        `${JSON.stringify(diagnostics, null, 2)}\n`,
      );
      writeFileSync(
        outputPath('docs/assets/screenshots/command-palette-debug.html'),
        await page.content(),
      );
      await page.screenshot({
        path: outputPath('docs/assets/screenshots/command-palette-failure.png'),
        fullPage: true,
      });
    }
    throw error;
  }

  return palette;
};

test.describe('docs capture', () => {
  test.skip(!process.env.DOCS_CAPTURE, 'Set DOCS_CAPTURE=1 to run');

  test('capture screenshots and gif frames', async ({ page }) => {
    const consoleMessages: { type: string; text: string }[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
      consoleMessages.push({ type: message.type(), text: message.text() });
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    const defaultUrl = pathToFileURL(resolve('apps/web/dist/index.html')).href;
    const rawUrl = process.env.DOCS_CAPTURE_URL ?? defaultUrl;
    const appUrl = rawUrl.includes('?') ? `${rawUrl}&docsCapture=1` : `${rawUrl}?docsCapture=1`;

    await page.setViewportSize({ width: 1440, height: 900 });
    console.log(`[docs-capture] loading ${appUrl}`);
    await page.goto(appUrl);
    await page.waitForLoadState('networkidle');

    const paletteDialog = page.getByTestId('command-palette-dialog');
    if (await paletteDialog.isVisible().catch(() => false)) {
      await page.waitForFunction(
        () => {
          const win = window as typeof window & {
            __fpSetCommandPaletteOpen?: (value: boolean) => void;
          };
          return typeof win.__fpSetCommandPaletteOpen === 'function';
        },
        null,
        { timeout: 10_000 },
      );
      await page.evaluate(() => {
        const win = window as typeof window & {
          __fpSetCommandPaletteOpen?: (value: boolean) => void;
        };
        win.__fpSetCommandPaletteOpen?.(false);
      });
      await expect(paletteDialog).toBeHidden({ timeout: 5_000 });
    }

    // Empty state
    console.log('[docs-capture] empty state');
    await page.screenshot({
      path: outputPath('docs/assets/screenshots/empty-state.png'),
      fullPage: true,
    });

    console.log('[docs-capture] load sample flow');
    const sampleButton = page.getByTestId('sample-flow-button');
    await sampleButton.waitFor({ state: 'visible', timeout: 30_000 });
    await sampleButton.click();

    console.log('[docs-capture] wait for context preview');
    const contextPanel = page.getByTestId('context-preview-panel');
    await contextPanel.waitFor({ state: 'visible', timeout: 30_000 });

    console.log('[docs-capture] context preview panel');
    await contextPanel.scrollIntoViewIfNeeded();
    await contextPanel.screenshot({
      path: outputPath('docs/assets/screenshots/context-preview.png'),
    });

    console.log('[docs-capture] risk findings panel');
    const riskPanel = page.getByTestId('risk-findings-panel');
    await riskPanel.scrollIntoViewIfNeeded();
    await riskPanel.screenshot({
      path: outputPath('docs/assets/screenshots/risk-findings.png'),
    });

    console.log('[docs-capture] flow summary');
    const flowSummary = page.locator('section', { hasText: 'Flow Summary' }).first();
    await flowSummary.scrollIntoViewIfNeeded();
    await flowSummary.screenshot({
      path: outputPath('docs/assets/screenshots/flow-summary.png'),
    });

    console.log('[docs-capture] command palette frames');
    await page.screenshot({
      path: outputPath('docs/assets/screenshots/command-palette-preflight.png'),
      fullPage: true,
    });
    await openCommandPalette(page, consoleMessages, pageErrors);

    for (let i = 0; i < 12; i += 1) {
      await page.waitForTimeout(80);
      await page.screenshot({
        path: outputPath(`docs/assets/gifs/command-palette-${String(i).padStart(2, '0')}.png`),
        fullPage: true,
      });
    }

    await page.keyboard.press('Escape');

    if (process.env.DOCS_CAPTURE) {
      writeFileSync(
        outputPath('docs/assets/screenshots/docs-capture-console.json'),
        `${JSON.stringify({ consoleMessages, pageErrors }, null, 2)}\n`,
      );
    }
  });
});
