import { describe, expect, test } from 'vitest';
import type { BankEdge, BankNode } from '../types';
import { applyDagreLayout } from './layout';

function node(id: string, x: number, y: number): BankNode {
  return {
    id,
    type: 'bankNode',
    position: { x, y },
    width: 220,
    height: 110,
    data: {
      id,
      nodeType: 'Sponsor Bank',
      displayName: id,
      description: '',
      jurisdiction: 'Blank',
      roleInFlow: 'Blank',
      regulator: '',
      settlementAccess: 'Blank',
      integrationMode: 'Blank',
      postingTiming: 'Blank',
      coreType: 'Blank',
      heldAt: '',
      custodyModel: 'Blank',
      ledgerType: 'Blank',
      balanceModel: 'Blank',
      sourceOfTruth: 'Blank',
      method: 'Blank',
      owner: 'Blank',
      treasuryScope: 'Blank',
    },
  };
}

function edge(id: string, source: string, target: string): BankEdge {
  return {
    id,
    source,
    target,
    type: 'straight',
    data: {
      id,
      rail: 'Blank',
      settlementType: 'Blank',
      direction: 'Blank',
      messageOrFunds: 'Blank',
      notes: '',
      networkName: 'Blank',
      transactionStage: 'Blank',
    },
  };
}

describe('applyDagreLayout', () => {
  test('returns nodes in left-to-right flow for a chain graph', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 0), node('c', 0, 0)];
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')];

    const laidOut = applyDagreLayout(nodes, edges, 'LR');

    expect(laidOut).toHaveLength(3);
    const ax = laidOut.find((item) => item.id === 'a')?.position.x ?? 0;
    const bx = laidOut.find((item) => item.id === 'b')?.position.x ?? 0;
    const cx = laidOut.find((item) => item.id === 'c')?.position.x ?? 0;

    expect(ax).toBeLessThan(bx);
    expect(bx).toBeLessThan(cx);
  });

  test('returns empty list unchanged', () => {
    const laidOut = applyDagreLayout([], [], 'LR');
    expect(laidOut).toEqual([]);
  });

  test('returns nodes in top-to-bottom flow for a chain graph', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 0), node('c', 0, 0)];
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')];

    const laidOut = applyDagreLayout(nodes, edges, 'TB');

    expect(laidOut).toHaveLength(3);
    const ay = laidOut.find((item) => item.id === 'a')?.position.y ?? 0;
    const by = laidOut.find((item) => item.id === 'b')?.position.y ?? 0;
    const cy = laidOut.find((item) => item.id === 'c')?.position.y ?? 0;

    expect(ay).toBeLessThan(by);
    expect(by).toBeLessThan(cy);
  });
});
