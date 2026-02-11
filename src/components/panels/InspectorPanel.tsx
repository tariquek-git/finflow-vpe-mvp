import { CircleHelp, Link2, RotateCcw, SquarePen } from 'lucide-react';
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

function Field({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: FieldDef<string>;
  value: string;
  onChange: (value: string) => void;
}) {
  const base =
    'w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      {field.kind === 'select' ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={base}>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.kind === 'textarea' ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} className={base} rows={3} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={base} />
      )}
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
    const fields = [...NODE_BASE_FIELDS, ...nodeTypeFields(props.selectedNode.data.nodeType)];

    return (
      <aside className="h-full w-[340px] overflow-auto border-l border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <SquarePen size={14} />
            Node Inspector
          </h2>
          <button
            type="button"
            onClick={() => props.onResetNode(props.selectedNode!.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw size={12} />
            Reset to defaults
          </button>
        </div>

        <div className="mb-3 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {props.selectedNode.data.nodeType}
        </div>

        {fields.map((field) => (
          <Field
            key={field.key}
            label={field.label}
            field={field as FieldDef<string>}
            value={String(props.selectedNode!.data[field.key as keyof BankNodeData] ?? '')}
            onChange={(value) => props.onUpdateNode(props.selectedNode!.id, { [field.key]: value } as Partial<BankNodeData>)}
          />
        ))}
      </aside>
    );
  }

  const edge = props.selectedEdge!;
  const edgeData = edge.data;
  const showCardFields = edgeData?.rail === 'Card Network';

  return (
    <aside className="h-full w-[340px] overflow-auto border-l border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/50">
      <div className="mb-3 flex items-center justify-between">
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
          Reset to defaults
        </button>
      </div>

      {EDGE_FIELDS.map((field) => (
        <Field
          key={field.key}
          label={field.label}
          field={field as FieldDef<string>}
          value={String(edgeData?.[field.key as keyof BankEdgeData] ?? '')}
          onChange={(value) => props.onUpdateEdge(edge.id, { [field.key]: value } as Partial<BankEdgeData>)}
        />
      ))}

      {showCardFields && (
        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="mb-1 text-xs font-semibold text-blue-800 dark:text-blue-200">Card Network Fields</div>
          {CARD_NETWORK_FIELDS.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              field={field as FieldDef<string>}
              value={String(edgeData?.[field.key as keyof BankEdgeData] ?? '')}
              onChange={(value) => props.onUpdateEdge(edge.id, { [field.key]: value } as Partial<BankEdgeData>)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
