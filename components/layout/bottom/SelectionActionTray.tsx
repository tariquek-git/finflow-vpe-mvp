import React from 'react';
import {
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartVertical,
  Copy,
  Trash2
} from 'lucide-react';

type SelectionActionTrayProps = {
  anchor: { x: number; y: number } | null;
  selectedNodeCount: number;
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

const actionButtonClass = (isActive = false) => `ff-bottom-btn${isActive ? ' is-active' : ''}`;

const SelectionActionTray: React.FC<SelectionActionTrayProps> = ({
  anchor,
  selectedNodeCount,
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
  const showNodeActions = selectedNodeCount > 0;
  const showArrangeActions = showNodeActions && selectedNodeCount >= 2;
  const showDistribute = showNodeActions && selectedNodeCount >= 3;

  if (!showNodeActions) return null;

  const style = anchor
    ? {
        left: `${anchor.x}px`,
        top: `${Math.max(56, anchor.y - 8)}px`,
        transform: 'translate(-50%, -100%)'
      }
    : {
        left: '50%',
        bottom: '8.8rem',
        transform: 'translateX(-50%)'
      };

  return (
    <div
      data-testid="selection-action-tray"
      className="ff-selection-tray"
      style={style}
      data-canvas-interactive="true"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onDelete}
        title="Delete selected"
        aria-label="Delete selected item"
        className={actionButtonClass()}
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete</span>
      </button>

      <button
        type="button"
        onClick={onDuplicateSelection}
        title="Duplicate selected nodes"
        aria-label="Duplicate selected nodes"
        className={actionButtonClass()}
      >
        <Copy className="h-4 w-4" />
        <span>Duplicate</span>
      </button>

      {selectedNodeCount === 1 ? (
        <>
          <button
            type="button"
            onClick={onRenameSelection}
            title="Rename selected node"
            aria-label="Rename selected node"
            className={actionButtonClass()}
          >
            <span>Rename</span>
          </button>

          <button
            type="button"
            onClick={onToggleQuickAttribute}
            title="Toggle account chip on nodes"
            aria-label="Toggle account chip on nodes"
            className={actionButtonClass(isQuickAttributePinned)}
          >
            <span>{isQuickAttributePinned ? 'Hide Chip' : 'Show Chip'}</span>
          </button>
        </>
      ) : null}

      {showArrangeActions ? (
        <>
          <button
            type="button"
            onClick={onAlignLeft}
            title="Align left"
            aria-label="Align selected left"
            className={actionButtonClass()}
          >
            <AlignStartVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onAlignCenter}
            title="Align center"
            aria-label="Align selected center"
            className={actionButtonClass()}
          >
            <AlignCenterVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onAlignRight}
            title="Align right"
            aria-label="Align selected right"
            className={actionButtonClass()}
          >
            <AlignEndVertical className="h-4 w-4" />
          </button>
        </>
      ) : null}

      {showDistribute ? (
        <button
          type="button"
          onClick={onDistribute}
          title="Distribute horizontally"
          aria-label="Distribute selected horizontally"
          className={actionButtonClass()}
        >
          <AlignHorizontalDistributeCenter className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

export default SelectionActionTray;
