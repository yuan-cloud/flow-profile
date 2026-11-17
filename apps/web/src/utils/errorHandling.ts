import { parseInputJson } from '@flow-profile/core';

export type JsonParseResult = { ok: true; value: unknown } | { ok: false; error: Error };

export const parseJsonSafe = (raw: string): JsonParseResult => {
  try {
    return { ok: true, value: parseInputJson(raw) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};
