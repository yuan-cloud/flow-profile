import {
  appendPath,
  DEFAULT_FIELD_PATTERNS,
  getRules,
  isHighEntropy,
  isInputType,
  isLogicType,
  isOutputType,
  type RiskFinding,
  type RiskPresentation,
  redactSecrets,
} from '@flow-profile/core';

type LocatedFinding = RiskFinding & { filePath?: string };
const MASK = '[REDACTED]';
const TOKEN = /[^\s"'`<>“”‘’]+/gu;
const RUN = /\S+/gu;
const ID_WORD = /[\p{L}\p{N}_-]{8,}/gu;
const MAX_TRIE_VALUE_LENGTH = 1024;
const INPUT_REF = /^urn:flow-profile:input:[1-9]\d*$/;
const privateFindings = new WeakSet<object>();
const ruleIds = new Set(getRules().map((rule) => rule.id));
const publicFields = new Set(DEFAULT_FIELD_PATTERNS);
export const safeRuleIds = (ids: string[]) => ids.filter((id) => ruleIds.has(id));

/** Only owned, deeply frozen findings can bypass the fallback library sanitizer. */
export function markLintFinding<T extends LocatedFinding>(finding: T): T {
  for (const node of finding.affectedNodes) Object.freeze(node);
  Object.freeze(finding.affectedNodes);
  Object.freeze(finding);
  privateFindings.add(finding);
  return finding;
}

type MatchState = { next: Map<string, number>; fail: number; length: number };

function buildTrie(values: Set<string>): MatchState[] {
  const states: MatchState[] = [{ next: new Map(), fail: 0, length: 0 }];
  for (const value of values) {
    let state = 0;
    const chars = [...value];
    for (const char of chars) {
      let next = states[state]?.next.get(char);
      if (next === undefined) {
        next = states.length;
        states.push({ next: new Map(), fail: 0, length: 0 });
        states[state]?.next.set(char, next);
      }
      state = next;
    }
    const terminal = states[state];
    if (terminal) terminal.length = chars.length;
  }
  return states;
}

function advance(states: MatchState[], state: number, char: string): number {
  let cursor = state;
  while (cursor && !states[cursor]?.next.has(char)) cursor = states[cursor]?.fail ?? 0;
  return states[cursor]?.next.get(char) ?? 0;
}

function connectSuffixes(states: MatchState[]): void {
  const queue = [...(states[0]?.next.values() ?? [])];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i] ?? 0;
    for (const [char, next] of states[current]?.next ?? []) {
      const target = states[next];
      if (target) {
        target.fail = advance(states, states[current]?.fail ?? 0, char);
        target.length = Math.max(target.length, states[target.fail]?.length ?? 0);
      }
      queue.push(next);
    }
  }
}

function maskMatches(value: string, states: MatchState[]): string {
  const chars = [...value];
  const coverage = new Int32Array(chars.length + 1);
  let state = 0;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i] ?? '';
    state = advance(states, state, char);
    const length = states[state]?.length ?? 0;
    if (length) {
      coverage[i + 1 - length] = (coverage[i + 1 - length] ?? 0) + 1;
      coverage[i + 1] = (coverage[i + 1] ?? 0) - 1;
    }
  }
  const output: string[] = [];
  let covered = 0;
  for (let i = 0; i < chars.length; i++) {
    const previous = covered;
    covered += coverage[i] ?? 0;
    if (covered && !previous) output.push(MASK);
    if (!covered) output.push(chars[i] ?? '');
  }
  return output.join('');
}

/** Aho-Corasick matching of recognized values, never an input-sized regular expression.
 * Only the longest suffix match is needed: it covers all shorter matches at that end.
 */
function valueMatcher(values: Set<string>) {
  // A Map per character amplifies a single megabyte value into hundreds of MB.
  // Keep long values as strings and use native substring search instead of trie states.
  const short = new Set<string>();
  const long: string[] = [];
  let shortestLong = Infinity;
  for (const value of values) {
    if (value.length <= MAX_TRIE_VALUE_LENGTH) short.add(value);
    else {
      long.push(value);
      shortestLong = Math.min(shortestLong, value.length);
    }
  }
  const states = buildTrie(short);
  connectSuffixes(states);
  return (value: string) => {
    // Conservative whole-display masking avoids allocating a per-character result for long matches.
    if (value.length >= shortestLong && long.some((secret) => value.includes(secret))) return MASK;
    return !short.size || !value ? value : maskMatches(value, states);
  };
}

function inputReferences(paths: string[], secrets: Set<string>, fromSource: boolean) {
  const pathMap = new Map<string, string>();
  const usedPaths = new Set(!fromSource ? paths.filter((path) => INPUT_REF.test(path)) : []);
  let nextInput = 1;
  for (const path of paths) {
    if (pathMap.has(path)) continue;
    let ref = path;
    if (fromSource || !INPUT_REF.test(path)) {
      do {
        ref = `urn:flow-profile:input:${nextInput++}`;
      } while (secrets.has(ref) || usedPaths.has(ref));
    }
    usedPaths.add(ref);
    pathMap.set(path, ref);
  }
  return pathMap;
}

