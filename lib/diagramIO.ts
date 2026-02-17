import {
  AccountType,
  BatchingType,
  DiagramSnapshot,
  Edge,
  EdgeData,
  EndPointType,
  EntityType,
  ExportPayloadV2,
  FlowDirection,
  GridMode,
  LayoutSettings,
  Node,
  NodeHandleConfig,
  NodeBorderStyle,
  NodeData,
  NodeDisplayStyle,
  NodeShape,
  PaymentRail,
  ReconciliationMethod
} from '../types';
import { normalizeNodeAccountType } from './nodeDisplay';

export const GRAPH_SCHEMA_VERSION = 2;
export const WORKSPACE_EXPORT_SCHEMA_VERSION = 4;
export const NOTE_MAX_LENGTH = 20_000;

const DIAGRAM_BACKUP_SUFFIX = '.backups.v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toSafeString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const toIsoTimestamp = (value: unknown): string | undefined => {
  const next = toSafeString(value);
  if (!next) return undefined;
  return Number.isNaN(Date.parse(next)) ? undefined : next;
};

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isGridMode = (value: unknown): value is GridMode =>
  value === 'none' || value === 'lines' || value === 'dots';

const isEntityType = (value: unknown): value is EntityType =>
  typeof value === 'string' && (Object.values(EntityType) as string[]).includes(value);

const isNodeShape = (value: unknown): value is NodeShape =>
  typeof value === 'string' && (Object.values(NodeShape) as string[]).includes(value);

const isPaymentRail = (value: unknown): value is PaymentRail =>
  typeof value === 'string' && (Object.values(PaymentRail) as string[]).includes(value);

const isFlowDirection = (value: unknown): value is FlowDirection =>
  typeof value === 'string' && (Object.values(FlowDirection) as string[]).includes(value);

const isAccountType = (value: unknown): value is AccountType =>
  typeof value === 'string' && (Object.values(AccountType) as string[]).includes(value);

const isNodeDisplayStyle = (value: unknown): value is NodeDisplayStyle =>
  value === 'chips' || value === 'compact' || value === 'hidden';

const isNodeBorderStyle = (value: unknown): value is NodeBorderStyle =>
  value === 'solid' || value === 'dashed' || value === 'dotted';

const isNodeHandleSide = (value: unknown): value is 'top' | 'right' | 'bottom' | 'left' =>
  value === 'top' || value === 'right' || value === 'bottom' || value === 'left';

const isEndPointType = (value: unknown): value is EndPointType =>
  typeof value === 'string' && (Object.values(EndPointType) as string[]).includes(value);

const isReconciliationMethod = (value: unknown): value is ReconciliationMethod =>
  typeof value === 'string' && (Object.values(ReconciliationMethod) as string[]).includes(value);

const isBatchingType = (value: unknown): value is BatchingType =>
  typeof value === 'string' && (Object.values(BatchingType) as string[]).includes(value);

const sanitizeHandleConfig = (value: unknown): NodeHandleConfig | undefined => {
  if (!isRecord(value)) return undefined;

  const normalizeSides = (entry: unknown) =>
    Array.isArray(entry)
      ? Array.from(new Set(entry.filter(isNodeHandleSide)))
      : undefined;

  const sources = normalizeSides(value.sources);
  const targets = normalizeSides(value.targets);
  const bidirectional = typeof value.bidirectional === 'boolean' ? value.bidirectional : undefined;

  if (!sources && !targets && typeof bidirectional === 'undefined') return undefined;
  return {
    ...(sources ? { sources } : {}),
    ...(targets ? { targets } : {}),
    ...(typeof bidirectional === 'boolean' ? { bidirectional } : {})
  };
};

const sanitizePosition = (value: unknown): { x: number; y: number } | null => {
  if (!isRecord(value)) return null;
  const x = toFiniteNumber(value.x);
  const y = toFiniteNumber(value.y);
  if (x === null || y === null) return null;
  return { x, y };
};

