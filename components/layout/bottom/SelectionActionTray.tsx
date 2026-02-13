import React from 'react';
import { ArrowRight, ArrowRightLeft, Copy, Divide, MoreHorizontal, Trash2, Minus } from 'lucide-react';

type SelectionActionTrayProps = {
  anchor: { x: number; y: number } | null;
  selectedNodeCount: number;
  hasSelectedEdge: boolean;
  activeEdgeStyle: 'solid' | 'dashed' | 'dotted';
  arrowHeadEnabled: boolean;
  midArrowEnabled: boolean;
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

const actionButtonClass = (isActive = false) => `ff-bottom-btn${isActive ? ' is-active' : ''}`;

const edgeStyleOptions: Array<{
  id: 'solid' | 'dashed' | 'dotted';
  icon: React.ReactNode;
  title: string;
}> = [
  { id: 'solid', icon: <Minus className="h-4 w-4" />, title: 'solid line style' },
  { id: 'dashed', icon: <Divide className="h-4 w-4 rotate-90" />, title: 'dashed line style' },
  { id: 'dotted', icon: <MoreHorizontal className="h-4 w-4" />, title: 'dotted line style' }
];

const SelectionActionTray: React.FC<SelectionActionTrayProps> = ({
  anchor,
  selectedNodeCount,
  hasSelectedEdge,
  activeEdgeStyle,
  arrowHeadEnabled,
  midArrowEnabled,
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
  const showEdgeActions = hasSelectedEdge;
  const showNodeActions = !hasSelectedEdge && selectedNodeCount > 0;
  const showArrangeActions = showNodeActions && selectedNodeCount >= 2;
  const showDistribute = showNodeActions && selectedNodeCount >= 3;

  if (!showEdgeActions && !showNodeActions) return null;

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
    <div data-testid="selection-action-tray" className="ff-selection-tray" style={style}>
      {showNodeActions ? (
        <>
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

          {showArrangeActions ? (
            <>
              <button
                type="button"
                onClick={onAlignLeft}
                title="Align left"
                aria-label="Align selected left"
                className={actionButtonClass()}
              >
                L
              </button>
              <button
                type="button"
                onClick={onAlignCenter}
                title="Align center"
                aria-label="Align selected center"
                className={actionButtonClass()}
              >
                C
              </button>
              <button
                type="button"
                onClick={onAlignRight}
                title="Align right"
                aria-label="Align selected right"
                className={actionButtonClass()}
              >
                R
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
              Dist
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
              className={actionButtonClass(activeEdgeStyle === styleOption.id)}
            >
              {styleOption.icon}
            </button>
          ))}

          <button
            type="button"
            onClick={onToggleArrowHead}
            aria-pressed={arrowHeadEnabled}
            title="Toggle arrow head"
            aria-label="Toggle arrow head"
            className={actionButtonClass(arrowHeadEnabled)}
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleMidArrow}
            aria-pressed={midArrowEnabled}
            title="Toggle middle arrow"
            aria-label="Toggle middle arrow"
            className={actionButtonClass(midArrowEnabled)}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>

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
        </>
      ) : null}
    </div>
  );
};

export default SelectionActionTray;
