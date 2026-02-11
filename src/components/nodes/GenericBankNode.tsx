import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Banknote,
  Building2,
  CheckCircle2,
  Database,
  Landmark,
  Layers,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { BankNode, NodeType } from '../../types';

const iconMap: Record<NodeType, LucideIcon> = {
  'Sponsor Bank': Landmark,
  'Issuer Bank': Building2,
  'Acquirer Merchant Bank': Building2,
  'Correspondent Bank': Building2,
  'Fintech Program': Layers,
  'Program Manager': Layers,
  Processor: Database,
  'Core Banking System': Database,
  'Wallet App': Wallet,
  'Generic Account': Banknote,
  'FBO Account': Banknote,
  'Settlement Account': Banknote,
  'KYC Gate': ShieldCheck,
  'AML Gate': ShieldCheck,
  'Sanctions Screening Gate': ShieldCheck,
  Ledger: CheckCircle2,
  'Sub Ledger': CheckCircle2,
  'Treasury Operations': CheckCircle2,
};

const colorMap: Record<string, string> = {
  Institutions: 'bg-blue-50 text-blue-700 border-blue-200',
  Systems: 'bg-violet-50 text-violet-700 border-violet-200',
  Accounts: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Gates: 'bg-amber-50 text-amber-700 border-amber-200',
  Control: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

function nodeTone(type: NodeType): string {
  if (type.includes('Bank')) return colorMap.Institutions;
  if (type.includes('Account')) return colorMap.Accounts;
  if (type.includes('Gate') || type.includes('Screening')) return colorMap.Gates;
  if (type.includes('Ledger') || type.includes('Treasury')) return colorMap.Control;
  return colorMap.Systems;
}

export function GenericBankNode({ data, selected }: NodeProps<BankNode>) {
  const Icon = iconMap[data.nodeType];
  const secondary = [data.jurisdiction !== 'Blank' ? data.jurisdiction : '', data.roleInFlow !== 'Blank' ? data.roleInFlow : '']
    .filter(Boolean)
    .join(' • ');

  return (
    <div
      className={clsx(
        'relative h-[110px] w-[220px] rounded-xl border bg-white p-3 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900',
        selected
          ? 'border-blue-500 ring-2 ring-blue-300/70 dark:ring-blue-500/40'
          : 'border-slate-300 hover:shadow-md dark:border-slate-700',
      )}
    >
      <Handle type="target" id="left" position={Position.Left} className="!h-2.5 !w-2.5 !border !border-white !bg-blue-500" />
      <Handle type="source" id="right" position={Position.Right} className="!h-2.5 !w-2.5 !border !border-white !bg-blue-500" />
      <Handle type="target" id="top" position={Position.Top} className="!h-2.5 !w-2.5 !border !border-white !bg-blue-500" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!h-2.5 !w-2.5 !border !border-white !bg-blue-500" />

      <div className="mb-2 flex items-center gap-2">
        <span className={clsx('inline-flex h-7 w-7 items-center justify-center rounded-lg border', nodeTone(data.nodeType))}>
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{data.displayName}</div>
          <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {data.nodeType}
          </div>
        </div>
      </div>

      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{secondary || 'No secondary details'}</div>
    </div>
  );
}
