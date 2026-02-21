/**
 * E2E Test Logger
 *
 * Provides detailed console logging for debugging test failures.
 * Captures test phases, element states, timing info, and assertion values.
 */

import type { Locator, Page } from '@playwright/test';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

/** Format timestamp for logging */
function timestamp(): string {
  const now = new Date();
  return `${now.toISOString().slice(11, 23)}`;
}

/** Log a test phase with timing */
export function logPhase(phase: string): void {
  console.log(`\n${colors.bright}${colors.blue}[${timestamp()}] ▶ ${phase}${colors.reset}`);
}

/** Log a sub-step within a phase */
export function logStep(step: string): void {
  console.log(`${colors.cyan}  [${timestamp()}] → ${step}${colors.reset}`);
}

/** Log success message */
export function logSuccess(message: string): void {
  console.log(`${colors.green}  [${timestamp()}] ✓ ${message}${colors.reset}`);
}

/** Log warning message */
export function logWarning(message: string): void {
  console.log(`${colors.yellow}  [${timestamp()}] ⚠ ${message}${colors.reset}`);
}

/** Log error message */
export function logError(message: string): void {
  console.log(`${colors.red}  [${timestamp()}] ✗ ${message}${colors.reset}`);
}

/** Log timing information */
export function logTiming(label: string, durationMs: number): void {
  const color = durationMs > 5000 ? colors.yellow : durationMs > 10000 ? colors.red : colors.dim;
  console.log(`${color}  [${timestamp()}] ⏱ ${label}: ${durationMs.toFixed(0)}ms${colors.reset}`);
}

/** Log element state */
export async function logElementState(locator: Locator, description: string): Promise<void> {
  try {
    const isVisible = await locator.isVisible();
    const isEnabled = await locator.isEnabled().catch(() => 'N/A');
    const count = await locator.count();
    console.log(
      `${colors.dim}  [${timestamp()}] 📍 ${description}: visible=${isVisible}, enabled=${isEnabled}, count=${count}${colors.reset}`,
    );
  } catch (_error) {
    console.log(
      `${colors.dim}  [${timestamp()}] 📍 ${description}: <element not found>${colors.reset}`,
    );
  }
}

/** Log page state */
export async function logPageState(page: Page): Promise<void> {
  const url = page.url();
  const title = await page.title();
  console.log(`${colors.dim}  [${timestamp()}] 🌐 Page: ${url} - "${title}"${colors.reset}`);
}

/** Log assertion value before asserting */
export function logAssertion(expected: unknown, actual: unknown, description: string): void {
  console.log(
    `${colors.magenta}  [${timestamp()}] 🔍 ${description}: expected=${JSON.stringify(expected)}, actual=${JSON.stringify(actual)}${colors.reset}`,
  );
}

/**
 * Timer class for measuring operation durations
 */
export class TestTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
    logStep(`Starting: ${label}`);
  }

  stop(): number {
    const duration = Date.now() - this.startTime;
    logTiming(this.label, duration);
    return duration;
  }
}

/**
 * Create a timed operation wrapper
 */
export async function timed<T>(label: string, operation: () => Promise<T>): Promise<T> {
  const timer = new TestTimer(label);
  try {
    const result = await operation();
    timer.stop();
    return result;
  } catch (error) {
    timer.stop();
    logError(`Failed: ${label}`);
    throw error;
  }
}

/**
 * Wait for element with logging
 */
export async function waitForWithLogging(
  locator: Locator,
  description: string,
  options?: { timeout?: number },
): Promise<void> {
  logStep(`Waiting for: ${description}`);
  const startTime = Date.now();

  try {
    await locator.waitFor({ state: 'visible', timeout: options?.timeout });
    logSuccess(`Found: ${description} (${Date.now() - startTime}ms)`);
  } catch (error) {
    logError(`Timeout waiting for: ${description} (${Date.now() - startTime}ms)`);
    await logElementState(locator, description);
    throw error;
  }
}

/**
 * Click with logging
 */
export async function clickWithLogging(locator: Locator, description: string): Promise<void> {
  logStep(`Clicking: ${description}`);
  await logElementState(locator, description);

  try {
    await locator.click();
    logSuccess(`Clicked: ${description}`);
  } catch (error) {
    logError(`Failed to click: ${description}`);
    throw error;
  }
}

/**
 * Navigate with logging
 */
export async function gotoWithLogging(page: Page, url: string): Promise<void> {
  logStep(`Navigating to: ${url}`);
  const startTime = Date.now();

  try {
    await page.goto(url);
    logSuccess(`Loaded: ${url} (${Date.now() - startTime}ms)`);
    await logPageState(page);
  } catch (error) {
    logError(`Failed to load: ${url}`);
    throw error;
  }
}

/**
 * Test reporter that captures all logs for a test
 */
export class TestReporter {
  private testName: string;
  private startTime: number;

  constructor(testName: string) {
    this.testName = testName;
    this.startTime = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${colors.bright}TEST: ${testName}${colors.reset}`);
    console.log(`${'='.repeat(60)}`);
  }

  finish(passed: boolean): void {
    const duration = Date.now() - this.startTime;
    const status = passed
      ? `${colors.green}PASSED${colors.reset}`
      : `${colors.red}FAILED${colors.reset}`;
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${this.testName}: ${status} (${duration}ms)`);
    console.log(`${'─'.repeat(60)}\n`);
  }
}
