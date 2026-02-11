import { applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react';
import { create } from 'zustand';
import {
  cloneFlowNode,
  createEdgeData,
  createFlowEdge,
  createFlowNode,
  createNodeData,
  decorateEdge,
  defaultLanes,
  emptyDiagram,
  normalizeLaneOrder,
  VERSION,
} from '../core/builders';
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
} from '../core/types';

export interface GuardrailIssue {
  id: string;
  edgeId: string;
  severity: 'warning' | 'error';
  message: string;
}

interface Store {
  nodes: FlowNode[];
  edges: FlowEdge[];
  lanes: Swimlane[];
  ui: UIState;
  guardrails: GuardrailIssue[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  addNode: (type: NodeKind, position: { x: number; y: number }) => void;
  addConnection: (connection: Connection) => void;
  select: (nodeId: string | null, edgeId: string | null) => void;
  updateNode: (id: string, patch: Partial<FlowNodeData>) => void;
  resetNode: (id: string) => void;
  updateEdge: (id: string, patch: Partial<FlowEdgeData>) => void;
  resetEdge: (id: string) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  patchUI: (patch: Partial<UIState>) => void;
  setLaneOrientation: (orientation: LaneOrientation) => void;
  addLane: () => void;
  updateLane: (id: string, patch: Partial<Swimlane>) => void;
  resizeLane: (id: string, size: number) => void;
  reorderLanes: (ids: string[]) => void;
  freshDiagram: () => void;
  hydrate: (payload: DiagramPackage) => void;
  exportState: () => DiagramPackage;
}

const initial = emptyDiagram();

function edgeData(edge: FlowEdge): FlowEdgeData {
  return edge.data ?? createEdgeData(edge.id);
}

function evaluateGuardrails(nodes: FlowNode[], edges: FlowEdge[]): GuardrailIssue[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const issues: GuardrailIssue[] = [];

  edges.forEach((edge) => {
    const data = edgeData(edge);
    const movementDefined = data.rail !== 'Blank';
    const ledgerMissing = !data.ledgerOfRecord.trim() || data.ledgerOfRecord === 'Blank';

    if (movementDefined && ledgerMissing) {
      issues.push({
        id: `${edge.id}:ledger-of-record`,
        edgeId: edge.id,
        severity: 'warning',
        message: 'Define the Ledger of Record for this movement.',
      });
    }

    const target = nodeById.get(edge.target);
    const isPotentialBatchTarget = target?.data.nodeType === 'Internal Ledger';

    if (
      movementDefined &&
      isPotentialBatchTarget &&
      data.direction === 'Push' &&
      data.settlementSpeed === 'T+0'
    ) {
      issues.push({
        id: `${edge.id}:incompatible-realtime`,
        edgeId: edge.id,
        severity: 'error',
        message:
          'Potential flow integrity issue: T+0 Push into Internal Ledger. Add an intermediary buffer or use T+1/T+2.',
      });
    }
  });

  return issues;
}

function withGuardrails(nodes: FlowNode[], edges: FlowEdge[]) {
  return {
    nodes,
    edges,
    guardrails: evaluateGuardrails(nodes, edges),
  };
}

export const useBankFlowStore = create<Store>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  lanes: initial.lanes,
  ui: initial.ui,
  guardrails: evaluateGuardrails(initial.nodes, initial.edges),
  selectedNodeId: null,
  selectedEdgeId: null,

  setNodes: (nodes) => {
    set((state) => {
      const nextNodes = typeof nodes === 'function' ? nodes(state.nodes) : nodes;
      return withGuardrails(nextNodes, state.edges);
    });
  },

