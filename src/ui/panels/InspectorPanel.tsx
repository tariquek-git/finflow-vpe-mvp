import { AlertTriangle, Link2, RefreshCw, ShieldAlert, SquarePen } from 'lucide-react';
import { motion } from 'motion/react';
import { createEdgeData } from '../../core/builders';
import { BASE_NODE_FIELDS, edgeFields, type EdgeField, type NodeField } from '../../core/schema';
import type { FlowEdge, FlowNode } from '../../core/types';
import type { GuardrailIssue } from '../../store/useBankFlowStore';
import { nodeIconMap } from '../common/icons';

interface Props {
  selectedNode: FlowNode | null;
  selectedEdge: FlowEdge | null;
  ledgerOptions: string[];
  guardrails: GuardrailIssue[];
  onUpdateNode: (id: string, patch: Record<string, string>) => void;
  onResetNode: (id: string) => void;
  onUpdateEdge: (id: string, patch: Record<string, string>) => void;
  onResetEdge: (id: string) => void;
}

function Field({
  field,
  value,
  onChange,
}: {
  field: NodeField | EdgeField;
  value: string;
  onChange: (value: string) => void;
}) {
  const base =
    'w-full rounded-xl border border-slate-300/80 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
        {field.label}
      </span>
      {field.type === 'select' ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={base}>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          placeholder={field.placeholder}
          className={base}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      )}
    </label>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-300/70 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <RefreshCw size={11} />
      Reset
    </button>
  );
}

export function InspectorPanel(props: Props) {
  if (!props.selectedNode && !props.selectedEdge) {
    return null;
  }

  if (props.selectedNode) {
    const Icon = nodeIconMap[props.selectedNode.data.nodeType];

    return (
      <motion.aside
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-[350px]"
      >
        <div className="rounded-2xl border border-slate-300/70 bg-white/92 p-3 shadow-[0_16px_36px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/88">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <SquarePen size={14} />
              Node Attributes
            </h2>
            <ResetButton onClick={() => props.onResetNode(props.selectedNode!.id)} />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-300/70 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Icon size={12} />
            {props.selectedNode.data.nodeType}
          </div>

          {BASE_NODE_FIELDS.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={String(props.selectedNode!.data[field.key] ?? '')}
              onChange={(value) => props.onUpdateNode(props.selectedNode!.id, { [field.key]: value })}
            />
          ))}
        </div>
      </motion.aside>
    );
  }

  const edge = props.selectedEdge!;
  const data = edge.data ?? createEdgeData(edge.id);
  const fields = edgeFields(props.ledgerOptions);
  const edgeAlerts = props.guardrails.filter((issue) => issue.edgeId === edge.id);
  const needsLedgerPrompt = data.rail !== 'Blank' && (!data.ledgerOfRecord.trim() || data.ledgerOfRecord === 'Blank');

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-[360px]"
    >
      <div className="rounded-2xl border border-slate-300/70 bg-white/92 p-3 shadow-[0_16px_36px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/88">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Link2 size={14} />
            Rail Attributes
          </h2>
          <ResetButton onClick={() => props.onResetEdge(edge.id)} />
        </div>

        <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300/70 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <ShieldAlert size={12} />
          {edge.id}
        </div>

        {needsLedgerPrompt && (
          <div className="mb-3 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100">
            Define the Ledger of Record before finalizing this movement.
          </div>
        )}

        {edgeAlerts.map((issue) => (
          <div
            key={issue.id}
            className={
              issue.severity === 'error'
                ? 'mb-2 inline-flex w-full items-start gap-1.5 rounded-xl border border-rose-300/80 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-100'
                : 'mb-2 inline-flex w-full items-start gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100'
            }
          >
            <AlertTriangle size={12} className="mt-[1px]" />
            <span>{issue.message}</span>
          </div>
        ))}

        {fields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={String(data[field.key] ?? '')}
            onChange={(value) => props.onUpdateEdge(edge.id, { [field.key]: value })}
          />
        ))}
      </div>
    </motion.aside>
  );
}
