import React, { useEffect, useMemo, useState } from 'react';
import type { ToolMode } from '../../types';
import ActionOverflowSheet from './bottom/ActionOverflowSheet';
import BottomToolDock from './bottom/BottomToolDock';
import SelectionActionTray from './bottom/SelectionActionTray';

type FloatingContextBarProps = {
  isDarkMode: boolean;
  isMobileViewport: boolean;
  anchor: { x: number; y: number } | null;
  activeTool: ToolMode;
  onSetActiveTool: (tool: ToolMode) => void;
  onAutoConnectEdge: () => void;
  onAddConnector: () => void;
  onConnectorNativeDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDelete: () => void;
  onDuplicateSelection: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onDistribute: () => void;
  selectedNodeCount: number;
  hasSelectedEdge: boolean;
  activeEdgeStyle: 'solid' | 'dashed' | 'dotted';
  onSetEdgeStyle: (style: 'solid' | 'dashed' | 'dotted') => void;
  arrowHeadEnabled: boolean;
  midArrowEnabled: boolean;
  onToggleArrowHead: () => void;
  onToggleMidArrow: () => void;
};

const FloatingContextBar: React.FC<FloatingContextBarProps> = ({
  isDarkMode: _isDarkMode,
  isMobileViewport,
  anchor,
  activeTool,
  onSetActiveTool,
  onAutoConnectEdge,
  onAddConnector,
  onConnectorNativeDragStart,
  onDelete,
  onDuplicateSelection,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onDistribute,
  selectedNodeCount,
  hasSelectedEdge,
  activeEdgeStyle,
  onSetEdgeStyle,
  arrowHeadEnabled,
  midArrowEnabled,
  onToggleArrowHead,
  onToggleMidArrow
}) => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  const visibility = useMemo(() => {
    const hasSelection = selectedNodeCount > 0 || hasSelectedEdge;
    const canShowSelectionActions = hasSelection && activeTool === 'select';

    return {
      showDesktopTray: !isMobileViewport && canShowSelectionActions && !!anchor,
      showMobileMore: isMobileViewport && canShowSelectionActions
    };
  }, [activeTool, anchor, hasSelectedEdge, isMobileViewport, selectedNodeCount]);

  useEffect(() => {
    if (!visibility.showMobileMore && isOverflowOpen) {
      setIsOverflowOpen(false);
    }
  }, [isOverflowOpen, visibility.showMobileMore]);

  useEffect(() => {
    if (!isMobileViewport && isOverflowOpen) {
      setIsOverflowOpen(false);
    }
  }, [isMobileViewport, isOverflowOpen]);

  return (
    <>
      <BottomToolDock
        activeTool={activeTool}
        isMobileViewport={isMobileViewport}
        showMoreButton={visibility.showMobileMore}
        isMoreOpen={isOverflowOpen}
        onSetActiveTool={onSetActiveTool}
        onAutoConnectEdge={onAutoConnectEdge}
        onAddConnector={onAddConnector}
        onConnectorNativeDragStart={onConnectorNativeDragStart}
        onToggleMore={() => setIsOverflowOpen((prev) => !prev)}
      />

      {visibility.showDesktopTray ? (
        <SelectionActionTray
          anchor={anchor}
          selectedNodeCount={selectedNodeCount}
          hasSelectedEdge={hasSelectedEdge}
          activeEdgeStyle={activeEdgeStyle}
          arrowHeadEnabled={arrowHeadEnabled}
          midArrowEnabled={midArrowEnabled}
          onDelete={onDelete}
          onDuplicateSelection={onDuplicateSelection}
          onAlignLeft={onAlignLeft}
          onAlignCenter={onAlignCenter}
          onAlignRight={onAlignRight}
          onDistribute={onDistribute}
          onSetEdgeStyle={onSetEdgeStyle}
          onToggleArrowHead={onToggleArrowHead}
          onToggleMidArrow={onToggleMidArrow}
        />
      ) : null}

      {isMobileViewport ? (
        <ActionOverflowSheet
          isOpen={isOverflowOpen}
          selectedNodeCount={selectedNodeCount}
          hasSelectedEdge={hasSelectedEdge}
          activeEdgeStyle={activeEdgeStyle}
          arrowHeadEnabled={arrowHeadEnabled}
          midArrowEnabled={midArrowEnabled}
          onClose={() => setIsOverflowOpen(false)}
          onDelete={onDelete}
          onDuplicateSelection={onDuplicateSelection}
          onAlignLeft={onAlignLeft}
          onAlignCenter={onAlignCenter}
          onAlignRight={onAlignRight}
          onDistribute={onDistribute}
          onSetEdgeStyle={onSetEdgeStyle}
          onToggleArrowHead={onToggleArrowHead}
          onToggleMidArrow={onToggleMidArrow}
        />
      ) : null}
    </>
  );
};

export default FloatingContextBar;
