export function calculateEntropy(value: string): number {
  if (!value) {
    return 0;
  }

  const freq = new Map<string, number>();
  for (const char of value) {
    freq.set(char, (freq.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(
    value,
  );
}

export function isVersionString(value: string): boolean {
  return /^v?\d+\.\d+(?:\.\d+)?(?:[-._][0-9A-Za-z]+)*$/.test(value);
}

export function isBase64Like(value: string): boolean {
  if (value.length % 4 !== 0) {
    return false;
  }
  if (/\s/.test(value)) {
    return false;
  }
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function shouldSkipEntropy(value: string, isSensitiveField = false): boolean {
  if (isSensitiveField) {
    return false;
  }
  if (value.length < 8) {
    return true;
  }
  if (isUuid(value)) {
    return true;
  }
  if (isIsoDate(value)) {
    return true;
  }
  if (isVersionString(value)) {
    return true;
  }
  if (isBase64Like(value) && value.length <= 48) {
    return true;
  }
  if (/\s/.test(value)) {
    return true;
  }
  return false;
}

export function isHighEntropy(value: string, threshold: number, isSensitiveField = false): boolean {
  if (shouldSkipEntropy(value, isSensitiveField)) {
    return false;
  }
  return calculateEntropy(value) >= threshold;
}
