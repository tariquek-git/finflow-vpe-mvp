import { create } from 'zustand';
import type { GridMode, ToolMode } from '../types';

export type { ToolMode, GridMode };

export const UI_DEFAULT_SWIMLANE_LABELS = ['Swimlane 1', 'Swimlane 2'];

interface UIState {
  activeTool: ToolMode;
  showPorts: boolean;
  showSwimlanes: boolean;
  swimlaneLabels: string[];
  gridMode: GridMode;
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
  setGridMode: (mode: GridMode) => void;
  setIsLayoutPanelOpen: (value: boolean) => void;
  toggleLayoutPanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTool: 'select',
  showPorts: true,
  showSwimlanes: true,
  swimlaneLabels: UI_DEFAULT_SWIMLANE_LABELS,
  gridMode: 'dots',
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
    set({
      swimlaneLabels: labels.length >= 2 ? labels : UI_DEFAULT_SWIMLANE_LABELS
    }),
  addSwimlane: () =>
    set((state) => ({
      swimlaneLabels: [...state.swimlaneLabels, `Swimlane ${state.swimlaneLabels.length + 1}`]
    })),
  removeSwimlane: (index) =>
    set((state) => {
      if (state.swimlaneLabels.length <= 2) return state;
      return {
        swimlaneLabels: state.swimlaneLabels.filter((_, idx) => idx !== index)
      };
    }),
  updateSwimlaneLabel: (index, label) =>
    set((state) => ({
      swimlaneLabels: state.swimlaneLabels.map((existing, idx) =>
        idx === index ? label : existing
      )
    })),

  setGridMode: (mode) => set({ gridMode: mode }),
  setIsLayoutPanelOpen: (value) => set({ isLayoutPanelOpen: value }),
  toggleLayoutPanel: () => set((state) => ({ isLayoutPanelOpen: !state.isLayoutPanelOpen }))
}));
