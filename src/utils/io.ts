import {
  CARD_NETWORK_OPTIONS,
  CARD_STAGE_OPTIONS,
  EDGE_DIRECTION_OPTIONS,
  EDGE_MESSAGE_FUNDS_OPTIONS,
  EDGE_RAIL_OPTIONS,
  EDGE_SETTLEMENT_OPTIONS,
  JURISDICTION_OPTIONS,
  NODE_TYPES,
  ROLE_IN_FLOW_OPTIONS,
  type BankEdge,
  type BankEdgeData,
  type BankNode,
  type DiagramPayload,
  type Swimlane,
} from '../types';
import { z } from 'zod';
import {
  createEdgeData,
  createNodeData,
  decorateEdge,
  defaultLanes,
  defaultUI,
  NODE_HEIGHT,
  NODE_WIDTH,
  STORAGE_KEY,
  VERSION,
} from './factory';

const RawUiSchema = z
  .object({
    darkMode: z.boolean().optional(),
    backgroundMode: z.enum(['grid', 'dots', 'none']).optional(),
    snapToGrid: z.boolean().optional(),
    autoLayoutDirection: z.enum(['LR', 'TB']).optional(),
    showSwimlanes: z.boolean().optional(),
    laneOrientation: z.enum(['horizontal', 'vertical']).optional(),
    showMiniMap: z.boolean().optional(),
    exportIncludeSwimlanes: z.boolean().optional(),
    exportIncludeBackground: z.boolean().optional(),
  })
  .passthrough();

const RawPayloadSchema = z
  .object({
    version: z.string().optional(),
    timestamp: z.string().optional(),
    nodes: z.array(z.unknown()).optional(),
    edges: z.array(z.unknown()).optional(),
    lanes: z.array(z.unknown()).optional(),
    ui: RawUiSchema.optional(),
  })
  .passthrough();

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeNodes(raw: unknown): BankNode[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!isObject(item) || !isObject(item.data) || !isObject(item.position)) {
        return null;
      }

      const id = typeof item.id === 'string' ? item.id : null;
      const nodeType = item.data.nodeType;
      if (!id || typeof nodeType !== 'string' || !NODE_TYPES.includes(nodeType as (typeof NODE_TYPES)[number])) {
        return null;
      }

      const defaults = createNodeData(id, nodeType as (typeof NODE_TYPES)[number]);
      const jurisdiction =
        typeof item.data.jurisdiction === 'string' &&
        JURISDICTION_OPTIONS.includes(item.data.jurisdiction as (typeof JURISDICTION_OPTIONS)[number])
          ? item.data.jurisdiction
          : 'Blank';
      const roleInFlow =
        typeof item.data.roleInFlow === 'string' &&
        ROLE_IN_FLOW_OPTIONS.includes(item.data.roleInFlow as (typeof ROLE_IN_FLOW_OPTIONS)[number])
          ? item.data.roleInFlow
          : 'Blank';

      return {
        ...(item as BankNode),
        id,
        type: 'bankNode',
        width: typeof item.width === 'number' ? item.width : NODE_WIDTH,
        height: typeof item.height === 'number' ? item.height : NODE_HEIGHT,
        data: {
          ...defaults,
          ...item.data,
          id,
          nodeType,
          displayName:
            typeof item.data.displayName === 'string' && item.data.displayName.trim()
              ? item.data.displayName
              : nodeType,
          description: typeof item.data.description === 'string' ? item.data.description : '',
          jurisdiction,
          roleInFlow,
        },
      } as BankNode;
    })
    .filter((node): node is BankNode => Boolean(node));
}

