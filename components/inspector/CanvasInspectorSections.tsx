import React, { useState } from 'react';
import { Layers, Map, Plus, Settings2 } from 'lucide-react';
import { GridMode, LaneGroupingMode } from '../../types';

type CanvasInspectorSectionsProps = {
  showSwimlanes: boolean;
  onToggleSwimlanes: () => void;
  swimlaneLabels: string[];
  onAddSwimlane: () => void;
  onRemoveSwimlane: (index: number) => void;
  onUpdateSwimlaneLabel: (index: number, label: string) => void;
  gridMode: GridMode;
  onSetGridMode: (mode: GridMode) => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  showPorts: boolean;
  onTogglePorts: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  laneGroupingMode: LaneGroupingMode;
  onSetLaneGroupingMode: (mode: LaneGroupingMode) => void;
};

const PanelSection: React.FC<{ title: string; icon: React.ReactNode; children?: React.ReactNode }> = ({
  title,
  icon,
  children
}) => (
  <section className="mb-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className="mb-2 flex items-center gap-2 border-b border-slate-200 px-1 pb-1 dark:border-slate-700">
      <div className="text-cyan-600 dark:text-cyan-300">{icon}</div>
      <h3 className="ui-section-title">{title}</h3>
    </div>
    <div className="space-y-2.5 px-1">{children}</div>
  </section>
);

const Field: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="ml-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-slate-400">
      {label}
    </label>
    {children}
  </div>
);

const CanvasInspectorSections: React.FC<CanvasInspectorSectionsProps> = ({
  showSwimlanes,
  onToggleSwimlanes,
  swimlaneLabels,
  onAddSwimlane,
  onRemoveSwimlane,
  onUpdateSwimlaneLabel,
  gridMode,
  onSetGridMode,
  snapToGrid,
  onToggleSnapToGrid,
  showPorts,
  onTogglePorts,
  showMinimap,
  onToggleMinimap,
  laneGroupingMode,
  onSetLaneGroupingMode
}) => {
  const [swimlaneListOpen, setSwimlaneListOpen] = useState(false);

  return (
    <>
      <PanelSection title="Canvas Utilities" icon={<Settings2 className="h-3.5 w-3.5" />}>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Primary toggles are now in the top bar and left rail. This panel keeps full-detail controls.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onToggleSnapToGrid} aria-pressed={snapToGrid} className={`status-chip ${snapToGrid ? 'is-active' : ''}`}>
            {snapToGrid ? 'Snap On' : 'Snap Off'}
          </button>
          <button type="button" onClick={onTogglePorts} aria-pressed={showPorts} className={`status-chip ${showPorts ? 'is-active' : ''}`}>
            {showPorts ? 'Ports On' : 'Ports Off'}
          </button>
          <button
            type="button"
            onClick={onToggleMinimap}
            aria-pressed={showMinimap}
            className={`status-chip col-span-2 inline-flex items-center justify-center gap-1 ${showMinimap ? 'is-active' : ''}`}
          >
            <Map className="h-3.5 w-3.5" /> {showMinimap ? 'Minimap On' : 'Minimap Off'}
          </button>
        </div>

        <Field label="Grid Mode">
          <div className="grid grid-cols-3 gap-1">
            {(['none', 'lines', 'dots'] as GridMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSetGridMode(mode)}
                aria-pressed={gridMode === mode}
                className={`status-chip ${gridMode === mode ? 'is-active' : ''}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Lane Grouping">
          <select
            value={laneGroupingMode}
            onChange={(event) => onSetLaneGroupingMode(event.target.value as LaneGroupingMode)}
            className="ui-input h-9 w-full cursor-pointer px-3 text-xs font-medium"
          >
            <option value="manual">Manual</option>
            <option value="entity">Entity Type</option>
            <option value="regulatory">Regulatory Domain</option>
            <option value="geography">Geography</option>
            <option value="ledger">Ledger Layer</option>
          </select>
        </Field>
      </PanelSection>

      <PanelSection title="Swimlanes" icon={<Layers className="h-3.5 w-3.5" />}>
        <button
          type="button"
          onClick={onToggleSwimlanes}
          aria-pressed={showSwimlanes}
          className={`status-chip ${showSwimlanes ? 'is-active' : ''}`}
        >
          {showSwimlanes ? 'Swimlanes: On' : 'Swimlanes: Off'}
        </button>

        {showSwimlanes ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSwimlaneListOpen((prev) => !prev)}
              className="status-chip"
            >
              {swimlaneListOpen ? 'Hide Lane Labels' : `Lane Labels (${swimlaneLabels.length})`}
            </button>

            {swimlaneListOpen ? (
              <div className="space-y-2">
                {swimlaneLabels.map((label, idx) => (
                  <div key={`swimlane-${idx}`} className="flex items-center gap-2">
                    <span className="w-12 text-[10px] font-semibold uppercase text-slate-500">L{idx + 1}</span>
                    <input
                      value={label}
                      onChange={(event) => onUpdateSwimlaneLabel(idx, event.target.value)}
                      className="ui-input h-8 flex-1 px-2 text-xs"
                    />
                    <button
                      type="button"
                      disabled={swimlaneLabels.length <= 2}
                      onClick={() => onRemoveSwimlane(idx)}
                      className="rounded-md border border-rose-300 px-2 py-1 text-[10px] font-semibold text-rose-600 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <button type="button" onClick={onAddSwimlane} className="status-chip inline-flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Swimlane
            </button>
          </div>
        ) : null}
      </PanelSection>
    </>
  );
};

export default CanvasInspectorSections;
