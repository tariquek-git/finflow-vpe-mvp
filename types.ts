
// 1. ENTITY TYPES (The Nodes)
export enum EntityType {
  SPONSOR_BANK = 'Sponsor Bank',
  ISSUING_BANK = 'Issuing Bank',
  ACQUIRING_BANK = 'Acquiring Bank',
  CENTRAL_BANK = 'Central Bank',
  CORRESPONDENT_BANK = 'Correspondent Bank',
  CREDIT_UNION = 'Credit Union',
  PROGRAM_MANAGER = 'Program Manager',
  PROCESSOR = 'Processor',
  GATEWAY = 'Payment Gateway',
  NETWORK = 'Card Network',
  SWITCH = 'Switch / Clearing',
  WALLET_PROVIDER = 'Wallet Provider',
  GATE = 'Compliance Gate',
  LIQUIDITY_PROVIDER = 'Liquidity Provider',
  END_POINT = 'End-Point',
  TEXT_BOX = 'Text Box',
  ANCHOR = 'Anchor Point'
}

export enum EndPointType {
  CONSUMER = 'Consumer',
  MERCHANT = 'Merchant',
  CORPORATE = 'Corporate',
  OTHER = 'Other'
}

export enum AccountType {
  DDA = 'DDA (Checking)',
  FBO = 'FBO (For Benefit Of)',
  RESERVE = 'Reserve Account',
  SETTLEMENT = 'Settlement Account',
  OPERATING = 'Operating Account',
  SUSPENSE = 'Suspense Account',
  WALLET = 'Digital Wallet',
  VAULT = 'Crypto Vault',
  TREASURY = 'Treasury / Omnibus'
}

export enum PaymentRail {
  BLANK = '', 
  ACH = 'ACH',
  RTP = 'RTP',
  FEDNOW = 'FedNow',
  WIRE = 'Wire',
  SWIFT = 'SWIFT',
  INTERNAL_LEDGER = 'Internal Ledger',
  CARD_NETWORK = 'Card Network',
  STABLECOIN = 'Stablecoin',
  OTHER = 'Other',
  BANK_TRANSFER = 'Bank Transfer',
  EFT_CANADA = 'EFT (Canada)',
  INTERAC = 'Interac e-Transfer',
  CASH = 'Cash',
  CHEQUE = 'Cheque',
  ON_US = 'On-Us Transfer',
  CARRIER_PIGEON = 'Carrier Pigeon'
}

export enum ReconciliationMethod {
  NONE = 'None',
  AUTO_MATCH = 'Auto-Match',
  MANUAL = 'Manual / Visual',
  FILE_BASED = 'File-Based (BAI2/MT940)',
  API_WEBHOOK = 'API / Webhook'
}

export enum BatchingType {
  REAL_TIME = 'Real-Time / Atomic',
  PERIODIC_BATCH = 'Periodic Batching',
  END_OF_DAY = 'End of Day (EOD)',
  WEEKLY = 'Weekly'
}

export enum FlowDirection {
  PUSH = 'Push (Credit)',
  PULL = 'Pull (Debit)',
  AUTH = 'Authorization',
  SETTLEMENT = 'Settlement',
  INTERNAL = 'Internal',
  RETURN = 'Return / Refund'
}

export enum NodeShape {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  CYLINDER = 'cylinder',
  DIAMOND = 'diamond',
}

export enum TimingType {
  INSTANT = 'Instant',
  SAME_DAY = 'Same Day',
  NEXT_DAY = 'Next Day (T+1)',
  T_PLUS_2 = 'T+2',
  T_PLUS_3 = 'T+3'
}

export interface Position {
  x: number;
  y: number;
}

export interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface Node {
  id: string;
  type: EntityType;
  label: string;
  shape: NodeShape;
  endPointType?: EndPointType; 
  accountType?: AccountType;
  position: Position;
  zIndex?: number;
  swimlaneId?: number;
  color?: string;
  description?: string;
  width?: number;
  height?: number;
  isConnectorHandle?: boolean;
}

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePortIdx: number;
  targetPortIdx: number;

  // Professional Payment Attributes
  rail: PaymentRail;
  direction: FlowDirection;
  label: string;
  sequence?: number; // Added: Order in the transaction lifecycle (e.g., 1, 2, 3)
  amount?: string;
  currency?: string;
  timing?: TimingType | string;
  
  // Strategic Fintech Metadata
  recoMethod?: ReconciliationMethod;
  batching?: BatchingType;
  dataSchema?: string; // e.g. ISO 20022
  description?: string;
  isExceptionPath?: boolean; // If true, line turns red
  
  // FX Data
  isFX: boolean;
  fxPair?: string;

  // Visuals
  pathType: 'bezier' | 'orthogonal'; 
  style: 'solid' | 'dashed' | 'dotted';
  curvature?: number; // Added: Manual override for bending
  color?: string;
  showArrowHead: boolean;
  showMidArrow?: boolean;
  thickness?: number;
}

export interface DrawingPath {
  id: string;
  points: Position[];
  color: string;
  width: number;
}

export type ToolMode = 'select' | 'draw' | 'text';
export type GridMode = 'none' | 'lines' | 'dots';
export type OverlayMode = 'none' | 'risk' | 'ledger' | 'both';
export type LaneGroupingMode = 'manual' | 'entity' | 'regulatory' | 'geography' | 'ledger';
export type ExportFormat = 'json' | 'png' | 'pdf' | 'svg';

export interface DiagramSnapshot {
  nodes: Node[];
  edges: Edge[];
  drawings: DrawingPath[];
}

export interface LayoutSettings {
  showSwimlanes: boolean;
  swimlaneLabels: string[];
  gridMode: GridMode;
  isDarkMode: boolean;
  showPorts: boolean;
}

export interface ExportPayloadV2 {
  version: 2;
  diagram: DiagramSnapshot;
  layout: LayoutSettings;
}
