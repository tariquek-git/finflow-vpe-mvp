import { describe, expect, test } from 'vitest';
import { normalizePayload } from './io';

describe('normalizePayload', () => {
  test('returns null for invalid top-level shape', () => {
    expect(normalizePayload(null)).toBeNull();
    expect(normalizePayload({ ui: 'invalid' })).toBeNull();
  });

  test('normalizes minimal payload with defaults', () => {
    const payload = normalizePayload({ ui: {} });
    expect(payload).not.toBeNull();
    expect(payload?.nodes).toEqual([]);
    expect(payload?.edges).toEqual([]);
    expect(payload?.ui.backgroundMode).toBe('grid');
    expect(payload?.ui.autoLayoutDirection).toBe('LR');
  });

  test('migrates legacy settlementSpeed into settlementType', () => {
    const payload = normalizePayload({
      ui: {},
      nodes: [
        {
          id: 'n1',
          type: 'bankNode',
          position: { x: 0, y: 0 },
          data: { id: 'n1', nodeType: 'Sponsor Bank', displayName: 'Sponsor Bank' },
        },
        {
          id: 'n2',
          type: 'bankNode',
          position: { x: 240, y: 0 },
          data: { id: 'n2', nodeType: 'Issuer Bank', displayName: 'Issuer Bank' },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          data: {
            rail: 'ACH',
            settlementSpeed: 'Batch',
            direction: 'Push',
            messageOrFunds: 'Funds Movement',
          },
        },
      ],
    });

    expect(payload).not.toBeNull();
    expect(payload?.edges[0].data?.settlementType).toBe('Batch');
  });
});
