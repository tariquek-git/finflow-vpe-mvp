import React from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { ChevronDown, ChevronRight, FileJson, ListOrdered } from 'lucide-react';
import { FlowDirection, PaymentRail, ReconciliationMethod, TimingType } from '../../types';

type EdgeFormValues = {
  label: string;
  rail: PaymentRail;
  direction: FlowDirection;
  timing?: string;
  amount?: string;
  currency?: string;
  sequence: number;
  isFX: boolean;
  isExceptionPath: boolean;
  fxPair?: string;
  recoMethod: ReconciliationMethod;
  dataSchema?: string;
  description?: string;
};

type EdgeInspectorSectionsProps = {
  register: UseFormRegister<EdgeFormValues>;
  setValue: UseFormSetValue<EdgeFormValues>;
  edgeIsFX: boolean;
  edgeIsExceptionPath: boolean;
  edgeAdvancedOpen: boolean;
  onToggleEdgeAdvanced: () => void;
};

const FIELD_HELPERS: Record<string, string> = {
  direction: 'Use Push/Pull/Settlement to describe how value or messages move.',
  rail: 'Select the operating network or rail for this connection.',
  timing: 'Capture settlement cadence or SLA window for this flow.'
};

const mergeClasses = (...classNames: Array<string | undefined>) => classNames.filter(Boolean).join(' ');

const Field: React.FC<{ label: string; helper?: string; children?: React.ReactNode }> = ({ label, helper, children }) => (
  <div className="inspector-field">
    <label className="inspector-label">{label}</label>
    {children}
    {helper ? <span className="inspector-helper">{helper}</span> : null}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input {...props} className={mergeClasses('ui-input inspector-input', className)} />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, ...props }) => (
  <select {...props} className={mergeClasses('ui-input inspector-input inspector-select', className)}>
    {props.children}
  </select>
);

const PanelSection: React.FC<{ title: string; icon: React.ReactNode; children?: React.ReactNode }> = ({
  title,
  icon,
  children
}) => (
  <section className="inspector-section">
    <div className="inspector-section-head">
      <div className="text-cyan-600 dark:text-cyan-300">{icon}</div>
      <h3 className="ui-section-title">{title}</h3>
    </div>
    <div className="inspector-body">{children}</div>
  </section>
);

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  testId?: string;
  bodyClassName?: string;
}> = ({ title, icon, isOpen, onToggle, children, testId, bodyClassName }) => (
  <section className="inspector-section">
    <button
      type="button"
      onClick={onToggle}
      data-testid={testId}
      aria-expanded={isOpen}
      className="inspector-toggle inspector-section-head"
    >
      <span className="flex items-center gap-2">
        <span className="text-cyan-600 dark:text-cyan-300">{icon}</span>
        <span className="ui-section-title">{title}</span>
      </span>
      {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
    </button>
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">
        <div className={bodyClassName || 'inspector-body pt-2.5'}>{children}</div>
      </div>
    </div>
  </section>
);

const EdgeInspectorSections: React.FC<EdgeInspectorSectionsProps> = ({
  register,
  setValue,
  edgeIsFX,
  edgeIsExceptionPath,
  edgeAdvancedOpen,
  onToggleEdgeAdvanced
}) => {
  return (
    <>
      <PanelSection title="Flow" icon={<ListOrdered className="h-3.5 w-3.5" />}>
        <Field label="Label">
          <Input {...register('label')} />
        </Field>
        <Field label="Rail" helper={FIELD_HELPERS.rail}>
          <Select {...register('rail')}>
            <option value="">Generic Path</option>
            {Object.values(PaymentRail)
              .filter((rail) => rail !== '')
              .map((rail) => (
                <option key={rail} value={rail}>
                  {rail}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Direction" helper={FIELD_HELPERS.direction}>
          <Select {...register('direction')}>
            {Object.values(FlowDirection).map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Settlement Timing" helper={FIELD_HELPERS.timing}>
          <Select {...register('timing')}>
            <option value="">Undetermined</option>
            {Object.values(TimingType).map((timing) => (
              <option key={timing} value={timing}>
                {timing}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <Input {...register('amount')} placeholder="0.00" />
          </Field>
          <Field label="Currency">
            <Input {...register('currency')} placeholder="USD" />
          </Field>
        </div>
      </PanelSection>

      <CollapsibleSection
        title="Advanced Details"
        icon={<FileJson className="h-3.5 w-3.5" />}
        isOpen={edgeAdvancedOpen}
        onToggle={onToggleEdgeAdvanced}
        testId="inspector-toggle-edge-advanced"
        bodyClassName="inspector-body pt-2.5 min-h-[680px]"
      >
        <Field label="Sequence">
          <Input type="number" min="0" {...register('sequence', { valueAsNumber: true })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setValue('isFX', !edgeIsFX, { shouldDirty: true, shouldValidate: true })}
            className={`rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] transition-all ${
              edgeIsFX
                ? 'border-emerald-600 bg-emerald-500 text-white shadow-md'
                : 'border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            FX
          </button>
          <button
            type="button"
            onClick={() =>
              setValue('isExceptionPath', !edgeIsExceptionPath, {
                shouldDirty: true,
                shouldValidate: true
              })
            }
            className={`rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] transition-all ${
              edgeIsExceptionPath
                ? 'border-rose-600 bg-rose-500 text-white shadow-md'
                : 'border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            Exception
          </button>
        </div>
        {edgeIsFX ? (
          <Field label="FX Pair">
            <Input {...register('fxPair')} placeholder="USD/EUR" />
          </Field>
        ) : null}
        <Field label="Reconciliation">
          <Select {...register('recoMethod')}>
            {Object.values(ReconciliationMethod).map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data Schema">
          <Input {...register('dataSchema')} placeholder="e.g. ISO 20022" />
        </Field>
        <Field label="Notes">
          <textarea
            {...register('description')}
            className="ui-input inspector-textarea"
            placeholder="Settlement rules, risk, data exchanged..."
          />
        </Field>
      </CollapsibleSection>
    </>
  );
};

export default EdgeInspectorSections;
