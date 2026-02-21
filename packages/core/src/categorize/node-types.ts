/**
 * Known node type categorizations
 *
 * These lookup tables drive the categorization logic.
 * They can be extended for custom node types.
 */

/**
 * Input nodes - data enters the flow from external sources
 */
export const INPUT_TYPES = new Set([
  // HTTP
  'http in',
  'http-in',
  // MQTT
  'mqtt in',
  'mqtt-in',
  // TCP/UDP
  'tcp in',
  'tcp-in',
  'udp in',
  'udp-in',
  // WebSocket
  'websocket in',
  'websocket-in',
  // Time-based
  'inject',
  'cron',
  // File
  'file in',
  'file-in',
  // Watch
  'watch',
  // Tail
  'tail',
  // Serial
  'serial in',
  'serial-in',
  // Link
  'link in',
  'link-in',
  // Catch/Status
  'catch',
  'status',
  'complete',
]);

/**
 * Output nodes - data leaves the flow or causes side effects
 */
export const OUTPUT_TYPES = new Set([
  // HTTP
  'http response',
  'http-response',
  // MQTT
  'mqtt out',
  'mqtt-out',
  // TCP/UDP
  'tcp out',
  'tcp-out',
  'tcp request',
  'tcp-request',
  'udp out',
  'udp-out',
  // WebSocket
  'websocket out',
  'websocket-out',
  // Debug
  'debug',
  // File
  'file',
  'file out',
  'file-out',
  // Email
  'e-mail',
  'email',
  // Exec
  'exec',
  // Link
  'link out',
  'link-out',
  // Notification
  'notify',
  'notification',
  // HTTP Request (makes outbound requests)
  'http request',
  'http-request',
]);

/**
 * Logic/processing nodes - transform data within the flow
 */
export const LOGIC_TYPES = new Set([
  // Core processing
  'function',
  'change',
  'switch',
  'template',
  // Timing
  'delay',
  'trigger',
  'rate-limit',
  // Aggregation
  'split',
  'join',
  'sort',
  'batch',
  // Routing
  'link call',
  'link-call',
  // JSON
  'json',
  'xml',
  'csv',
  'html',
  'yaml',
  // Range/mapping
  'range',
  'map',
  // Debug helpers
  'comment',
  'unknown',
  // RBE (Report by Exception)
  'rbe',
]);

/**
 * Check if a type is a known input type
 */
export function isInputType(type: string): boolean {
  return INPUT_TYPES.has(type) || INPUT_TYPES.has(type.toLowerCase());
}

/**
 * Check if a type is a known output type
 */
export function isOutputType(type: string): boolean {
  return OUTPUT_TYPES.has(type) || OUTPUT_TYPES.has(type.toLowerCase());
}

/**
 * Check if a type is a known logic type
 */
export function isLogicType(type: string): boolean {
  return LOGIC_TYPES.has(type) || LOGIC_TYPES.has(type.toLowerCase());
}

/**
 * Check if a type is a subflow reference
 */
export function isSubflowReference(type: string): boolean {
  return type.startsWith('subflow:');
}
