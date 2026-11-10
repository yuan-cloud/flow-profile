import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import {
  clickWithLogging,
  gotoWithLogging,
  logAssertion,
  logElementState,
  logError,
  logPhase,
  logStep,
  logSuccess,
  TestReporter,
  waitForWithLogging,
} from './test-logger.js';

const loadSampleFlow = async (page: Page) => {
  logStep('Loading sample flow');
  const button = page.getByTestId('sample-flow-button');
  await clickWithLogging(button, 'Sample Flow button');
};

test('primary user flow', async ({ page }) => {
  const reporter = new TestReporter('primary user flow');
  let passed = true;

  try {
    logPhase('Navigation');
    await gotoWithLogging(page, '/');

    logPhase('Load Sample Flow');
    await loadSampleFlow(page);

    logPhase('Verify Context Preview');
    const contextPreview = page.getByTestId('context-preview-panel');
    await waitForWithLogging(contextPreview, 'Context Preview section', { timeout: 30_000 });

    logPhase('Verify UI Elements');
    const exportButton = page.getByTestId('export-panel');
    const tokenMeter = page.getByTestId('token-meter');
    const riskFindings = page.getByTestId('risk-findings-panel');

    await logElementState(exportButton, 'Export button');
    await expect(exportButton).toBeVisible();
    logSuccess('Export button visible');

    await logElementState(tokenMeter, 'Token meter');
    await expect(tokenMeter).toBeVisible();
    logSuccess('Token meter visible');

    await logElementState(riskFindings, 'Risk Findings');
    await expect(riskFindings).toBeVisible();
    logSuccess('Risk Findings visible');

    logPhase('Copy to Clipboard');
    const copyButton = page.getByTestId('copy-context-button');
    await clickWithLogging(copyButton, 'Copy to Clipboard button');

    const clipboardMessage = page.getByTestId('export-status');
    await waitForWithLogging(clipboardMessage, 'Clipboard feedback message');
  } catch (error) {
    passed = false;
    logError(`Test failed: ${error}`);
    throw error;
  } finally {
    reporter.finish(passed);
  }
});

test('handles invalid file gracefully', async ({ page }) => {
  const reporter = new TestReporter('handles invalid file gracefully');
  let passed = true;

  try {
    logPhase('Navigation');
    await gotoWithLogging(page, '/');

    logPhase('Upload Invalid File');
    logStep('Creating invalid JSON file');
    const fileInput = page.locator('input[type="file"]');
    await logElementState(fileInput, 'File input');

    await fileInput.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('not valid json'),
    });
    logSuccess('Invalid file uploaded');

    logPhase('Verify Error Message');
    const errorMessage = page.getByTestId('dropzone-error');
    await waitForWithLogging(errorMessage, 'JSON error message');

    logPhase('Recovery - Load Sample Flow');
    await loadSampleFlow(page);

    const contextPreview = page.getByTestId('context-preview-panel');
    await waitForWithLogging(contextPreview, 'Context Preview after recovery', { timeout: 30_000 });
    logSuccess('Successfully recovered from invalid file');
  } catch (error) {
    passed = false;
    logError(`Test failed: ${error}`);
    throw error;
  } finally {
    reporter.finish(passed);
  }
});

test('no critical or serious a11y violations', async ({ page }) => {
  const reporter = new TestReporter('no critical or serious a11y violations');
  let passed = true;

  try {
    logPhase('Navigation');
    await gotoWithLogging(page, '/');

    logPhase('Load Sample Flow');
    await loadSampleFlow(page);
    const contextPreview = page.getByTestId('context-preview-panel');
    await waitForWithLogging(contextPreview, 'Context Preview', { timeout: 30_000 });

    logPhase('Accessibility Audit');
    await expect(page.getByTestId('copy-context-button')).toBeEnabled();
    // Audit the settled workspace, not a frame in the completion banner's opacity transition.
    await expect(page.getByText('Analysis complete', { exact: true })).toBeHidden();
    logStep('Running axe-core analysis');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    const serious = results.violations.filter((v) => v.impact === 'serious');
    const moderate = results.violations.filter((v) => v.impact === 'moderate');
    const minor = results.violations.filter((v) => v.impact === 'minor');

    logStep(`Total violations found: ${results.violations.length}`);
    logAssertion(0, critical.length, 'Critical violations');
    logAssertion(0, serious.length, 'Serious violations');
    logStep(`Moderate violations: ${moderate.length}`);
    logStep(`Minor violations: ${minor.length}`);

    if (critical.length > 0) {
      logError('Critical violations:');
      for (const v of critical) {
        logError(`  - ${v.id}: ${v.description}`);
      }
    }

    if (serious.length > 0) {
      logError('Serious violations:');
      for (const v of serious) {
        logError(`  - ${v.id}: ${v.description}`);
      }
    }

    expect(critical).toHaveLength(0);
    expect(serious).toHaveLength(0);
    logSuccess('No critical or serious violations');
  } catch (error) {
    passed = false;
    logError(`Test failed: ${error}`);
    throw error;
  } finally {
    reporter.finish(passed);
  }
});

