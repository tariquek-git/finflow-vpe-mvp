import React, { useMemo, useState } from 'react';
import { EntityType } from '../types';
import { ENTITY_ICONS } from '../constants';
import { ChevronDown, ChevronRight, Grid, Search } from 'lucide-react';

interface SidebarProps {
  onAddNode: (type: EntityType) => void;
  isDarkMode: boolean;
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
    title: 'Treasury & Tools',
    types: [EntityType.GATE, EntityType.LIQUIDITY_PROVIDER]
  },
  {
    key: 'endpoints',
    title: 'End Points',
    types: [EntityType.END_POINT, EntityType.TEXT_BOX, EntityType.ANCHOR]
  }
];

const getShortLabel = (type: EntityType) =>
  type
    .replace(' Bank', '')
    .replace(' Provider', '')
    .replace(' Point', '')
    .replace(' / ', '/');

const Sidebar = React.memo<SidebarProps>(({ onAddNode, isDarkMode }) => {
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

  const createDragGhost = (label: string) => {
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    ghost.style.padding = '8px 12px';
    ghost.style.borderRadius = '10px';
    ghost.style.border = '1px solid rgba(99, 102, 241, 0.45)';
    ghost.style.background = isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.86)';
    ghost.style.backdropFilter = 'blur(10px)';
    ghost.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.16)';
    ghost.style.fontSize = '12px';
    ghost.style.fontWeight = '600';
    ghost.style.color = isDarkMode ? '#e2e8f0' : '#0f172a';
    ghost.style.opacity = '0.78';
    ghost.textContent = label;
    document.body.appendChild(ghost);
    return ghost;
  };

  const onDragStartShape = (event: React.DragEvent, type: EntityType) => {
    event.dataTransfer.setData('application/finflow/type', type);
    event.dataTransfer.effectAllowed = 'copy';
    const ghost = createDragGhost(getShortLabel(type));
    event.dataTransfer.setDragImage(ghost, 16, 16);
    window.setTimeout(() => {
      if (ghost.parentNode) {
        ghost.parentNode.removeChild(ghost);
      }
    }, 0);
  };

  const renderShapeButton = (type: EntityType) => (
    <button
      key={type}
      draggable
      onDragStart={(e) => onDragStartShape(e, type)}
      onClick={() => onAddNode(type)}
      className="ff-surface-card ff-focus group flex aspect-square min-h-[4.5rem] cursor-grab flex-col items-center justify-center p-2 text-center transition-all duration-200 active:cursor-grabbing hover:-translate-y-[1px] hover:border-indigo-400/70"
      title={`Drag ${type} to canvas`}
    >
      <div className="ff-panel-muted mb-1.5 flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border-1)]">
        {ENTITY_ICONS[type]}
      </div>
      <span className="line-clamp-2 text-[10px] font-medium leading-tight text-[var(--color-text-secondary)]">
        {getShortLabel(type)}
      </span>
    </button>
  );

  return (
    <div className="flex h-full flex-col text-[var(--color-text-primary)]">
      <div className="ff-soft-divider space-y-3 border-b px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4 text-[var(--color-accent-1)]" />
            <span className="ff-shell-section-title">
              Component Library
            </span>
          </div>
          <span className="ff-chip">
            {totalVisibleBlocks}
          </span>
        </div>
        <p className="ff-shell-section-note">
          Drag a block onto the canvas, or click to insert near the viewport center.
        </p>

        <div className="relative">
          <Search className="ff-muted-text pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search blocks..."
            className="ff-input ff-focus h-9 w-full pl-8 pr-2 text-xs outline-none"
          />
        </div>
      </div>

      <div className="ff-scrollbar-thin flex-1 overflow-y-auto p-3">
        {sections.length === 0 ? (
          <div className="ff-panel-muted ff-muted-text px-3 py-4 text-center text-xs">
            No matching blocks.
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.key} className="ff-surface-card overflow-hidden border">
                <button
                  onClick={() => toggleSection(section.key)}
                  aria-expanded={!!openSections[section.key]}
                  aria-controls={`library-section-${section.key}`}
                  className={`ff-focus flex w-full items-center justify-between px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                    openSections[section.key]
                      ? 'bg-[color:var(--color-surface-3)] text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[color:var(--color-surface-3)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {openSections[section.key] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    {section.title}
                  </span>
                  <span className="ff-chip text-[10px] normal-case tracking-normal">
                    {section.filteredTypes.length}
                  </span>
                </button>

                {openSections[section.key] && (
                  <div
                    id={`library-section-${section.key}`}
                    className="ff-soft-divider grid grid-cols-3 gap-1.5 border-t bg-[color:var(--color-surface-2)] p-2"
                  >
                    {section.filteredTypes.map(renderShapeButton)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default Sidebar;
