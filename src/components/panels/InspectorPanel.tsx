import { CircleHelp, Link2, RotateCcw, SquarePen } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  CARD_NETWORK_FIELDS,
  EDGE_FIELDS,
  NODE_BASE_FIELDS,
  nodeTypeFields,
  type FieldDef,
} from '../../data/schema';
import type { BankEdge, BankEdgeData, BankNode, BankNodeData, Swimlane } from '../../types';

interface Props {
  selectedNode: BankNode | null;
  selectedEdge: BankEdge | null;
  nodes: BankNode[];
  edges: BankEdge[];
  lanes: Swimlane[];
  onUpdateNode: (id: string, patch: Partial<BankNodeData>) => void;
  onResetNode: (id: string) => void;
  onUpdateEdge: (id: string, patch: Partial<BankEdgeData>) => void;
  onResetEdge: (id: string) => void;
}

interface SectionDef {
  title: string;
  description?: string;
  fields: FieldDef<string>[];
}

const NODE_GROUPS: Array<{ title: string; description: string; keys: string[] }> = [
  {
    title: 'Core',
    description: 'Identity and flow role for this node.',
    keys: ['displayName', 'description', 'jurisdiction', 'roleInFlow'],
  },
  {
    title: 'Regulatory',
    description: 'Regulator and settlement access controls.',
    keys: ['regulator', 'settlementAccess'],
  },
  {
    title: 'Integration',
    description: 'Integration and posting behavior.',
    keys: ['integrationMode', 'postingTiming', 'coreType'],
  },
  {
    title: 'Accounts and Ledger',
    description: 'Account custody and ledger metadata.',
    keys: ['heldAt', 'custodyModel', 'ledgerType', 'balanceModel', 'sourceOfTruth'],
  },
  {
    title: 'Controls',
    description: 'Compliance and ownership controls.',
    keys: ['method', 'owner', 'treasuryScope'],
  },
];

const EDGE_GROUPS: Array<{ title: string; description: string; keys: string[] }> = [
  {
    title: 'Rail and Settlement',
    description: 'Primary movement rail and settlement model.',
    keys: ['rail', 'settlementType'],
  },
  {
    title: 'Direction and Flow',
    description: 'Directionality and message/funds semantics.',
    keys: ['direction', 'messageOrFunds'],
  },
  {
    title: 'Notes',
    description: 'Free-form implementation notes for this edge.',
    keys: ['notes'],
  },
];

const FIELD_HELPERS: Record<string, string> = {
  roleInFlow: 'Defines the operational responsibility of this node within the flow.',
  settlementType: 'Capture whether settlement happens instantly, in batch, or delayed windows.',
  messageOrFunds: 'Clarifies if this edge represents messaging, funds movement, or both.',
};

