import React from 'react';

type ToggleRowProps = {
  label: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  helper?: string;
  disabled?: boolean;
};

const ToggleRow: React.FC<ToggleRowProps> = ({ label, enabled, onToggle, helper, disabled = false }) => {
  return (
    <div className="inspector-field">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inspector-label">{label}</div>
          {helper ? <div className="inspector-helper mt-0.5">{helper}</div> : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={label}
          disabled={disabled}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
            enabled
              ? 'border-cyan-500 bg-cyan-500/25 dark:border-cyan-400 dark:bg-cyan-400/30'
              : 'border-slate-300 bg-slate-200/80 dark:border-slate-600 dark:bg-slate-700/80'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform dark:bg-slate-100 ${
              enabled ? 'translate-x-[22px]' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default React.memo(ToggleRow);
