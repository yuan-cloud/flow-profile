import { describe, expect, it } from 'vitest';
import {
  buildTokenBreakdown,
  buildTokenBudget,
  defaultTokenizer,
  estimateTokens,
  type TokenBudgetTextSections,
} from './tokens.js';

describe('token budgeting', () => {
  it('estimates tokens with fast heuristic', () => {
    expect(estimateTokens('abcd', defaultTokenizer)).toBe(1);
    expect(estimateTokens('abcde', defaultTokenizer)).toBe(2);
  });

  it('builds breakdown by section', () => {
    const sections: TokenBudgetTextSections = {
      summary: '1234',
      nodeDescriptions: '12345',
      functionCode: '12345678',
      riskFindings: '',
    };

    expect(buildTokenBreakdown(sections, defaultTokenizer)).toEqual({
      summary: 1,
      nodeDescriptions: 2,
      functionCode: 2,
      riskFindings: 0,
    });
  });

  it('assigns ok status when under 80% budget', () => {
    const sections: TokenBudgetTextSections = {
      summary: '1234',
      nodeDescriptions: '',
      functionCode: '',
      riskFindings: '',
    };

    const budget = buildTokenBudget(sections, 10, defaultTokenizer);
    expect(budget.status).toBe('ok');
  });

  it('assigns warning status when within budget', () => {
    const sections: TokenBudgetTextSections = {
      summary: '1234567890',
      nodeDescriptions: '',
      functionCode: '',
      riskFindings: '',
    };

    const budget = buildTokenBudget(sections, 3, defaultTokenizer);
    expect(budget.status).toBe('warning');
  });

  it('assigns over status when exceeding budget', () => {
    const sections: TokenBudgetTextSections = {
      summary: '1234567890',
      nodeDescriptions: '',
      functionCode: '',
      riskFindings: '',
    };

    const budget = buildTokenBudget(sections, 1, defaultTokenizer);
    expect(budget.status).toBe('over');
  });
});
