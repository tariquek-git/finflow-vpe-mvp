import {
  Command,
  FileDown,
  FilePlus2,
  FlaskConical,
  FolderOpen,
  Grid3X3,
  ImageDown,
  LayoutPanelLeft,
  Menu,
  Rows3,
  Save,
  Search,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { BackgroundStyle } from '../../core/types';

interface Props {
  search: string;
  onSearchText: (value: string) => void;
  onSearchGo: () => void;
  backgroundMode: BackgroundStyle;
  snapToGrid: boolean;
  darkMode: boolean;
  showSwimlanes: boolean;
  showMiniMap: boolean;
  includeLaneExport: boolean;
  includeBackgroundExport: boolean;
  paletteOpen: boolean;
  onTogglePalette: () => void;
  onNew: () => void;
  onSave: () => void;
  onImport: () => void;
  onSample: () => void;
  onPng: () => void;
  onPdf: () => void;
  onLaneToggle: () => void;
  onLaneManager: () => void;
  onBackground: (mode: BackgroundStyle) => void;
  onSnap: () => void;
  onDark: () => void;
  onMini: () => void;
  onExportLane: () => void;
  onExportBg: () => void;
  onCommandPalette: () => void;
}

const minimalButton =
  'inline-flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';

const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300/80 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

const menuButton =
  'inline-flex w-full items-center justify-between rounded-lg border border-slate-300/70 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

const bgIcons: Record<BackgroundStyle, LucideIcon> = {
  grid: Grid3X3,
  dots: SlidersHorizontal,
  none: Rows3,
};

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className={menuButton}>
      <span>{label}</span>
      <span
        className={
          checked
            ? 'h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_0_3px_rgba(6,182,212,0.18)]'
            : 'h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600'
        }
      />
    </button>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={menuButton} onClick={onClick}>
      <span className="inline-flex items-center gap-1.5">
        <Icon size={13} />
        {label}
      </span>
    </button>
  );
}

export function Toolbar(props: Props) {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(false);
      }
    };

    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onEscape);
    };
  }, [openMenu]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-[min(760px,calc(100vw-2.25rem))]"
    >
      <div className="rounded-2xl border border-slate-300/75 bg-white/92 p-2 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/86">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={props.onTogglePalette}
            className={props.paletteOpen ? 'inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-white' : minimalButton}
          >
            <LayoutPanelLeft size={14} />
            Library
          </button>

          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-300/80 bg-white px-2 dark:border-slate-700 dark:bg-slate-900">
            <Search size={13} className="text-slate-400" />
            <input
              value={props.search}
              onChange={(event) => props.onSearchText(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && props.onSearchGo()}
              placeholder="Find node"
              className="w-32 bg-transparent py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </div>

          <button type="button" onClick={props.onSearchGo} className={iconButton} title="Find">
            <Search size={13} />
          </button>

          <button type="button" onClick={props.onCommandPalette} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            <Command size={13} />
            Commands
          </button>

          <button
            type="button"
            onClick={() => setOpenMenu((value) => !value)}
            className={iconButton}
            title="More"
          >
            <Menu size={14} />
          </button>
        </div>

        {openMenu && (
          <div ref={menuRef} className="mt-2 grid gap-2 rounded-xl border border-slate-300/80 bg-white/95 p-2 dark:border-slate-700 dark:bg-slate-900/95">
            <div className="grid grid-cols-2 gap-1.5">
              <ActionRow icon={FilePlus2} label="New" onClick={props.onNew} />
              <ActionRow icon={Save} label="Save JSON" onClick={props.onSave} />
              <ActionRow icon={FolderOpen} label="Import" onClick={props.onImport} />
              <ActionRow icon={FlaskConical} label="Load Sample" onClick={props.onSample} />
              <ActionRow icon={ImageDown} label="Export PNG" onClick={props.onPng} />
              <ActionRow icon={FileDown} label="Export PDF" onClick={props.onPdf} />
              <ActionRow icon={Rows3} label="Lane Manager" onClick={props.onLaneManager} />
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            <div className="grid grid-cols-2 gap-1.5">
              <ToggleRow label="Dark mode" checked={props.darkMode} onToggle={props.onDark} />
              <ToggleRow label="Swimlanes" checked={props.showSwimlanes} onToggle={props.onLaneToggle} />
              <ToggleRow label="Snap to grid" checked={props.snapToGrid} onToggle={props.onSnap} />
              <ToggleRow label="Mini map" checked={props.showMiniMap} onToggle={props.onMini} />
              <ToggleRow label="Export lanes" checked={props.includeLaneExport} onToggle={props.onExportLane} />
              <ToggleRow
                label="Export background"
                checked={props.includeBackgroundExport}
                onToggle={props.onExportBg}
              />
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            <div className="inline-flex items-center gap-1.5">
              {(['none', 'dots', 'grid'] as BackgroundStyle[]).map((mode) => {
                const Icon = bgIcons[mode];
                const active = props.backgroundMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => props.onBackground(mode)}
                    className={
                      active
                        ? 'inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white'
                        : 'inline-flex items-center gap-1 rounded-lg border border-slate-300/80 bg-white px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }
                  >
                    <Icon size={11} />
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.header>
  );
}
