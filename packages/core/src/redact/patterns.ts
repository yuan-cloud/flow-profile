export const DEFAULT_FIELD_PATTERNS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'apikey',
  'api_key',
  'apitoken',
  'secret',
  'secretkey',
  'secret_key',
  'credentials',
  'credential',
  'auth',
  'authorization',
  'auth_token',
  'privatekey',
  'private_key',
  'accesskey',
  'access_key',
  'bearer',
  'bearer_token',
  'session',
  'session_id',
  'sessionid',
];

export type FieldMatchReason = 'field_name' | 'prefix_match';

const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function appendPath(base: string, key: string | number): string {
  if (typeof key === 'number') {
    return `${base}[${key}]`;
  }

  if (!base) {
    return IDENTIFIER_PATTERN.test(key) ? key : `[${JSON.stringify(key)}]`;
  }

  if (IDENTIFIER_PATTERN.test(key)) {
    return `${base}.${key}`;
  }

  return `${base}[${JSON.stringify(key)}]`;
}

function matchesExact(normalized: string): boolean {
  return DEFAULT_FIELD_PATTERNS.some((pattern) => normalized === pattern);
}

function matchesPrefixOrSuffix(normalized: string): boolean {
  return DEFAULT_FIELD_PATTERNS.some(
    (pattern) => normalized.startsWith(pattern) || normalized.endsWith(pattern),
  );
}

function matchesContains(normalized: string): boolean {
  return DEFAULT_FIELD_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function matchesAdditional(key: string, additionalPatterns?: RegExp[]): boolean {
  return additionalPatterns?.some((pattern) => pattern.test(key)) ?? false;
}

export function getFieldMatchReason(
  key: string,
  additionalPatterns?: RegExp[],
): FieldMatchReason | undefined {
  const normalized = key.toLowerCase();

  if (matchesExact(normalized)) {
    return 'field_name';
  }

  if (matchesPrefixOrSuffix(normalized)) {
    return 'prefix_match';
  }

  if (matchesContains(normalized)) {
    return 'field_name';
  }

  if (matchesAdditional(key, additionalPatterns)) {
    return 'field_name';
  }

  return undefined;
}
