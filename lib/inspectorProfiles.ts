import { EntityType, PaymentRail } from '../types';

type NodeFieldKey =
  | 'accountType'
  | 'custodyHolder'
  | 'ledgerType'
  | 'balanceModel'
  | 'postingTiming'
  | 'kycOwner'
  | 'amlMonitoring'
  | 'fraudControls'
  | 'tags'
  | 'externalRefs';

export type NodeInspectorProfile = {
  id: 'institution' | 'intermediary' | 'control' | 'endpoint' | 'generic';
  title: string;
  summary: string;
  showCompliance: boolean;
  fieldLabels: Record<NodeFieldKey, string>;
  fieldPlaceholders: Partial<Record<NodeFieldKey, string>>;
  fieldHelpers: Partial<Record<NodeFieldKey, string>>;
  ledgerTypeOptions: string[];
  balanceModelOptions: string[];
};

export type EdgeRailProfile = {
  id: 'instant' | 'batch' | 'card' | 'wire' | 'internal' | 'digital' | 'cash' | 'generic';
  title: string;
  summary: string;
  timingHelper: string;
  reconciliationHelper: string;
  dataSchemaLabel: string;
  dataSchemaPlaceholder: string;
  notesPlaceholder: string;
};

const commonNodeLabels: Record<NodeFieldKey, string> = {
  accountType: 'Account Type',
  custodyHolder: 'Custody Holder',
  ledgerType: 'Ledger Type',
  balanceModel: 'Balance Model',
  postingTiming: 'Posting Timing',
  kycOwner: 'KYC Owner',
  amlMonitoring: 'AML Monitoring',
  fraudControls: 'Fraud Controls',
  tags: 'Tags',
  externalRefs: 'External References'
};

const commonNodeHelpers: Partial<Record<NodeFieldKey, string>> = {
  accountType: 'Use account type when this node directly books or settles balances.'
};

const institutionProfile: NodeInspectorProfile = {
  id: 'institution',
  title: 'Institution',
  summary: 'Banking institutions focus on custody, settlement posture, and controls ownership.',
  showCompliance: true,
  fieldLabels: {
    ...commonNodeLabels,
    custodyHolder: 'Sponsor / Custodian',
    ledgerType: 'Core Ledger',
    balanceModel: 'Account Structure',
    postingTiming: 'Settlement Window'
  },
  fieldPlaceholders: {
    custodyHolder: 'e.g. Sponsor Bank',
    postingTiming: 'e.g. T+0 cutoff 17:00 ET',
    kycOwner: 'Team or provider',
    amlMonitoring: 'Rule set or platform',
    fraudControls: 'Scoring / thresholds',
    tags: 'issuer,sponsor,settlement',
    externalRefs: 'policy docs, risk tickets'
  },
  fieldHelpers: {
    ...commonNodeHelpers,
    postingTiming: 'Capture settlement cadence and operational cutoff for this institution.'
  },
  ledgerTypeOptions: ['Core Banking', 'Settlement Ledger', 'Reserve Ledger', 'Batch Posting'],
  balanceModelOptions: ['Omnibus', 'Subledger', 'Customer Segregated', 'Reserve Account']
};

const intermediaryProfile: NodeInspectorProfile = {
  id: 'intermediary',
  title: 'Intermediary',
  summary: 'Intermediaries optimize routing, switching, and reconciliation across multiple rails.',
  showCompliance: true,
  fieldLabels: {
    ...commonNodeLabels,
    custodyHolder: 'Settlement Partner',
    ledgerType: 'Processing Ledger',
    balanceModel: 'Clearing Model',
    postingTiming: 'Clearing / Settlement Cadence',
    kycOwner: 'Program KYC Owner',
    amlMonitoring: 'Screening / Monitoring',
    fraudControls: 'Decisioning Controls'
  },
  fieldPlaceholders: {
    custodyHolder: 'e.g. Sponsor bank or network settlement bank',
    postingTiming: 'e.g. near-real-time with end-of-day reconciliation',
    kycOwner: 'Program manager or partner',
    amlMonitoring: 'Velocity + sanctions stack',
    fraudControls: 'Real-time decisioning thresholds',
    tags: 'processor,switch,gateway',
    externalRefs: 'processor API docs, partner IDs'
  },
  fieldHelpers: {
    ...commonNodeHelpers,
    ledgerType: 'Use this to reflect how this intermediary represents balances and events.',
    balanceModel: 'Show whether clearing is bilateral, multilateral, or through omnibus accounts.'
  },
  ledgerTypeOptions: ['Event Ledger', 'Switch Ledger', 'Network Clearing', 'Wallet Subledger'],
  balanceModelOptions: ['Bilateral Clearing', 'Multilateral Netting', 'Omnibus + Subledger', 'Memo + Final Post']
};