test('skip link is functional', async ({ page }) => {
  const reporter = new TestReporter('skip link is functional');
  let passed = true;

  try {
    logPhase('Navigation');
    await gotoWithLogging(page, '/');

    logPhase('Tab to Skip Link');
    logStep('Pressing Tab key');
    await page.keyboard.press('Tab');

    const skipLink = page.locator('.skip-link');
    await logElementState(skipLink, 'Skip link');
    await expect(skipLink).toBeFocused();
    logSuccess('Skip link is focused');

    logPhase('Activate Skip Link');
    logStep('Pressing Enter key');
    await page.keyboard.press('Enter');

    const mainContent = page.locator('#main-content');
    await logElementState(mainContent, 'Main content');
    await expect(mainContent).toBeFocused();
    logSuccess('Main content is now focused');
  } catch (error) {
    passed = false;
    logError(`Test failed: ${error}`);
    throw error;
  } finally {
    reporter.finish(passed);
  }
});

test('keyboard navigation works for interactive elements', async ({ page }) => {
  const reporter = new TestReporter('keyboard navigation works for interactive elements');
  let passed = true;

  try {
    logPhase('Navigation');
    await gotoWithLogging(page, '/');

    logPhase('Load Sample Flow');
    await loadSampleFlow(page);
    const contextPreview = page.getByTestId('context-preview-panel');
    await waitForWithLogging(contextPreview, 'Context Preview', { timeout: 30_000 });

    logPhase('Tab Navigation');
    logStep('Pressing Tab 3 times');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await logElementState(focusedElement, 'Currently focused element');
    await expect(focusedElement).toBeVisible();

    const tagName = await focusedElement.evaluate((el) => el.tagName.toLowerCase());
    const tabindex = await focusedElement.getAttribute('tabindex');
    logStep(`Focused element: <${tagName}> tabindex=${tabindex}`);

    const isInteractive =
      ['button', 'a', 'input', 'select', 'textarea'].includes(tagName) || tabindex !== null;

    logAssertion(true, isInteractive, 'Element is interactive');
    expect(isInteractive).toBe(true);
    logSuccess('Focused element is interactive');
  } catch (error) {
    passed = false;
    logError(`Test failed: ${error}`);
    throw error;
  } finally {
    reporter.finish(passed);
  }
});

test('focus is visible on interactive elements', async ({ page }) => {
  const reporter = new TestReporter('focus is visible on interactive elements');
  let passed = true;

  try {
    logPhase('Navigation');
    await gotoWithLogging(page, '/');

    logPhase('Load Sample Flow');
    await loadSampleFlow(page);
    const contextPreview = page.getByTestId('context-preview-panel');
    await waitForWithLogging(contextPreview, 'Context Preview', { timeout: 30_000 });

    logPhase('Focus Copy Button');
    const copyButton = page.getByTestId('copy-context-button');
    await expect(copyButton).toBeVisible({ timeout: 5_000 });
    await expect(copyButton).toBeEnabled({ timeout: 5_000 });
    await logElementState(copyButton, 'Copy button');
    await copyButton.focus();
    await expect(copyButton).toBeFocused();
    logSuccess('Copy button focused');

    logPhase('Verify Focus Indicator');
    const outlineStyle = await copyButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      const className = (el as HTMLElement).className;
      const hasFocusClass =
        className.includes('focus:ring') ||
        className.includes('focus:outline') ||
        className.includes('fp-focus-ring');
      return {
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
        hasFocusClass,
        hasVisibleFocus: styles.outlineWidth !== '0px' || styles.boxShadow !== 'none',
      };
    });

    logStep(`Outline width: ${outlineStyle.outlineWidth}`);
    logStep(`Box shadow: ${outlineStyle.boxShadow?.slice(0, 50)}...`);
    logStep(`Has focus style class: ${outlineStyle.hasFocusClass}`);
    logAssertion(
      true,
      outlineStyle.hasVisibleFocus || outlineStyle.hasFocusClass,
      'Focus indicator visible',
    );

    expect(outlineStyle.hasVisibleFocus || outlineStyle.hasFocusClass).toBe(true);
    logSuccess('Focus indicator is visible');
  } catch (error) {
    passed = false;
    logError(`Test failed: ${error}`);
    throw error;
  } finally {
    reporter.finish(passed);
  }
});
