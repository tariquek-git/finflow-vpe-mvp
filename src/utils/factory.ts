import { MarkerType } from '@xyflow/react';
import type {
  BankEdge,
  BankEdgeData,
  BankNode,
  BankNodeData,
  LaneOrientation,
  NodeType,
  Swimlane,
  UISettings,
} from '../types';

export const STORAGE_KEY = 'banking-diagram-mvp-v1';
export const SNAP_GRID = 24;
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 110;
export const VERSION = '1.0.0';

export function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const defaultUI: UISettings = {
  darkMode: false,
  backgroundMode: 'grid',
  snapToGrid: false,
  autoLayoutDirection: 'LR',
  showSwimlanes: true,
  laneOrientation: 'horizontal',
  showMiniMap: false,
  exportIncludeSwimlanes: true,
  exportIncludeBackground: true,
};

export function createNodeData(id: string, nodeType: NodeType): BankNodeData {
  return {
    id,
    nodeType,
    displayName: nodeType,
    description: '',
    jurisdiction: 'Blank',
    roleInFlow: 'Blank',
    regulator: '',
    settlementAccess: 'Blank',
    integrationMode: 'Blank',
    postingTiming: 'Blank',
    coreType: 'Blank',
    heldAt: '',
    custodyModel: 'Blank',
    ledgerType: 'Blank',
    balanceModel: 'Blank',
    sourceOfTruth: 'Blank',
    method: 'Blank',
    owner: 'Blank',
    treasuryScope: 'Blank',
  };
}

export function createNode(nodeType: NodeType, position: { x: number; y: number }): BankNode {
  const id = makeId('node');
  return {
    id,
    type: 'bankNode',
    position,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    data: createNodeData(id, nodeType),
  };
}

export function createEdgeData(id: string): BankEdgeData {
  return {
    id,
    rail: 'Blank',
    settlementType: 'Blank',
    direction: 'Blank',
    messageOrFunds: 'Blank',
    notes: '',
    networkName: 'Blank',
    transactionStage: 'Blank',
  };
}

export function edgeLabel(data: BankEdgeData): string {
  if (data.rail === 'Blank') {
    return '';
  }

  if (data.rail === 'Card Network' && data.networkName !== 'Blank') {
    return `${data.rail} (${data.networkName})`;
  }

  return data.rail;
}

export function decorateEdge(edge: BankEdge): BankEdge {
  const data = edge.data ?? createEdgeData(edge.id);
  return {
    ...edge,
    type: 'straight',
    data,
    label: edgeLabel(data),
    style: {
      stroke: '#2563eb',
      strokeWidth: 1.8,
      ...edge.style,
    },
    labelStyle: {
      fontSize: 11,
      fontWeight: 600,
      fill: '#0f172a',
      ...edge.labelStyle,
    },
    labelBgStyle: {
      fill: 'rgba(255,255,255,0.95)',
      ...edge.labelBgStyle,
    },
    labelBgPadding: edge.labelBgPadding ?? [4, 2],
    labelBgBorderRadius: edge.labelBgBorderRadius ?? 6,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#2563eb',
    },
  };
}

export function createEdge(params: {
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}): BankEdge {
  const id = makeId('edge');
  return decorateEdge({
    id,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
    type: 'straight',
    data: createEdgeData(id),
  });
}

export function cloneNode(node: BankNode): BankNode {
  const id = makeId('node');
  return {
    ...node,
    id,
    selected: true,
    position: {
      x: node.position.x + 40,
      y: node.position.y + 40,
    },
    data: {
      ...node.data,
      id,
      displayName: `${node.data.displayName} Copy`,
    },
  };
}

export function defaultLanes(orientation: LaneOrientation = 'horizontal'): Swimlane[] {
  return [
    { id: 'lane-1', label: 'Initiation', order: 0, size: 220, visible: true, orientation },
    { id: 'lane-2', label: 'Processing', order: 1, size: 220, visible: true, orientation },
    { id: 'lane-3', label: 'Settlement', order: 2, size: 220, visible: true, orientation },
  ];
}