const controlProfile: NodeInspectorProfile = {
  id: 'control',
  title: 'Control / Treasury',
  summary: 'Control nodes represent policy gates, liquidity controls, and treasury checkpoints.',
  showCompliance: true,
  fieldLabels: {
    ...commonNodeLabels,
    accountType: 'Control Account Type',
    custodyHolder: 'Control Owner',
    ledgerType: 'Control Ledger',
    balanceModel: 'Decision Model',
    postingTiming: 'Control Timing'
  },
  fieldPlaceholders: {
    custodyHolder: 'e.g. Risk, Treasury, or Compliance team',
    postingTiming: 'e.g. pre-auth, post-auth, pre-settlement',
    kycOwner: 'Policy owner',
    amlMonitoring: 'Monitoring logic',
    fraudControls: 'Rule sets and response model',
    tags: 'control,treasury,policy',
    externalRefs: 'control IDs, policy docs'
  },
  fieldHelpers: {
    ...commonNodeHelpers,
    balanceModel: 'Map control state transitions or liquidity guardrails.'
  },
  ledgerTypeOptions: ['Policy Ledger', 'Risk Ledger', 'Treasury Ledger'],
  balanceModelOptions: ['Rule-based', 'Score-based', 'Manual Approval', 'Hybrid']
};

const endpointProfile: NodeInspectorProfile = {
  id: 'endpoint',
  title: 'Endpoint',
  summary: 'Endpoints capture touchpoints (consumer, merchant, text/anchor) with lighter metadata.',
  showCompliance: false,
  fieldLabels: {
    ...commonNodeLabels,
    accountType: 'Endpoint Account',
    custodyHolder: 'Owning Party',
    ledgerType: 'Endpoint Ledger',
    balanceModel: 'Exposure Model',
    postingTiming: 'Event Timing'
  },
  fieldPlaceholders: {
    custodyHolder: 'e.g. consumer, merchant, or external counterparty',
    postingTiming: 'e.g. request, callback, completion',
    tags: 'endpoint,channel',
    externalRefs: 'endpoint IDs, external links'
  },
  fieldHelpers: {
    ...commonNodeHelpers
  },
  ledgerTypeOptions: ['External Account', 'Wallet', 'No Ledger'],
  balanceModelOptions: ['Off-ledger', 'Memo', 'Posted']
};

const genericProfile: NodeInspectorProfile = {
  id: 'generic',
  title: 'General',
  summary: 'Generic profile for node types without specialized financial behavior.',
  showCompliance: true,
  fieldLabels: commonNodeLabels,
  fieldPlaceholders: {
    custodyHolder: 'Owner or custodian',
    postingTiming: 'e.g. T+0',
    tags: 'comma,separated,tags',
    externalRefs: 'ticket IDs, doc links'
  },
  fieldHelpers: commonNodeHelpers,
  ledgerTypeOptions: ['Real-time', 'Batch'],
  balanceModelOptions: ['Omnibus', 'Subledger']
};

const institutionTypes = new Set<EntityType>([
  EntityType.SPONSOR_BANK,
  EntityType.ISSUING_BANK,
  EntityType.ACQUIRING_BANK,
  EntityType.CENTRAL_BANK,
  EntityType.CORRESPONDENT_BANK,
  EntityType.CREDIT_UNION
]);

const intermediaryTypes = new Set<EntityType>([
  EntityType.PROGRAM_MANAGER,
  EntityType.PROCESSOR,
  EntityType.GATEWAY,
  EntityType.NETWORK,
  EntityType.SWITCH,
  EntityType.WALLET_PROVIDER
]);

const controlTypes = new Set<EntityType>([EntityType.GATE, EntityType.LIQUIDITY_PROVIDER]);
const endpointTypes = new Set<EntityType>([EntityType.END_POINT, EntityType.TEXT_BOX, EntityType.ANCHOR]);

export const getNodeInspectorProfile = (nodeType: EntityType | undefined): NodeInspectorProfile => {
  if (!nodeType) return genericProfile;
  if (institutionTypes.has(nodeType)) return institutionProfile;
  if (intermediaryTypes.has(nodeType)) return intermediaryProfile;
  if (controlTypes.has(nodeType)) return controlProfile;
  if (endpointTypes.has(nodeType)) return endpointProfile;
  return genericProfile;
};

const instantRails = new Set<PaymentRail>([PaymentRail.RTP, PaymentRail.FEDNOW, PaymentRail.INTERAC]);
const batchRails = new Set<PaymentRail>([PaymentRail.ACH, PaymentRail.EFT_CANADA, PaymentRail.BANK_TRANSFER]);
const cardRails = new Set<PaymentRail>([PaymentRail.CARD_NETWORK]);
const wireRails = new Set<PaymentRail>([PaymentRail.WIRE, PaymentRail.SWIFT]);
const internalRails = new Set<PaymentRail>([PaymentRail.INTERNAL_LEDGER, PaymentRail.ON_US]);
const digitalRails = new Set<PaymentRail>([PaymentRail.STABLECOIN]);
const cashRails = new Set<PaymentRail>([PaymentRail.CASH, PaymentRail.CHEQUE, PaymentRail.CARRIER_PIGEON]);