export const sanitizeNotesText = (value: unknown, maxLength = NOTE_MAX_LENGTH): string => {
  if (typeof value !== 'string') return '';
  const normalized = value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength);
};

const getLegacyNodeNotes = (nodeValue: Record<string, unknown>, nodeDataValue: Record<string, unknown>): string => {
  const directLegacy =
    toSafeString(nodeDataValue.documentation) ||
    toSafeString(nodeDataValue.note) ||
    toSafeString(nodeValue.notes) ||
    toSafeString(nodeValue.note);
  return sanitizeNotesText(directLegacy);
};

const getLegacyEdgeNotes = (edgeValue: Record<string, unknown>, edgeDataValue: Record<string, unknown>): string => {
  const directLegacy =
    toSafeString(edgeDataValue.documentation) ||
    toSafeString(edgeDataValue.note) ||
    toSafeString(edgeValue.notes) ||
    toSafeString(edgeValue.note) ||
    toSafeString(edgeValue.description);
  return sanitizeNotesText(directLegacy);
};

const migrateNodeRecordV1toV2 = (nodeValue: Record<string, unknown>): Record<string, unknown> => {
  const nodeDataValue = isRecord(nodeValue.data) ? { ...nodeValue.data } : {};
  const migratedData: Record<string, unknown> = { ...nodeDataValue };

  if (!hasOwn(migratedData, 'notes') || migratedData.notes == null) {
    migratedData.notes = getLegacyNodeNotes(nodeValue, nodeDataValue);
  } else {
    migratedData.notes = sanitizeNotesText(migratedData.notes);
  }

  if ((!hasOwn(migratedData, 'accountType') || migratedData.accountType == null) && nodeValue.accountType != null) {
    migratedData.accountType = nodeValue.accountType;
  }

  return {
    ...nodeValue,
    data: migratedData
  };
};

const migrateEdgeRecordV1toV2 = (edgeValue: Record<string, unknown>): Record<string, unknown> => {
  const edgeDataValue = isRecord(edgeValue.data) ? { ...edgeValue.data } : {};
  const migratedData: Record<string, unknown> = { ...edgeDataValue };

  if (!hasOwn(migratedData, 'notes') || migratedData.notes == null) {
    migratedData.notes = getLegacyEdgeNotes(edgeValue, edgeDataValue);
  } else {
    migratedData.notes = sanitizeNotesText(migratedData.notes);
  }

  return {
    ...edgeValue,
    data: migratedData
  };
};

const migrateGraphRecordV1toV2 = (graphValue: Record<string, unknown>): Record<string, unknown> => {
  const nodes = Array.isArray(graphValue.nodes)
    ? graphValue.nodes.map((nodeValue) => (isRecord(nodeValue) ? migrateNodeRecordV1toV2(nodeValue) : nodeValue))
    : [];
  const edges = Array.isArray(graphValue.edges)
    ? graphValue.edges.map((edgeValue) => (isRecord(edgeValue) ? migrateEdgeRecordV1toV2(edgeValue) : edgeValue))
    : [];

  return {
    ...graphValue,
    nodes,
    edges,
    schemaVersion: 2
  };
};

export const migrateGraphToLatest = (value: unknown): unknown => {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return null;

  let current: Record<string, unknown> = {
    ...value,
    nodes: [...value.nodes],
    edges: [...value.edges],
    drawings: Array.isArray(value.drawings) ? [...value.drawings] : []
  };

  const sourceSchemaVersion =
    typeof value.schemaVersion === 'number' && Number.isFinite(value.schemaVersion)
      ? Math.floor(value.schemaVersion)
      : 1;

  if (sourceSchemaVersion < 2) {
    current = migrateGraphRecordV1toV2(current);
  }

  current.schemaVersion = GRAPH_SCHEMA_VERSION;
  return current;
};

