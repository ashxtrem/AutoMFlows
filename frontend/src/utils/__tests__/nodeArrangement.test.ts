import { describe, it, expect } from 'vitest';
import { arrangeNodesVertical, arrangeNodesHorizontal } from '../nodeArrangement';
import { Node, Edge } from 'reactflow';
import { NodeType } from '@automflows/shared';

function makeNode(id: string, type: string, pos = { x: 0, y: 0 }): Node {
  return { id, data: { type }, position: pos, width: 200, height: 100 } as Node;
}

function makeEdge(source: string, target: string, targetHandle?: string): Edge {
  return { id: `${source}-${target}`, source, target, targetHandle } as Edge;
}

describe('arrangeNodesVertical', () => {
  it('returns empty array for empty input', () => {
    expect(arrangeNodesVertical([], [], {})).toEqual([]);
  });

  it('positions a single start node at default startX/startY', () => {
    const nodes = [makeNode('s', NodeType.START)];
    const result = arrangeNodesVertical(nodes, [], {});
    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ x: 100, y: 200 });
  });

  it('positions connected nodes in a vertical column following edges', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('a2', NodeType.ACTION),
    ];
    const edges = [
      makeEdge('s', 'a1'),
      makeEdge('a1', 'a2'),
    ];
    const result = arrangeNodesVertical(nodes, edges, {});

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    expect(posMap.get('s')!.x).toBe(posMap.get('a1')!.x);
    expect(posMap.get('a1')!.x).toBe(posMap.get('a2')!.x);
    expect(posMap.get('s')!.y).toBeLessThan(posMap.get('a1')!.y);
    expect(posMap.get('a1')!.y).toBeLessThan(posMap.get('a2')!.y);
  });

  it('places unconnected nodes to the left of connected nodes', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('orphan', NodeType.ACTION),
    ];
    const edges = [makeEdge('s', 'a1')];
    const result = arrangeNodesVertical(nodes, edges, {});

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    expect(posMap.get('orphan')!.x).toBeLessThan(posMap.get('s')!.x);
  });

  it('places reusable nodes to the left of the start column', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('r1', 'reusable.reusable'),
    ];
    const result = arrangeNodesVertical(nodes, [], {});

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    expect(posMap.get('r1')!.x).toBeLessThan(posMap.get('s')!.x);
  });

  it('places property input nodes above their target', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('val', 'value.string'),
    ];
    const edges = [
      makeEdge('s', 'a1'),
      makeEdge('val', 'a1', 'selector-input'),
    ];
    const result = arrangeNodesVertical(nodes, edges, {});

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    expect(posMap.get('val')!.y).toBeLessThan(posMap.get('a1')!.y);
  });

  it('wraps to a new column when nodesPerColumn is exceeded', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('a2', NodeType.ACTION),
    ];
    const edges = [makeEdge('s', 'a1'), makeEdge('a1', 'a2')];
    const result = arrangeNodesVertical(nodes, edges, { nodesPerColumn: 2 });

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    // Third node (index 2) should wrap to column 1
    expect(posMap.get('a2')!.x).toBeGreaterThan(posMap.get('s')!.x);
  });

  it('respects custom startX and startY options', () => {
    const nodes = [makeNode('s', NodeType.START)];
    const result = arrangeNodesVertical(nodes, [], { startX: 500, startY: 600 });
    expect(result[0].position).toEqual({ x: 500, y: 600 });
  });

  it('preserves all nodes in the output', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('orphan', NodeType.ACTION),
      makeNode('r1', 'reusable.reusable'),
    ];
    const edges = [makeEdge('s', 'a1')];
    const result = arrangeNodesVertical(nodes, edges, {});
    expect(result).toHaveLength(4);
    const ids = result.map((n) => n.id).sort();
    expect(ids).toEqual(['a1', 'orphan', 'r1', 's']);
  });
});

describe('arrangeNodesHorizontal', () => {
  it('returns empty array for empty input', () => {
    expect(arrangeNodesHorizontal([], [], {})).toEqual([]);
  });

  it('positions a single start node at default startX/startY', () => {
    const nodes = [makeNode('s', NodeType.START)];
    const result = arrangeNodesHorizontal(nodes, [], {});
    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ x: 100, y: 200 });
  });

  it('positions connected nodes in a horizontal row following edges', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('a2', NodeType.ACTION),
    ];
    const edges = [
      makeEdge('s', 'a1'),
      makeEdge('a1', 'a2'),
    ];
    const result = arrangeNodesHorizontal(nodes, edges, {});

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    expect(posMap.get('s')!.y).toBe(posMap.get('a1')!.y);
    expect(posMap.get('a1')!.y).toBe(posMap.get('a2')!.y);
    expect(posMap.get('s')!.x).toBeLessThan(posMap.get('a1')!.x);
    expect(posMap.get('a1')!.x).toBeLessThan(posMap.get('a2')!.x);
  });

  it('places unconnected nodes above connected nodes', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('orphan', NodeType.ACTION),
    ];
    const edges = [makeEdge('s', 'a1')];
    const result = arrangeNodesHorizontal(nodes, edges, {});

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    expect(posMap.get('orphan')!.y).toBeLessThan(posMap.get('s')!.y);
  });

  it('places reusable nodes above the start row', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('r1', 'reusable.reusable'),
    ];
    const result = arrangeNodesHorizontal(nodes, [], {});

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    expect(posMap.get('r1')!.y).toBeLessThan(posMap.get('s')!.y);
  });

  it('places property input nodes above their target', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('val', 'value.string'),
    ];
    const edges = [
      makeEdge('s', 'a1'),
      makeEdge('val', 'a1', 'selector-input'),
    ];
    const result = arrangeNodesHorizontal(nodes, edges, {});

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    expect(posMap.get('val')!.y).toBeLessThan(posMap.get('a1')!.y);
  });

  it('wraps to a new row when nodesPerRow is exceeded', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('a2', NodeType.ACTION),
    ];
    const edges = [makeEdge('s', 'a1'), makeEdge('a1', 'a2')];
    const result = arrangeNodesHorizontal(nodes, edges, { nodesPerRow: 2 });

    const posMap = new Map(result.map((n) => [n.id, n.position]));
    // Third node (index 2) should wrap to row 1
    expect(posMap.get('a2')!.y).toBeGreaterThan(posMap.get('s')!.y);
  });

  it('respects custom startX and startY options', () => {
    const nodes = [makeNode('s', NodeType.START)];
    const result = arrangeNodesHorizontal(nodes, [], { startX: 500, startY: 600 });
    expect(result[0].position).toEqual({ x: 500, y: 600 });
  });

  it('preserves all nodes in the output', () => {
    const nodes = [
      makeNode('s', NodeType.START),
      makeNode('a1', NodeType.ACTION),
      makeNode('orphan', NodeType.ACTION),
      makeNode('r1', 'reusable.reusable'),
    ];
    const edges = [makeEdge('s', 'a1')];
    const result = arrangeNodesHorizontal(nodes, edges, {});
    expect(result).toHaveLength(4);
    const ids = result.map((n) => n.id).sort();
    expect(ids).toEqual(['a1', 'orphan', 'r1', 's']);
  });
});
