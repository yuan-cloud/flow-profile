export type DiffLine = {
  type: 'equal' | 'add' | 'remove';
  text: string;
};

const toLines = (value: string): string[] => (value.length ? value.split('\n') : []);

const buildMatrix = (left: string[], right: string[]): number[][] => {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (left[i - 1] === right[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  return matrix;
};

export const diffLines = (before: string, after: string): DiffLine[] => {
  const left = toLines(before);
  const right = toLines(after);
  const matrix = buildMatrix(left, right);
  const result: DiffLine[] = [];

  let i = left.length;
  let j = right.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      result.push({ type: 'equal', text: left[i - 1] });
      i -= 1;
      j -= 1;
      continue;
    }

    if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      result.push({ type: 'add', text: right[j - 1] });
      j -= 1;
      continue;
    }

    if (i > 0) {
      result.push({ type: 'remove', text: left[i - 1] });
      i -= 1;
    }
  }

  return result.reverse();
};
