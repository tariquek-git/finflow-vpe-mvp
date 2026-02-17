import React, { useMemo, useState } from 'react';

type ColorPickerProps = {
  fillColor: string;
  borderColor: string;
  onChangeFill: (hex: string) => void;
  onChangeBorder: (hex: string) => void;
  disabled?: boolean;
};

const SWATCHES = ['#ffffff', '#f8fafc', '#0f172a', '#0e7490', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];
const RECENT_STORAGE_KEY = 'finflow-builder.recent-node-colors.v1';

const normalizeHex = (value: string) => {
  if (!value) return '#ffffff';
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#ffffff';
};

const loadRecentColors = (): string[] => {
  try {
    const raw = sessionStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => normalizeHex(entry))
      .slice(0, 8);
  } catch {
    return [];
  }
};

const persistRecentColors = (colors: string[]) => {
  try {
    sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(colors.slice(0, 8)));
  } catch {
    // no-op
  }
};

const ColorPicker: React.FC<ColorPickerProps> = ({
  fillColor,
  borderColor,
  onChangeFill,
  onChangeBorder,
  disabled = false
}) => {
  const [activeTarget, setActiveTarget] = useState<'fill' | 'border'>('fill');
  const [recentColors, setRecentColors] = useState<string[]>(() => loadRecentColors());

  const activeColor = useMemo(
    () => normalizeHex(activeTarget === 'fill' ? fillColor : borderColor),
    [activeTarget, borderColor, fillColor]
  );

  const applyColor = (hex: string) => {
    const normalized = normalizeHex(hex);
    if (activeTarget === 'fill') {
      onChangeFill(normalized);
    } else {
      onChangeBorder(normalized);
    }

    setRecentColors((prev) => {
      const next = [normalized, ...prev.filter((entry) => entry !== normalized)].slice(0, 8);
      persistRecentColors(next);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          aria-pressed={activeTarget === 'fill'}
          onClick={() => setActiveTarget('fill')}
          disabled={disabled}
          className={`status-chip !h-8 !rounded-lg !px-2.5 ${activeTarget === 'fill' ? 'is-active' : ''} ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          Fill
        </button>
        <button
          type="button"
          aria-pressed={activeTarget === 'border'}
          onClick={() => setActiveTarget('border')}
          disabled={disabled}
          className={`status-chip !h-8 !rounded-lg !px-2.5 ${activeTarget === 'border' ? 'is-active' : ''} ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          Border
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={activeColor}
          onChange={(event) => applyColor(event.target.value)}
          aria-label={`${activeTarget} color picker`}
          disabled={disabled}
          className="h-9 w-12 cursor-pointer rounded-md border border-slate-300 bg-transparent p-1 dark:border-slate-600"
        />
        <input
          type="text"
          value={activeColor}
          onChange={(event) => applyColor(event.target.value)}
          aria-label={`${activeTarget} color hex`}
          disabled={disabled}
          className="ui-input inspector-input"
        />
      </div>

      <div>
        <div className="inspector-helper mb-1">Preset swatches</div>
        <div className="flex flex-wrap gap-1.5">
          {SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              title={hex}
              onClick={() => applyColor(hex)}
              disabled={disabled}
              className="h-6 w-6 rounded-full border border-slate-300 transition-transform hover:scale-105 dark:border-slate-600"
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {recentColors.length > 0 ? (
        <div>
          <div className="inspector-helper mb-1">Recent</div>
          <div className="flex flex-wrap gap-1.5">
            {recentColors.map((hex) => (
              <button
                key={`recent-${hex}`}
                type="button"
                title={hex}
                onClick={() => applyColor(hex)}
                disabled={disabled}
                className="h-6 w-6 rounded-full border border-slate-300 transition-transform hover:scale-105 dark:border-slate-600"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(ColorPicker);