const sanitizeNode = (value: unknown): Node | null => {
  if (!isRecord(value)) return null;
  const id = toSafeString(value.id);
  const label = toSafeString(value.label);
  const type = value.type;
  const position = sanitizePosition(value.position);
  if (!id || !label || !isEntityType(type) || !position) return null;

  const rawData = isRecord(value.data) ? value.data : null;
  const dataShape = rawData && isNodeShape(rawData.shape) ? rawData.shape : undefined;
  const shape = dataShape
    ? dataShape
    : isNodeShape(value.shape)
      ? value.shape
      : type === EntityType.GATE
        ? NodeShape.DIAMOND
        : NodeShape.RECTANGLE;

  const width = toFiniteNumber(value.width);
  const height = toFiniteNumber(value.height);
  const zIndex = toFiniteNumber(value.zIndex);
  const swimlaneId = toFiniteNumber(value.swimlaneId);
  const accountType = normalizeNodeAccountType(rawData?.accountType, value.accountType);
  const isNameAuto =
    typeof value.isNameAuto === 'boolean'
      ? value.isNameAuto
      : typeof rawData?.isNameAuto === 'boolean'
        ? rawData.isNameAuto
        : undefined;

  const nextData: NodeData = {
    ...(rawData || {}),
    accountType,
    accountDetails: toSafeString(rawData?.accountDetails) || undefined,
    showLabel: typeof rawData?.showLabel === 'boolean' ? rawData.showLabel : undefined,
    showType: typeof rawData?.showType === 'boolean' ? rawData.showType : undefined,
    showAccount: typeof rawData?.showAccount === 'boolean' ? rawData.showAccount : undefined,
    showAccountDetails:
      typeof rawData?.showAccountDetails === 'boolean' ? rawData.showAccountDetails : undefined,
    displayStyle: isNodeDisplayStyle(rawData?.displayStyle) ? rawData.displayStyle : undefined,
    shape: dataShape,
    fillColor: toSafeString(rawData?.fillColor) || undefined,
    borderColor: toSafeString(rawData?.borderColor) || undefined,
    borderWidth:
      rawData && toFiniteNumber(rawData.borderWidth) !== null
        ? Math.min(8, Math.max(1, toFiniteNumber(rawData.borderWidth) || 1))
        : undefined,
    borderStyle: isNodeBorderStyle(rawData?.borderStyle) ? rawData.borderStyle : undefined,
    opacity:
      rawData && toFiniteNumber(rawData.opacity) !== null
        ? Math.min(100, Math.max(0, toFiniteNumber(rawData.opacity) || 0))
        : undefined,
    isPhantom: typeof rawData?.isPhantom === 'boolean' ? rawData.isPhantom : undefined,
    isLocked: typeof rawData?.isLocked === 'boolean' ? rawData.isLocked : undefined,
    scale:
      rawData && toFiniteNumber(rawData.scale) !== null
        ? Math.min(2, Math.max(0.6, toFiniteNumber(rawData.scale) || 1))
        : undefined,
    notes: sanitizeNotesText(rawData?.notes),
    isNameAuto,
    handleConfig: sanitizeHandleConfig(rawData?.handleConfig)
  };

  const hasNodeData = Object.values(nextData).some((entry) => typeof entry !== 'undefined');

  return {
    id,
    label,
    isNameAuto,
    type,
    shape,
    position,
    color: toSafeString(value.color) || undefined,
    description: toSafeString(value.description) || undefined,
    endPointType: isEndPointType(value.endPointType) ? value.endPointType : undefined,
    isConnectorHandle: typeof value.isConnectorHandle === 'boolean' ? value.isConnectorHandle : undefined,
    width: width !== null && width > 0 ? width : undefined,
    height: height !== null && height > 0 ? height : undefined,
    zIndex: zIndex !== null ? zIndex : undefined,
    swimlaneId: swimlaneId !== null && swimlaneId > 0 ? swimlaneId : undefined,
    data: hasNodeData ? nextData : undefined
  };
};

