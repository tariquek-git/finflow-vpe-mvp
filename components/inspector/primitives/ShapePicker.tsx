import React from 'react';
import { Circle, Diamond, RectangleHorizontal, RectangleVertical, Pill } from 'lucide-react';
import { NodeShape } from '../../../types';

type ShapePickerProps = {
  value: NodeShape;
  onChange: (next: NodeShape) => void;
  disabled?: boolean;
};

const shapeOptions: Array<{ id: NodeShape; label: string; icon: React.ReactNode }> = [
  { id: NodeShape.RECTANGLE, label: 'Rectangle', icon: <RectangleHorizontal className="h-4 w-4" /> },
  {
    id: NodeShape.ROUNDED_RECTANGLE,
    label: 'Rounded rectangle',
    icon: <RectangleHorizontal className="h-4 w-4" />
  },
  { id: NodeShape.SQUARE, label: 'Square', icon: <RectangleVertical className="h-4 w-4" /> },
  { id: NodeShape.CIRCLE, label: 'Circle', icon: <Circle className="h-4 w-4" /> },
  { id: NodeShape.DIAMOND, label: 'Diamond', icon: <Diamond className="h-4 w-4" /> },
  { id: NodeShape.PILL, label: 'Pill', icon: <Pill className="h-4 w-4" /> }
];

const ShapePicker: React.FC<ShapePickerProps> = ({ value, onChange, disabled = false }) => {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {shapeOptions.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-label={option.label}
            title={option.label}
            aria-pressed={active}
            disabled={disabled}
            className={`status-chip !h-8 !justify-start !gap-1.5 !rounded-lg !px-2 !text-[10px] ${active ? 'is-active' : ''} ${
              disabled ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(ShapePicker);