function toSections(fields: FieldDef<string>[], groups: Array<{ title: string; description: string; keys: string[] }>): SectionDef[] {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const consumed = new Set<string>();
  const sections: SectionDef[] = [];

  for (const group of groups) {
    const groupFields = group.keys
      .map((key) => byKey.get(key))
      .filter((field): field is FieldDef<string> => Boolean(field));

    if (groupFields.length === 0) {
      continue;
    }

    for (const field of groupFields) {
      consumed.add(field.key);
    }

    sections.push({
      title: group.title,
      description: group.description,
      fields: groupFields,
    });
  }

  const remaining = fields.filter((field) => !consumed.has(field.key));
  if (remaining.length > 0) {
    sections.push({
      title: 'Additional',
      description: 'Additional context fields for this item.',
      fields: remaining,
    });
  }

  return sections;
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">{title}</h3>
      {description && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef<string>;
  value: string;
  onChange: (value: string) => void;
}) {
  const base =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 shadow-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400';
  const helper = FIELD_HELPERS[field.key];
  const isSelectBlank = field.kind === 'select' && value === 'Blank';

  return (
    <label className="mb-3 block">
      <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">{field.label}</span>
      {field.kind === 'select' ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={`${base} h-9`}>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.kind === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${base} min-h-[88px] py-2`}
          rows={4}
        />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={`${base} h-9`} />
      )}

      {isSelectBlank && (
        <span className="mt-1 block text-[10px] font-medium text-amber-700 dark:text-amber-300">Using default value: Blank</span>
      )}
      {helper && <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">{helper}</span>}
    </label>
  );
}

export function InspectorPanel(props: Props) {
  const visibleLaneCount = props.lanes.filter((lane) => lane.visible).length;

  if (!props.selectedNode && !props.selectedEdge) {
    return (
      <aside className="h-full w-[340px] border-l border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <CircleHelp size={14} />
            Quick Help
          </div>
          <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-400">
            <li>Drag nodes from palette to canvas.</li>
            <li>Connect handles to create edges.</li>
            <li>Delete/backspace removes selected items.</li>
            <li>Cmd/Ctrl + D duplicates selected node.</li>
            <li>Double-click lane label to rename.</li>
          </ul>
        </div>

        <div className="mt-3 rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Diagram Stats</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Nodes: {props.nodes.length}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Edges: {props.edges.length}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Lanes: {props.lanes.length}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Visible Lanes: {visibleLaneCount}</div>
        </div>
      </aside>
    );
  }

  if (props.selectedNode) {
    const node = props.selectedNode;
    const fields = [...NODE_BASE_FIELDS, ...nodeTypeFields(node.data.nodeType)] as FieldDef<string>[];
    const sections = toSections(fields, NODE_GROUPS);

    return (
      <aside className="h-full w-[340px] overflow-auto border-l border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="sticky top-0 z-10 -mx-3 mb-3 border-b border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <SquarePen size={14} />
              Node Inspector
            </h2>
            <button
              type="button"
              onClick={() => props.onResetNode(node.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw size={12} />
              Reset fields
            </button>
          </div>

          <div className="rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900">
            <div className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{node.data.displayName}</div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {node.data.nodeType}
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-4">
          {sections.map((section) => (
            <SectionCard key={section.title} title={section.title} description={section.description}>
              {section.fields.map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={String(node.data[field.key as keyof BankNodeData] ?? '')}
                  onChange={(value) => props.onUpdateNode(node.id, { [field.key]: value } as Partial<BankNodeData>)}
                />
              ))}
            </SectionCard>
          ))}
        </div>
      </aside>
    );
  }

  const edge = props.selectedEdge!;
  const edgeData = edge.data;
  const showCardFields = edgeData?.rail === 'Card Network';
  const edgeSections = toSections(EDGE_FIELDS as FieldDef<string>[], EDGE_GROUPS);

  return (
    <aside className="h-full w-[340px] overflow-auto border-l border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/50">
      <div className="sticky top-0 z-10 -mx-3 mb-3 border-b border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Link2 size={14} />
            Edge Inspector
          </h2>
          <button
            type="button"
            onClick={() => props.onResetEdge(edge.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw size={12} />
            Reset fields
          </button>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {edge.source} to {edge.target}
        </div>
      </div>

      <div className="space-y-3 pb-4">
        {edgeSections.map((section) => (
          <SectionCard key={section.title} title={section.title} description={section.description}>
            {section.fields.map((field) => (
              <Field
                key={field.key}
                field={field}
                value={String(edgeData?.[field.key as keyof BankEdgeData] ?? '')}
                onChange={(value) => props.onUpdateEdge(edge.id, { [field.key]: value } as Partial<BankEdgeData>)}
              />
            ))}
          </SectionCard>
        ))}

        {showCardFields && (
          <SectionCard title="Card Network" description="Additional card network details when rail is Card Network.">
            {CARD_NETWORK_FIELDS.map((field) => (
              <Field
                key={field.key}
                field={field as FieldDef<string>}
                value={String(edgeData?.[field.key as keyof BankEdgeData] ?? '')}
                onChange={(value) => props.onUpdateEdge(edge.id, { [field.key]: value } as Partial<BankEdgeData>)}
              />
            ))}
          </SectionCard>
        )}
      </div>
    </aside>
  );
}
