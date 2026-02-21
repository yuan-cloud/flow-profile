import type { AboutMyFlows } from './types';

export const buildPrompt = (bundle: AboutMyFlows): string => {
  const payload = JSON.stringify(bundle, null, 2);
  return [
    'You are a vendor-neutral assistant helping review a sanitized Node-RED flow bundle.',
    'Return STRICT JSON only. Do not wrap in markdown.',
    '',
    'Schema:',
    '{',
    '  "suggestions": [',
    '    {',
    '      "type": "explanation" | "next-step" | "risk-insight",',
    '      "content": string,',
    '      "confidence": "high" | "medium" | "low",',
    '      "references": string[]',
    '    }',
    '  ],',
    '  "evidenceRefs": string[]',
    '}',
    '',
    'Bundle:',
    payload,
  ].join('\n');
};