const sanitizeEdge = (value: unknown): Edge | null => {
  if (!isRecord(value)) return null;
  const id = toSafeString(value.id);
  const sourceId = toSafeString(value.sourceId);
  const targetId = toSafeString(value.targetId);
  if (!id || !sourceId || !targetId) return null;

  const sourcePortIdx = toFiniteNumber(value.sourcePortIdx);
  const targetPortIdx = toFiniteNumber(value.targetPortIdx);
  const thickness = toFiniteNumber(value.thickness);
  const sequence = toFiniteNumber(value.sequence);

  const style =
    value.style === 'solid' || value.style === 'dashed' || value.style === 'dotted'
      ? value.style
      : 'solid';
  const pathType = value.pathType === 'orthogonal' ? 'orthogonal' : 'bezier';
  const rawData = isRecord(value.data) ? value.data : null;

  const nextData: EdgeData = {
    ...(rawData || {}),
    notes: sanitizeNotesText(rawData?.notes)
  };

  const hasEdgeData = Object.values(nextData).some((entry) => typeof entry !== 'undefined');

  return {
    id,
    sourceId,
    targetId,
    sourcePortIdx: sourcePortIdx !== null ? sourcePortIdx : 1,
    targetPortIdx: targetPortIdx !== null ? targetPortIdx : 3,
    rail: isPaymentRail(value.rail) ? value.rail : PaymentRail.BLANK,
    direction: isFlowDirection(value.direction) ? value.direction : FlowDirection.PUSH,
    label: toSafeString(value.label) || 'Transfer',
    isFX: typeof value.isFX === 'boolean' ? value.isFX : false,
    fxPair: toSafeString(value.fxPair) || undefined,
    pathType,
    style,
    curvature: toFiniteNumber(value.curvature) ?? undefined,
    color: toSafeString(value.color) || undefined,
    showArrowHead: typeof value.showArrowHead === 'boolean' ? value.showArrowHead : true,
    showMidArrow: typeof value.showMidArrow === 'boolean' ? value.showMidArrow : undefined,
    thickness: thickness !== null && thickness > 0 ? thickness : 2,
    sequence: sequence !== null && sequence >= 0 ? Math.floor(sequence) : undefined,
    amount: toSafeString(value.amount) || undefined,
    currency: toSafeString(value.currency) || undefined,
    timing: toSafeString(value.timing) || undefined,
    recoMethod: isReconciliationMethod(value.recoMethod) ? value.recoMethod : undefined,
    batching: isBatchingType(value.batching) ? value.batching : undefined,
    dataSchema: toSafeString(value.dataSchema) || undefined,
    description: toSafeString(value.description) || undefined,
    isExceptionPath: typeof value.isExceptionPath === 'boolean' ? value.isExceptionPath : undefined,
    data: hasEdgeData ? nextData : undefined
  };
};

const sanitizeDrawing = (value: unknown) => {
  if (!isRecord(value)) return null;
  const id = toSafeString(value.id);
  if (!id) return null;

  const points = Array.isArray(value.points)
    ? value.points.map(sanitizePosition).filter((point): point is { x: number; y: number } => !!point)
    : [];
  if (points.length === 0) return null;

  const width = toFiniteNumber(value.width);
  return {
    id,
    points,
    color: toSafeString(value.color) || '#0f172a',
    width: width !== null && width > 0 ? width : 2
  };
};

const toSchemaVersion = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : GRAPH_SCHEMA_VERSION;

export const cloneSnapshot = (snapshot: DiagramSnapshot): DiagramSnapshot => ({
  schemaVersion: toSchemaVersion(snapshot.schemaVersion),
  nodes: snapshot.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: node.data ? { ...node.data } : undefined
  })),
  edges: snapshot.edges.map((edge) => ({
    ...edge,
    data: edge.data ? { ...edge.data } : undefined
  })),
  drawings: snapshot.drawings.map((drawing) => ({
    ...drawing,
    points: drawing.points.map((point) => ({ ...point }))
  }))
});

export const createEmptySnapshot = (): DiagramSnapshot => ({
  schemaVersion: GRAPH_SCHEMA_VERSION,
  nodes: [],
  edges: [],
  drawings: []
});

