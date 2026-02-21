export interface CanonicalStringifyOptions {
  indent?: number;
}

export function canonicalStringify(
  value: unknown,
  options: CanonicalStringifyOptions = {},
): string {
  const indent = options.indent ?? 2;
  const sorted = sortKeys(value, new WeakSet<object>());
  return JSON.stringify(sorted, null, indent);
}

export function sortKeys(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (seen.has(value)) {
    throw new TypeError('Cannot canonicalize circular structure');
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item, seen));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key], seen);
  }

  return sorted;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
