import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartVertical,
  Copy,
  Trash2,
  X
} from 'lucide-react';

type ActionOverflowSheetProps = {
  isOpen: boolean;
  selectedNodeCount: number;
  onClose: () => void;
  onDelete: () => void;
  onDuplicateSelection: () => void;
  onRenameSelection: () => void;
  onToggleQuickAttribute: () => void;
  isQuickAttributePinned: boolean;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onDistribute: () => void;
};

const overflowButtonClass = (isActive = false) => `ff-overflow-btn${isActive ? ' is-active' : ''}`;
const EXIT_DURATION_MS = 180;

const ActionOverflowSheet: React.FC<ActionOverflowSheetProps> = ({
  isOpen,
  selectedNodeCount,
  onClose,
  onDelete,
  onDuplicateSelection,
  onRenameSelection,
  onToggleQuickAttribute,
  isQuickAttributePinned,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onDistribute
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

  const showNodeActions = selectedNodeCount > 0;
  const showArrangeActions = showNodeActions && selectedNodeCount >= 2;
  const showDistribute = showNodeActions && selectedNodeCount >= 3;
  const shellPointerEvents = isOpen ? 'auto' : 'none';

  const handleTrapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const container = sheetRef.current;
    if (!container) return;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
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
    <div className="ff-overflow-shell" style={{ pointerEvents: shellPointerEvents }}>
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
        style={{ pointerEvents: shellPointerEvents }}
      >
        <div className="ff-overflow-head">
          <div>
            <div className="ui-section-title">Quick Actions</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Selection controls
            </div>
          </div>
          <button type="button" onClick={onClose} className={overflowButtonClass()} aria-label="Close actions">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="ff-overflow-grid">
          {showNodeActions ? (
            <>
              <div className="col-span-full menu-section-label !px-1.5">Edit</div>
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

              {selectedNodeCount === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onRenameSelection();
                      onClose();
                    }}
                    title="Rename selected node"
                    aria-label="Rename selected node"
                    className={overflowButtonClass()}
                  >
                    <span>Rename</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleQuickAttribute();
                      onClose();
                    }}
                    title="Toggle account chip on nodes"
                    aria-label="Toggle account chip on nodes"
                    className={overflowButtonClass(isQuickAttributePinned)}
                  >
                    <span>{isQuickAttributePinned ? 'Hide Chip' : 'Show Chip'}</span>
                  </button>
                </>
              ) : null}

              {showArrangeActions ? (
                <>
                  <div className="col-span-full menu-section-label !px-1.5">Arrange</div>
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
                    <AlignStartVertical className="h-4 w-4" />
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
                    <AlignCenterVertical className="h-4 w-4" />
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
                    <AlignEndVertical className="h-4 w-4" />
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
                  <AlignHorizontalDistributeCenter className="h-4 w-4" />
                  <span>Distribute</span>
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ActionOverflowSheet;
