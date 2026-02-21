import { test } from '@playwright/test';
import {
  gotoWithLogging,
  logPhase,
  logSuccess,
  TestReporter,
  waitForWithLogging,
} from './test-logger.js';

test('minimal test', async ({ page }) => {
  const reporter = new TestReporter('minimal test');
  let passed = true;

  try {
    logPhase('Navigation');
    await gotoWithLogging(page, 'http://127.0.0.1:5173/');

    logPhase('Verify Body');
    const body = page.locator('body');
    await waitForWithLogging(body, 'Body element');
    logSuccess('Page loaded successfully');
  } catch (error) {
    passed = false;
    throw error;
  } finally {
    reporter.finish(passed);
  }
});
