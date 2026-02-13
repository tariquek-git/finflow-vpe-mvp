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

const Field: React.FC<{ label: string; helper?: string; children?: React.ReactNode }> = ({ label, helper, children }) => (
  <div className="flex flex-col gap-1">
    <label className="ml-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-slate-400">
      {label}
    </label>
    {children}
    {helper ? <span className="ml-0.5 text-[10px] text-slate-500 dark:text-slate-400">{helper}</span> : null}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="ui-input h-9 w-full px-3 text-xs font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="ui-input h-9 w-full cursor-pointer appearance-none px-3 text-xs font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
  >
    {props.children}
  </select>
);

const PanelSection: React.FC<{ title: string; icon: React.ReactNode; children?: React.ReactNode }> = ({
  title,
  icon,
  children
}) => (
  <section className="mb-3 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
    <div className="mb-2 flex items-center gap-2 border-b border-slate-200 px-1 pb-1 dark:border-slate-700">
      <div className="text-blue-600 dark:text-blue-300">{icon}</div>
      <h3 className="ui-section-title">{title}</h3>
    </div>
    <div className="space-y-2.5 px-1">{children}</div>
  </section>
);

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  testId?: string;
}> = ({ title, icon, isOpen, onToggle, children, testId }) => (
  <section className="mb-3 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
    <button
      type="button"
      onClick={onToggle}
      data-testid={testId}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-2 border-b border-slate-200 px-1 pb-1 dark:border-slate-700"
    >
      <span className="flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-300">{icon}</span>
        <span className="ui-section-title">{title}</span>
      </span>
      {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
    </button>
    {isOpen ? <div className="space-y-2.5 px-1 pt-2.5">{children}</div> : null}
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
      >
        <Field label="Sequence">
          <Input type="number" min="0" {...register('sequence', { valueAsNumber: true })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setValue('isFX', !edgeIsFX, { shouldDirty: true, shouldValidate: true })}
            className={`rounded-md border px-3 py-2 text-[10px] font-semibold uppercase transition-all ${
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
            className={`rounded-md border px-3 py-2 text-[10px] font-semibold uppercase transition-all ${
              edgeIsExceptionPath
                ? 'bg-rose-500 border-rose-600 text-white shadow-md'
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
            className="ui-input h-24 w-full resize-none p-3 text-xs outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="Settlement rules, risk, data exchanged..."
          />
        </Field>
      </CollapsibleSection>
    </>
  );
};

export default EdgeInspectorSections;
