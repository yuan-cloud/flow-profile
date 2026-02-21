import { categorizeNodes } from '../categorize/categorize.js';
import type { NodeCategory } from '../categorize/types.js';
import type { Node, ParsedFlow } from '../parser/types.js';

export type CapabilityType = 'tool' | 'resource';
export type CapabilityConfidence = 'high' | 'medium' | 'low';

export interface Capability {
  type: CapabilityType;
  name: string;
  description: string;
  nodeId: string;
  nodeName: string;
  confidence: CapabilityConfidence;
  inferred: boolean;
}

export interface CapabilityManifest {
  tools: Capability[];
  resources: Capability[];
  metadata: {
    totalNodes: number;
    analyzedNodes: number;
    uncertainCount: number;
  };
}

export function buildCapabilityManifest(flow: ParsedFlow): CapabilityManifest {
  const categorized = categorizeNodes(flow);
  const categorizedById = new Map(categorized.map((node) => [node.id, node]));

  const tools: Capability[] = [];
  const resources: Capability[] = [];

  for (const node of flow.nodes) {
    const categorizedNode = categorizedById.get(node.id);
    const category = categorizedNode?.category;
    if (!category) {
      continue;
    }

    if (category === 'input') {
      resources.push(buildCapability(node, category, 'resource', buildResourceDescriptor));
      continue;
    }

    if (category === 'output') {
      tools.push(buildCapability(node, category, 'tool', buildToolDescriptor));
    }
  }

  resources.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  tools.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  const uncertainCount = [...resources, ...tools].filter(
    (capability) => capability.inferred || capability.confidence !== 'high',
  ).length;

  return {
    tools,
    resources,
    metadata: {
      totalNodes: flow.nodes.length + flow.configNodes.length,
      analyzedNodes: tools.length + resources.length,
      uncertainCount,
    },
  };
}

type DescriptorBuilder = (node: Node) => CapabilityDescriptor;

interface CapabilityDescriptor {
  name: string;
  description: string;
  confidence: CapabilityConfidence;
  inferred: boolean;
}

const RESOURCE_BUILDERS: Record<string, DescriptorBuilder> = {
  'http in': (node) => buildHttpInDescriptor(node),
  'http-in': (node) => buildHttpInDescriptor(node),
  'mqtt in': (node) => buildMqttInDescriptor(node),
  'mqtt-in': (node) => buildMqttInDescriptor(node),
  'file in': (node) => buildFileInDescriptor(node),
  'file-in': (node) => buildFileInDescriptor(node),
  inject: () => ({
    name: 'Scheduled/manual trigger',
    description: 'Scheduled or manual trigger',
    confidence: 'high',
    inferred: false,
  }),
};

const TOOL_BUILDERS: Record<string, DescriptorBuilder> = {
  'http response': () => ({
    name: 'Respond to HTTP requests',
    description: 'Respond to HTTP requests',
    confidence: 'high',
    inferred: false,
  }),
  'http-response': () => ({
    name: 'Respond to HTTP requests',
    description: 'Respond to HTTP requests',
    confidence: 'high',
    inferred: false,
  }),
  'mqtt out': (node) => buildMqttOutDescriptor(node),
  'mqtt-out': (node) => buildMqttOutDescriptor(node),
  file: (node) => buildFileOutDescriptor(node),
  'file out': (node) => buildFileOutDescriptor(node),
  'file-out': (node) => buildFileOutDescriptor(node),
  email: () => ({
    name: 'Send email',
    description: 'Send email',
    confidence: 'high',
    inferred: false,
  }),
  'e-mail': () => ({
    name: 'Send email',
    description: 'Send email',
    confidence: 'high',
    inferred: false,
  }),
  exec: (node) => buildExecDescriptor(node),
  'http request': (node) => buildHttpRequestDescriptor(node),
  'http-request': (node) => buildHttpRequestDescriptor(node),
  debug: () => ({
    name: 'Debug output',
    description: 'Emit debug output',
    confidence: 'medium',
    inferred: true,
  }),
};

function buildCapability(
  node: Node,
  _category: NodeCategory,
  type: CapabilityType,
  descriptorBuilder: DescriptorBuilder,
): Capability {
  const descriptor = descriptorBuilder(node);
  const nodeName = node.name ?? node.type;

  return {
    type,
    name: descriptor.name,
    description: descriptor.description,
    nodeId: node.id,
    nodeName,
    confidence: descriptor.confidence,
    inferred: descriptor.inferred,
  };
}

