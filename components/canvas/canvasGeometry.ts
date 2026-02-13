import { Position as RFPosition } from '@xyflow/react';
import { EntityType, Node, NodeShape, Position } from '../../types';

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 60;
export const ANCHOR_SIZE = 16;
export const SWIMLANE_HEIGHT = 300;

export const getHandlePosition = (portIdx: number): RFPosition => {
  if (portIdx === 0) return RFPosition.Top;
  if (portIdx === 1) return RFPosition.Right;
  if (portIdx === 2) return RFPosition.Bottom;
  return RFPosition.Left;
};

export const getNodeDimensions = (node: Node) => {
  if (node.type === EntityType.ANCHOR) {
    return { width: ANCHOR_SIZE, height: ANCHOR_SIZE };
  }

  return {
    width: node.width || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : NODE_WIDTH),
    height: node.height || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : NODE_HEIGHT)
  };
};

export const getNodeCenter = (node: Node): Position => {
  if (node.type === EntityType.ANCHOR) {
    return { x: node.position.x + ANCHOR_SIZE / 2, y: node.position.y + ANCHOR_SIZE / 2 };
  }

  const { width, height } = getNodeDimensions(node);
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2
  };
};

export const getPortPosition = (node: Node, portIdx: number): Position => {
  if (node.type === EntityType.ANCHOR) {
    return { x: node.position.x + ANCHOR_SIZE / 2, y: node.position.y + ANCHOR_SIZE / 2 };
  }

  const { width, height } = getNodeDimensions(node);
  const x = node.position.x;
  const y = node.position.y;
  const cx = x + width / 2;
  const cy = y + height / 2;

  if (portIdx === 0) return { x: cx, y };
  if (portIdx === 1) return { x: x + width, y: cy };
  if (portIdx === 2) return { x: cx, y: y + height };
  return { x, y: cy };
};

export const getClosestPortToPoint = (node: Node, point: Position) => {
  let bestIdx = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let idx = 0; idx < 4; idx += 1) {
    const port = getPortPosition(node, idx);
    const dx = port.x - point.x;
    const dy = port.y - point.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIdx = idx;
    }
  }

  return bestIdx;
};

export const getSquaredDistance = (a: Position, b: Position) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};
