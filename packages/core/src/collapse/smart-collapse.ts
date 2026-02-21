import type { Tokenizer } from '../budget/tokens.js';
import { defaultTokenizer, estimateTokens } from '../budget/tokens.js';

export type CollapseLevel = 'signature' | 'summary' | 'full';

export interface FunctionNode {
  id: string;
  name?: string;
  func: string;
}

export interface CollapseResult {
  nodeId: string;
  level: CollapseLevel;
  collapsedCode: string;
  summaryLines: string[];
}

export interface CollapseSavings {
  nodeId: string;
  originalTokens: number;
  collapsedTokens: number;
  savings: number;
}

export function getDefaultCollapseLevel(node: FunctionNode): CollapseLevel {
  const lineCount = node.func.split('\n').length;

  if (lineCount < 10) {
    return 'full';
  }

  if (lineCount < 50) {
    return 'summary';
  }

  return 'signature';
}

export function collapseFunctionCode(
  node: FunctionNode,
  level: CollapseLevel = getDefaultCollapseLevel(node),
): CollapseResult {
  const trimmed = node.func.trim();
  const signature = buildSignature(node);
  const summaryLines = buildSummaryLines(trimmed);

  if (level === 'full') {
    return {
      nodeId: node.id,
      level,
      collapsedCode: trimmed,
      summaryLines,
    };
  }

  if (level === 'signature') {
    return {
      nodeId: node.id,
      level,
      collapsedCode: `${signature} // ${countLines(node.func)} lines`,
      summaryLines,
    };
  }

  const summaryBody = summaryLines.length > 0 ? summaryLines.join('\n') : '// Summary unavailable';
  const collapsedCode = `${signature}\n${summaryBody}\n... // ${countLines(node.func)} lines`;

  return {
    nodeId: node.id,
    level,
    collapsedCode,
    summaryLines,
  };
}

export function calculateCollapseSavings(
  node: FunctionNode,
  collapsedCode: string,
  tokenizer: Tokenizer = defaultTokenizer,
): CollapseSavings {
  const originalTokens = estimateTokens(node.func, tokenizer);
  const collapsedTokens = estimateTokens(collapsedCode, tokenizer);
  const savings = Math.max(0, originalTokens - collapsedTokens);

  return {
    nodeId: node.id,
    originalTokens,
    collapsedTokens,
    savings,
  };
}

export function overrideCollapseLevel(node: FunctionNode, level: CollapseLevel): CollapseResult {
  return collapseFunctionCode(node, level);
}

function buildSignature(node: FunctionNode): string {
  const name = node.name?.trim() || 'anonymous';
  return `function ${name}(msg) { ... }`;
}

function countLines(value: string): number {
  return value.split('\n').length;
}

function buildSummaryLines(code: string): string[] {
  const lines = code.split('\n').map((line) => line.trim());
  const summaryLines: string[] = [];

  const commentBlock = extractLeadingComment(lines);
  if (commentBlock.length > 0) {
    summaryLines.push(...commentBlock.map((line) => `// ${line}`));
  }

  const operations = extractOperations(lines);
  if (operations.length > 0) {
    summaryLines.push(...operations.map((op) => `// ${op}`));
  }

  return summaryLines.slice(0, 3);
}

function extractLeadingComment(lines: string[]): string[] {
  const result: string[] = [];

  for (const line of lines) {
    if (line.startsWith('//')) {
      result.push(line.replace(/^\/\/\s?/, ''));
      continue;
    }
    if (line.startsWith('/*')) {
      result.push(line.replace(/^\/\*+\s?/, '').replace(/\*\/\s*$/, ''));
      continue;
    }
    if (result.length > 0) {
      break;
    }
    if (line.length > 0) {
      break;
    }
  }

  return result;
}

function extractOperations(lines: string[]): string[] {
  const operations: string[] = [];

  for (const line of lines) {
    if (line.includes('http') || line.includes('axios') || line.includes('fetch(')) {
      operations.push('Performs HTTP request');
      continue;
    }
    if (line.includes('fs.') || line.includes('readFile') || line.includes('writeFile')) {
      operations.push('Reads or writes files');
      continue;
    }
    if (line.includes('try') || line.includes('catch')) {
      operations.push('Includes error handling');
      continue;
    }
    if (line.includes('msg.') || line.includes('context.')) {
      operations.push('Transforms message/context');
    }
  }

  return [...new Set(operations)];
}
