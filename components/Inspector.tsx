import React, { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Node,
  Edge,
  EntityType,
  PaymentRail,
  TimingType,
  AccountType,
  FlowDirection,
  ReconciliationMethod,
  GridMode
} from '../types';
import {
  X,
  DollarSign,
  MousePointer2,
  FileJson,
  ShieldCheck,
  Zap,
  Repeat,
  ListOrdered
} from 'lucide-react';

interface InspectorProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onUpdateNode: (node: Node) => void;
  onUpdateEdge: (edge: Edge) => void;
  isDarkMode: boolean;
  canvasSettings: {
    snapToGrid: boolean;
    showPorts: boolean;
    showSwimlanes: boolean;
    gridMode: GridMode;
  };
  onToggleSnapToGrid: () => void;
  onToggleShowPorts: () => void;
  onToggleShowSwimlanes: () => void;
  onSetGridMode: (mode: GridMode) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { hex: '#020617', label: 'Dark' },
  { hex: '#ffffff', label: 'Light' },
  { hex: '#ef4444', label: 'Danger' },
  { hex: '#10b981', label: 'Success' },
  { hex: '#6366f1', label: 'Indigo' }
];

const nodeSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(120),
  type: z.nativeEnum(EntityType),
  accountType: z.union([z.nativeEnum(AccountType), z.literal('')]).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().optional()
});

