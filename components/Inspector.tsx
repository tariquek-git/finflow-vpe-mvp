import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AccountType,
  Edge,
  EntityType,
  FlowDirection,
  GridMode,
  Node,
  PaymentRail,
  ReconciliationMethod,
  TimingType
} from '../types';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronRight,
  FileJson,
  Layers,
  ListOrdered,
  MousePointer2,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';

export type InspectorTab = 'node' | 'edge' | 'canvas' | 'export';

interface InspectorProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onUpdateNode: (node: Node) => void;
  onUpdateEdge: (edge: Edge) => void;
  isDarkMode: boolean;
  onClose: () => void;
  showSwimlanes: boolean;
  onToggleSwimlanes: () => void;
  swimlaneLabels: string[];
  onAddSwimlane: () => void;
  onRemoveSwimlane: (index: number) => void;
  onUpdateSwimlaneLabel: (index: number, label: string) => void;
  gridMode: GridMode;
  onSetGridMode: (mode: GridMode) => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  showPorts: boolean;
  onTogglePorts: () => void;
  hasRecoverySnapshot: boolean;
  onRestoreRecovery: () => void;
  onResetCanvas: () => void;
  onImportDiagram: () => void;
  onExportDiagram: () => void;
  activeTabRequest?: InspectorTab | null;
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
const NODE_FIELD_NAMES: Array<keyof NodeFormValues> = ['label', 'type', 'accountType', 'description', 'color'];
const EDGE_FIELD_NAMES: Array<keyof EdgeFormValues> = [
  'label',
  'rail',
  'direction',
  'timing',
  'amount',
  'currency',
  'sequence',
  'isFX',
  'isExceptionPath',
  'fxPair',
  'recoMethod',
  'dataSchema',
  'description'
];

const FIELD_HELPERS: Record<string, string> = {
  direction: 'Use Push/Pull/Settlement to describe how value or messages move.',
  rail: 'Select the operating network or rail for this connection.',
  timing: 'Capture settlement cadence or SLA window for this flow.'
};

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
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-slate-400" />
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-400" />
      )}
    </button>
    {isOpen ? <div className="space-y-2.5 px-1 pt-2.5">{children}</div> : null}
  </section>
);

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

const tabMeta: Array<{ id: InspectorTab; label: string }> = [
  { id: 'node', label: 'Node' },
  { id: 'edge', label: 'Edge' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'export', label: 'Export' }
];

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

const getActiveFieldName = (): string | null => {
  if (typeof document === 'undefined') return null;
  const activeElement = document.activeElement;
  const isFormElement =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement;
  if (!isFormElement) return null;
  return activeElement.name || null;
};

const pickActiveField = <T extends string>(allowedFields: readonly T[]): T | null => {
  const activeField = getActiveFieldName();
  if (!activeField) return null;
  return allowedFields.includes(activeField as T) ? (activeField as T) : null;
};