  onNodesChange: (changes) => {
    set((state) => {
      const nextNodes = applyNodeChanges(changes, state.nodes);
      return withGuardrails(nextNodes, state.edges);
    });
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const nextEdges = applyEdgeChanges(changes, state.edges);
      return withGuardrails(state.nodes, nextEdges);
    });
  },

  addNode: (type, position) => {
    const node = createFlowNode(type, position);
    set((state) => {
      const nodes = [...state.nodes, node];
      return {
        ...withGuardrails(nodes, state.edges),
        selectedNodeId: node.id,
        selectedEdgeId: null,
      };
    });
  },

  addConnection: (connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    const edge = createFlowEdge({
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    });

    set((state) => {
      const edges = [...state.edges, edge];
      return {
        ...withGuardrails(state.nodes, edges),
        selectedNodeId: null,
        selectedEdgeId: edge.id,
      };
    });
  },

  select: (nodeId, edgeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: edgeId });
  },

  updateNode: (id, patch) => {
    set((state) => {
      const nodes = state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                ...patch,
              },
            }
          : node,
      );
      return withGuardrails(nodes, state.edges);
    });
  },

  resetNode: (id) => {
    set((state) => {
      const nodes = state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: createNodeData(node.id, node.data.nodeType),
            }
          : node,
      );
      return withGuardrails(nodes, state.edges);
    });
  },

  updateEdge: (id, patch) => {
    set((state) => {
      const edges = state.edges.map((edge) => {
        if (edge.id !== id) {
          return edge;
        }

        const nextData: FlowEdgeData = {
          ...edgeData(edge),
          ...patch,
        };

        return decorateEdge({
          ...edge,
          data: nextData,
        });
      });

      return withGuardrails(state.nodes, edges);
    });
  },

  resetEdge: (id) => {
    set((state) => {
      const edges = state.edges.map((edge) =>
        edge.id === id
          ? decorateEdge({
              ...edge,
              data: createEdgeData(edge.id),
            })
          : edge,
      );
      return withGuardrails(state.nodes, edges);
    });
  },

  deleteSelection: () => {
    set((state) => {
      const nodeIds = new Set(
        state.nodes.filter((node) => node.selected || node.id === state.selectedNodeId).map((node) => node.id),
      );
      const edgeIds = new Set(
        state.edges.filter((edge) => edge.selected || edge.id === state.selectedEdgeId).map((edge) => edge.id),
      );

      const nodes = state.nodes.filter((node) => !nodeIds.has(node.id));
      const edges = state.edges.filter(
        (edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target),
      );

      return {
        ...withGuardrails(nodes, edges),
        selectedNodeId: null,
        selectedEdgeId: null,
      };
    });
  },

  duplicateSelection: () => {
    set((state) => {
      const selected = state.nodes.filter((node) => node.selected || node.id === state.selectedNodeId);
      if (!selected.length) {
        return state;
      }

      const clones = selected.map((node) => cloneFlowNode(node));
      const nodes = [
        ...state.nodes.map((node) => ({
          ...node,
          selected: false,
        })),
        ...clones,
      ];

      return {
        ...withGuardrails(nodes, state.edges),
        selectedNodeId: clones.length === 1 ? clones[0].id : null,
        selectedEdgeId: null,
      };
    });
  },

  patchUI: (patch) => {
    set((state) => ({
      ui: {
        ...state.ui,
        ...patch,
      },
    }));
  },

  setLaneOrientation: (orientation) => {
    set((state) => ({
      ui: {
        ...state.ui,
        laneOrientation: orientation,
      },
      lanes: state.lanes.map((lane) => ({
        ...lane,
        orientation,
      })),
    }));
  },

  addLane: () => {
    set((state) => {
      const id = `lane-${state.lanes.length + 1}-${Date.now()}`;
      const lane: Swimlane = {
        id,
        label: `Lane ${state.lanes.length + 1}`,
        order: state.lanes.length,
        size: 220,
        visible: true,
        orientation: state.ui.laneOrientation,
      };
      return {
        lanes: [...state.lanes, lane],
      };
    });
  },

  updateLane: (id, patch) => {
    set((state) => ({
      lanes: state.lanes.map((lane) => (lane.id === id ? { ...lane, ...patch } : lane)),
    }));
  },

  resizeLane: (id, size) => {
    set((state) => ({
      lanes: state.lanes.map((lane) =>
        lane.id === id
          ? {
              ...lane,
              size: Math.max(80, size),
            }
          : lane,
      ),
    }));
  },

  reorderLanes: (ids) => {
    set((state) => {
      const map = new Map(state.lanes.map((lane) => [lane.id, lane]));
      const next = ids
        .map((id) => map.get(id))
        .filter((lane): lane is Swimlane => Boolean(lane))
        .map((lane, order) => ({ ...lane, order }));

      return {
        lanes: normalizeLaneOrder(next),
      };
    });
  },

  freshDiagram: () => {
    const next = emptyDiagram();
    set({
      nodes: next.nodes,
      edges: next.edges,
      lanes: next.lanes,
      ui: next.ui,
      guardrails: evaluateGuardrails(next.nodes, next.edges),
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  hydrate: (payload) => {
    const nodes = payload.nodes;
    const edges = payload.edges.map((edge) => decorateEdge(edge));
    set({
      nodes,
      edges,
      lanes: normalizeLaneOrder(payload.lanes),
      ui: payload.ui,
      guardrails: evaluateGuardrails(nodes, edges),
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  exportState: () => {
    const state = get();
    return {
      version: VERSION,
      timestamp: new Date().toISOString(),
      nodes: state.nodes,
      edges: state.edges,
      lanes: state.lanes,
      ui: state.ui,
    };
  },
}));

export function fallbackLaneSet(orientation: LaneOrientation = 'horizontal'): Swimlane[] {
  return defaultLanes(orientation);
}
