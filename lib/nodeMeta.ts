export type NodeMetaFields = {
  custodyHolder: string;
  ledgerType: string;
  balanceModel: string;
  postingTiming: string;
  kycOwner: string;
  amlMonitoring: string;
  fraudControls: string;
  tags: string;
  externalRefs: string;
};

export type ParsedNodeMeta = {
  meta: NodeMetaFields;
  notes: string;
};

const META_START = '[[finflow-meta]]';
const META_END = '[[/finflow-meta]]';

const META_KEYS: Array<keyof NodeMetaFields> = [
  'custodyHolder',
  'ledgerType',
  'balanceModel',
  'postingTiming',
  'kycOwner',
  'amlMonitoring',
  'fraudControls',
  'tags',
  'externalRefs'
];

const EMPTY_META: NodeMetaFields = {
  custodyHolder: '',
  ledgerType: '',
  balanceModel: '',
  postingTiming: '',
  kycOwner: '',
  amlMonitoring: '',
  fraudControls: '',
  tags: '',
  externalRefs: ''
};

const normalizeLine = (value: string) => value.trim();

const hasAnyMetaValue = (meta: NodeMetaFields): boolean =>
  META_KEYS.some((key) => meta[key].trim().length > 0);

export const createEmptyNodeMeta = (): NodeMetaFields => ({ ...EMPTY_META });

export const parseNodeDescriptionMeta = (description: string | undefined): ParsedNodeMeta => {
  if (!description || description.trim().length === 0) {
    return { meta: createEmptyNodeMeta(), notes: '' };
  }

  const startIdx = description.indexOf(META_START);
  const endIdx = description.indexOf(META_END);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return {
      meta: createEmptyNodeMeta(),
      notes: description.trim()
    };
  }

  const metaBlock = description
    .slice(startIdx + META_START.length, endIdx)
    .split('\n')
    .map(normalizeLine)
    .filter((line) => line.length > 0);

  const parsedMeta = createEmptyNodeMeta();
  for (const line of metaBlock) {
    const equalIdx = line.indexOf('=');
    if (equalIdx <= 0) continue;

    const rawKey = line.slice(0, equalIdx).trim();
    const rawValue = line.slice(equalIdx + 1).trim();
    if ((META_KEYS as string[]).includes(rawKey)) {
      parsedMeta[rawKey as keyof NodeMetaFields] = rawValue;
    }
  }

  const beforeMeta = description.slice(0, startIdx).trim();
  const afterMeta = description.slice(endIdx + META_END.length).trim();
  const notes = [beforeMeta, afterMeta].filter((part) => part.length > 0).join('\n\n');

  return { meta: parsedMeta, notes };
};

export const buildDescriptionWithNodeMeta = (
  meta: Partial<NodeMetaFields>,
  notes: string | undefined
): string | undefined => {
  const normalizedMeta = createEmptyNodeMeta();
  for (const key of META_KEYS) {
    const next = typeof meta[key] === 'string' ? meta[key] : '';
    normalizedMeta[key] = next.trim();
  }

  const notesText = (notes || '').trim();
  const includeMeta = hasAnyMetaValue(normalizedMeta);

  if (!includeMeta && notesText.length === 0) {
    return undefined;
  }

  if (!includeMeta) {
    return notesText;
  }

  const metaLines = META_KEYS.map((key) => `${key}=${normalizedMeta[key]}`);
  const metaText = [META_START, ...metaLines, META_END].join('\n');

  if (!notesText) {
    return metaText;
  }

  return `${metaText}\n\n${notesText}`;
};
