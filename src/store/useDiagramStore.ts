import { applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react';
import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  cloneNode,
  createEdge,
  createEdgeData,
  createNode,
  createNodeData,
  decorateEdge,
  defaultLanes,
  defaultUI,
  makeId,
  VERSION,
} from '../utils/factory';
import type {
  BankEdge,
  BankEdgeData,
  BankNode,
  BankNodeData,
  DiagramPayload,
  LaneOrientation,
  NodeType,
  Swimlane,
  UISettings,
} from '../types';

interface DiagramState {
  nodes: BankNode[];
  edges: BankEdge[];
  lanes: Swimlane[];
  ui: UISettings;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setNodes: (next: BankNode[] | ((current: BankNode[]) => BankNode[])) => void;
  onNodesChange: (changes: NodeChange<BankNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<BankEdge>[]) => void;
  addNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
  addConnection: (connection: Connection) => void;
  select: (nodeId: string | null, edgeId: string | null) => void;
  updateNode: (id: string, patch: Partial<BankNodeData>) => void;
  resetNode: (id: string) => void;
  updateEdge: (id: string, patch: Partial<BankEdgeData>) => void;
  resetEdge: (id: string) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  patchUI: (patch: Partial<UISettings>) => void;
  setLaneOrientation: (orientation: LaneOrientation) => void;
  addLane: () => void;
  updateLane: (id: string, patch: Partial<Swimlane>) => void;
  resizeLane: (id: string, size: number) => void;
  reorderLanes: (orderedIds: string[]) => void;
  newDiagram: () => void;
  hydrate: (payload: DiagramPayload) => void;
  exportPayload: () => DiagramPayload;
}

const initialState = {
  nodes: [] as BankNode[],
  edges: [] as BankEdge[],
  lanes: defaultLanes(),
  ui: { ...defaultUI },
  selectedNodeId: null as string | null,
  selectedEdgeId: null as string | null,
};

function normalizeLaneOrder(lanes: Swimlane[]): Swimlane[] {
  return [...lanes]
    .sort((a, b) => a.order - b.order)
    .map((lane, index) => ({ ...lane, order: index }));
}

export const useDiagramStore = create<DiagramState>()(
  temporal(
    (set, get) => ({
      ...initialState,

  setNodes: (next) => {
    set((state) => ({
      nodes: typeof next === 'function' ? next(state.nodes) : next,
    }));
  },

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  addNode: (nodeType, position) => {
    const node = createNode(nodeType, position);
    set((state) => ({
      nodes: [...state.nodes, node],
      selectedNodeId: node.id,
      selectedEdgeId: null,
    }));
  },

  addConnection: (connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    const edge = createEdge({
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    });

    set((state) => ({
      edges: [...state.edges, edge],
      selectedNodeId: null,
      selectedEdgeId: edge.id,
    }));
  },

  select: (nodeId, edgeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: edgeId });
  },

  updateNode: (id, patch) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                ...patch,
              },
            }
          : node,
      ),
    }));
  },

  resetNode: (id) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: createNodeData(node.id, node.data.nodeType),
            }
          : node,
      ),
    }));
  },

  updateEdge: (id, patch) => {
    set((state) => ({
      edges: state.edges.map((edge) => {
        if (edge.id !== id) {
          return edge;
        }
        const updated = {
          ...edge,
          data: {
            ...(edge.data ?? createEdgeData(edge.id)),
            ...patch,
          },
        };
        return decorateEdge(updated);
      }),
    }));
  },

  resetEdge: (id) => {
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === id
          ? decorateEdge({
              ...edge,
              data: createEdgeData(edge.id),
            })
          : edge,
      ),
    }));
  },

  deleteSelection: () => {
    set((state) => {
      const selectedNodeIds = new Set(
        state.nodes.filter((node) => node.selected || node.id === state.selectedNodeId).map((node) => node.id),
      );
      const selectedEdgeIds = new Set(
        state.edges.filter((edge) => edge.selected || edge.id === state.selectedEdgeId).map((edge) => edge.id),
      );

      return {
        nodes: state.nodes.filter((node) => !selectedNodeIds.has(node.id)),
        edges: state.edges.filter(
          (edge) =>
            !selectedEdgeIds.has(edge.id) && !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target),
        ),
        selectedNodeId: null,
        selectedEdgeId: null,
      };
    });
  },

  duplicateSelection: () => {
    set((state) => {
      const selectedNodes = state.nodes.filter((node) => node.selected || node.id === state.selectedNodeId);
      if (!selectedNodes.length) {
        return state;
      }

      const clones = selectedNodes.map((node) => cloneNode(node));
      return {
        nodes: [
          ...state.nodes.map((node) => ({
            ...node,
            selected: false,
          })),
          ...clones,
        ],
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
      const newLane: Swimlane = {
        id: makeId('lane'),
        label: `Lane ${state.lanes.length + 1}`,
        order: state.lanes.length,
        size: 220,
        visible: true,
        orientation: state.ui.laneOrientation,
      };

      return {
        lanes: [...state.lanes, newLane],
      };
    });
  },

  updateLane: (id, patch) => {
    set((state) => ({
      lanes: state.lanes.map((lane) =>
        lane.id === id
          ? {
              ...lane,
              ...patch,
            }
          : lane,
      ),
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

  reorderLanes: (orderedIds) => {
    set((state) => {
      const map = new Map(state.lanes.map((lane) => [lane.id, lane]));
      const next = orderedIds
        .map((id) => map.get(id))
        .filter((lane): lane is Swimlane => Boolean(lane))
        .map((lane, index) => ({ ...lane, order: index }));

      if (next.length !== state.lanes.length) {
        return state;
      }

      return {
        lanes: next,
      };
    });
  },

  newDiagram: () => {
    set({
      nodes: [],
      edges: [],
      lanes: defaultLanes(),
      ui: { ...defaultUI },
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  hydrate: (payload) => {
    set({
      nodes: payload.nodes,
      edges: payload.edges.map((edge) => decorateEdge(edge)),
      lanes: normalizeLaneOrder(payload.lanes),
      ui: {
        ...defaultUI,
        ...payload.ui,
      },
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

      exportPayload: () => {
        const state = get();
        return {
          version: VERSION,
          timestamp: new Date().toISOString(),
          nodes: state.nodes,
          edges: state.edges,
          lanes: normalizeLaneOrder(state.lanes),
          ui: state.ui,
        };
      },
    }),
    {
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
      equality: (previousState, currentState) =>
        previousState.nodes === currentState.nodes &&
        previousState.edges === currentState.edges,
      limit: 100,
    },
  ),
);
