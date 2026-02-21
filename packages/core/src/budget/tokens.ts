export interface Tokenizer {
  count(text: string): number;
  name: string;
}

export interface TokenBudgetBreakdown {
  summary: number;
  nodeDescriptions: number;
  functionCode: number;
  riskFindings: number;
}

export interface TokenBudget {
  current: number;
  budget: number;
  status: 'ok' | 'warning' | 'over';
  breakdown: TokenBudgetBreakdown;
}

export interface TokenBudgetTextSections {
  summary: string;
  nodeDescriptions: string;
  functionCode: string;
  riskFindings: string;
}

export const defaultTokenizer: Tokenizer = {
  count: (text) => Math.ceil(text.length / 4),
  name: 'fast-heuristic',
};

export function estimateTokens(text: string, tokenizer: Tokenizer = defaultTokenizer): number {
  return tokenizer.count(text);
}

export function buildTokenBreakdown(
  sections: TokenBudgetTextSections,
  tokenizer: Tokenizer = defaultTokenizer,
): TokenBudgetBreakdown {
  return {
    summary: estimateTokens(sections.summary, tokenizer),
    nodeDescriptions: estimateTokens(sections.nodeDescriptions, tokenizer),
    functionCode: estimateTokens(sections.functionCode, tokenizer),
    riskFindings: estimateTokens(sections.riskFindings, tokenizer),
  };
}

export function buildTokenBudget(
  sections: TokenBudgetTextSections,
  budget: number,
  tokenizer: Tokenizer = defaultTokenizer,
): TokenBudget {
  const breakdown = buildTokenBreakdown(sections, tokenizer);
  const current =
    breakdown.summary +
    breakdown.nodeDescriptions +
    breakdown.functionCode +
    breakdown.riskFindings;

  const status = resolveStatus(current, budget);

  return {
    current,
    budget,
    status,
    breakdown,
  };
}

function resolveStatus(current: number, budget: number): TokenBudget['status'] {
  if (budget <= 0) {
    return 'over';
  }

  const ratio = current / budget;
  if (ratio <= 0.8) {
    return 'ok';
  }

  if (ratio <= 1) {
    return 'warning';
  }

  return 'over';
}
