import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowRightLeft, Copy, Divide, Minus, MoreHorizontal, Trash2, X } from 'lucide-react';

type ActionOverflowSheetProps = {
  isOpen: boolean;
  selectedNodeCount: number;
  hasSelectedEdge: boolean;
  activeEdgeStyle: 'solid' | 'dashed' | 'dotted';
  arrowHeadEnabled: boolean;
  midArrowEnabled: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDuplicateSelection: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onDistribute: () => void;
  onSetEdgeStyle: (style: 'solid' | 'dashed' | 'dotted') => void;
  onToggleArrowHead: () => void;
  onToggleMidArrow: () => void;
};

const overflowButtonClass = (isActive = false) => `ff-overflow-btn${isActive ? ' is-active' : ''}`;
const EXIT_DURATION_MS = 180;

const edgeStyleOptions: Array<{
  id: 'solid' | 'dashed' | 'dotted';
  icon: React.ReactNode;
  title: string;
}> = [
  { id: 'solid', icon: <Minus className="h-4 w-4" />, title: 'solid line style' },
  { id: 'dashed', icon: <Divide className="h-4 w-4 rotate-90" />, title: 'dashed line style' },
  { id: 'dotted', icon: <MoreHorizontal className="h-4 w-4" />, title: 'dotted line style' }
];

const ActionOverflowSheet: React.FC<ActionOverflowSheetProps> = ({
  isOpen,
  selectedNodeCount,
  hasSelectedEdge,
  activeEdgeStyle,
  arrowHeadEnabled,
  midArrowEnabled,
  onClose,
  onDelete,
  onDuplicateSelection,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onDistribute,
  onSetEdgeStyle,
  onToggleArrowHead,
  onToggleMidArrow
}) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, EXIT_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const focusable = sheetRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])');
    focusable?.focus();
  }, [isOpen]);

  if (!isMounted) return null;

  const showEdgeActions = hasSelectedEdge;
  const showNodeActions = !hasSelectedEdge && selectedNodeCount > 0;
  const showArrangeActions = showNodeActions && selectedNodeCount >= 2;
  const showDistribute = showNodeActions && selectedNodeCount >= 3;

  const handleTrapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const container = sheetRef.current;
    if (!container) return;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    }
  };

  return (
    <div className="ff-overflow-shell">
      <button
        type="button"
        className="ff-overflow-backdrop"
        onClick={onClose}
        aria-label="Close action menu"
      />

      <div
        ref={sheetRef}
        data-testid="bottom-overflow-sheet"
        data-open={isOpen ? 'true' : 'false'}
        className="ff-overflow-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Selection actions"
        onKeyDown={handleTrapFocus}
      >
        <div className="ff-overflow-head">
          <div>
            <div className="ui-section-title">Quick Actions</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {showEdgeActions ? 'Connector styling and direction controls' : 'Selection edit and layout controls'}
            </div>
          </div>
          <button type="button" onClick={onClose} className={overflowButtonClass()} aria-label="Close actions">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="ff-overflow-grid">
          {showNodeActions ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                title="Delete selected"
                aria-label="Delete selected item"
                className={overflowButtonClass()}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDuplicateSelection();
                  onClose();
                }}
                title="Duplicate selected nodes"
                aria-label="Duplicate selected nodes"
                className={overflowButtonClass()}
              >
                <Copy className="h-4 w-4" />
                <span>Duplicate</span>
              </button>

              {showArrangeActions ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onAlignLeft();
                      onClose();
                    }}
                    title="Align left"
                    aria-label="Align selected left"
                    className={overflowButtonClass()}
                  >
                    <span>L</span>
                    <span>Align Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAlignCenter();
                      onClose();
                    }}
                    title="Align center"
                    aria-label="Align selected center"
                    className={overflowButtonClass()}
                  >
                    <span>C</span>
                    <span>Align Center</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAlignRight();
                      onClose();
                    }}
                    title="Align right"
                    aria-label="Align selected right"
                    className={overflowButtonClass()}
                  >
                    <span>R</span>
                    <span>Align Right</span>
                  </button>
                </>
              ) : null}

              {showDistribute ? (
                <button
                  type="button"
                  onClick={() => {
                    onDistribute();
                    onClose();
                  }}
                  title="Distribute horizontally"
                  aria-label="Distribute selected horizontally"
                  className={overflowButtonClass()}
                >
                  <span>Dist</span>
                  <span>Distribute</span>
                </button>
              ) : null}
            </>
          ) : null}

          {showEdgeActions ? (
            <>
              {edgeStyleOptions.map((styleOption) => (
                <button
                  key={styleOption.id}
                  type="button"
                  onClick={() => onSetEdgeStyle(styleOption.id)}
                  title={styleOption.title}
                  aria-label={styleOption.title}
                  aria-pressed={activeEdgeStyle === styleOption.id}
                  className={overflowButtonClass(activeEdgeStyle === styleOption.id)}
                >
                  {styleOption.icon}
                  <span>{styleOption.id}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={onToggleArrowHead}
                aria-pressed={arrowHeadEnabled}
                title="Toggle arrow head"
                aria-label="Toggle arrow head"
                className={overflowButtonClass(arrowHeadEnabled)}
              >
                <ArrowRight className="h-4 w-4" />
                <span>Arrow Head</span>
              </button>
              <button
                type="button"
                onClick={onToggleMidArrow}
                aria-pressed={midArrowEnabled}
                title="Toggle middle arrow"
                aria-label="Toggle middle arrow"
                className={overflowButtonClass(midArrowEnabled)}
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Mid Arrow</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                title="Delete selected"
                aria-label="Delete selected item"
                className={overflowButtonClass()}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ActionOverflowSheet;