function normalizeEdges(raw: unknown): BankEdge[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }
      const id = typeof item.id === 'string' ? item.id : null;
      const source = typeof item.source === 'string' ? item.source : null;
      const target = typeof item.target === 'string' ? item.target : null;
      if (!id || !source || !target || source === target) {
        return null;
      }

      const defaults = createEdgeData(id);
      const data = isObject(item.data) ? item.data : {};
      const rail =
        typeof data.rail === 'string' && EDGE_RAIL_OPTIONS.includes(data.rail as (typeof EDGE_RAIL_OPTIONS)[number])
          ? (data.rail as BankEdgeData['rail'])
          : defaults.rail;
      const settlementType =
        typeof data.settlementType === 'string' &&
        EDGE_SETTLEMENT_OPTIONS.includes(data.settlementType as (typeof EDGE_SETTLEMENT_OPTIONS)[number])
          ? (data.settlementType as BankEdgeData['settlementType'])
          : typeof data.settlementSpeed === 'string' &&
              EDGE_SETTLEMENT_OPTIONS.includes(data.settlementSpeed as (typeof EDGE_SETTLEMENT_OPTIONS)[number])
            ? (data.settlementSpeed as BankEdgeData['settlementType'])
          : defaults.settlementType;
      const direction =
        typeof data.direction === 'string' &&
        EDGE_DIRECTION_OPTIONS.includes(data.direction as (typeof EDGE_DIRECTION_OPTIONS)[number])
          ? (data.direction as BankEdgeData['direction'])
          : defaults.direction;
      const messageOrFunds =
        typeof data.messageOrFunds === 'string' &&
        EDGE_MESSAGE_FUNDS_OPTIONS.includes(data.messageOrFunds as (typeof EDGE_MESSAGE_FUNDS_OPTIONS)[number])
          ? (data.messageOrFunds as BankEdgeData['messageOrFunds'])
          : defaults.messageOrFunds;
      const networkName =
        typeof data.networkName === 'string' &&
        CARD_NETWORK_OPTIONS.includes(data.networkName as (typeof CARD_NETWORK_OPTIONS)[number])
          ? (data.networkName as BankEdgeData['networkName'])
          : defaults.networkName;
      const transactionStage =
        typeof data.transactionStage === 'string' &&
        CARD_STAGE_OPTIONS.includes(data.transactionStage as (typeof CARD_STAGE_OPTIONS)[number])
          ? (data.transactionStage as BankEdgeData['transactionStage'])
          : defaults.transactionStage;

      return decorateEdge({
        ...(item as BankEdge),
        id,
        source,
        target,
        type: 'straight',
        data: {
          ...defaults,
          ...data,
          id,
          rail,
          settlementType,
          direction,
          messageOrFunds,
          notes: typeof data.notes === 'string' ? data.notes : '',
          networkName,
          transactionStage,
        },
      });
    })
    .filter((edge): edge is BankEdge => Boolean(edge));
}

function normalizeLanes(raw: unknown, orientation: 'horizontal' | 'vertical'): Swimlane[] {
  if (!Array.isArray(raw) || !raw.length) {
    return defaultLanes(orientation);
  }

  return raw
    .map((item, index) => {
      if (!isObject(item) || typeof item.id !== 'string') {
        return null;
      }
      return {
        id: item.id,
        label: typeof item.label === 'string' && item.label.trim().length ? item.label : `Lane ${index + 1}`,
        order: typeof item.order === 'number' ? item.order : index,
        size: typeof item.size === 'number' ? Math.max(80, item.size) : 220,
        visible: typeof item.visible === 'boolean' ? item.visible : true,
        orientation:
          item.orientation === 'horizontal' || item.orientation === 'vertical' ? item.orientation : orientation,
      };
    })
    .filter((lane): lane is Swimlane => Boolean(lane))
    .sort((a, b) => a.order - b.order)
    .map((lane, order) => ({ ...lane, order }));
}

export function normalizePayload(raw: unknown): DiagramPayload | null {
  const parsed = RawPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  const uiRaw = parsed.data.ui ?? {};
  const orientation = uiRaw.laneOrientation === 'vertical' ? 'vertical' : 'horizontal';

  return {
    version: parsed.data.version ?? VERSION,
    timestamp: parsed.data.timestamp ?? new Date().toISOString(),
    nodes: normalizeNodes(parsed.data.nodes),
    edges: normalizeEdges(parsed.data.edges),
    lanes: normalizeLanes(parsed.data.lanes, orientation),
    ui: {
      ...defaultUI,
      ...uiRaw,
      laneOrientation: orientation,
      autoLayoutDirection:
        uiRaw.autoLayoutDirection === 'LR' || uiRaw.autoLayoutDirection === 'TB'
          ? uiRaw.autoLayoutDirection
          : defaultUI.autoLayoutDirection,
      backgroundMode:
        uiRaw.backgroundMode === 'grid' || uiRaw.backgroundMode === 'dots' || uiRaw.backgroundMode === 'none'
          ? uiRaw.backgroundMode
          : defaultUI.backgroundMode,
    },
  };
}

export function readFromStorage(): DiagramPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizePayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeToStorage(payload: DiagramPayload): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function parseJsonFile(file: File): Promise<DiagramPayload | null> {
  try {
    const text = await file.text();
    return normalizePayload(JSON.parse(text));
  } catch {
    return null;
  }
}

export function downloadJson(payload: DiagramPayload, fileName = 'banking-diagram.json'): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
