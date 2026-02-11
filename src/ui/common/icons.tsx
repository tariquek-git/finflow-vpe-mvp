import type { LucideIcon } from 'lucide-react';
import {
  Building,
  Building2,
  Cpu,
  Database,
  Globe,
  Landmark,
  LayoutGrid,
  Network,
  NotebookText,
  PiggyBank,
  ReceiptText,
  Smartphone,
  Store,
  WalletCards,
  WalletMinimal,
  UsersRound,
  Vault,
} from 'lucide-react';
import type { NodeKind } from '../../core/types';

export const nodeIconMap: Record<NodeKind, LucideIcon> = {
  'Sponsor Bank': Landmark,
  'Issuer Bank': Building2,
  'Acquirer Bank': Store,
  'Correspondent Bank': Building,
  'Central Bank': Globe,
  'Fintech Program': Network,
  'Program Manager': UsersRound,
  Processor: Cpu,
  'Core Banking System': Database,
  'Wallet App': Smartphone,
  'FBO Account': WalletCards,
  DDA: ReceiptText,
  'Omnibus Account': Vault,
  'Virtual Account': WalletMinimal,
  'Internal Ledger': NotebookText,
};

export const categoryIconMap: Record<string, LucideIcon> = {
  Institutions: Landmark,
  Systems: LayoutGrid,
  Custody: PiggyBank,
};