const Inspector: React.FC<InspectorProps> = ({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onUpdateNode,
  onUpdateEdge,
  isDarkMode,
  onClose,
  showSwimlanes,
  onToggleSwimlanes,
  swimlaneLabels,
  onAddSwimlane,
  onRemoveSwimlane,
  onUpdateSwimlaneLabel,
  gridMode,
  onSetGridMode,
  snapToGrid,
  onToggleSnapToGrid,
  showPorts,
  onTogglePorts,
  hasRecoverySnapshot,
  onRestoreRecovery,
  onResetCanvas,
  onImportDiagram,
  onExportDiagram,
  activeTabRequest
}) => {
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId]
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId),
    [edges, selectedEdgeId]
  );

  const [activeTab, setActiveTab] = useState<InspectorTab>('canvas');
  const [isManualTabSelection, setIsManualTabSelection] = useState(false);
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [edgeAdvancedOpen, setEdgeAdvancedOpen] = useState(false);
  const [swimlaneListOpen, setSwimlaneListOpen] = useState(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const scrollPositionsRef = useRef<Record<InspectorTab, number>>({
    node: 0,
    edge: 0,
    canvas: 0,
    export: 0
  });
  const hasNodeSelection = !!selectedNode;
  const hasEdgeSelection = !!selectedEdge;
  const selectedEdgeEndpoints = useMemo(() => {
    if (!selectedEdge) return '';
    const sourceLabel = nodes.find((node) => node.id === selectedEdge.sourceId)?.label || selectedEdge.sourceId;
    const targetLabel = nodes.find((node) => node.id === selectedEdge.targetId)?.label || selectedEdge.targetId;
    return `${sourceLabel} -> ${targetLabel}`;
  }, [nodes, selectedEdge]);
  const contextMeta = useMemo((): { label: string; detail: string } => {
    if (activeTab === 'node') {
      return {
        label: 'Node',
        detail: selectedNode ? selectedNode.label : 'No node selected'
      };
    }
    if (activeTab === 'edge') {
      if (!selectedEdge) {
        return { label: 'Edge', detail: 'No edge selected' };
      }
      return {
        label: 'Edge',
        detail: selectedEdge.label?.trim() || selectedEdgeEndpoints
      };
    }
    if (activeTab === 'canvas') {
      return { label: 'Canvas', detail: 'Layout, grid, and swimlane controls' };
    }
    return { label: 'Export', detail: 'Import/export and recovery actions' };
  }, [activeTab, selectedNode, selectedEdge, selectedEdgeEndpoints]);
  const isTabValidForSelection = useCallback(
    (tab: InspectorTab) => {
      if (tab === 'node') return hasNodeSelection;
      if (tab === 'edge') return hasEdgeSelection;
      return true;
    },
    [hasEdgeSelection, hasNodeSelection]
  );
  const resolveSelectionPreferredTab = useCallback((): InspectorTab => {
    if (hasEdgeSelection) return 'edge';
    if (hasNodeSelection) return 'node';
    return 'canvas';
  }, [hasEdgeSelection, hasNodeSelection]);
  const switchTab = useCallback(
    (tab: InspectorTab, options?: { manual?: boolean }) => {
      const container = scrollBodyRef.current;
      if (container) {
        scrollPositionsRef.current[activeTab] = container.scrollTop;
      }
      if (typeof options?.manual === 'boolean') {
        setIsManualTabSelection(options.manual);
      }
      if (tab !== activeTab) {
        setActiveTab(tab);
      }
    },
    [activeTab]
  );
  const handleTabClick = useCallback((tab: InspectorTab) => {
    switchTab(tab, { manual: true });
  }, [switchTab]);

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
  const handleResetNodeFields = useCallback(() => {
    nodeForm.reset(nodeToFormValues(selectedNode));
  }, [nodeForm, selectedNode]);
  const handleResetEdgeFields = useCallback(() => {
    edgeForm.reset(edgeToFormValues(selectedEdge));
  }, [edgeForm, selectedEdge]);

  useEffect(() => {
    if (activeTabRequest) {
      switchTab(activeTabRequest, { manual: false });
      return;
    }

    if (!isManualTabSelection) {
      const nextAutoTab = resolveSelectionPreferredTab();
      if (nextAutoTab !== activeTab) {
        switchTab(nextAutoTab);
      }
      return;
    }

    if (!isTabValidForSelection(activeTab)) {
      switchTab(resolveSelectionPreferredTab());
    }
  }, [
    activeTabRequest,
    activeTab,
    isManualTabSelection,
    isTabValidForSelection,
    resolveSelectionPreferredTab,
    switchTab,
    selectedNodeId,
    selectedEdgeId
  ]);

  useEffect(() => {
    const fieldToRefocus = pickActiveField(NODE_FIELD_NAMES);
    nodeForm.reset(nodeToFormValues(selectedNode));
    if (fieldToRefocus && selectedNode) {
      window.requestAnimationFrame(() => {
        nodeForm.setFocus(fieldToRefocus);
      });
    }
  }, [selectedNode?.id, selectedNode, nodeForm]);

  useEffect(() => {
    const fieldToRefocus = pickActiveField(EDGE_FIELD_NAMES);
    edgeForm.reset(edgeToFormValues(selectedEdge));
    if (fieldToRefocus && selectedEdge) {
      window.requestAnimationFrame(() => {
        edgeForm.setFocus(fieldToRefocus);
      });
    }
  }, [selectedEdge?.id, selectedEdge, edgeForm]);

  useLayoutEffect(() => {
    const container = scrollBodyRef.current;
    if (!container) return;
    const nextScrollTop = scrollPositionsRef.current[activeTab] ?? 0;
    container.scrollTop = nextScrollTop;
    const raf = window.requestAnimationFrame(() => {
      if (scrollBodyRef.current) {
        scrollBodyRef.current.scrollTop = nextScrollTop;
      }
    });
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [activeTab]);

  useEffect(() => {
    const container = scrollBodyRef.current;
    if (!container) return;
    const handleScroll = () => {
      scrollPositionsRef.current[activeTab] = container.scrollTop;
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab]);

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

  return (
    <div className={`flex h-full flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      <div
        className={`sticky top-0 z-10 border-b px-3 py-2 backdrop-blur ${
          isDarkMode ? 'border-slate-700 bg-slate-900/95' : 'border-slate-200 bg-white/95'
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] dark:text-slate-200">Inspector</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 p-1.5 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
            aria-label="Close inspector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          {tabMeta.map((tab) => {
            const disabled = (tab.id === 'node' && !selectedNode) || (tab.id === 'edge' && !selectedEdge);
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`inspector-tab-${tab.id}`}
                disabled={disabled}
                aria-pressed={activeTab === tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={scrollBodyRef}
        data-testid="inspector-scroll-body"
        className="custom-scrollbar flex-1 overflow-y-auto p-2.5"
      >
        <div
          className={`sticky top-0 z-[1] mb-2 rounded-lg border px-2.5 py-2 backdrop-blur ${
            isDarkMode
              ? 'border-slate-700 bg-slate-900/95'
              : 'border-slate-200 bg-white/96'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                {contextMeta.label}
              </div>
              <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                {contextMeta.detail}
              </div>
            </div>

            {activeTab === 'node' && selectedNode ? (
              <button
                type="button"
                onClick={handleResetNodeFields}
                className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Reset fields
              </button>
            ) : null}

            {activeTab === 'edge' && selectedEdge ? (
              <button
                type="button"
                onClick={handleResetEdgeFields}
                className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Reset fields
              </button>
            ) : null}
          </div>
        </div>

        {activeTab === 'node' && !selectedNode ? (
          <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-6 text-center opacity-60">
            <MousePointer2 className="mb-3 h-10 w-10 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Select a node to edit</p>
          </div>
        ) : null}

        {activeTab === 'node' && selectedNode ? (
          <>
            <PanelSection title="Core" icon={<Sparkles className="h-3.5 w-3.5" />}>
              <Field label="Node Label">
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
              <Field label="Account Type">
                <Select {...nodeForm.register('accountType')}>
                  <option value="">None / Off-Ledger</option>
                  {Object.values(AccountType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>
            </PanelSection>

            <CollapsibleSection
              title="Visual & Notes"
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              isOpen={nodeDetailsOpen}
              onToggle={() => setNodeDetailsOpen((prev) => !prev)}
              testId="inspector-toggle-node-details"
            >
              <Field label="Color">
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() =>
                        nodeForm.setValue('color', color.hex, {
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
              <Field label="Notes">
                <textarea
                  {...nodeForm.register('description')}
                  className="ui-input h-24 w-full resize-none p-3 text-xs outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Optional notes for this node..."
                />
              </Field>
            </CollapsibleSection>
          </>
        ) : null}

        {activeTab === 'edge' && !selectedEdge ? (
          <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-6 text-center opacity-60">
            <MousePointer2 className="mb-3 h-10 w-10 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Select an edge to edit</p>
          </div>
        ) : null}

        {activeTab === 'edge' && selectedEdge ? (
          <>
            <PanelSection title="Flow" icon={<ListOrdered className="h-3.5 w-3.5" />}>
              <Field label="Label">
                <Input {...edgeForm.register('label')} />
              </Field>
              <Field label="Rail" helper={FIELD_HELPERS.rail}>
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
              <Field label="Direction" helper={FIELD_HELPERS.direction}>
                <Select {...edgeForm.register('direction')}>
                  {Object.values(FlowDirection).map((direction) => (
                    <option key={direction} value={direction}>
                      {direction}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Settlement Timing" helper={FIELD_HELPERS.timing}>
                <Select {...edgeForm.register('timing')}>
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
                  <Input {...edgeForm.register('amount')} placeholder="0.00" />
                </Field>
                <Field label="Currency">
                  <Input {...edgeForm.register('currency')} placeholder="USD" />
                </Field>
              </div>
            </PanelSection>

            <CollapsibleSection
              title="Advanced Details"
              icon={<FileJson className="h-3.5 w-3.5" />}
              isOpen={edgeAdvancedOpen}
              onToggle={() => setEdgeAdvancedOpen((prev) => !prev)}
              testId="inspector-toggle-edge-advanced"
            >
              <Field label="Sequence">
                <Input type="number" min="0" {...edgeForm.register('sequence', { valueAsNumber: true })} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => edgeForm.setValue('isFX', !edgeIsFX, { shouldDirty: true, shouldValidate: true })}
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
                    edgeForm.setValue('isExceptionPath', !edgeIsExceptionPath, {
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
                  <Input {...edgeForm.register('fxPair')} placeholder="USD/EUR" />
                </Field>
              ) : null}
              <Field label="Reconciliation">
                <Select {...edgeForm.register('recoMethod')}>
                  {Object.values(ReconciliationMethod).map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Data Schema">
                <Input {...edgeForm.register('dataSchema')} placeholder="e.g. ISO 20022" />
              </Field>
              <Field label="Notes">
                <textarea
                  {...edgeForm.register('description')}
                  className="ui-input h-24 w-full resize-none p-3 text-xs outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Settlement rules, risk, data exchanged..."
                />
              </Field>
            </CollapsibleSection>
          </>
        ) : null}

        {activeTab === 'canvas' ? (
          <>
            <PanelSection title="Canvas Utilities" icon={<Settings2 className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onToggleSnapToGrid}
                  aria-pressed={snapToGrid}
                  className={`rounded-md border px-3 py-2 text-[10px] font-semibold uppercase transition-all ${
                    snapToGrid
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {snapToGrid ? 'Snap On' : 'Snap Off'}
                </button>
                <button
                  type="button"
                  onClick={onTogglePorts}
                  aria-pressed={showPorts}
                  className={`rounded-md border px-3 py-2 text-[10px] font-semibold uppercase transition-all ${
                    showPorts
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {showPorts ? 'Ports On' : 'Ports Off'}
                </button>
              </div>
              <Field label="Grid Mode">
                <div className="grid grid-cols-3 gap-1">
                  {(['none', 'lines', 'dots'] as GridMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSetGridMode(mode)}
                      aria-pressed={gridMode === mode}
                      className={`rounded-md border px-2 py-1.5 text-[10px] font-semibold uppercase ${
                        gridMode === mode
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </Field>
            </PanelSection>

            <PanelSection title="Swimlanes" icon={<Layers className="h-3.5 w-3.5" />}>
              <button
                type="button"
                onClick={onToggleSwimlanes}
                aria-pressed={showSwimlanes}
                className={`mb-2 rounded-md border px-3 py-2 text-[10px] font-semibold uppercase ${
                  showSwimlanes
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {showSwimlanes ? 'Swimlanes: On' : 'Swimlanes: Off'}
              </button>

              {showSwimlanes ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSwimlaneListOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[10px] font-semibold uppercase dark:border-slate-700"
                  >
                    {swimlaneListOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    {swimlaneListOpen ? 'Hide Lane Labels' : `Lane Labels (${swimlaneLabels.length})`}
                  </button>
                  {swimlaneListOpen ? (
                    <div className="space-y-2">
                      {swimlaneLabels.map((label, idx) => (
                        <div key={`swimlane-${idx}`} className="flex items-center gap-2">
                          <span className="w-12 text-[10px] font-semibold uppercase text-slate-500">L{idx + 1}</span>
                          <input
                            value={label}
                            onChange={(event) => onUpdateSwimlaneLabel(idx, event.target.value)}
                            className="ui-input h-8 flex-1 px-2 text-xs"
                          />
                          <button
                            type="button"
                            disabled={swimlaneLabels.length <= 2}
                            onClick={() => onRemoveSwimlane(idx)}
                            className="rounded-md border border-rose-300 px-2 py-1 text-[10px] font-semibold text-rose-600 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={onAddSwimlane}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[10px] font-semibold uppercase"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Swimlane
                  </button>
                </div>
              ) : null}
            </PanelSection>
          </>
        ) : null}

        {activeTab === 'export' ? (
          <PanelSection title="File & Export" icon={<ArrowDownToLine className="h-3.5 w-3.5" />}>
            <button
              type="button"
              data-testid="toolbar-export-json"
              onClick={onExportDiagram}
              className="ui-button-primary inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold"
            >
              <ArrowDownToLine className="h-4 w-4" /> Export JSON
            </button>
            <button
              type="button"
              data-testid="toolbar-import-json"
              onClick={onImportDiagram}
              className="ui-button-secondary inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold"
            >
              <ArrowUpFromLine className="h-4 w-4" /> Import JSON
            </button>
            <button
              type="button"
              data-testid="toolbar-restore"
              onClick={onRestoreRecovery}
              className={`ui-button-secondary inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold ${
                hasRecoverySnapshot ? '' : 'opacity-90'
              }`}
            >
              Restore Backup
            </button>
            <button
              type="button"
              data-testid="toolbar-reset-canvas"
              onClick={onResetCanvas}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
            >
              New / Reset Canvas
            </button>
          </PanelSection>
        ) : null}
      </div>
    </div>
  );
};

export default Inspector;
