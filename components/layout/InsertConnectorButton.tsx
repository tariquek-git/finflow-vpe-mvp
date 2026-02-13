import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

type InsertConnectorButtonProps = {
  onClick: () => void;
  onNativeDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  className?: string;
  showLabel?: boolean;
};

const InsertConnectorButton: React.FC<InsertConnectorButtonProps> = ({
  onClick,
  onNativeDragStart,
  className = 'toolbar-chip',
  showLabel = true
}) => {
  return (
    <button
      type="button"
      draggable
      data-testid="toolbar-insert-connector"
      onClick={onClick}
      onDragStart={onNativeDragStart}
      className={className}
      aria-label="Insert connector"
      title="Insert connector (click or drag)"
    >
      <ArrowRightLeft className="h-4 w-4" />
      {showLabel ? <span className="hidden sm:inline">Connector</span> : null}
    </button>
  );
};

export default InsertConnectorButton;
