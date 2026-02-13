import React from 'react';
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Download,
  FileImage,
  FileText,
  HelpCircle,
  Import,
  LayoutPanelLeft,
  Moon,
  RotateCcw,
  RotateCw,
  Rows3,
  Settings2,
  Sun,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

type TopBarProps = {
  isDarkMode: boolean;
  nodesCount: number;
  edgesCount: number;
  backupStatusText: string;
  hasRecoverySnapshot: boolean;
  recoveryLastSavedAt: string | null;
  feedbackHref: string;
  storageWarning: string | null;
  isSidebarOpen: boolean;
  isInspectorOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isAIEnabled: boolean;
  isAILoading: boolean;
  onToggleSidebar: () => void;
  onToggleInspector: () => void;
  onToggleTheme: () => void;
  onOpenHelp: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenCanvasControls: () => void;
  onOpenAiLauncher: () => void;
  onRestoreRecovery: () => void;
  onResetCanvas: () => void;
  onImportDiagram: () => void;
  onExportDiagram: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
};

const actionButton = (isDarkMode: boolean) =>
  `tap-target shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
    isDarkMode
      ? 'border-slate-700 bg-slate-900/85 text-slate-200 hover:bg-slate-800'
      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
  }`;

const TopBar: React.FC<TopBarProps> = ({
  isDarkMode,
  nodesCount,
  edgesCount,
  backupStatusText,
  hasRecoverySnapshot,
  recoveryLastSavedAt,
  feedbackHref,
  storageWarning,
  isSidebarOpen,
  isInspectorOpen,
  canUndo,
  canRedo,
  isAIEnabled,
  isAILoading,
  onToggleSidebar,
  onToggleInspector,
  onToggleTheme,
  onOpenHelp,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onOpenCanvasControls,
  onOpenAiLauncher,
  onRestoreRecovery,
  onResetCanvas,
  onImportDiagram,
  onExportDiagram,
  onExportSvg,
  onExportPng,
  onExportPdf
}) => {
  return (
    <header
      className={`ff-topbar glass-panel z-50 mx-2 mt-2 flex shrink-0 flex-col gap-2 rounded-2xl border px-3 py-2.5 md:mx-3 md:px-4 ${
        isDarkMode ? 'border-slate-700 bg-slate-950/88' : 'border-slate-200 bg-white/88'
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-cyan-600 text-sm font-bold text-white shadow-[0_8px_20px_rgba(15,23,42,0.22)]">
            FF
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">Flow of Funds Studio</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Fintech Diagram Workspace
            </p>
          </div>
          <span
            className={`mono hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold xl:inline-flex ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {nodesCount} nodes • {edgesCount} edges
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-pressed={isSidebarOpen}
            className={`${actionButton(isDarkMode)} lg:hidden`}
          >
            <LayoutPanelLeft className="h-3.5 w-3.5" />
            {isSidebarOpen ? 'Hide Library' : 'Library'}
          </button>

          <button
            type="button"
            onClick={onToggleInspector}
            aria-pressed={isInspectorOpen}
            className={`${actionButton(isDarkMode)} lg:hidden`}
          >
            <Rows3 className="h-3.5 w-3.5" />
            {isInspectorOpen ? 'Hide Inspect' : 'Inspect'}
          </button>

          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/80 p-1 dark:border-slate-700/80">
            <button
              type="button"
              title="Undo"
              aria-label="Undo"
              onClick={onUndo}
              disabled={!canUndo}
              className={actionButton(isDarkMode)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Redo"
              aria-label="Redo"
              onClick={onRedo}
              disabled={!canRedo}
              className={actionButton(isDarkMode)}
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className={actionButton(isDarkMode)}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span className="hidden xl:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            onClick={onZoomOut}
            className={actionButton(isDarkMode)}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            className={actionButton(isDarkMode)}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenCanvasControls}
            className={actionButton(isDarkMode)}
            title="Open layout controls"
            aria-label="Open layout controls"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Canvas</span>
          </button>

          <details className="relative shrink-0">
            <summary
              className={`${actionButton(isDarkMode)} list-none cursor-pointer`}
              title="System status"
              aria-label="System status"
            >
              <span className="hidden xl:inline">System</span>
              <span
                data-testid="backup-status-indicator"
                data-last-saved-at={recoveryLastSavedAt || ''}
                className={`rounded-full px-2 py-0.5 ${
                  hasRecoverySnapshot
                    ? isDarkMode
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-emerald-100 text-emerald-700'
                    : isDarkMode
                      ? 'bg-amber-500/20 text-amber-200'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {backupStatusText}
              </span>
              {!isAIEnabled ? (
                <span
                  data-testid="ai-disabled-badge"
                  className={`rounded-full border px-2 py-0.5 ${
                    isDarkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-300'
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  AI off
                </span>
              ) : null}
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </summary>
            <div
              className={`absolute right-0 z-40 mt-1.5 flex min-w-[14rem] flex-col gap-1.5 rounded-xl border p-2 shadow-xl ${
                isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
              }`}
            >
              {!isAIEnabled ? (
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">AI disabled for MVP</div>
              ) : null}
              {storageWarning ? (
                <span
                  role="status"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isDarkMode ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-100 text-amber-700'
                  }`}
                  title={storageWarning}
                >
                  <AlertTriangle className="h-3 w-3" /> Autosave issue
                </span>
              ) : null}
              <a
                href={feedbackHref}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  isDarkMode
                    ? 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                    : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                }`}
              >
                Feedback
              </a>
            </div>
          </details>

          <button
            type="button"
            data-testid="toolbar-help-open"
            onClick={onOpenHelp}
            className={actionButton(isDarkMode)}
            title="Open quick start help ( ? )"
            aria-label="Open quick start help"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Help</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <div
          className="flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar lg:w-auto lg:justify-end lg:overflow-visible"
          data-testid="primary-actions-strip"
        >
          <span className="ui-section-title shrink-0 px-1">Primary Actions</span>

          <button
            type="button"
            data-testid="toolbar-restore"
            onClick={onRestoreRecovery}
            className={actionButton(isDarkMode)}
            title="Restore backup"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore Backup
          </button>

          <button
            type="button"
            data-testid="toolbar-reset-canvas"
            onClick={onResetCanvas}
            className="tap-target shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30"
            title="Reset canvas"
          >
            Reset
          </button>

          <button
            type="button"
            data-testid="toolbar-import-json"
            onClick={onImportDiagram}
            className={actionButton(isDarkMode)}
            title="Import JSON"
          >
            <Import className="h-3.5 w-3.5" />
            Import JSON
          </button>

          <button
            type="button"
            data-testid="toolbar-export-json"
            onClick={onExportDiagram}
            className="ui-button-primary tap-target shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-1.5 px-2.5 text-[11px] font-semibold"
            title="Export JSON"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </button>

          <details className="relative shrink-0">
            <summary className={`${actionButton(isDarkMode)} list-none cursor-pointer`} title="Export options">
              <Download className="h-3.5 w-3.5" />
              More
            </summary>
            <div
              className={`absolute right-0 z-40 mt-1.5 flex min-w-[11rem] flex-col gap-1 rounded-xl border p-1.5 shadow-xl ${
                isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                data-testid="toolbar-export-svg"
                onClick={onExportSvg}
                className="ui-button-secondary inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold"
              >
                <Download className="h-3.5 w-3.5" /> Export SVG
              </button>
              <button
                type="button"
                data-testid="toolbar-export-png"
                onClick={onExportPng}
                className="ui-button-secondary inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold"
              >
                <FileImage className="h-3.5 w-3.5" /> Export PNG
              </button>
              <button
                type="button"
                data-testid="toolbar-export-pdf"
                onClick={onExportPdf}
                className="ui-button-secondary inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold"
              >
                <FileText className="h-3.5 w-3.5" /> Export PDF
              </button>
            </div>
          </details>

          {isAIEnabled ? (
            <button
              type="button"
              data-testid="toolbar-open-ai-launcher"
              onClick={onOpenAiLauncher}
              className={`${actionButton(isDarkMode)} ${isAILoading ? 'animate-pulse' : ''}`}
              title="Open AI flow generator"
            >
              <Bot className="h-3.5 w-3.5" />
              AI
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