/** Raw detection uses the original graph. These callbacks render only interpolated data. */
export function createLintPrivacy(
  findings: LocatedFinding[],
  inputs: unknown[] = [],
  paths: string[] = [],
) {
  const secrets = new Set<string>();
  const sourceIds = new Set<string>();
  const compare = (original: unknown, redacted: unknown): void => {
    if (typeof original === 'string') {
      if (original && original !== redacted) secrets.add(original);
    } else if (Array.isArray(original)) {
      original.forEach((item, i) => {
        compare(item, (redacted as unknown[])[i]);
      });
    } else if (original && typeof original === 'object') {
      for (const [key, value] of Object.entries(original))
        compare(value, (redacted as Record<string, unknown>)[key]);
    }
  };
  for (const input of inputs) {
    compare(input, redactSecrets(input).redacted);
    if (Array.isArray(input))
      for (const element of input) {
        if (element && typeof element === 'object' && typeof element.id === 'string')
          sourceIds.add(element.id);
      }
  }
  const replaceValues = valueMatcher(secrets);
  const nodeMap = new Map<string, string>();
  const usedNodes = new Set<string>(
    !inputs.length
      ? findings
          .flatMap((finding) => finding.affectedNodes?.map((node) => node.id) ?? [])
          .filter((id) => /^node-[1-9]\d*$/.test(id))
      : [],
  );
  let nextNode = 1;
  const nodeId = (id: string): string => {
    let alias = nodeMap.get(id);
    if (!alias) {
      // Library renderers can receive an already serialized presentation; never infer a file location.
      if (!inputs.length && /^node-[1-9]\d*$/.test(id) && !secrets.has(id)) alias = id;
      else {
        do {
          alias = `node-${nextNode++}`;
        } while (secrets.has(alias) || usedNodes.has(alias));
      }
      usedNodes.add(alias);
      nodeMap.set(id, alias);
    }
    return alias;
  };
  const pathMap = inputReferences(
    [...paths, ...findings.flatMap((f) => (f.filePath === undefined ? [] : [f.filePath]))],
    secrets,
    inputs.length > 0,
  );
  const contentCache = new Map<string, string>();
  const tokenContent = (token: string): string => {
    if (token === MASK) return token;
    // Short word-like IDs are ambiguous in prose; protect structural slots explicitly.
    if (token.length >= 8 && sourceIds.has(token)) return nodeId(token);
    if (isHighEntropy(token, 4.5)) return MASK;
    return token.replace(ID_WORD, (word) => (sourceIds.has(word) ? nodeId(word) : word));
  };
  const content = (value: string | undefined): string => {
    const raw = typeof value === 'string' ? value : '';
    const cached = contentCache.get(raw);
    if (cached !== undefined) return cached;
    const text = replaceValues(raw).replace(RUN, (run) =>
      isHighEntropy(run, 4.5) ? MASK : run.replace(TOKEN, tokenContent),
    );
    contentCache.set(raw, text);
    return text;
  };
  const presentation: RiskPresentation = {
    nodeId,
    nodeName: (id, name, type) => {
      // These literals are already public in rule descriptions/type lists. Partially masking
      // one occurrence would reveal which part equals a sensitive value.
      if (name === undefined) {
        if (
          type !== undefined &&
          (isInputType(type) || isOutputType(type) || isLogicType(type) || type === 'daemon')
        )
          return type;
        return content(type);
      }
      if (name === id) return nodeId(id);
      const display = content(name);
      // An explicit label can also equal the type shown elsewhere in the finding.
      // Do not reveal the position/length of its matched substring beside that public context.
      return name === type && display !== name ? MASK : display;
    },
    tabName: (id, label) => (label === undefined ? nodeId(id) : content(label)),
    fieldPath: (parts) =>
      parts.reduce<string>(
        (base, part) =>
          appendPath(
            base,
            typeof part === 'number' || publicFields.has(part.toLowerCase()) ? part : content(part),
          ),
        'raw',
      ),
  };
  const finding = (value: LocatedFinding): LocatedFinding => {
    if (privateFindings.has(value)) return value;
    return markLintFinding({
      id: ruleIds.has(value.id) ? value.id : 'RISK_UNKNOWN',
      severity: ['low', 'medium', 'high'].includes(value.severity) ? value.severity : 'medium',
      confidence: ['low', 'medium', 'high'].includes(value.confidence) ? value.confidence : 'low',
      title: content(value.title),
      description: content(value.description),
      evidence: content(value.evidence),
      remediation: content(value.remediation),
      affectedNodes: (value.affectedNodes ?? []).map((node) => ({
        id: nodeId(node.id),
        name: content(node.name),
      })),
      ...(value.filePath === undefined
        ? {}
        : { filePath: pathMap.get(value.filePath) ?? 'urn:flow-profile:input:1' }),
    });
  };
  return {
    finding,
    presentation,
    path: (path: string) => pathMap.get(path) ?? 'urn:flow-profile:input:1',
  };
}
