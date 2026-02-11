import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Eye,
  FileDown,
  FileUp,
  File,
  Grid2X2,
  Moon,
  PanelTop,
  Save,
  Search,
  Sparkles,
  Sun,
  Workflow,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BackgroundMode, LayoutDirection } from '../../types';

interface Props {
  search: string;
  backgroundMode: BackgroundMode;
  darkMode: boolean;
  snapToGrid: boolean;
  layoutDirection: LayoutDirection;
  showSwimlanes: boolean;
  showMiniMap: boolean;
  exportIncludeSwimlanes: boolean;
  exportIncludeBackground: boolean;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onNew: () => void;
  onSaveJson: () => void;
  onImportJson: () => void;
  onLoadSample: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onAutoLayout: () => void;
  onSetLayoutDirection: (direction: LayoutDirection) => void;
  onOpenLaneManager: () => void;
  onToggleSwimlanes: () => void;
  onSetBackground: (mode: BackgroundMode) => void;
  onToggleSnap: () => void;
  onToggleDark: () => void;
  onToggleMiniMap: () => void;
  onToggleExportLanes: () => void;
  onToggleExportBackground: () => void;
}

function ToolbarButton({
  label,
  onClick,
  active = false,
  disabled = false,
  icon,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? 'inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
          : disabled
            ? 'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
            : 'inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
      }
    >
      {icon}
      {label}
    </button>
  );
}

export function TopBar(props: Props) {
  const [viewOpen, setViewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setViewOpen(false);
        setExportOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <header
      ref={containerRef}
      className="border-b border-slate-200 bg-slate-50/95 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/95"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton
          label="Undo"
          onClick={props.onUndo}
          disabled={!props.canUndo}
          icon={<ArrowLeft size={13} />}
        />
        <ToolbarButton
          label="Redo"
          onClick={props.onRedo}
          disabled={!props.canRedo}
          icon={<ArrowRight size={13} />}
        />
        <ToolbarButton label="New" onClick={props.onNew} icon={<File size={13} />} />
        <ToolbarButton label="Save JSON" onClick={props.onSaveJson} icon={<Save size={13} />} />
        <ToolbarButton label="Import JSON" onClick={props.onImportJson} icon={<FileUp size={13} />} />
        <ToolbarButton label="Load Sample" onClick={props.onLoadSample} icon={<Sparkles size={13} />} />
        <ToolbarButton label="Auto Layout" onClick={props.onAutoLayout} icon={<Workflow size={13} />} />
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
          {(['LR', 'TB'] as LayoutDirection[]).map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() => props.onSetLayoutDirection(direction)}
              className={
                props.layoutDirection === direction
                  ? 'inline-flex items-center gap-1 bg-blue-500 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white'
                  : 'inline-flex items-center gap-1 bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }
            >
              {direction === 'LR' ? <ArrowRightLeft size={11} /> : <ArrowDownUp size={11} />}
              {direction}
            </button>
          ))}
        </div>

        <div className="mx-1 h-6 w-px bg-slate-300 dark:bg-slate-700" />

        <div className="relative">
          <ToolbarButton
            label="View"
            onClick={() => {
              setViewOpen((current) => !current);
              setExportOpen(false);
            }}
            active={viewOpen}
            icon={<Eye size={13} />}
          />
          {viewOpen && (
            <div className="absolute left-0 top-9 z-30 w-64 rounded-xl border border-slate-300 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={props.onToggleSwimlanes}
                className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Swimlanes</span>
                <span>{props.showSwimlanes ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  props.onOpenLaneManager();
                  setViewOpen(false);
                }}
                className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Lanes</span>
                <PanelTop size={12} />
              </button>
              <button
                type="button"
                onClick={props.onToggleMiniMap}
                className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>MiniMap</span>
                <span>{props.showMiniMap ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={props.onToggleSnap}
                className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Snap</span>
                <span>{props.snapToGrid ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={props.onToggleDark}
                className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>{props.darkMode ? 'Light mode' : 'Dark mode'}</span>
                {props.darkMode ? <Sun size={12} /> : <Moon size={12} />}
              </button>

              <div className="rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Background
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(['grid', 'dots', 'none'] as BackgroundMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => props.onSetBackground(mode)}
                      className={
                        props.backgroundMode === mode
                          ? 'rounded-md bg-blue-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white'
                          : 'rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }
                    >
                      {mode === 'grid' ? (
                        <Grid2X2 size={11} className="mx-auto mb-0.5" />
                      ) : mode === 'dots' ? (
                        <span className="mb-0.5 block text-center text-xs">:</span>
                      ) : (
                        <span className="mb-0.5 block text-center text-xs">-</span>
                      )}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <ToolbarButton
            label="Export"
            onClick={() => {
              setExportOpen((current) => !current);
              setViewOpen(false);
            }}
            active={exportOpen}
            icon={<FileDown size={13} />}
          />
          {exportOpen && (
            <div className="absolute left-0 top-9 z-30 w-60 rounded-xl border border-slate-300 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <label className="mb-1 flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                <span>Include swimlanes</span>
                <input type="checkbox" checked={props.exportIncludeSwimlanes} onChange={props.onToggleExportLanes} />
              </label>
              <label className="mb-2 flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                <span>Include background</span>
                <input type="checkbox" checked={props.exportIncludeBackground} onChange={props.onToggleExportBackground} />
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    props.onExportPng();
                    setExportOpen(false);
                  }}
                  className="rounded-md bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Export PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    props.onExportPdf();
                    setExportOpen(false);
                  }}
                  className="rounded-md bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Export PDF
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-900">
          <Search size={13} className="text-slate-400" />
          <input
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && props.onSearch()}
            placeholder="Search by displayName"
            className="w-44 bg-transparent py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
          <button
            type="button"
            onClick={props.onSearch}
            className="rounded-md bg-blue-500 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-600"
          >
            Find
          </button>
        </div>
      </div>
    </header>
  );
}
