import {
  AccountType,
  NODE_ACCOUNT_TYPE_OPTIONS,
  Node,
  NodeAccountType,
  NodeBorderStyle,
  NodeData,
  NodeDisplayStyle,
  NodeShape
} from '../types';

const ACCOUNT_TYPE_SET = new Set<string>(NODE_ACCOUNT_TYPE_OPTIONS);

const LEGACY_ACCOUNT_TYPE_MAP: Record<AccountType, NodeAccountType> = {
  [AccountType.DDA]: 'DDA',
  [AccountType.FBO]: 'FBO',
  [AccountType.RESERVE]: 'Reserve',
  [AccountType.SETTLEMENT]: 'Settlement',
  [AccountType.OPERATING]: 'Other',
  [AccountType.SUSPENSE]: 'Suspense',
  [AccountType.WALLET]: 'Wallet',
  [AccountType.VAULT]: 'Other',
  [AccountType.TREASURY]: 'Ledger'
};

export const DEFAULT_NODE_DISPLAY_STYLE: NodeDisplayStyle = 'chips';
export const DEFAULT_NODE_BORDER_STYLE: NodeBorderStyle = 'solid';
export const DEFAULT_NODE_BORDER_WIDTH = 1;
export const DEFAULT_NODE_OPACITY = 100;
export const DEFAULT_NODE_SCALE = 1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeNodeIdentityToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

export const isNodeAccountType = (value: unknown): value is NodeAccountType =>
  typeof value === 'string' && ACCOUNT_TYPE_SET.has(value);

const toAccountTypeFromFreeform = (value: string): NodeAccountType | undefined => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (normalized === 'dda' || normalized.includes('checking')) return 'DDA';
  if (normalized.startsWith('fbo')) return 'FBO';
  if (normalized.startsWith('reserve')) return 'Reserve';
  if (normalized.startsWith('settlement')) return 'Settlement';
  if (normalized.startsWith('nostro')) return 'Nostro';
  if (normalized.startsWith('vostro')) return 'Vostro';
  if (normalized.startsWith('wallet')) return 'Wallet';
  if (normalized.startsWith('ledger') || normalized.includes('treasury')) return 'Ledger';
  if (normalized.startsWith('clearing')) return 'Clearing';
  if (normalized.startsWith('prefund')) return 'Prefund';
  if (normalized.startsWith('chargeback')) return 'Chargeback';
  if (normalized.startsWith('suspense')) return 'Suspense';
  if (normalized.startsWith('trust')) return 'Trust';
  if (normalized.startsWith('escrow')) return 'Escrow';
  if (normalized === 'other') return 'Other';

  return undefined;
};

export const normalizeNodeAccountType = (
  value: unknown,
  fallback?: unknown
): NodeAccountType | undefined => {
  if (isNodeAccountType(value)) return value;

  if (typeof value === 'string') {
    const inferred = toAccountTypeFromFreeform(value);
    if (inferred) return inferred;
  }

  if (typeof fallback === 'string') {
    if ((Object.values(AccountType) as string[]).includes(fallback)) {
      return LEGACY_ACCOUNT_TYPE_MAP[fallback as AccountType] || undefined;
    }
    const inferredFallback = toAccountTypeFromFreeform(fallback);
    if (inferredFallback) return inferredFallback;
  }

  return undefined;
};

export const resolveNodeShape = (node: Node): NodeShape => node.data?.shape || node.shape || NodeShape.RECTANGLE;

export const resolveNodeDisplayStyle = (node: Node): NodeDisplayStyle => {
  const style = node.data?.displayStyle;
  if (style === 'chips' || style === 'compact' || style === 'hidden') return style;
  return DEFAULT_NODE_DISPLAY_STYLE;
};

export const resolveNodeBorderStyle = (node: Node): NodeBorderStyle => {
  const style = node.data?.borderStyle;
  if (style === 'solid' || style === 'dashed' || style === 'dotted') return style;
  if (node.data?.isPhantom) return 'dashed';
  return DEFAULT_NODE_BORDER_STYLE;
};

