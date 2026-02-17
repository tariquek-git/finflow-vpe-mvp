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
  zoom: number;
  onSetActiveTool: (tool: ToolMode) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  onSetZoomPercent: (percent: number) => void;
  onAddConnector: () => void;
  onConnectorNativeDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDelete: () => void;
  onDuplicateSelection: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onDistribute: () => void;
  selectedNodeCount: number;
  onRenameSelection: () => void;
  onToggleQuickAttribute: () => void;
  isQuickAttributePinned: boolean;
};

const FloatingContextBar: React.FC<FloatingContextBarProps> = ({
  isDarkMode: _isDarkMode,
  isMobileViewport,
  anchor,
  activeTool,
  zoom,
  onSetActiveTool,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  onFitView,
  onSetZoomPercent,
  onAddConnector,
  onConnectorNativeDragStart,
  onDelete,
  onDuplicateSelection,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onDistribute,
  selectedNodeCount,
  onRenameSelection,
  onToggleQuickAttribute,
  isQuickAttributePinned
}) => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  const visibility = useMemo(() => {
    const hasSelection = selectedNodeCount > 0;
    const canShowSelectionActions = hasSelection && activeTool === 'select';
    const shouldShowDesktopTray = canShowSelectionActions && selectedNodeCount >= 2;

    return {
      showDesktopTray: !isMobileViewport && shouldShowDesktopTray && !!anchor,
      showMobileMore: isMobileViewport && canShowSelectionActions
    };
  }, [activeTool, anchor, isMobileViewport, selectedNodeCount]);

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
        zoom={zoom}
        isMobileViewport={isMobileViewport}
        showMoreButton={visibility.showMobileMore}
        isMoreOpen={isOverflowOpen}
        onSetActiveTool={onSetActiveTool}
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        onResetZoom={onResetZoom}
        onFitView={onFitView}
        onSetZoomPercent={onSetZoomPercent}
        onAddConnector={onAddConnector}
        onConnectorNativeDragStart={onConnectorNativeDragStart}
        onToggleMore={() => setIsOverflowOpen((prev) => !prev)}
      />

      {visibility.showDesktopTray ? (
        <SelectionActionTray
          anchor={anchor}
          selectedNodeCount={selectedNodeCount}
          onDelete={onDelete}
          onDuplicateSelection={onDuplicateSelection}
          onRenameSelection={onRenameSelection}
          onToggleQuickAttribute={onToggleQuickAttribute}
          isQuickAttributePinned={isQuickAttributePinned}
          onAlignLeft={onAlignLeft}
          onAlignCenter={onAlignCenter}
          onAlignRight={onAlignRight}
          onDistribute={onDistribute}
        />
      ) : null}

      {isMobileViewport ? (
        <ActionOverflowSheet
          isOpen={isOverflowOpen}
          selectedNodeCount={selectedNodeCount}
          onClose={() => setIsOverflowOpen(false)}
          onDelete={onDelete}
          onDuplicateSelection={onDuplicateSelection}
          onRenameSelection={onRenameSelection}
          onToggleQuickAttribute={onToggleQuickAttribute}
          isQuickAttributePinned={isQuickAttributePinned}
          onAlignLeft={onAlignLeft}
          onAlignCenter={onAlignCenter}
          onAlignRight={onAlignRight}
          onDistribute={onDistribute}
        />
      ) : null}
    </>
  );
};

export default FloatingContextBar;
