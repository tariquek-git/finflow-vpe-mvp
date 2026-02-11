import { describe, expect, beforeEach, test } from 'vitest';
import { useDiagramStore } from './useDiagramStore';

function resetStore() {
  const state = useDiagramStore.getState();
  state.newDiagram();
  state.select(null, null);
  useDiagramStore.temporal.getState().clear();
}

describe('useDiagramStore', () => {
  beforeEach(() => {
    resetStore();
  });

  test('adds node and selects it', () => {
    const state = useDiagramStore.getState();
    state.addNode('Sponsor Bank', { x: 100, y: 120 });

    const next = useDiagramStore.getState();
    expect(next.nodes).toHaveLength(1);
    expect(next.nodes[0].data.nodeType).toBe('Sponsor Bank');
    expect(next.selectedNodeId).toBe(next.nodes[0].id);
    expect(next.selectedEdgeId).toBeNull();
  });

  test('prevents self-loop edges', () => {
    const state = useDiagramStore.getState();
    state.addNode('Sponsor Bank', { x: 10, y: 10 });

    const nodeId = useDiagramStore.getState().nodes[0].id;
    useDiagramStore.getState().addConnection({
      source: nodeId,
      target: nodeId,
      sourceHandle: 'right',
      targetHandle: 'left',
    });

    expect(useDiagramStore.getState().edges).toHaveLength(0);
  });

  test('updates edge label for card network rule', () => {
    const state = useDiagramStore.getState();
    state.addNode('Sponsor Bank', { x: 0, y: 0 });
    state.addNode('Issuer Bank', { x: 220, y: 0 });

    const [source, target] = useDiagramStore.getState().nodes;
    useDiagramStore.getState().addConnection({
      source: source.id,
      target: target.id,
      sourceHandle: 'right',
      targetHandle: 'left',
    });

    const edge = useDiagramStore.getState().edges[0];
    expect(edge.label).toBe('');

    useDiagramStore.getState().updateEdge(edge.id, {
      rail: 'Card Network',
      networkName: 'Visa',
    });

    const updated = useDiagramStore.getState().edges[0];
    expect(updated.label).toBe('Card Network (Visa)');
  });

  test('duplicates selected node', () => {
    const state = useDiagramStore.getState();
    state.addNode('Processor', { x: 40, y: 60 });

    useDiagramStore.getState().duplicateSelection();

    const next = useDiagramStore.getState();
    expect(next.nodes).toHaveLength(2);
    expect(next.nodes[1].data.displayName).toContain('Copy');
  });

  test('deletes selected node and connected edges', () => {
    const state = useDiagramStore.getState();
    state.addNode('Sponsor Bank', { x: 0, y: 0 });
    state.addNode('Settlement Account', { x: 320, y: 0 });

    const [nodeA, nodeB] = useDiagramStore.getState().nodes;
    useDiagramStore.getState().addConnection({
      source: nodeA.id,
      target: nodeB.id,
      sourceHandle: 'right',
      targetHandle: 'left',
    });

    useDiagramStore.getState().select(nodeA.id, null);
    useDiagramStore.getState().deleteSelection();

    const next = useDiagramStore.getState();
    expect(next.nodes).toHaveLength(1);
    expect(next.nodes[0].id).toBe(nodeB.id);
    expect(next.edges).toHaveLength(0);
  });

  test('undo and redo restore diagram state', () => {
    const state = useDiagramStore.getState();
    state.addNode('Sponsor Bank', { x: 10, y: 20 });
    expect(useDiagramStore.getState().nodes).toHaveLength(1);

    useDiagramStore.temporal.getState().undo();
    expect(useDiagramStore.getState().nodes).toHaveLength(0);

    useDiagramStore.temporal.getState().redo();
    expect(useDiagramStore.getState().nodes).toHaveLength(1);
  });

  test('reorderLanes updates order indices', () => {
    const laneIds = useDiagramStore
      .getState()
      .lanes.sort((a, b) => a.order - b.order)
      .map((lane) => lane.id);

    const reordered = [laneIds[2], laneIds[0], laneIds[1]];
    useDiagramStore.getState().reorderLanes(reordered);

    const lanes = [...useDiagramStore.getState().lanes].sort((a, b) => a.order - b.order);
    expect(lanes.map((lane) => lane.id)).toEqual(reordered);
    expect(lanes.map((lane) => lane.order)).toEqual([0, 1, 2]);
  });
});