export const resolveNodeOpacity = (node: Node): number => {
  if (typeof node.data?.opacity === 'number' && Number.isFinite(node.data.opacity)) {
    return clamp(node.data.opacity, 0, 100);
  }
  if (node.data?.isPhantom) return 58;
  return DEFAULT_NODE_OPACITY;
};

export const resolveNodeScale = (node: Node): number => {
  if (typeof node.data?.scale === 'number' && Number.isFinite(node.data.scale)) {
    return clamp(node.data.scale, 0.6, 2);
  }
  return DEFAULT_NODE_SCALE;
};

export const resolveNodeBorderWidth = (node: Node): number => {
  if (typeof node.data?.borderWidth === 'number' && Number.isFinite(node.data.borderWidth)) {
    return clamp(node.data.borderWidth, 1, 8);
  }
  return node.data?.isPhantom ? 2 : DEFAULT_NODE_BORDER_WIDTH;
};

export const resolveNodeFillColor = (node: Node): string | undefined => node.data?.fillColor || node.color;

export const resolveNodeBorderColor = (node: Node): string | undefined => node.data?.borderColor || undefined;

export const withNodeDataDefaults = (node: Node): Node => {
  const normalizedLabel = (node.label || '').trim();
  const resolvedLabel = normalizedLabel || node.type;
  const isNameAuto =
    typeof node.isNameAuto === 'boolean'
      ? node.isNameAuto
      : typeof node.data?.isNameAuto === 'boolean'
        ? node.data.isNameAuto
        : normalizeNodeIdentityToken(resolvedLabel) === normalizeNodeIdentityToken(node.type);
  const accountType = normalizeNodeAccountType(node.data?.accountType, node.accountType);

  return {
    ...node,
    label: resolvedLabel,
    isNameAuto,
    data: {
      ...node.data,
      isNameAuto,
      accountType,
      showLabel: node.data?.showLabel ?? false,
      showType: node.data?.showType ?? true,
      showAccount: node.data?.showAccount ?? true,
      showAccountDetails: node.data?.showAccountDetails ?? false,
      displayStyle: resolveNodeDisplayStyle(node),
      shape: resolveNodeShape(node),
      borderStyle: resolveNodeBorderStyle(node),
      borderWidth: resolveNodeBorderWidth(node),
      opacity: resolveNodeOpacity(node),
      scale: resolveNodeScale(node)
    }
  };
};

export const defaultAccountDetailsPlaceholder = (accountType: NodeAccountType | '' | undefined): string => {
  if (accountType === 'FBO') {
    return 'Optional: FBO for whom, custodian, program name';
  }
  if (accountType === 'Nostro') {
    return 'Optional: Counterparty bank, branch, currency corridor';
  }
  if (accountType === 'Vostro') {
    return 'Optional: Respondent institution and settlement instructions';
  }
  if (accountType === 'Settlement') {
    return 'Optional: Settlement window, cut-off, reserve policy';
  }
  if (accountType === 'Escrow' || accountType === 'Trust') {
    return 'Optional: Trustee, legal structure, release conditions';
  }
  return 'Optional: ownership context, routing notes, custodian';
};

export const getNodeDisplayItems = (node: Node): string[] => {
  const data = withNodeDataDefaults(node).data as NodeData;
  const items: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (value: string | undefined) => {
    if (!value) return;
    const normalized = value.trim();
    if (!normalized) return;
    const token = normalized.toLowerCase();
    if (seen.has(token)) return;
    seen.add(token);
    items.push(normalized);
  };

  if (data.showLabel) {
    pushUnique(node.label);
  }
  if (data.showType) {
    pushUnique(node.type);
  }
  if (data.showAccount && data.accountType) {
    pushUnique(data.accountType);
  }
  if (data.showAccountDetails && data.accountDetails) {
    pushUnique(data.accountDetails);
  }

  return items;
};