const genericRailProfile: EdgeRailProfile = {
  id: 'generic',
  title: 'General Rail Profile',
  summary: 'Capture direction, timing, data schema, and reconciliation for this payment connection.',
  timingHelper: 'Use settlement timing to show operational expectations for this edge.',
  reconciliationHelper: 'Document how disputes and balancing are handled for this flow.',
  dataSchemaLabel: 'Data Schema',
  dataSchemaPlaceholder: 'e.g. ISO 20022',
  notesPlaceholder: 'Settlement rules, risk, and data exchanged...'
};

const instantRailProfile: EdgeRailProfile = {
  id: 'instant',
  title: 'Instant Rail Profile',
  summary: 'Instant rails settle in seconds with immediate availability and finality expectations.',
  timingHelper: 'Prefer instant or same-session timing values for instant payment rails.',
  reconciliationHelper: 'Define exception-return workflow because posted payments are typically final.',
  dataSchemaLabel: 'Message Standard',
  dataSchemaPlaceholder: 'e.g. ISO 20022 pacs.008 / request-for-payment',
  notesPlaceholder: 'Include return request handling, risk thresholds, and participant requirements.'
};

const batchRailProfile: EdgeRailProfile = {
  id: 'batch',
  title: 'Batch Rail Profile',
  summary: 'Batch rails depend on clearing windows, cutoff times, and next-day settlement behavior.',
  timingHelper: 'Capture window/cutoff assumptions (same-day, next-day, or T+2 where applicable).',
  reconciliationHelper: 'Define return/NOC handling and batch balancing controls.',
  dataSchemaLabel: 'Batch Format',
  dataSchemaPlaceholder: 'e.g. NACHA SEC class / CPA EFT format',
  notesPlaceholder: 'Include cutoff times, return windows, and settlement file dependencies.'
};

const cardRailProfile: EdgeRailProfile = {
  id: 'card',
  title: 'Card Rail Profile',
  summary: 'Card rails separate authorization, clearing, and settlement with scheme-specific rules.',
  timingHelper: 'Set timing to reflect auth vs. clearing vs. settlement stage.',
  reconciliationHelper: 'Include chargeback/dispute and representment process expectations.',
  dataSchemaLabel: 'Scheme / Message Spec',
  dataSchemaPlaceholder: 'e.g. ISO 8583 variant, network program',
  notesPlaceholder: 'Capture auth/clearing semantics, fees, and exception handling.'
};

const wireRailProfile: EdgeRailProfile = {
  id: 'wire',
  title: 'Wire Rail Profile',
  summary: 'Wire rails are high-value RTGS flows with immediate, final, and irrevocable settlement.',
  timingHelper: 'Use real-time or same-day timing and include operating window considerations.',
  reconciliationHelper: 'Document reference-matching and investigation workflow.',
  dataSchemaLabel: 'Wire Message Format',
  dataSchemaPlaceholder: 'e.g. MT / ISO 20022 pacs',
  notesPlaceholder: 'Include beneficiary instruction and finality requirements.'
};

const internalRailProfile: EdgeRailProfile = {
  id: 'internal',
  title: 'Internal Ledger Profile',
  summary: 'Internal transfers rely on platform ledger posting and internal controls.',
  timingHelper: 'Capture posting model (real-time, memo-first, or end-of-day finalization).',
  reconciliationHelper: 'Define internal balancing and suspense resolution process.',
  dataSchemaLabel: 'Internal Event Schema',
  dataSchemaPlaceholder: 'e.g. ledger event type / journal model',
  notesPlaceholder: 'Include booking logic and account impact rules.'
};

const digitalRailProfile: EdgeRailProfile = {
  id: 'digital',
  title: 'Digital Asset Rail Profile',
  summary: 'Digital rails require chain/network assumptions, confirmation depth, and custody controls.',
  timingHelper: 'Capture confirmation policy and expected settlement latency.',
  reconciliationHelper: 'Document reconciliation across chain events and internal books.',
  dataSchemaLabel: 'On-Chain / Payload Schema',
  dataSchemaPlaceholder: 'e.g. chain, token standard, wallet payload',
  notesPlaceholder: 'Include custody, confirmation threshold, and failure handling.'
};

const cashRailProfile: EdgeRailProfile = {
  id: 'cash',
  title: 'Offline / Manual Rail Profile',
  summary: 'Offline rails are operationally intensive and typically require manual controls.',
  timingHelper: 'Capture manual processing or delayed-settlement expectations.',
  reconciliationHelper: 'Define manual proof-of-payment and exception workflow.',
  dataSchemaLabel: 'Reference Format',
  dataSchemaPlaceholder: 'e.g. receipt / manual control reference',
  notesPlaceholder: 'Include manual checkpoints and audit references.'
};

export const getEdgeRailProfile = (rail: PaymentRail | '' | undefined): EdgeRailProfile => {
  if (!rail) return genericRailProfile;
  if (instantRails.has(rail)) return instantRailProfile;
  if (batchRails.has(rail)) return batchRailProfile;
  if (cardRails.has(rail)) return cardRailProfile;
  if (wireRails.has(rail)) return wireRailProfile;
  if (internalRails.has(rail)) return internalRailProfile;
  if (digitalRails.has(rail)) return digitalRailProfile;
  if (cashRails.has(rail)) return cashRailProfile;
  return genericRailProfile;
};
