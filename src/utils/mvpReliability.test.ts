import { beforeEach, describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, type BankEdge, type BankNode, type NodeType } from '../types';
import { createEdgeData, createNodeData, NODE_HEIGHT, NODE_WIDTH } from './factory';
import { computeExportFrame } from './exporters';
import { normalizePayload } from './io';
import { applyDagreLayout } from './layout';
import { useDiagramStore } from '../store/useDiagramStore';

function buildNode(id: string, nodeType: NodeType, x: number, y: number): BankNode {
  return {
    id,
    type: 'bankNode',
    position: { x, y },
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    data: {
      ...createNodeData(id, nodeType),
      displayName: `${nodeType} ${id}`,
    },
  };
}

function buildEdge(id: string, source: string, target: string): BankEdge {
  return {
    id,
    source,
    target,
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'straight',
    data: createEdgeData(id),
  };
}

function buildLargeGraph(nodeCount = 75): { nodes: BankNode[]; edges: BankEdge[] } {
  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const nodeType = NODE_TYPES[index % NODE_TYPES.length];
    return buildNode(`node-${index + 1}`, nodeType, 0, 0);
  });

  const edges: BankEdge[] = [];
  for (let index = 0; index < nodeCount - 1; index += 1) {
    edges.push(buildEdge(`edge-chain-${index + 1}`, nodes[index].id, nodes[index + 1].id));
  }

  for (let index = 0; index < nodeCount - 5; index += 5) {
    edges.push(buildEdge(`edge-skip-${index + 1}`, nodes[index].id, nodes[index + 5].id));
  }

  return { nodes, edges };
}

function spread(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

function resetStore() {
  useDiagramStore.getState().newDiagram();
  useDiagramStore.getState().select(null, null);
  useDiagramStore.temporal.getState().clear();
}

describe('MVP reliability harness', () => {
  beforeEach(() => {
    resetStore();
  });

  test('computes export frame for empty and populated graphs', () => {
    const empty = computeExportFrame([]);
    expect(empty.width).toBe(1200);
    expect(empty.height).toBe(720);

    const graph = buildLargeGraph(30);
    const laidOut = applyDagreLayout(graph.nodes, graph.edges, 'LR');
    const frame = computeExportFrame(laidOut);

    expect(frame.width).toBeGreaterThan(600);
    expect(frame.height).toBeGreaterThan(320);
    expect(frame.transform.startsWith('translate(')).toBe(true);
  });

  test('applies auto-layout to 75 nodes in both directions', () => {
    const graph = buildLargeGraph(75);
    const lr = applyDagreLayout(graph.nodes, graph.edges, 'LR');
    const tb = applyDagreLayout(graph.nodes, graph.edges, 'TB');

    expect(lr).toHaveLength(75);
    expect(tb).toHaveLength(75);

    const lrXs = lr.map((node) => node.position.x);
    const lrYs = lr.map((node) => node.position.y);
    const tbXs = tb.map((node) => node.position.x);
    const tbYs = tb.map((node) => node.position.y);

    expect(spread(lrXs)).toBeGreaterThan(spread(lrYs));
    expect(spread(tbYs)).toBeGreaterThan(spread(tbXs));
  });

  test('preserves graph and UI through save/import round-trip', () => {
    const state = useDiagramStore.getState();
    for (let index = 0; index < 14; index += 1) {
      state.addNode(NODE_TYPES[index % NODE_TYPES.length], { x: index * 140, y: (index % 4) * 110 });
    }

    const createdNodes = useDiagramStore.getState().nodes;
    for (let index = 0; index < createdNodes.length - 1; index += 1) {
      useDiagramStore.getState().addConnection({
        source: createdNodes[index].id,
        target: createdNodes[index + 1].id,
        sourceHandle: 'right',
        targetHandle: 'left',
      });
    }

    useDiagramStore.getState().patchUI({
      darkMode: true,
      backgroundMode: 'dots',
      snapToGrid: true,
      autoLayoutDirection: 'TB',
      showSwimlanes: true,
      laneOrientation: 'vertical',
      showMiniMap: true,
      exportIncludeSwimlanes: false,
      exportIncludeBackground: false,
    });

    const payload = useDiagramStore.getState().exportPayload();
    const normalized = normalizePayload(payload);
    expect(normalized).not.toBeNull();

    useDiagramStore.getState().newDiagram();
    useDiagramStore.getState().hydrate(normalized!);
    const after = useDiagramStore.getState();

    expect(after.nodes).toHaveLength(payload.nodes.length);
    expect(after.edges).toHaveLength(payload.edges.length);
    expect(after.lanes).toHaveLength(payload.lanes.length);
    expect(after.ui.autoLayoutDirection).toBe('TB');
    expect(after.ui.backgroundMode).toBe('dots');
    expect(after.ui.exportIncludeBackground).toBe(false);
    expect(after.ui.exportIncludeSwimlanes).toBe(false);
  });

  test('normalizes the 75-node sample payload', () => {
    const file = path.resolve(process.cwd(), 'public/sampleDiagram.75.json');
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const normalized = normalizePayload(raw);

    expect(normalized).not.toBeNull();
    expect(normalized?.nodes).toHaveLength(75);
    expect(normalized?.edges.length).toBeGreaterThanOrEqual(100);
    expect(normalized?.ui.autoLayoutDirection).toBe('LR');
  });
});
