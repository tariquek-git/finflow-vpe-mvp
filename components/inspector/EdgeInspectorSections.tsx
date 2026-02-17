import React from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { PaymentRail } from '../../types';

type EdgeFormValues = {
  label: string;
  flowType:
    | ''
    | 'authorization'
    | 'clearing'
    | 'settlement'
    | 'funding'
    | 'fee'
    | 'dispute'
    | 'refund'
    | 'reconciliation'
    | 'other';
  flowTypeCustom?: string;
  timingPreset: '' | 'realtime' | 'batch' | 'T+1' | 'T+2' | 'other';
  timingCustom?: string;
  rail: PaymentRail | '';
  railCustom?: string;
  notes?: string;
  style: 'solid' | 'dashed' | 'dotted';
  pathType: 'bezier' | 'orthogonal';
  thickness: number;
  showArrowHead: boolean;
  showMidArrow: boolean;
};

type EdgeInspectorSectionsProps = {
  register: UseFormRegister<EdgeFormValues>;
  setValue: UseFormSetValue<EdgeFormValues>;
  values: EdgeFormValues;
  onResetEdgeSection?: () => void;
  onResetStylingSection?: () => void;
  onNotesBlur?: () => void;
};

const FLOW_TYPE_OPTIONS: Array<{ value: EdgeFormValues['flowType']; label: string }> = [
  { value: '', label: 'Not specified' },
  { value: 'authorization', label: 'Authorization' },
  { value: 'clearing', label: 'Clearing' },
  { value: 'settlement', label: 'Settlement' },
  { value: 'funding', label: 'Funding' },
  { value: 'fee', label: 'Fee' },
  { value: 'dispute', label: 'Dispute' },
  { value: 'refund', label: 'Refund' },
  { value: 'reconciliation', label: 'Reconciliation' },
  { value: 'other', label: 'Other' }
];

const TIMING_OPTIONS: Array<{ value: EdgeFormValues['timingPreset']; label: string }> = [
  { value: '', label: 'Not specified' },
  { value: 'realtime', label: 'Realtime' },
  { value: 'batch', label: 'Batch' },
  { value: 'T+1', label: 'T+1' },
  { value: 'T+2', label: 'T+2' },
  { value: 'other', label: 'Other' }
];

const RAIL_OPTIONS = Object.values(PaymentRail)
  .filter((rail) => rail !== '')
  .map((rail) => ({ value: rail, label: rail })) as Array<{ value: PaymentRail; label: string }>;

const AI_SUGGESTIONS: Array<{
  id: string;
  label: string;
  flowType: EdgeFormValues['flowType'];
  timingPreset: EdgeFormValues['timingPreset'];
  rail?: PaymentRail | '';
}> = [
  { id: 'auth-realtime', label: 'AI suggested: Auth + realtime', flowType: 'authorization', timingPreset: 'realtime', rail: PaymentRail.CARD_NETWORK },
  { id: 'clearing-batch', label: 'AI suggested: Clearing + batch', flowType: 'clearing', timingPreset: 'batch', rail: PaymentRail.ACH },
  { id: 'settlement-t1', label: 'AI suggested: Settlement + T+1', flowType: 'settlement', timingPreset: 'T+1', rail: PaymentRail.WIRE }
];

const toggleClass = (enabled: boolean) =>
  `status-chip !h-7 !px-2.5 ${enabled ? 'is-active' : ''}`;

const styleButtonClass = (enabled: boolean) =>
  `status-chip !h-7 !px-2.5 ${enabled ? 'is-active' : ''}`;

