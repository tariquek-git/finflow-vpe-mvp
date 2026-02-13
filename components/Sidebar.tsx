import React, { useMemo, useState } from 'react';
import { EntityType, OverlayMode } from '../types';
import { ENTITY_ICONS } from '../constants';
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeftRightEllipsis,
  Search,
  ShieldAlert,
  Sparkles,
  Wallet
} from 'lucide-react';

interface SidebarProps {
  onAddNode: (type: EntityType) => void;
  isDarkMode: boolean;
  overlayMode: OverlayMode;
  onToggleRiskOverlay: () => void;
  onToggleLedgerOverlay: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

type LibrarySection = {
  key: string;
  title: string;
  types: EntityType[];
};

const LIBRARY_SECTIONS: LibrarySection[] = [
  {
    key: 'institutions',
    title: 'Institutions',
    types: [
      EntityType.SPONSOR_BANK,
      EntityType.ISSUING_BANK,
      EntityType.ACQUIRING_BANK,
      EntityType.CENTRAL_BANK,
      EntityType.CREDIT_UNION,
      EntityType.CORRESPONDENT_BANK
    ]
  },
  {
    key: 'intermediaries',
    title: 'Intermediaries',
    types: [
      EntityType.PROGRAM_MANAGER,
      EntityType.PROCESSOR,
      EntityType.GATEWAY,
      EntityType.NETWORK,
      EntityType.SWITCH,
      EntityType.WALLET_PROVIDER
    ]
  },
  {
    key: 'treasury',
    title: 'Treasury & Controls',
    types: [EntityType.GATE, EntityType.LIQUIDITY_PROVIDER]
  },
  {
    key: 'endpoints',
    title: 'End Points',
    types: [EntityType.END_POINT, EntityType.TEXT_BOX, EntityType.ANCHOR]
  }
];

const TOTAL_LIBRARY_COUNT = LIBRARY_SECTIONS.reduce((count, section) => count + section.types.length, 0);

const getShortLabel = (type: EntityType) =>
  type
    .replace(' Bank', '')
    .replace(' Provider', '')
    .replace(' Point', '')
    .replace(' / ', '/');

const Sidebar = React.memo<SidebarProps>(({
  onAddNode,
  isDarkMode,
  overlayMode,
  onToggleRiskOverlay,
  onToggleLedgerOverlay,
  isExpanded,
  onToggleExpanded
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    institutions: true,
    intermediaries: true,
    treasury: true,
    endpoints: true
  });
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();

  const sections = useMemo(() => {
    return LIBRARY_SECTIONS.map((section) => {
      if (!normalizedQuery) return { ...section, filteredTypes: section.types };
      return {
        ...section,
        filteredTypes: section.types.filter((type) =>
          getShortLabel(type).toLowerCase().includes(normalizedQuery)
        )
      };
    }).filter((section) => section.filteredTypes.length > 0);
  }, [normalizedQuery]);

  const totalVisibleBlocks = sections.reduce((acc, section) => acc + section.filteredTypes.length, 0);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onDragStartShape = (event: React.DragEvent, type: EntityType) => {
    event.dataTransfer.setData('application/finflow/type', type);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const renderShapeButton = (type: EntityType) => (
    <button
      key={type}
      draggable
      onDragStart={(event) => onDragStartShape(event, type)}
      onClick={() => onAddNode(type)}
      className={`group flex min-h-[64px] cursor-grab items-start gap-2 rounded-xl border px-2 py-1.5 text-left transition-all duration-150 active:cursor-grabbing ${
        isDarkMode
          ? 'border-slate-800 bg-slate-900/80 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-slate-800/95'
          : 'border-slate-200/80 bg-white/92 hover:-translate-y-0.5 hover:border-cyan-300/80 hover:bg-cyan-50/35'
      }`}
      title={`Drag ${type} to canvas`}
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
        }`}
      >
        {ENTITY_ICONS[type]}
      </div>
      <span
        className={`line-clamp-2 text-[11px] font-semibold leading-tight ${
          isDarkMode ? 'text-slate-200' : 'text-slate-700'
        }`}
      >
        {getShortLabel(type)}
      </span>
    </button>
  );

  const riskEnabled = overlayMode === 'risk' || overlayMode === 'both';
  const ledgerEnabled = overlayMode === 'ledger' || overlayMode === 'both';

  const overlayButtonClasses = (enabled: boolean) =>
    `status-chip h-8 justify-center ${enabled ? 'is-active' : ''}`;

  return (
    <div className={`flex h-full ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
      {isExpanded ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className={`space-y-2.5 border-b px-3 py-3 ${isDarkMode ? 'border-slate-700/70' : 'border-slate-200/70'}`}>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                aria-pressed={isExpanded}
                onClick={onToggleExpanded}
                className="status-chip h-8 px-2.5"
                title="Collapse library"
                aria-label="Collapse library"
              >
                <ChevronsLeftRightEllipsis className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="toolbar-toggle-risk-overlay"
                  onClick={onToggleRiskOverlay}
                  aria-pressed={riskEnabled}
                  className={`${overlayButtonClasses(riskEnabled)} w-9`}
                  title="Toggle risk overlay"
                  aria-label="Toggle risk overlay"
                >
                  <ShieldAlert className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  data-testid="toolbar-toggle-ledger-overlay"
                  onClick={onToggleLedgerOverlay}
                  aria-pressed={ledgerEnabled}
                  className={`${overlayButtonClasses(ledgerEnabled)} w-9`}
                  title="Toggle ledger overlay"
                  aria-label="Toggle ledger overlay"
                >
                  <Wallet className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                <span className="ui-section-title">Node Library</span>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalVisibleBlocks}/{TOTAL_LIBRARY_COUNT}
              </span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search node types..."
                className={`ui-input h-8 w-full pl-8 pr-2 text-xs outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 ${
                  isDarkMode ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'
                }`}
              />
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400">Click to add or drag to place on canvas.</p>
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 py-2">
            {sections.length === 0 ? (
              <div
                className={`rounded-xl border px-3 py-4 text-center text-xs ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-900 text-slate-400'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                No matching blocks for "{query}".
              </div>
            ) : (
              <div className="space-y-2.5">
                {sections.map((section) => (
                  <div
                    key={section.key}
                    className={`overflow-hidden rounded-2xl border transition-colors ${
                      isDarkMode ? 'border-slate-800/60 bg-slate-900/62' : 'border-slate-200/65 bg-white/94'
                    }`}
                  >
                    <button
                      onClick={() => toggleSection(section.key)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        isDarkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-600 hover:bg-slate-50/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {openSections[section.key] ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        {section.title}
                      </span>
                      <span className="text-[10px] normal-case tracking-normal opacity-75">
                        {section.filteredTypes.length}
                      </span>
                    </button>

                    {openSections[section.key] ? (
                      <div className={`grid grid-cols-2 gap-2 p-2`}>
                        {section.filteredTypes.map(renderShapeButton)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <aside
          className={`flex w-full flex-col items-center gap-1.5 px-1.5 py-2 ${
            isDarkMode ? 'bg-slate-950/85' : 'bg-slate-50/90'
          }`}
        >
          <button
            type="button"
            aria-pressed={isExpanded}
            onClick={onToggleExpanded}
            className="status-chip h-8 w-full justify-center"
            title="Expand library"
            aria-label="Expand library"
          >
            <ChevronsLeftRightEllipsis className="h-4 w-4" />
          </button>

          <div className={`my-0.5 h-px w-7 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

          <button
            type="button"
            data-testid="toolbar-toggle-risk-overlay"
            onClick={onToggleRiskOverlay}
            aria-pressed={riskEnabled}
            className={`${overlayButtonClasses(riskEnabled)} w-full`}
            title="Toggle risk overlay"
            aria-label="Toggle risk overlay"
          >
            <ShieldAlert className="h-4 w-4" />
          </button>

          <button
            type="button"
            data-testid="toolbar-toggle-ledger-overlay"
            onClick={onToggleLedgerOverlay}
            aria-pressed={ledgerEnabled}
            className={`${overlayButtonClasses(ledgerEnabled)} w-full`}
            title="Toggle ledger overlay"
            aria-label="Toggle ledger overlay"
          >
            <Wallet className="h-4 w-4" />
          </button>
        </aside>
      )}
    </div>
  );
});

export default Sidebar;
