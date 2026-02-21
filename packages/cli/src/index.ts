/**
 * @flow-profile/cli
 *
 * Command-line interface for Flow Profile.
 * This package can use Node.js APIs.
 */

import { existsSync } from 'node:fs';

export * from './commands/index.js';

export const VERSION = '0.0.1' as const;

// Verify Node.js APIs are available in CLI package
export function fileExists(path: string): boolean {
  return existsSync(path);
}
