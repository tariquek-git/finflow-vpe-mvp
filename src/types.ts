import type { Edge, Node } from '@xyflow/react';

export const NODE_TYPES = [
  'Sponsor Bank',
  'Issuer Bank',
  'Acquirer Merchant Bank',
  'Correspondent Bank',
  'Fintech Program',
  'Program Manager',
  'Processor',
  'Core Banking System',
  'Wallet App',
  'Generic Account',
  'FBO Account',
  'Settlement Account',
  'KYC Gate',
  'AML Gate',
  'Sanctions Screening Gate',
  'Ledger',
  'Sub Ledger',
  'Treasury Operations',
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export const JURISDICTION_OPTIONS = ['Blank', 'Canada', 'US', 'EU', 'UK', 'Other'] as const;
export const ROLE_IN_FLOW_OPTIONS = [
  'Blank',
  'funds holder',
  'message sender',
  'message receiver',
  'settler',
  'ledger of record',
  'other',
] as const;

export const SETTLEMENT_ACCESS_OPTIONS = ['Blank', 'yes', 'no', 'unknown'] as const;
export const INTEGRATION_MODE_OPTIONS = ['Blank', 'API', 'file', 'hybrid'] as const;
export const POSTING_TIMING_OPTIONS = ['Blank', 'auth', 'capture', 'settlement', 'mixed'] as const;
export const CORE_TYPE_OPTIONS = ['Blank', 'deposit core', 'credit core', 'lending core', 'other'] as const;
export const CUSTODY_MODEL_OPTIONS = ['Blank', 'omnibus', 'per customer', 'hybrid'] as const;
export const LEDGER_TYPE_OPTIONS = ['Blank', 'real time', 'batch'] as const;
export const BALANCE_MODEL_OPTIONS = ['Blank', 'omnibus', 'sub ledger', 'hybrid'] as const;
export const SOURCE_OF_TRUTH_OPTIONS = ['Blank', 'bank', 'processor', 'internal'] as const;
export const KYC_METHOD_OPTIONS = ['Blank', 'documents', 'bureau', 'open banking', 'other'] as const;
export const OWNER_OPTIONS = ['Blank', 'bank', 'fintech', 'program manager', 'vendor'] as const;
export const TREASURY_SCOPE_OPTIONS = ['Blank', 'funding', 'settlement', 'liquidity', 'all'] as const;

export const EDGE_RAIL_OPTIONS = [
  'Blank',
  'ACH',
  'FedNow',
  'RTP',
  'Wire',
  'Bank Transfer',
  'Interac e Transfer',
  'Card Network',
  'Cash',
  'Cheque',
  'Swift',
  'SEPA',
  'Other',
] as const;

export const EDGE_SETTLEMENT_OPTIONS = [
  'Blank',
  'Realtime',
  'Batch',
  'End of day',
  'T plus 1',
  'T plus 2',
  'Other',
] as const;

export const EDGE_DIRECTION_OPTIONS = ['Blank', 'Push', 'Pull', 'Both'] as const;
export const EDGE_MESSAGE_FUNDS_OPTIONS = ['Blank', 'Funds Movement', 'Message Only', 'Both'] as const;
export const CARD_NETWORK_OPTIONS = ['Blank', 'Visa', 'Mastercard', 'Amex', 'Discover'] as const;
export const CARD_STAGE_OPTIONS = ['Blank', 'auth', 'capture', 'clearing', 'settlement', 'chargeback'] as const;

export type BackgroundMode = 'grid' | 'dots' | 'none';
export type LaneOrientation = 'horizontal' | 'vertical';
export type LayoutDirection = 'LR' | 'TB';

export interface BankNodeData {
  [key: string]: unknown;
  id: string;
  nodeType: NodeType;
  displayName: string;
  description: string;
  jurisdiction: (typeof JURISDICTION_OPTIONS)[number];
  roleInFlow: (typeof ROLE_IN_FLOW_OPTIONS)[number];
  regulator: string;
  settlementAccess: (typeof SETTLEMENT_ACCESS_OPTIONS)[number];
  integrationMode: (typeof INTEGRATION_MODE_OPTIONS)[number];
  postingTiming: (typeof POSTING_TIMING_OPTIONS)[number];
  coreType: (typeof CORE_TYPE_OPTIONS)[number];
  heldAt: string;
  custodyModel: (typeof CUSTODY_MODEL_OPTIONS)[number];
  ledgerType: (typeof LEDGER_TYPE_OPTIONS)[number];
  balanceModel: (typeof BALANCE_MODEL_OPTIONS)[number];
  sourceOfTruth: (typeof SOURCE_OF_TRUTH_OPTIONS)[number];
  method: (typeof KYC_METHOD_OPTIONS)[number];
  owner: (typeof OWNER_OPTIONS)[number];
  treasuryScope: (typeof TREASURY_SCOPE_OPTIONS)[number];
}

export interface BankEdgeData {
  [key: string]: unknown;
  id: string;
  rail: (typeof EDGE_RAIL_OPTIONS)[number];
  settlementType: (typeof EDGE_SETTLEMENT_OPTIONS)[number];
  direction: (typeof EDGE_DIRECTION_OPTIONS)[number];
  messageOrFunds: (typeof EDGE_MESSAGE_FUNDS_OPTIONS)[number];
  notes: string;
  networkName: (typeof CARD_NETWORK_OPTIONS)[number];
  transactionStage: (typeof CARD_STAGE_OPTIONS)[number];
}

export type BankNode = Node<BankNodeData, 'bankNode'>;
export type BankEdge = Edge<BankEdgeData>;

export interface Swimlane {
  id: string;
  label: string;
  order: number;
  size: number;
  visible: boolean;
  orientation: LaneOrientation;
}

export interface UISettings {
  darkMode: boolean;
  backgroundMode: BackgroundMode;
  snapToGrid: boolean;
  autoLayoutDirection: LayoutDirection;
  showSwimlanes: boolean;
  laneOrientation: LaneOrientation;
  showMiniMap: boolean;
  exportIncludeSwimlanes: boolean;
  exportIncludeBackground: boolean;
}

export interface DiagramPayload {
  version: string;
  timestamp: string;
  nodes: BankNode[];
  edges: BankEdge[];
  lanes: Swimlane[];
  ui: UISettings;
}
