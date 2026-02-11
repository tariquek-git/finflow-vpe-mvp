import type { Edge, Node } from '@xyflow/react';

export const NODE_KIND = [
  'Sponsor Bank',
  'Issuer Bank',
  'Acquirer Bank',
  'Correspondent Bank',
  'Central Bank',
  'Fintech Program',
  'Program Manager',
  'Processor',
  'Core Banking System',
  'Wallet App',
  'FBO Account',
  'DDA',
  'Omnibus Account',
  'Virtual Account',
  'Internal Ledger',
] as const;

export type NodeKind = (typeof NODE_KIND)[number];

export const JURISDICTION_OPTIONS = ['Blank', 'US', 'CAN', 'UK', 'EU', 'Other'] as const;
export const SETTLEMENT_ACCESS_OPTIONS = ['Blank', 'Direct', 'Indirect'] as const;

export const RAIL_TYPE_OPTIONS = [
  'Blank',
  'ACH (Next-day)',
  'ACH (Same-day)',
  'RTP',
  'FedNow',
  'Wire',
  'SWIFT',
  'Book Transfer',
] as const;

export const SETTLEMENT_SPEED_OPTIONS = [
  'Blank',
  'T+0',
  'T+1',
  'T+2',
] as const;

export const DIRECTION_OPTIONS = ['Blank', 'Push', 'Pull'] as const;

export type BackgroundStyle = 'grid' | 'dots' | 'none';
export type LaneOrientation = 'horizontal' | 'vertical';

export interface FlowNodeData {
  [key: string]: unknown;
  id: string;
  nodeType: NodeKind;
  displayName: string;
  description: string;
  jurisdiction: (typeof JURISDICTION_OPTIONS)[number];
  regulator: string;
  settlementAccess: (typeof SETTLEMENT_ACCESS_OPTIONS)[number];
}

export interface FlowEdgeData {
  [key: string]: unknown;
  id: string;
  rail: (typeof RAIL_TYPE_OPTIONS)[number];
  settlementSpeed: (typeof SETTLEMENT_SPEED_OPTIONS)[number];
  direction: (typeof DIRECTION_OPTIONS)[number];
  ledgerOfRecord: string;
  notes: string;
}

export type FlowNode = Node<FlowNodeData, 'bank-node'>;
export type FlowEdge = Edge<FlowEdgeData>;

export interface Swimlane {
  id: string;
  label: string;
  order: number;
  size: number;
  visible: boolean;
  orientation: LaneOrientation;
}

export interface UIState {
  darkMode: boolean;
  backgroundMode: BackgroundStyle;
  snapToGrid: boolean;
  showSwimlanes: boolean;
  laneOrientation: LaneOrientation;
  showMiniMap: boolean;
  exportIncludeSwimlanes: boolean;
  exportIncludeBackground: boolean;
}

export interface DiagramPackage {
  version: string;
  timestamp: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  lanes: Swimlane[];
  ui: UIState;
}