const edgeSchema = z.object({
  label: z.string().trim().max(120),
  rail: z.nativeEnum(PaymentRail),
  direction: z.nativeEnum(FlowDirection),
  timing: z.string().optional(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  sequence: z.number().int().nonnegative(),
  isFX: z.boolean(),
  isExceptionPath: z.boolean(),
  fxPair: z.string().optional(),
  recoMethod: z.nativeEnum(ReconciliationMethod),
  dataSchema: z.string().optional(),
  description: z.string().optional()
});

type NodeFormValues = z.infer<typeof nodeSchema>;
type EdgeFormValues = z.infer<typeof edgeSchema>;

const Section: React.FC<{ title: string; icon: React.ReactNode; children?: React.ReactNode }> = ({
  title,
  icon,
  children
}) => (
  <div className="ff-motion-in mb-6">
    <div className="ff-soft-divider mb-3 flex items-center gap-2 border-b px-1 pb-1.5">
      <div className="text-[var(--color-accent-1)]">{icon}</div>
      <h3 className="ff-muted-text text-[10px] font-semibold uppercase tracking-[0.12em]">
        {title}
      </h3>
    </div>
    <div className="space-y-3 px-1">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="ff-muted-text ml-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]">
      {label}
    </label>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="ff-input ff-focus w-full px-3 py-2 text-xs font-medium outline-none"
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="ff-input ff-focus w-full cursor-pointer appearance-none px-3 py-2 text-xs font-medium outline-none"
  >
    {props.children}
  </select>
);

const DetailToggle: React.FC<{
  isActive: boolean;
  label: string;
  onClick: () => void;
}> = ({ isActive, label, onClick }) => (
  <button
    onClick={onClick}
    className={`ff-focus rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
      isActive
        ? 'bg-[var(--color-accent-1)] text-white shadow-sm'
        : 'text-[var(--color-text-tertiary)] hover:bg-[color:var(--color-surface-3)]'
    }`}
  >
    {label}
  </button>
);

const nodeToFormValues = (node: Node | undefined): NodeFormValues => ({
  label: node?.label || '',
  type: node?.type || EntityType.PROCESSOR,
  accountType: node?.accountType || '',
  description: node?.description || '',
  color: node?.color || ''
});

const edgeToFormValues = (edge: Edge | undefined): EdgeFormValues => ({
  label: edge?.label || '',
  rail: edge?.rail || PaymentRail.BLANK,
  direction: edge?.direction || FlowDirection.PUSH,
  timing: edge?.timing || '',
  amount: edge?.amount || '',
  currency: edge?.currency || '',
  sequence: edge?.sequence || 0,
  isFX: !!edge?.isFX,
  isExceptionPath: !!edge?.isExceptionPath,
  fxPair: edge?.fxPair || '',
  recoMethod: edge?.recoMethod || ReconciliationMethod.NONE,
  dataSchema: edge?.dataSchema || '',
  description: edge?.description || ''
});

const Inspector: React.FC<InspectorProps> = ({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onUpdateNode,
  onUpdateEdge,
  isDarkMode,
  canvasSettings,
  onToggleSnapToGrid,
  onToggleShowPorts,
  onToggleShowSwimlanes,
  onSetGridMode,
  onClose
}) => {
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId]
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId),
    [edges, selectedEdgeId]
  );
  const [detailLevel, setDetailLevel] = useState<'basic' | 'advanced'>('basic');

  const nodeForm = useForm<NodeFormValues>({
    resolver: zodResolver(nodeSchema),
    mode: 'onChange',
    defaultValues: nodeToFormValues(selectedNode)
  });
  const edgeForm = useForm<EdgeFormValues>({
    resolver: zodResolver(edgeSchema),
    mode: 'onChange',
    defaultValues: edgeToFormValues(selectedEdge)
  });

  const nodeValues = useWatch({ control: nodeForm.control });
  const edgeValues = useWatch({ control: edgeForm.control });
  const selectedNodeColor = nodeForm.watch('color') || '';
  const edgeIsFX = edgeForm.watch('isFX');
  const edgeIsExceptionPath = edgeForm.watch('isExceptionPath');

  useEffect(() => {
    setDetailLevel('basic');
  }, [selectedNodeId, selectedEdgeId]);

  useEffect(() => {
    nodeForm.reset(nodeToFormValues(selectedNode));
  }, [selectedNode?.id, nodeForm]);

  useEffect(() => {
    edgeForm.reset(edgeToFormValues(selectedEdge));
  }, [selectedEdge?.id, edgeForm]);

  useEffect(() => {
    if (!selectedNode) return;
    const parsed = nodeSchema.safeParse(nodeValues);
    if (!parsed.success) return;

    const next = parsed.data;
    const nextNode: Node = {
      ...selectedNode,
      label: next.label,
      type: next.type,
      accountType: next.accountType || undefined,
      description: next.description || undefined,
      color: next.color || undefined
    };

    const hasChanged =
      selectedNode.label !== nextNode.label ||
      selectedNode.type !== nextNode.type ||
      selectedNode.accountType !== nextNode.accountType ||
      selectedNode.description !== nextNode.description ||
      selectedNode.color !== nextNode.color;

    if (hasChanged) onUpdateNode(nextNode);
  }, [nodeValues, selectedNode, onUpdateNode]);

  useEffect(() => {
    if (!selectedEdge) return;
    const parsed = edgeSchema.safeParse(edgeValues);
    if (!parsed.success) return;

    const next = parsed.data;
    const nextEdge: Edge = {
      ...selectedEdge,
      label: next.label,
      rail: next.rail,
      direction: next.direction,
      timing: next.timing || undefined,
      amount: next.amount || undefined,
      currency: next.currency || undefined,
      sequence: Number.isFinite(next.sequence) ? next.sequence : 0,
      isFX: next.isFX,
      isExceptionPath: next.isExceptionPath,
      fxPair: next.fxPair || undefined,
      recoMethod: next.recoMethod,
      dataSchema: next.dataSchema || undefined,
      description: next.description || undefined
    };

    const hasChanged =
      selectedEdge.label !== nextEdge.label ||
      selectedEdge.rail !== nextEdge.rail ||
      selectedEdge.direction !== nextEdge.direction ||
      selectedEdge.timing !== nextEdge.timing ||
      selectedEdge.amount !== nextEdge.amount ||
      selectedEdge.currency !== nextEdge.currency ||
      (selectedEdge.sequence || 0) !== (nextEdge.sequence || 0) ||
      selectedEdge.isFX !== nextEdge.isFX ||
      !!selectedEdge.isExceptionPath !== !!nextEdge.isExceptionPath ||
      selectedEdge.fxPair !== nextEdge.fxPair ||
      (selectedEdge.recoMethod || ReconciliationMethod.NONE) !==
        (nextEdge.recoMethod || ReconciliationMethod.NONE) ||
      selectedEdge.dataSchema !== nextEdge.dataSchema ||
      selectedEdge.description !== nextEdge.description;

    if (hasChanged) onUpdateEdge(nextEdge);
  }, [edgeValues, selectedEdge, onUpdateEdge]);

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <div className="ff-soft-divider mb-4 flex items-center gap-2 border-b pb-2">
          <MousePointer2 className="h-4 w-4 text-[var(--color-accent-1)]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">Canvas Settings</h2>
        </div>

        <Section title="Layout Controls" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          <Field label="Grid Mode">
            <div className="ff-panel-muted grid grid-cols-3 gap-1 p-1">
              {(['none', 'lines', 'dots'] as GridMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSetGridMode(mode)}
                  aria-pressed={canvasSettings.gridMode === mode}
                  className={`ff-focus rounded-md px-2 py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                    canvasSettings.gridMode === mode
                      ? 'bg-[var(--color-accent-1)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[color:var(--color-surface-3)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Canvas Toggles">
            <div className="space-y-2">
              <button
                type="button"
                onClick={onToggleSnapToGrid}
                aria-pressed={canvasSettings.snapToGrid}
                className="ff-btn-secondary ff-focus flex w-full items-center justify-between px-3 py-2 text-xs"
              >
                <span>Snap to 20px Grid</span>
                <span className="ff-chip">{canvasSettings.snapToGrid ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={onToggleShowPorts}
                aria-pressed={canvasSettings.showPorts}
                className="ff-btn-secondary ff-focus flex w-full items-center justify-between px-3 py-2 text-xs"
              >
                <span>Show Handles</span>
                <span className="ff-chip">{canvasSettings.showPorts ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={onToggleShowSwimlanes}
                aria-pressed={canvasSettings.showSwimlanes}
                className="ff-btn-secondary ff-focus flex w-full items-center justify-between px-3 py-2 text-xs"
              >
                <span>Swimlanes</span>
                <span className="ff-chip">{canvasSettings.showSwimlanes ? 'On' : 'Off'}</span>
              </button>
            </div>
          </Field>
        </Section>
      </div>
    );
  }

  return (
    <div className="ff-panel flex h-full flex-col border-0 bg-transparent shadow-none">
      <div className="ff-soft-divider flex items-center justify-between border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--color-accent-1)]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">
            {selectedNode ? 'Entity Profile' : 'Link Logic'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="ff-panel-muted flex items-center p-0.5">
            <DetailToggle
              isActive={detailLevel === 'basic'}
              label="Basic"
              onClick={() => setDetailLevel('basic')}
            />
            <DetailToggle
              isActive={detailLevel === 'advanced'}
              label="Advanced"
              onClick={() => setDetailLevel('advanced')}
            />
          </div>
          <button onClick={onClose} className="ff-btn-ghost ff-focus p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
        {selectedNode && detailLevel === 'basic' && (
          <Section title="Entity Basics" icon={<Zap className="h-3.5 w-3.5" />}>
            <Field label="Entity Label">
              <Input {...nodeForm.register('label')} />
            </Field>
            <Field label="Archetype">
              <Select {...nodeForm.register('type')}>
                {Object.values(EntityType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Brand Context">
              <div className="flex gap-2 pt-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => nodeForm.setValue('color', color.hex, { shouldDirty: true, shouldValidate: true })}
                    title={color.label}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      selectedNodeColor === color.hex
                        ? 'scale-110 border-blue-500 shadow-lg'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
            </Field>
          </Section>
        )}

        {selectedNode && detailLevel === 'advanced' && (
          <Section title="Entity Advanced" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
            <Field label="Accounting Record">
              <Select {...nodeForm.register('accountType')}>
                <option value="">None / Off-Ledger</option>
                {Object.values(AccountType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>
              <Field label="Entity Notes">
                <textarea
                  {...nodeForm.register('description')}
                  className="ff-input ff-focus h-24 w-full resize-none p-3 text-xs outline-none"
                  placeholder="Optional notes for this entity..."
                />
              </Field>
          </Section>
        )}

        {selectedEdge && detailLevel === 'basic' && (
          <>
            <Section title="Link Basics" icon={<ListOrdered className="h-3.5 w-3.5" />}>
              <Field label="Technical Description">
                <Input {...edgeForm.register('label')} />
              </Field>
              <Field label="Infrastructure Rail">
                <Select {...edgeForm.register('rail')}>
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
              <Field label="Accounting Direction">
                <Select {...edgeForm.register('direction')}>
                  {Object.values(FlowDirection).map((direction) => (
                    <option key={direction} value={direction}>
                      {direction}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="SLA / Timing">
                <Select {...edgeForm.register('timing')}>
                  <option value="">Undetermined</option>
                  {Object.values(TimingType).map((timing) => (
                    <option key={timing} value={timing}>
                      {timing}
                    </option>
                  ))}
                </Select>
              </Field>
            </Section>

            <Section title="Financial Data" icon={<DollarSign className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base Amount">
                  <Input {...edgeForm.register('amount')} placeholder="0.00" />
                </Field>
                <Field label="ISO Currency">
                  <Input {...edgeForm.register('currency')} placeholder="USD" />
                </Field>
              </div>
            </Section>
          </>
        )}

        {selectedEdge && detailLevel === 'advanced' && (
          <>
            <Section title="Link Advanced" icon={<ListOrdered className="h-3.5 w-3.5" />}>
              <Field label="Order">
                <Input type="number" min="0" {...edgeForm.register('sequence', { valueAsNumber: true })} />
              </Field>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() =>
                    edgeForm.setValue('isFX', !edgeIsFX, {
                      shouldDirty: true,
                      shouldValidate: true
                    })
                  }
                  className={`ff-focus rounded-md border px-3 py-2 text-[10px] font-semibold uppercase transition-all ${
                    edgeIsFX
                      ? 'border-emerald-600 bg-emerald-500 text-white shadow-md'
                      : 'ff-btn-secondary'
                  }`}
                >
                  Foreign Exchange (FX)
                </button>
                <button
                  onClick={() =>
                    edgeForm.setValue('isExceptionPath', !edgeIsExceptionPath, {
                      shouldDirty: true,
                      shouldValidate: true
                    })
                  }
                  className={`ff-focus rounded-md border px-3 py-2 text-[10px] font-semibold uppercase transition-all ${
                    edgeIsExceptionPath
                      ? 'bg-rose-500 border-rose-600 text-white shadow-md'
                      : 'ff-btn-secondary'
                  }`}
                >
                  Exception / Return Path
                </button>
              </div>
              {edgeIsFX && (
                <Field label="Market Pair">
                  <Input {...edgeForm.register('fxPair')} placeholder="USD/EUR" />
                </Field>
              )}
            </Section>

            <Section title="Reconciliation" icon={<Repeat className="h-3.5 w-3.5" />}>
              <Field label="Reco Logic">
                <Select {...edgeForm.register('recoMethod')}>
                  {Object.values(ReconciliationMethod).map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </Field>
            </Section>

            <Section title="Architecture" icon={<FileJson className="h-3.5 w-3.5" />}>
              <Field label="Message Format">
                <Input {...edgeForm.register('dataSchema')} placeholder="e.g. ISO 20022" />
              </Field>
              <Field label="Architect Notes">
                <textarea
                  {...edgeForm.register('description')}
                  className="ff-input ff-focus h-24 w-full resize-none p-3 text-xs outline-none"
                  placeholder="Explain cut-offs, retries, dependencies..."
                />
              </Field>
            </Section>
          </>
        )}
      </div>
    </div>
  );
};

export default Inspector;
