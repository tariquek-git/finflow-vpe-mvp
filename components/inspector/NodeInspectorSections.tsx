import React from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { ChevronDown, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { AccountType, EntityType } from '../../types';
import type { NodeMetaFields } from '../../lib/nodeMeta';

type NodeFormValues = {
  label: string;
  type: EntityType;
  accountType?: AccountType | '';
  description?: string;
  color?: string;
};

type NodeInspectorSectionsProps = {
  register: UseFormRegister<NodeFormValues>;
  setValue: UseFormSetValue<NodeFormValues>;
  selectedNodeColor: string;
  nodeDetailsOpen: boolean;
  onToggleNodeDetails: () => void;
  nodeMeta: NodeMetaFields;
  onNodeMetaChange: (key: keyof NodeMetaFields, value: string) => void;
};

const PRESET_COLORS = [
  { hex: '#020617', label: 'Dark' },
  { hex: '#ffffff', label: 'Light' },
  { hex: '#ef4444', label: 'Danger' },
  { hex: '#10b981', label: 'Success' },
  { hex: '#6366f1', label: 'Indigo' }
];

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

const NodeInspectorSections: React.FC<NodeInspectorSectionsProps> = ({
  register,
  setValue,
  selectedNodeColor,
  nodeDetailsOpen,
  onToggleNodeDetails,
  nodeMeta,
  onNodeMetaChange
}) => {
  return (
    <>
      <PanelSection title="Identity" icon={<Sparkles className="h-3.5 w-3.5" />}>
        <Field label="Node Name">
          <Input {...register('label')} />
        </Field>
        <Field label="Node Type">
          <Select {...register('type')}>
            {Object.values(EntityType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <textarea
            {...register('description')}
            className="ui-input h-24 w-full resize-none p-3 text-xs outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="Operational context and workflow notes..."
          />
        </Field>
      </PanelSection>

      <CollapsibleSection
        title="Financial Attributes"
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        isOpen={nodeDetailsOpen}
        onToggle={onToggleNodeDetails}
        testId="inspector-toggle-node-details"
      >
        <Field label="Account Type">
          <Select {...register('accountType')}>
            <option value="">None / Off-Ledger</option>
            {Object.values(AccountType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Custody Holder">
            <Input
              value={nodeMeta.custodyHolder}
              onChange={(event) => onNodeMetaChange('custodyHolder', event.target.value)}
              placeholder="e.g. Sponsor Bank"
            />
          </Field>
          <Field label="Ledger Type">
            <Select
              value={nodeMeta.ledgerType}
              onChange={(event) => onNodeMetaChange('ledgerType', event.target.value)}
            >
              <option value="">Not set</option>
              <option value="Real-time">Real-time</option>
              <option value="Batch">Batch</option>
            </Select>
          </Field>
          <Field label="Balance Model">
            <Select
              value={nodeMeta.balanceModel}
              onChange={(event) => onNodeMetaChange('balanceModel', event.target.value)}
            >
              <option value="">Not set</option>
              <option value="Omnibus">Omnibus</option>
              <option value="Subledger">Subledger</option>
            </Select>
          </Field>
          <Field label="Posting Timing">
            <Input
              value={nodeMeta.postingTiming}
              onChange={(event) => onNodeMetaChange('postingTiming', event.target.value)}
              placeholder="e.g. T+0"
            />
          </Field>
        </div>

        <Field label="Color">
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() =>
                  setValue('color', color.hex, {
                    shouldDirty: true,
                    shouldValidate: true
                  })
                }
                title={color.label}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  selectedNodeColor === color.hex ? 'scale-110 border-blue-500 shadow-lg' : 'border-transparent'
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </Field>
      </CollapsibleSection>

      <CollapsibleSection
        title="Compliance"
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        isOpen={true}
        onToggle={() => {
          // intentionally static-open for current UX pass
        }}
      >
        <div className="grid grid-cols-1 gap-2">
          <Field label="KYC Owner">
            <Input
              value={nodeMeta.kycOwner}
              onChange={(event) => onNodeMetaChange('kycOwner', event.target.value)}
              placeholder="Team or provider"
            />
          </Field>
          <Field label="AML Monitoring">
            <Input
              value={nodeMeta.amlMonitoring}
              onChange={(event) => onNodeMetaChange('amlMonitoring', event.target.value)}
              placeholder="Rule set or platform"
            />
          </Field>
          <Field label="Fraud Controls">
            <Input
              value={nodeMeta.fraudControls}
              onChange={(event) => onNodeMetaChange('fraudControls', event.target.value)}
              placeholder="Scoring / thresholds"
            />
          </Field>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Metadata"
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        isOpen={true}
        onToggle={() => {
          // intentionally static-open for current UX pass
        }}
      >
        <Field label="Tags">
          <Input
            value={nodeMeta.tags}
            onChange={(event) => onNodeMetaChange('tags', event.target.value)}
            placeholder="comma,separated,tags"
          />
        </Field>
        <Field label="External References">
          <Input
            value={nodeMeta.externalRefs}
            onChange={(event) => onNodeMetaChange('externalRefs', event.target.value)}
            placeholder="ticket IDs, doc links"
          />
        </Field>
      </CollapsibleSection>
    </>
  );
};

export default NodeInspectorSections;
