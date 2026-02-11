import {
  BALANCE_MODEL_OPTIONS,
  CARD_NETWORK_OPTIONS,
  CARD_STAGE_OPTIONS,
  CORE_TYPE_OPTIONS,
  CUSTODY_MODEL_OPTIONS,
  EDGE_DIRECTION_OPTIONS,
  EDGE_MESSAGE_FUNDS_OPTIONS,
  EDGE_RAIL_OPTIONS,
  EDGE_SETTLEMENT_OPTIONS,
  INTEGRATION_MODE_OPTIONS,
  JURISDICTION_OPTIONS,
  KYC_METHOD_OPTIONS,
  LEDGER_TYPE_OPTIONS,
  OWNER_OPTIONS,
  POSTING_TIMING_OPTIONS,
  ROLE_IN_FLOW_OPTIONS,
  SETTLEMENT_ACCESS_OPTIONS,
  SOURCE_OF_TRUTH_OPTIONS,
  TREASURY_SCOPE_OPTIONS,
  type BankEdgeData,
  type BankNodeData,
  type NodeType,
} from '../types';
type NodeFieldKey = Extract<keyof BankNodeData, string>;
type EdgeFieldKey = Extract<keyof BankEdgeData, string>;

export const NODE_CATEGORIES: Array<{ title: string; items: NodeType[] }> = [
  {
    title: 'Institutions',
    items: ['Sponsor Bank', 'Issuer Bank', 'Acquirer Merchant Bank', 'Correspondent Bank'],
  },
  {
    title: 'Fintech Program and Systems',
    items: ['Fintech Program', 'Program Manager', 'Processor', 'Core Banking System', 'Wallet App'],
  },
  {
    title: 'Accounts and Custody',
    items: ['Generic Account', 'FBO Account', 'Settlement Account'],
  },
  {
    title: 'Controls and Gates',
    items: ['KYC Gate', 'AML Gate', 'Sanctions Screening Gate'],
  },
  {
    title: 'Financial Control Objects',
    items: ['Ledger', 'Sub Ledger', 'Treasury Operations'],
  },
];

export type FieldKind = 'text' | 'textarea' | 'select';

export interface FieldDef<K extends string> {
  key: K;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
}

export const NODE_BASE_FIELDS: FieldDef<NodeFieldKey>[] = [
  { key: 'displayName', label: 'Display Name', kind: 'text' },
  { key: 'description', label: 'Description', kind: 'textarea' },
  { key: 'jurisdiction', label: 'Jurisdiction', kind: 'select', options: JURISDICTION_OPTIONS },
  { key: 'roleInFlow', label: 'Role In Flow', kind: 'select', options: ROLE_IN_FLOW_OPTIONS },
];

const BANK_NODES: NodeType[] = ['Sponsor Bank', 'Issuer Bank'];
const ACCOUNT_NODES: NodeType[] = ['Generic Account', 'FBO Account', 'Settlement Account'];
const LEDGER_NODES: NodeType[] = ['Ledger', 'Sub Ledger'];

export function nodeTypeFields(nodeType: NodeType): FieldDef<NodeFieldKey>[] {
  if (BANK_NODES.includes(nodeType)) {
    return [
      { key: 'regulator', label: 'Regulator', kind: 'text' },
      { key: 'settlementAccess', label: 'Settlement Access', kind: 'select', options: SETTLEMENT_ACCESS_OPTIONS },
    ];
  }

  if (nodeType === 'Processor') {
    return [
      { key: 'integrationMode', label: 'Integration Mode', kind: 'select', options: INTEGRATION_MODE_OPTIONS },
      { key: 'postingTiming', label: 'Posting Timing', kind: 'select', options: POSTING_TIMING_OPTIONS },
    ];
  }

  if (nodeType === 'Core Banking System') {
    return [{ key: 'coreType', label: 'Core Type', kind: 'select', options: CORE_TYPE_OPTIONS }];
  }

  if (ACCOUNT_NODES.includes(nodeType)) {
    return [
      { key: 'heldAt', label: 'Held At', kind: 'text' },
      { key: 'custodyModel', label: 'Custody Model', kind: 'select', options: CUSTODY_MODEL_OPTIONS },
    ];
  }

  if (LEDGER_NODES.includes(nodeType)) {
    return [
      { key: 'ledgerType', label: 'Ledger Type', kind: 'select', options: LEDGER_TYPE_OPTIONS },
      { key: 'balanceModel', label: 'Balance Model', kind: 'select', options: BALANCE_MODEL_OPTIONS },
      { key: 'sourceOfTruth', label: 'Source Of Truth', kind: 'select', options: SOURCE_OF_TRUTH_OPTIONS },
    ];
  }

  if (nodeType === 'KYC Gate') {
    return [
      { key: 'method', label: 'Method', kind: 'select', options: KYC_METHOD_OPTIONS },
      { key: 'owner', label: 'Owner', kind: 'select', options: OWNER_OPTIONS },
    ];
  }

  if (nodeType === 'AML Gate' || nodeType === 'Sanctions Screening Gate') {
    return [{ key: 'owner', label: 'Owner', kind: 'select', options: OWNER_OPTIONS }];
  }

  if (nodeType === 'Treasury Operations') {
    return [{ key: 'treasuryScope', label: 'Treasury Scope', kind: 'select', options: TREASURY_SCOPE_OPTIONS }];
  }

  return [];
}

export const EDGE_FIELDS: FieldDef<EdgeFieldKey>[] = [
  { key: 'rail', label: 'Rail', kind: 'select', options: EDGE_RAIL_OPTIONS },
  { key: 'settlementType', label: 'Settlement Type', kind: 'select', options: EDGE_SETTLEMENT_OPTIONS },
  { key: 'direction', label: 'Direction', kind: 'select', options: EDGE_DIRECTION_OPTIONS },
  { key: 'messageOrFunds', label: 'Message or Funds', kind: 'select', options: EDGE_MESSAGE_FUNDS_OPTIONS },
  { key: 'notes', label: 'Notes', kind: 'textarea' },
];

export const CARD_NETWORK_FIELDS: FieldDef<EdgeFieldKey>[] = [
  { key: 'networkName', label: 'Network Name', kind: 'select', options: CARD_NETWORK_OPTIONS },
  { key: 'transactionStage', label: 'Transaction Stage', kind: 'select', options: CARD_STAGE_OPTIONS },
];
