import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export type CommandAction = {
  id: string;
  label: string;
  shortcut?: string;
  keywords?: string[];
  onSelect: () => void;
};

type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
  isDarkMode: boolean;
};

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, actions, isDarkMode }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return actions;
    return actions.filter((action) => {
      const haystack = [action.label, ...(action.keywords || [])].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }, [actions, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(raf);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const handleRunAction = (action: CommandAction) => {
    action.onSelect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[145] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        data-testid="command-palette"
        className={`relative z-10 w-full max-w-xl rounded-2xl border p-3 shadow-2xl ${
          isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
        }`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
            return;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((prev) => Math.min(filteredActions.length - 1, prev + 1));
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((prev) => Math.max(0, prev - 1));
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            const action = filteredActions[activeIndex];
            if (action) {
              handleRunAction(action);
            }
          }
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Command</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Run editor actions quickly.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="ui-icon-button !h-8 !w-8 !min-h-0 !min-w-0 !p-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a command..."
            className="ui-input h-8 w-full pl-8 pr-2 text-[13px]"
          />
        </label>

        <div className="mt-2 max-h-[52vh] overflow-y-auto rounded-xl border border-slate-200/70 p-1 dark:border-slate-700/70">
          {filteredActions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-500">No commands found.</div>
          ) : (
            <ul className="space-y-0.5" role="listbox" aria-label="Available commands">
              {filteredActions.map((action, index) => {
                const isActive = index === activeIndex;
                return (
                  <li key={action.id}>
                    <button
                      type="button"
                      data-testid={`command-action-${action.id}`}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleRunAction(action)}
                      className={`flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-left text-[12px] font-medium transition-colors ${
                        isActive
                          ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-900/35 dark:text-cyan-200'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{action.label}</span>
                      {action.shortcut ? <span className="ui-kbd-hint">{action.shortcut}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