function buildResourceDescriptor(node: Node): CapabilityDescriptor {
  const type = node.type.toLowerCase();
  const builder = RESOURCE_BUILDERS[type];

  if (builder) {
    return builder(node);
  }

  return {
    name: `Input: ${node.type}`,
    description: `Input node: ${node.type}`,
    confidence: 'low',
    inferred: true,
  };
}

function buildToolDescriptor(node: Node): CapabilityDescriptor {
  const type = node.type.toLowerCase();
  const builder = TOOL_BUILDERS[type];

  if (builder) {
    return builder(node);
  }

  return {
    name: `Output: ${node.type}`,
    description: `Output node: ${node.type}`,
    confidence: 'low',
    inferred: true,
  };
}

function buildHttpInDescriptor(node: Node): CapabilityDescriptor {
  const raw = node.raw as Record<string, unknown>;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const method = typeof raw['method'] === 'string' ? raw['method'].toUpperCase() : 'GET';
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const url = typeof raw['url'] === 'string' ? raw['url'] : '';
  const inferred = url.length === 0;

  return {
    name: 'HTTP endpoint',
    description: url ? `HTTP endpoint: ${method} ${url}` : 'HTTP endpoint',
    confidence: inferred ? 'medium' : 'high',
    inferred,
  };
}

function buildMqttInDescriptor(node: Node): CapabilityDescriptor {
  const raw = node.raw as Record<string, unknown>;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const topic = typeof raw['topic'] === 'string' ? raw['topic'] : '';
  const inferred = topic.length === 0;

  return {
    name: 'MQTT subscription',
    description: topic ? `MQTT subscription: ${topic}` : 'MQTT subscription',
    confidence: inferred ? 'medium' : 'high',
    inferred,
  };
}

function buildFileInDescriptor(node: Node): CapabilityDescriptor {
  const raw = node.raw as Record<string, unknown>;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const filename = typeof raw['filename'] === 'string' ? raw['filename'] : '';
  const inferred = filename.length === 0;

  return {
    name: 'File input',
    description: filename ? `File: ${filename}` : 'File input',
    confidence: inferred ? 'medium' : 'high',
    inferred,
  };
}

function buildMqttOutDescriptor(node: Node): CapabilityDescriptor {
  const raw = node.raw as Record<string, unknown>;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const topic = typeof raw['topic'] === 'string' ? raw['topic'] : '';
  const inferred = topic.length === 0;

  return {
    name: 'Publish to MQTT topic',
    description: topic ? `Publish to MQTT topic: ${topic}` : 'Publish to MQTT topic',
    confidence: inferred ? 'medium' : 'high',
    inferred,
  };
}

function buildFileOutDescriptor(node: Node): CapabilityDescriptor {
  const raw = node.raw as Record<string, unknown>;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const filename = typeof raw['filename'] === 'string' ? raw['filename'] : '';
  const inferred = filename.length === 0;

  return {
    name: 'Write to file',
    description: filename ? `Write to file: ${filename}` : 'Write to file',
    confidence: inferred ? 'medium' : 'high',
    inferred,
  };
}

function buildExecDescriptor(node: Node): CapabilityDescriptor {
  const raw = node.raw as Record<string, unknown>;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const command = typeof raw['command'] === 'string' ? raw['command'] : '';
  const inferred = command.length === 0;

  return {
    name: 'Execute system command',
    description: command ? `Execute system command: ${command}` : 'Execute system command',
    confidence: inferred ? 'medium' : 'high',
    inferred,
  };
}

function buildHttpRequestDescriptor(node: Node): CapabilityDescriptor {
  const raw = node.raw as Record<string, unknown>;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const method = typeof raw['method'] === 'string' ? raw['method'].toUpperCase() : 'GET';
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const url = typeof raw['url'] === 'string' ? raw['url'] : '';
  const inferred = url.length === 0;

  return {
    name: 'HTTP request',
    description: url ? `HTTP request: ${method} ${url}` : 'HTTP request',
    confidence: inferred ? 'medium' : 'high',
    inferred,
  };
}
