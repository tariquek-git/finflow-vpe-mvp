import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { FlowNode, NodeKind } from '../../core/types';
import { nodeIconMap } from '../common/icons';

const toneByType: Record<NodeKind, string> = {
  'Sponsor Bank': 'from-cyan-500/90 to-sky-500/80',
  'Issuer Bank': 'from-cyan-500/90 to-sky-500/80',
  'Acquirer Bank': 'from-cyan-500/90 to-sky-500/80',
  'Correspondent Bank': 'from-cyan-500/90 to-sky-500/80',
  'Central Bank': 'from-cyan-500/90 to-sky-500/80',
  'Fintech Program': 'from-amber-500/90 to-orange-500/80',
  'Program Manager': 'from-amber-500/90 to-orange-500/80',
  Processor: 'from-amber-500/90 to-orange-500/80',
  'Core Banking System': 'from-amber-500/90 to-orange-500/80',
  'Wallet App': 'from-amber-500/90 to-orange-500/80',
  'FBO Account': 'from-emerald-500/90 to-teal-500/80',
  DDA: 'from-emerald-500/90 to-teal-500/80',
  'Omnibus Account': 'from-emerald-500/90 to-teal-500/80',
  'Virtual Account': 'from-emerald-500/90 to-teal-500/80',
  'Internal Ledger': 'from-emerald-500/90 to-teal-500/80',
};

export function BankNodeCard({ data, selected }: NodeProps<FlowNode>) {
  const Icon = nodeIconMap[data.nodeType];
  const secondary = [data.jurisdiction !== 'Blank' ? data.jurisdiction : '', data.regulator].filter(Boolean).join(' • ');

  return (
    <div
      className={clsx(
        'group relative h-[96px] w-[220px] overflow-hidden rounded-2xl border bg-white/95 px-3 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.14)] transition-all duration-200 dark:bg-slate-950/95',
        selected
          ? 'border-cyan-400 ring-2 ring-cyan-300/55 ring-offset-1 ring-offset-white dark:border-cyan-400 dark:ring-offset-slate-950'
          : 'border-slate-300/85 hover:-translate-y-[1px] hover:shadow-[0_14px_24px_rgba(15,23,42,0.18)] dark:border-slate-700/80',
      )}
    >
      <div className={clsx('absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r', toneByType[data.nodeType])} />

      <Handle type="target" id="left" position={Position.Left} className="!h-2.5 !w-2.5 !border !border-white !bg-cyan-500" />
      <Handle type="source" id="right" position={Position.Right} className="!h-2.5 !w-2.5 !border !border-white !bg-cyan-500" />
      <Handle type="target" id="top" position={Position.Top} className="!h-2.5 !w-2.5 !border !border-white !bg-cyan-500" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!h-2.5 !w-2.5 !border !border-white !bg-cyan-500" />

      <div className="mt-1 flex items-start gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">{data.displayName}</div>
          <div className="truncate text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
            {data.nodeType}
          </div>
        </div>
      </div>

      <div className="mt-2 truncate text-[11px] text-slate-500 dark:text-slate-400">{secondary || 'No attributes set'}</div>
    </div>
  );
}
