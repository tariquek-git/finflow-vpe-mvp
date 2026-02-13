import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { ChevronDown, ChevronRight, Landmark, ShieldCheck, Sparkles, Tags } from 'lucide-react';
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
  { hex: '#0f172a', label: 'Slate' },
  { hex: '#ffffff', label: 'White' },
  { hex: '#0e7490', label: 'Cyan' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#10b981', label: 'Green' }
];

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
}> = ({ title, icon, isOpen, onToggle, children, testId }) => (
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
        <div className="inspector-body pt-2.5">{children}</div>
      </div>
    </div>
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
  const [complianceOpen, setComplianceOpen] = useState(true);
  const [metadataOpen, setMetadataOpen] = useState(true);

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
            className="ui-input inspector-textarea"
            placeholder="Operational context and workflow notes..."
          />
        </Field>
      </PanelSection>

      <CollapsibleSection
        title="Financial Attributes"
        icon={<Landmark className="h-3.5 w-3.5" />}
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
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
                  selectedNodeColor === color.hex ? 'scale-110 border-cyan-500 shadow-lg' : 'border-transparent'
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
        isOpen={complianceOpen}
        onToggle={() => setComplianceOpen((prev) => !prev)}
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
        icon={<Tags className="h-3.5 w-3.5" />}
        isOpen={metadataOpen}
        onToggle={() => setMetadataOpen((prev) => !prev)}
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