export const sanitizeDiagramSnapshot = (value: unknown): DiagramSnapshot | null => {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return null;

  const nodes = value.nodes.map(sanitizeNode).filter((node): node is Node => !!node);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = value.edges
    .map(sanitizeEdge)
    .filter((edge): edge is Edge => !!edge && nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId));
  const drawings = Array.isArray(value.drawings)
    ? value.drawings
        .map(sanitizeDrawing)
        .filter((drawing): drawing is DiagramSnapshot['drawings'][number] => !!drawing)
    : [];

  return {
    schemaVersion: toSchemaVersion(value.schemaVersion),
    nodes,
    edges,
    drawings
  };
};

export const sanitizeLayoutSettings = (value: unknown): Partial<LayoutSettings> => {
  if (!isRecord(value)) return {};

  const next: Partial<LayoutSettings> = {};
  if (typeof value.showSwimlanes === 'boolean') next.showSwimlanes = value.showSwimlanes;
  if (typeof value.isDarkMode === 'boolean') next.isDarkMode = value.isDarkMode;
  if (typeof value.showPorts === 'boolean') next.showPorts = value.showPorts;
  if (isGridMode(value.gridMode)) next.gridMode = value.gridMode;

  if (Array.isArray(value.swimlaneLabels)) {
    const labels = value.swimlaneLabels
      .map((label) => (typeof label === 'string' ? label.trim() : ''))
      .filter((label) => label.length > 0);
    if (labels.length >= 2) next.swimlaneLabels = labels;
  }

  const laneCount = next.swimlaneLabels?.length;
  const sanitizeLaneIdArray = (candidate: unknown): number[] | undefined => {
    if (!Array.isArray(candidate)) return undefined;
    const normalized = Array.from(
      new Set(
        candidate
          .map((entry) => (typeof entry === 'number' && Number.isFinite(entry) ? Math.floor(entry) : 0))
          .filter((entry) => entry > 0)
      )
    ).sort((a, b) => a - b);
    if (normalized.length === 0) return [];
    if (!laneCount) return normalized;
    return normalized.filter((entry) => entry <= laneCount);
  };

  const collapsed = sanitizeLaneIdArray(value.swimlaneCollapsedIds);
  if (collapsed) next.swimlaneCollapsedIds = collapsed;
  const locked = sanitizeLaneIdArray(value.swimlaneLockedIds);
  if (locked) next.swimlaneLockedIds = locked;
  const hidden = sanitizeLaneIdArray(value.swimlaneHiddenIds);
  if (hidden) next.swimlaneHiddenIds = hidden;

  return next;
};

const migrateAndSanitizeDiagram = (value: unknown): DiagramSnapshot | null => {
  const migrated = migrateGraphToLatest(value);
  if (!migrated) return null;
  return sanitizeDiagramSnapshot(migrated);
};

export const parseImportPayload = (
  value: unknown
): {
  diagram: DiagramSnapshot;
  layout: Partial<LayoutSettings>;
  workspace: {
    workspaceId?: string;
    shortWorkspaceId?: string;
    name?: string;
    schemaVersion?: number;
    createdAt?: string;
    updatedAt?: string;
  };
} | null => {
  if (!isRecord(value)) return null;

  const workspaceMeta = {
    workspaceId: toSafeString(value.workspaceId) || undefined,
    shortWorkspaceId: toSafeString(value.shortWorkspaceId) || undefined,
    name: toSafeString(value.name) || undefined,
    schemaVersion:
      typeof value.schemaVersion === 'number' && Number.isFinite(value.schemaVersion)
        ? Math.floor(value.schemaVersion)
        : undefined,
    createdAt: toIsoTimestamp(value.createdAt),
    updatedAt: toIsoTimestamp(value.updatedAt)
  };

  if ((value.version === 2 || value.version === 3 || value.version === 4) && value.diagram) {
    const diagram = migrateAndSanitizeDiagram(value.diagram);
    if (!diagram) return null;
    return {
      diagram,
      layout: sanitizeLayoutSettings(value.layout),
      workspace: workspaceMeta
    };
  }

  const legacyDiagram = migrateAndSanitizeDiagram(value);
  if (!legacyDiagram) return null;
  return { diagram: legacyDiagram, layout: {}, workspace: workspaceMeta };
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export const hasStorageValue = (storageKey: string): boolean => {
  try {
    return sessionStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
};

const backupStorageKeyFor = (storageKey: string): string => `${storageKey}${DIAGRAM_BACKUP_SUFFIX}`;

type DiagramBackupEntry = {
  savedAt: string;
  diagram: DiagramSnapshot;
};

const readBackupEntries = (storageKey: string): DiagramBackupEntry[] => {
  try {
    const raw = sessionStorage.getItem(backupStorageKeyFor(storageKey));
    if (!raw) return [];
    const parsed = safeJsonParse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (!isRecord(entry)) return null;
        const savedAt = toSafeString(entry.savedAt);
        if (!savedAt) return null;
        const diagram = migrateAndSanitizeDiagram(entry.diagram);
        if (!diagram) return null;
        return { savedAt, diagram } satisfies DiagramBackupEntry;
      })
      .filter((entry): entry is DiagramBackupEntry => !!entry)
      .sort((a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt));
  } catch {
    return [];
  }
};

