import {
  DIRECTION_OPTIONS,
  JURISDICTION_OPTIONS,
  NODE_KIND,
  RAIL_TYPE_OPTIONS,
  SETTLEMENT_ACCESS_OPTIONS,
  SETTLEMENT_SPEED_OPTIONS,
  type FlowEdgeData,
  type FlowNodeData,
  type NodeKind,
} from './types';

export const NODE_CATEGORIES: Array<{ title: string; items: NodeKind[] }> = [
  {
    title: 'Institutions',
    items: ['Sponsor Bank', 'Issuer Bank', 'Acquirer Bank', 'Correspondent Bank', 'Central Bank'],
  },
  {
    title: 'Systems',
    items: ['Fintech Program', 'Program Manager', 'Processor', 'Core Banking System', 'Wallet App'],
  },
  {
    title: 'Custody',
    items: ['FBO Account', 'DDA', 'Omnibus Account', 'Virtual Account', 'Internal Ledger'],
  },
];

export const ALL_NODE_TYPES = new Set<NodeKind>(NODE_KIND);

export type FieldType = 'text' | 'textarea' | 'select';

export interface NodeField {
  key: keyof FlowNodeData;
  label: string;
  type: FieldType;
  options?: readonly string[];
  placeholder?: string;
}

export const BASE_NODE_FIELDS: NodeField[] = [
  { key: 'displayName', label: 'Header Name', type: 'text', placeholder: 'Displayed node title' },
  { key: 'description', label: 'Notes', type: 'textarea', placeholder: 'Optional context for this entity' },
  { key: 'jurisdiction', label: 'Jurisdiction', type: 'select', options: JURISDICTION_OPTIONS },
  { key: 'regulator', label: 'Regulator', type: 'text', placeholder: 'OCC, FINTRAC, FCA...' },
  {
    key: 'settlementAccess',
    label: 'Settlement Access',
    type: 'select',
    options: SETTLEMENT_ACCESS_OPTIONS,
  },
];

export interface EdgeField {
  key: keyof FlowEdgeData;
  label: string;
  type: FieldType;
  options?: readonly string[];
  placeholder?: string;
}

export function edgeFields(ledgerOptions: string[]): EdgeField[] {
  return [
    { key: 'rail', label: 'Rail Type', type: 'select', options: RAIL_TYPE_OPTIONS },
    { key: 'settlementSpeed', label: 'Settlement Speed', type: 'select', options: SETTLEMENT_SPEED_OPTIONS },
    { key: 'direction', label: 'Direction', type: 'select', options: DIRECTION_OPTIONS },
    {
      key: 'ledgerOfRecord',
      label: 'Ledger of Record',
      type: 'select',
      options: ['Blank', ...ledgerOptions],
    },
    { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional edge note' },
  ];
}
