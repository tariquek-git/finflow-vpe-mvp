import { create } from 'zustand';
import type { GridMode, LaneGroupingMode, NodePinnedAttribute, OverlayMode, ToolMode } from '../types';

export type { ToolMode, GridMode, OverlayMode, LaneGroupingMode };

export const UI_DEFAULT_SWIMLANE_LABELS = ['Swimlane 1', 'Swimlane 2'];

interface UIState {
  activeTool: ToolMode;
  showPorts: boolean;
  showSwimlanes: boolean;
  swimlaneLabels: string[];
  swimlaneCollapsedIds: number[];
  swimlaneLockedIds: number[];
  swimlaneHiddenIds: number[];
  selectedSwimlaneId: number | null;
  gridMode: GridMode;
  overlayMode: OverlayMode;
  laneGroupingMode: LaneGroupingMode;
  pinnedNodeAttributes: NodePinnedAttribute[];
  isLayoutPanelOpen: boolean;
  setActiveTool: (tool: ToolMode) => void;
  setShowPorts: (value: boolean) => void;
  toggleShowPorts: () => void;
  setShowSwimlanes: (value: boolean) => void;
  toggleShowSwimlanes: () => void;
  setSwimlaneLabels: (labels: string[]) => void;
  addSwimlane: () => void;
  removeSwimlane: (index: number) => void;
  updateSwimlaneLabel: (index: number, label: string) => void;
  setSwimlaneCollapsedIds: (ids: number[]) => void;
  setSwimlaneLockedIds: (ids: number[]) => void;
  setSwimlaneHiddenIds: (ids: number[]) => void;
  toggleSwimlaneCollapsed: (id: number) => void;
  toggleSwimlaneLocked: (id: number) => void;
  toggleSwimlaneHidden: (id: number) => void;
  setSelectedSwimlaneId: (id: number | null) => void;
  setGridMode: (mode: GridMode) => void;
  setOverlayMode: (mode: OverlayMode) => void;
  setLaneGroupingMode: (mode: LaneGroupingMode) => void;
  setPinnedNodeAttributes: (attributes: NodePinnedAttribute[]) => void;
  togglePinnedNodeAttribute: (attribute: NodePinnedAttribute) => void;
  setIsLayoutPanelOpen: (value: boolean) => void;
  toggleLayoutPanel: () => void;
}

const DEFAULT_PINNED_NODE_ATTRIBUTES: NodePinnedAttribute[] = ['role', 'account'];

const sanitizeLaneIds = (ids: number[], laneCount: number) =>
  Array.from(
    new Set(
      ids
        .map((id) => (Number.isFinite(id) ? Math.floor(id) : 0))
        .filter((id) => id >= 1 && id <= laneCount)
    )
  ).sort((a, b) => a - b);

const normalizeLabels = (labels: string[]) =>
  labels.length >= 2 ? labels : UI_DEFAULT_SWIMLANE_LABELS;

const isLaneIdSelectable = (id: number, laneCount: number) => id >= 1 && id <= laneCount;

