import { MarkerType } from '@xyflow/react';
import type {
  DiagramPackage,
  FlowEdge,
  FlowEdgeData,
  FlowNode,
  FlowNodeData,
  LaneOrientation,
  NodeKind,
  Swimlane,
  UIState,
} from './types';

export const VERSION = '2.1.0';
export const STORE_KEY = 'finflow-settlement-architect-v2';
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 96;
export const SNAP = 24;

export const defaultUI: UIState = {
  darkMode: false,
  backgroundMode: 'none',
  snapToGrid: false,
  showSwimlanes: true,
  laneOrientation: 'horizontal',
  showMiniMap: false,
  exportIncludeSwimlanes: true,
  exportIncludeBackground: true,
};

export function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNodeData(id: string, nodeType: NodeKind): FlowNodeData {
  return {
    id,
    nodeType,
    displayName: nodeType,
    description: '',
    jurisdiction: 'Blank',
    regulator: '',
    settlementAccess: 'Blank',
  };
}

export function createFlowNode(kind: NodeKind, position: { x: number; y: number }): FlowNode {
  const id = makeId('node');
  return {
    id,
    type: 'bank-node',
    position,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    data: createNodeData(id, kind),
  };
}

export function createEdgeData(id: string): FlowEdgeData {
  return {
    id,
    rail: 'Blank',
    settlementSpeed: 'Blank',
    direction: 'Blank',
    ledgerOfRecord: 'Blank',
    notes: '',
  };
}

export function edgeLabel(data: FlowEdgeData): string {
  if (data.rail === 'Blank') {
    return '';
  }
  return data.rail;
}

export function decorateEdge(edge: FlowEdge): FlowEdge {
  const data = edge.data ?? createEdgeData(edge.id);

  return {
    ...edge,
    type: 'straight',
    data,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 17,
      height: 17,
      color: '#0f766e',
    },
    style: {
      stroke: '#0f766e',
      strokeWidth: 1.9,
      ...edge.style,
    },
    label: edgeLabel(data),
    labelStyle: {
      fill: '#0f172a',
      fontSize: 11,
      fontWeight: 700,
      ...edge.labelStyle,
    },
    labelBgPadding: edge.labelBgPadding ?? [5, 3],
    labelBgBorderRadius: edge.labelBgBorderRadius ?? 6,
    labelBgStyle: {
      fill: 'rgba(248,250,252,0.92)',
      ...edge.labelBgStyle,
    },
  };
}

export function createFlowEdge(params: {
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}): FlowEdge {
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

export function cloneFlowNode(node: FlowNode): FlowNode {
  const id = makeId('node');

  return {
    ...node,
    id,
    selected: true,
    position: {
      x: node.position.x + 42,
      y: node.position.y + 42,
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
    { id: 'lane-1', label: 'Customer', order: 0, size: 220, visible: true, orientation },
    { id: 'lane-2', label: 'Processing', order: 1, size: 240, visible: true, orientation },
    { id: 'lane-3', label: 'Settlement', order: 2, size: 220, visible: true, orientation },
  ];
}

export function normalizeLaneOrder(lanes: Swimlane[]): Swimlane[] {
  return [...lanes]
    .sort((a, b) => a.order - b.order)
    .map((lane, index) => ({ ...lane, order: index }));
}

export function emptyDiagram(): DiagramPackage {
  return {
    version: VERSION,
    timestamp: new Date().toISOString(),
    nodes: [],
    edges: [],
    lanes: defaultLanes(),
    ui: { ...defaultUI },
  };
}
