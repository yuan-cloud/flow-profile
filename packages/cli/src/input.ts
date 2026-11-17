import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { INPUT_LIMITS, InputLimitError, parseInputJson } from '@flow-profile/core';

export type InputReadBudget = {
  bytesRemaining: number;
  filesRemaining: number;
  structuralUnitsRemaining: number;
};

export function createInputBudget(maxBytes: number = INPUT_LIMITS.maxBytes): InputReadBudget {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > INPUT_LIMITS.maxBytes) {
    throw new RangeError('Invalid input byte budget');
  }
  return {
    bytesRemaining: maxBytes,
    filesRemaining: INPUT_LIMITS.maxFiles,
    structuralUnitsRemaining: INPUT_LIMITS.maxStructuralUnits,
  };
}

/** Read actual bytes, including growth after open/stat. Never trust reported file size. */
export async function readInputJsonFile(
  inputPath: string,
  budget: InputReadBudget = createInputBudget(),
): Promise<unknown> {
  if (
    !Number.isSafeInteger(budget.filesRemaining) ||
    budget.filesRemaining < 1 ||
    budget.filesRemaining > INPUT_LIMITS.maxFiles
  ) {
    throw new InputLimitError('files');
  }
  if (
    !Number.isSafeInteger(budget.bytesRemaining) ||
    budget.bytesRemaining < 0 ||
    budget.bytesRemaining > INPUT_LIMITS.maxBytes
  ) {
    throw new InputLimitError('bytes');
  }
  budget.filesRemaining--;
  // Nonblocking open prevents a FIFO from blocking before its non-regular type is rejected.
  const file = await open(inputPath, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  try {
    if (!(await file.stat()).isFile()) throw new Error('Input must be a regular file');
    const chunks: Buffer[] = [];
    let bytes = 0;
    while (true) {
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, budget.bytesRemaining + 1));
      const { bytesRead } = await file.read(chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      if (bytesRead > budget.bytesRemaining) throw new InputLimitError('bytes');
      budget.bytesRemaining -= bytesRead;
      bytes += bytesRead;
      chunks.push(chunk.subarray(0, bytesRead));
    }
    return parseInputJson(Buffer.concat(chunks, bytes).toString('utf8'), budget);
  } finally {
    await file.close();
  }
}