export const useUIStore = create<UIState>((set) => ({
  activeTool: 'select',
  showPorts: true,
  showSwimlanes: true,
  swimlaneLabels: UI_DEFAULT_SWIMLANE_LABELS,
  swimlaneCollapsedIds: [],
  swimlaneLockedIds: [],
  swimlaneHiddenIds: [],
  selectedSwimlaneId: null,
  gridMode: 'dots',
  overlayMode: 'none',
  laneGroupingMode: 'manual',
  pinnedNodeAttributes: DEFAULT_PINNED_NODE_ATTRIBUTES,
  isLayoutPanelOpen: false,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setShowPorts: (value) => set({ showPorts: value }),
  toggleShowPorts: () => set((state) => ({ showPorts: !state.showPorts })),

  setShowSwimlanes: (value) => set({ showSwimlanes: value }),
  toggleShowSwimlanes: () =>
    set((state) => ({
      showSwimlanes: !state.showSwimlanes,
      swimlaneLabels:
        state.swimlaneLabels.length >= 2 ? state.swimlaneLabels : UI_DEFAULT_SWIMLANE_LABELS
    })),

  setSwimlaneLabels: (labels) =>
    set((state) => {
      const nextLabels = normalizeLabels(labels);
      const laneCount = nextLabels.length;
      return {
        swimlaneLabels: nextLabels,
        swimlaneCollapsedIds: sanitizeLaneIds(state.swimlaneCollapsedIds, laneCount),
        swimlaneLockedIds: sanitizeLaneIds(state.swimlaneLockedIds, laneCount),
        swimlaneHiddenIds: sanitizeLaneIds(state.swimlaneHiddenIds, laneCount),
        selectedSwimlaneId:
          state.selectedSwimlaneId && isLaneIdSelectable(state.selectedSwimlaneId, laneCount)
            ? state.selectedSwimlaneId
            : null
      };
    }),
  addSwimlane: () =>
    set((state) => {
      const nextLabels = [...state.swimlaneLabels, `Swimlane ${state.swimlaneLabels.length + 1}`];
      const laneCount = nextLabels.length;
      return {
        swimlaneLabels: nextLabels,
        swimlaneCollapsedIds: sanitizeLaneIds(state.swimlaneCollapsedIds, laneCount),
        swimlaneLockedIds: sanitizeLaneIds(state.swimlaneLockedIds, laneCount),
        swimlaneHiddenIds: sanitizeLaneIds(state.swimlaneHiddenIds, laneCount)
      };
    }),
  removeSwimlane: (index) =>
    set((state) => {
      if (state.swimlaneLabels.length <= 2) return state;
      const nextLabels = state.swimlaneLabels.filter((_, idx) => idx !== index);
      const laneCount = nextLabels.length;
      return {
        swimlaneLabels: nextLabels,
        swimlaneCollapsedIds: sanitizeLaneIds(state.swimlaneCollapsedIds, laneCount),
        swimlaneLockedIds: sanitizeLaneIds(state.swimlaneLockedIds, laneCount),
        swimlaneHiddenIds: sanitizeLaneIds(state.swimlaneHiddenIds, laneCount),
        selectedSwimlaneId:
          state.selectedSwimlaneId && isLaneIdSelectable(state.selectedSwimlaneId, laneCount)
            ? state.selectedSwimlaneId
            : null
      };
    }),
  updateSwimlaneLabel: (index, label) =>
    set((state) => ({
      swimlaneLabels: state.swimlaneLabels.map((existing, idx) =>
        idx === index ? label : existing
      )
    })),
  setSwimlaneCollapsedIds: (ids) =>
    set((state) => ({
      swimlaneCollapsedIds: sanitizeLaneIds(ids, state.swimlaneLabels.length)
    })),
  setSwimlaneLockedIds: (ids) =>
    set((state) => ({
      swimlaneLockedIds: sanitizeLaneIds(ids, state.swimlaneLabels.length)
    })),
  setSwimlaneHiddenIds: (ids) =>
    set((state) => ({
      swimlaneHiddenIds: sanitizeLaneIds(ids, state.swimlaneLabels.length)
    })),
  toggleSwimlaneCollapsed: (id) =>
    set((state) => {
      const laneCount = state.swimlaneLabels.length;
      if (!isLaneIdSelectable(id, laneCount)) return state;
      const next = state.swimlaneCollapsedIds.includes(id)
        ? state.swimlaneCollapsedIds.filter((laneId) => laneId !== id)
        : [...state.swimlaneCollapsedIds, id];
      return {
        swimlaneCollapsedIds: sanitizeLaneIds(next, laneCount)
      };
    }),
  toggleSwimlaneLocked: (id) =>
    set((state) => {
      const laneCount = state.swimlaneLabels.length;
      if (!isLaneIdSelectable(id, laneCount)) return state;
      const next = state.swimlaneLockedIds.includes(id)
        ? state.swimlaneLockedIds.filter((laneId) => laneId !== id)
        : [...state.swimlaneLockedIds, id];
      return {
        swimlaneLockedIds: sanitizeLaneIds(next, laneCount)
      };
    }),
  toggleSwimlaneHidden: (id) =>
    set((state) => {
      const laneCount = state.swimlaneLabels.length;
      if (!isLaneIdSelectable(id, laneCount)) return state;
      const next = state.swimlaneHiddenIds.includes(id)
        ? state.swimlaneHiddenIds.filter((laneId) => laneId !== id)
        : [...state.swimlaneHiddenIds, id];
      return {
        swimlaneHiddenIds: sanitizeLaneIds(next, laneCount)
      };
    }),
  setSelectedSwimlaneId: (id) =>
    set((state) => ({
      selectedSwimlaneId:
        id !== null && isLaneIdSelectable(id, state.swimlaneLabels.length) ? id : null
    })),

  setGridMode: (mode) => set({ gridMode: mode }),
  setOverlayMode: (mode) => set({ overlayMode: mode }),
  setLaneGroupingMode: (mode) => set({ laneGroupingMode: mode }),
  setPinnedNodeAttributes: (attributes) =>
    set(() => {
      const normalized = Array.from(new Set(attributes)).slice(0, 3);
      return {
        pinnedNodeAttributes:
          normalized.length > 0 ? normalized : DEFAULT_PINNED_NODE_ATTRIBUTES
      };
    }),
  togglePinnedNodeAttribute: (attribute) =>
    set((state) => {
      if (state.pinnedNodeAttributes.includes(attribute)) {
        const next = state.pinnedNodeAttributes.filter((item) => item !== attribute);
        return {
          pinnedNodeAttributes: next.length > 0 ? next : state.pinnedNodeAttributes
        };
      }
      if (state.pinnedNodeAttributes.length >= 3) {
        return state;
      }
      return {
        pinnedNodeAttributes: [...state.pinnedNodeAttributes, attribute]
      };
    }),
  setIsLayoutPanelOpen: (value) => set({ isLayoutPanelOpen: value }),
  toggleLayoutPanel: () => set((state) => ({ isLayoutPanelOpen: !state.isLayoutPanelOpen }))
}));
