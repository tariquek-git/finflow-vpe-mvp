import dagre from 'dagre';
import type { BankEdge, BankNode } from '../types';
import { NODE_HEIGHT, NODE_WIDTH } from './factory';

export type LayoutDirection = 'LR' | 'TB';

export function applyDagreLayout(
  nodes: BankNode[],
  edges: BankEdge[],
  direction: LayoutDirection = 'LR',
): BankNode[] {
  if (!nodes.length) {
    return nodes;
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: 70,
    ranksep: 120,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: typeof node.width === 'number' ? node.width : NODE_WIDTH,
      height: typeof node.height === 'number' ? node.height : NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const layoutNode = graph.node(node.id) as { x: number; y: number } | undefined;
    if (!layoutNode) {
      return node;
    }

    const width = typeof node.width === 'number' ? node.width : NODE_WIDTH;
    const height = typeof node.height === 'number' ? node.height : NODE_HEIGHT;

    return {
      ...node,
      position: {
        x: layoutNode.x - width / 2,
        y: layoutNode.y - height / 2,
      },
    };
  });
}