const EdgeInspectorSections: React.FC<EdgeInspectorSectionsProps> = ({
  register,
  setValue,
  values,
  onResetEdgeSection,
  onResetStylingSection,
  onNotesBlur
}) => {
  const notesField = register('notes');
  const showCustomType = values.flowType === 'other';
  const showCustomTiming = values.timingPreset === 'other';

  const applySuggestion = (suggestion: (typeof AI_SUGGESTIONS)[number]) => {
    setValue('flowType', suggestion.flowType, { shouldDirty: true, shouldValidate: true });
    setValue('timingPreset', suggestion.timingPreset, { shouldDirty: true, shouldValidate: true });
    if (suggestion.rail) {
      setValue('rail', suggestion.rail, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <div className="space-y-3">
      <section className="inspector-section">
        <div className="inspector-section-head">
          <h3 className="ui-section-title">Edge Properties</h3>
          {onResetEdgeSection ? (
            <button
              type="button"
              onClick={onResetEdgeSection}
              className="status-chip !h-6 !px-2 !text-[10px]"
            >
              Reset edge
            </button>
          ) : null}
        </div>
        <div className="inspector-body space-y-2.5 pt-2.5">
          <div className="inspector-field">
            <label className="inspector-label" htmlFor="edge-field-label">
              Label
            </label>
            <input id="edge-field-label" className="ui-input inspector-input" {...register('label')} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="inspector-field">
              <label className="inspector-label" htmlFor="edge-field-flow-type">
                Type
              </label>
              <select
                id="edge-field-flow-type"
                className="ui-input inspector-input inspector-select"
                {...register('flowType')}
              >
                {FLOW_TYPE_OPTIONS.map((option) => (
                  <option key={option.value || 'blank'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="inspector-field">
              <label className="inspector-label" htmlFor="edge-field-timing">
                Timing
              </label>
              <select
                id="edge-field-timing"
                className="ui-input inspector-input inspector-select"
                {...register('timingPreset')}
              >
                {TIMING_OPTIONS.map((option) => (
                  <option key={option.value || 'blank'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showCustomType ? (
            <div className="inspector-field">
              <label className="inspector-label" htmlFor="edge-field-type-custom">
                Type (custom)
              </label>
              <input
                id="edge-field-type-custom"
                className="ui-input inspector-input"
                placeholder="Describe the edge type"
                {...register('flowTypeCustom')}
              />
            </div>
          ) : null}

          {showCustomTiming ? (
            <div className="inspector-field">
              <label className="inspector-label" htmlFor="edge-field-timing-custom">
                Timing (custom)
              </label>
              <input
                id="edge-field-timing-custom"
                className="ui-input inspector-input"
                placeholder="Example: intra-day net 15m"
                {...register('timingCustom')}
              />
            </div>
          ) : null}

          <div className="inspector-field">
            <label className="inspector-label" htmlFor="edge-field-rail">
              Rail / Instrument
            </label>
            <select
              id="edge-field-rail"
              className="ui-input inspector-input inspector-select"
              {...register('rail')}
            >
              <option value="">Not specified</option>
              {RAIL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="inspector-field">
            <label className="inspector-label" htmlFor="edge-field-rail-custom">
              Instrument (custom)
            </label>
            <input
              id="edge-field-rail-custom"
              className="ui-input inspector-input"
              placeholder="Optional custom rail"
              {...register('railCustom')}
            />
          </div>

          <div className="inspector-field">
            <label className="inspector-label" htmlFor="edge-field-notes">
              Notes
            </label>
            <textarea
              id="edge-field-notes"
              {...notesField}
              onBlur={(event) => {
                notesField.onBlur(event);
                onNotesBlur?.();
              }}
              className="ui-input inspector-textarea"
              placeholder="Operational notes"
            />
          </div>
        </div>
      </section>

      <section className="inspector-section">
        <div className="inspector-section-head">
          <h3 className="ui-section-title">Styling</h3>
          {onResetStylingSection ? (
            <button
              type="button"
              onClick={onResetStylingSection}
              className="status-chip !h-6 !px-2 !text-[10px]"
            >
              Reset styling
            </button>
          ) : null}
        </div>
        <div className="inspector-body space-y-2.5 pt-2.5">
          <div className="inspector-field">
            <label className="inspector-label" htmlFor="edge-field-thickness">
              Thickness ({values.thickness}px)
            </label>
            <input
              id="edge-field-thickness"
              type="range"
              min={1}
              max={6}
              step={1}
              value={values.thickness}
              onChange={(event) =>
                setValue('thickness', Number(event.target.value), {
                  shouldDirty: true,
                  shouldValidate: true
                })
              }
              className="w-full"
            />
          </div>

          <div className="inspector-field">
            <span className="inspector-label">Line style</span>
            <div className="flex flex-wrap gap-1.5">
              {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  className={styleButtonClass(values.style === style)}
                  onClick={() => setValue('style', style, { shouldDirty: true, shouldValidate: true })}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="inspector-field">
            <span className="inspector-label">Path</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={styleButtonClass(values.pathType === 'bezier')}
                onClick={() =>
                  setValue('pathType', 'bezier', { shouldDirty: true, shouldValidate: true })
                }
              >
                Curved
              </button>
              <button
                type="button"
                className={styleButtonClass(values.pathType === 'orthogonal')}
                onClick={() =>
                  setValue('pathType', 'orthogonal', { shouldDirty: true, shouldValidate: true })
                }
              >
                Straight
              </button>
            </div>
          </div>

          <div className="inspector-field">
            <span className="inspector-label">Arrowheads</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={toggleClass(!values.showArrowHead && !values.showMidArrow)}
                onClick={() => {
                  setValue('showArrowHead', false, { shouldDirty: true, shouldValidate: true });
                  setValue('showMidArrow', false, { shouldDirty: true, shouldValidate: true });
                }}
              >
                None
              </button>
              <button
                type="button"
                className={toggleClass(values.showArrowHead && !values.showMidArrow)}
                onClick={() => {
                  setValue('showArrowHead', true, { shouldDirty: true, shouldValidate: true });
                  setValue('showMidArrow', false, { shouldDirty: true, shouldValidate: true });
                }}
              >
                End
              </button>
              <button
                type="button"
                className={toggleClass(!values.showArrowHead && values.showMidArrow)}
                onClick={() => {
                  setValue('showArrowHead', false, { shouldDirty: true, shouldValidate: true });
                  setValue('showMidArrow', true, { shouldDirty: true, shouldValidate: true });
                }}
              >
                Mid
              </button>
              <button
                type="button"
                className={toggleClass(values.showArrowHead && values.showMidArrow)}
                onClick={() => {
                  setValue('showArrowHead', true, { shouldDirty: true, shouldValidate: true });
                  setValue('showMidArrow', true, { shouldDirty: true, shouldValidate: true });
                }}
              >
                Both
              </button>
            </div>
          </div>

        </div>
      </section>

      <section className="inspector-section">
        <div className="inspector-section-head">
          <h3 className="ui-section-title">AI Suggestions</h3>
        </div>
        <div className="inspector-body pt-2.5">
          <div className="flex flex-wrap gap-1.5">
            {AI_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="status-chip !h-7 !px-2.5"
                onClick={() => applySuggestion(suggestion)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {suggestion.label}
              </button>
            ))}
          </div>
          <p className="inspector-helper mt-2">AI suggested values never auto-apply. Click a chip to apply.</p>
        </div>
      </section>
    </div>
  );
};

export default EdgeInspectorSections;