const writeBackupEntries = (storageKey: string, entries: DiagramBackupEntry[]): boolean => {
  try {
    sessionStorage.setItem(backupStorageKeyFor(storageKey), JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
};

export const persistDiagramBackup = (
  storageKey: string,
  snapshot: DiagramSnapshot,
  maxEntries = 5
): boolean => {
  const nextSnapshot = cloneSnapshot({ ...snapshot, schemaVersion: GRAPH_SCHEMA_VERSION });
  const existing = readBackupEntries(storageKey);
  const nextEntries = [...existing, { savedAt: new Date().toISOString(), diagram: nextSnapshot }].slice(
    -Math.max(1, maxEntries)
  );
  return writeBackupEntries(storageKey, nextEntries);
};

export const loadLatestDiagramBackup = (
  storageKey: string
): { savedAt: string; diagram: DiagramSnapshot } | null => {
  const entries = readBackupEntries(storageKey);
  if (entries.length === 0) return null;
  return entries[entries.length - 1] || null;
};

export const loadDiagramFromStorage = (storageKey: string): DiagramSnapshot | null => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = safeJsonParse(raw);

    if (isRecord(parsed) && (parsed.version === 2 || parsed.version === 3) && parsed.diagram) {
      return migrateAndSanitizeDiagram(parsed.diagram);
    }

    return migrateAndSanitizeDiagram(parsed);
  } catch {
    return null;
  }
};

export const loadLayoutFromStorage = (storageKey: string): Partial<LayoutSettings> | null => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return sanitizeLayoutSettings(safeJsonParse(raw));
  } catch {
    return null;
  }
};

export const persistDiagramToStorage = (storageKey: string, snapshot: DiagramSnapshot): boolean => {
  try {
    const normalized = cloneSnapshot({ ...snapshot, schemaVersion: GRAPH_SCHEMA_VERSION });
    sessionStorage.setItem(storageKey, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
};

export const persistLayoutToStorage = (storageKey: string, layout: LayoutSettings): boolean => {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(layout));
    return true;
  } catch {
    return false;
  }
};

export const createExportPayload = (
  diagram: DiagramSnapshot,
  layout: LayoutSettings,
  workspace: {
    workspaceId: string;
    shortWorkspaceId: string;
    name: string;
    schemaVersion: number;
    createdAt: string;
    updatedAt: string;
  }
): ExportPayloadV2 => ({
  version: WORKSPACE_EXPORT_SCHEMA_VERSION,
  workspaceId: workspace.workspaceId,
  shortWorkspaceId: workspace.shortWorkspaceId,
  name: workspace.name,
  schemaVersion: workspace.schemaVersion,
  createdAt: workspace.createdAt,
  updatedAt: workspace.updatedAt,
  diagram: cloneSnapshot({ ...diagram, schemaVersion: GRAPH_SCHEMA_VERSION }),
  layout: { ...layout }
});
