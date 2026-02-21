/**
 * @flow-profile/core
 *
 * Isomorphic core logic for Flow Profile.
 * This package is browser-compatible - no Node.js APIs allowed.
 */

export const VERSION = '0.0.1' as const;

// Export token budgeting
export * from './budget/index.js';
// Export capability manifest
export * from './capability/index.js';
// Export categorization
export * from './categorize/index.js';
// Export collapse heuristics
export * from './collapse/index.js';
// Export flow diff utilities
export * from './diff/index.js';
// Export doc generator
export * from './doc/index.js';
// Export subflow expansion
export * from './expand/index.js';
// Export output generators
export * from './output/index.js';
// Export flow parser
export * from './parser/index.js';
// Export redaction engine
export * from './redact/index.js';
// Export risk detection
export * from './risks/index.js';
// Export flow parsing schemas
export * from './schemas/flow.js';
// Export canonical JSON utilities
export * from './utils/canonical.js';
