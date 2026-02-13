import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

type InsertConnectorButtonProps = {
  onClick: () => void;
  onNativeDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
};

const InsertConnectorButton: React.FC<InsertConnectorButtonProps> = ({ onClick, onNativeDragStart }) => {
  return (
    <button
      type="button"
      draggable
      data-testid="toolbar-insert-connector"
      onClick={onClick}
      onDragStart={onNativeDragStart}
      className="toolbar-chip"
      aria-label="Insert connector"
      title="Insert connector (click or drag)"
    >
      <ArrowRightLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Connector</span>
    </button>
  );
};

export default InsertConnectorButton;
