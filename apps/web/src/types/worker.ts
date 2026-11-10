import type { RedactionReport, RiskFinding } from '@flow-profile/core';

export interface BuildOptions {
  redactionEnabled: boolean;
  strictMode: boolean;
  entropyThreshold: number;
  flattenSubflows: boolean;
}

export interface TokenBudget {
  current: number;
  budget: number;
  status: 'ok' | 'warning' | 'over';
  breakdown: Record<string, number>;
}

export interface ContextNodeLine {
  id: string;
  label: string;
  type: string;
  tabId?: string;
  tabLabel?: string;
  tokens: number;
}

export interface ContextSections {
  summaryLines: string[];
  nodeLines: ContextNodeLine[];
  subflowLabels: Record<string, string>;
}

export interface BuildResult {
  parameters: BuildOptions;
  redactionReport: RedactionReport;
  aboutMyFlows: Record<string, unknown>;
  promptContext: string;
  riskFindings: RiskFinding[];
  capabilityManifest: Record<string, unknown>;
  tokenEstimate: TokenBudget;
  contextSections?: ContextSections;
}

export interface WorkerProgress {
  phase: string;
  percent: number;
}

export interface RebuildOptions extends Partial<BuildOptions> {
  rawJson?: string;
}

export type WorkerRequest =
  | { type: 'parse'; payload: string; options?: Partial<BuildOptions> }
  | { type: 'rebuild'; payload: RebuildOptions }
  | { type: 'cancel' };

export type WorkerResponse =
  | { type: 'progress'; phase: string; percent: number }
  | { type: 'result'; payload: BuildResult }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };
