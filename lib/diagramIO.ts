import {
  AccountType,
  BatchingType,
  DiagramSnapshot,
  Edge,
  EndPointType,
  EntityType,
  ExportPayloadV2,
  FlowDirection,
  GridMode,
  LayoutSettings,
  Node,
  NodeShape,
  PaymentRail,
  ReconciliationMethod
} from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toSafeString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

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

const isEndPointType = (value: unknown): value is EndPointType =>
  typeof value === 'string' && (Object.values(EndPointType) as string[]).includes(value);

const isReconciliationMethod = (value: unknown): value is ReconciliationMethod =>
  typeof value === 'string' && (Object.values(ReconciliationMethod) as string[]).includes(value);

const isBatchingType = (value: unknown): value is BatchingType =>
  typeof value === 'string' && (Object.values(BatchingType) as string[]).includes(value);

const sanitizePosition = (value: unknown): { x: number; y: number } | null => {
  if (!isRecord(value)) return null;
  const x = toFiniteNumber(value.x);
  const y = toFiniteNumber(value.y);
  if (x === null || y === null) return null;
  return { x, y };
};

const sanitizeNode = (value: unknown): Node | null => {
  if (!isRecord(value)) return null;
  const id = toSafeString(value.id);
  const label = toSafeString(value.label);
  const type = value.type;
  const position = sanitizePosition(value.position);
  if (!id || !label || !isEntityType(type) || !position) return null;

  const shape =
    isNodeShape(value.shape)
      ? value.shape
      : type === EntityType.GATE
        ? NodeShape.DIAMOND
        : NodeShape.RECTANGLE;

  const width = toFiniteNumber(value.width);
  const height = toFiniteNumber(value.height);
  const zIndex = toFiniteNumber(value.zIndex);
  const swimlaneId = toFiniteNumber(value.swimlaneId);

  return {
    id,
    label,
    type,
    shape,
    position,
    color: toSafeString(value.color) || undefined,
    description: toSafeString(value.description) || undefined,
    accountType: isAccountType(value.accountType) ? value.accountType : undefined,
    endPointType: isEndPointType(value.endPointType) ? value.endPointType : undefined,
    isConnectorHandle: typeof value.isConnectorHandle === 'boolean' ? value.isConnectorHandle : undefined,
    width: width !== null && width > 0 ? width : undefined,
    height: height !== null && height > 0 ? height : undefined,
    zIndex: zIndex !== null ? zIndex : undefined,
    swimlaneId: swimlaneId !== null && swimlaneId > 0 ? swimlaneId : undefined
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
    isExceptionPath: typeof value.isExceptionPath === 'boolean' ? value.isExceptionPath : undefined
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

export const cloneSnapshot = (snapshot: DiagramSnapshot): DiagramSnapshot => ({
  nodes: snapshot.nodes.map((node) => ({
    ...node,
    position: { ...node.position }
  })),
  edges: snapshot.edges.map((edge) => ({ ...edge })),
  drawings: snapshot.drawings.map((drawing) => ({
    ...drawing,
    points: drawing.points.map((point) => ({ ...point }))
  }))
});

export const createEmptySnapshot = (): DiagramSnapshot => ({
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
    ? value.drawings.map(sanitizeDrawing).filter((drawing): drawing is DiagramSnapshot['drawings'][number] => !!drawing)
    : [];

  return { nodes, edges, drawings };
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

  return next;
};

export const parseImportPayload = (
  value: unknown
): { diagram: DiagramSnapshot; layout: Partial<LayoutSettings> } | null => {
  if (!isRecord(value)) return null;

  if (value.version === 2 && value.diagram) {
    const diagram = sanitizeDiagramSnapshot(value.diagram);
    if (!diagram) return null;
    return {
      diagram,
      layout: sanitizeLayoutSettings(value.layout)
    };
  }

  const legacyDiagram = sanitizeDiagramSnapshot(value);
  if (!legacyDiagram) return null;
  return { diagram: legacyDiagram, layout: {} };
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export const loadDiagramFromStorage = (storageKey: string): DiagramSnapshot | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return sanitizeDiagramSnapshot(safeJsonParse(raw));
  } catch {
    return null;
  }
};

export const loadLayoutFromStorage = (storageKey: string): Partial<LayoutSettings> | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return sanitizeLayoutSettings(safeJsonParse(raw));
  } catch {
    return null;
  }
};

export const persistDiagramToStorage = (storageKey: string, snapshot: DiagramSnapshot): boolean => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
};

export const persistLayoutToStorage = (storageKey: string, layout: LayoutSettings): boolean => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(layout));
    return true;
  } catch {
    return false;
  }
};

export const createExportPayload = (
  diagram: DiagramSnapshot,
  layout: LayoutSettings
): ExportPayloadV2 => ({
  version: 2,
  diagram: cloneSnapshot(diagram),
  layout: { ...layout }
});
