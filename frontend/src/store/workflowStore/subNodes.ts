import { StateCreator } from 'zustand';
import { Node, Edge } from 'reactflow';
import { WorkflowStoreStateWithNodes } from './slices';

const STORAGE_KEY = 'automflows-subnodes';

export interface SubNodeSnippet {
  id: string;
  name: string;
  createdAt: number;
  nodes: Node[];
  edges: Edge[];
}

export interface SubNodesSlice {
  subNodeSnippets: SubNodeSnippet[];
  loadSubNodes: () => void;
  saveAsSubNode: (name: string, nodeIds: string[]) => void;
  insertSubNode: (snippetId: string, position: { x: number; y: number }) => void;
  deleteSubNode: (snippetId: string) => void;
  isSubNodeNameTaken: (name: string) => boolean;
}

function persistSubNodes(snippets: SubNodeSnippet[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch {
    // localStorage full or unavailable
  }
}

function loadSubNodesFromStorage(): SubNodeSnippet[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SubNodeSnippet[];
  } catch {
    return [];
  }
}

export const createSubNodesSlice: StateCreator<
  WorkflowStoreStateWithNodes & SubNodesSlice,
  [],
  [],
  SubNodesSlice
> = (set, get) => ({
  subNodeSnippets: loadSubNodesFromStorage(),

  loadSubNodes: () => {
    set({ subNodeSnippets: loadSubNodesFromStorage() });
  },

  saveAsSubNode: (name, nodeIds) => {
    const state = get();
    const nodesToSave = state.nodes.filter((n) => nodeIds.includes(n.id));
    if (nodesToSave.length === 0) return;

    const nodeIdSet = new Set(nodeIds);
    const connectedEdges = state.edges.filter(
      (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    const snippet: SubNodeSnippet = {
      id: `subnode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: Date.now(),
      nodes: JSON.parse(JSON.stringify(nodesToSave)),
      edges: JSON.parse(JSON.stringify(connectedEdges)),
    };

    const updated = [...state.subNodeSnippets, snippet];
    set({ subNodeSnippets: updated });
    persistSubNodes(updated);
  },

  insertSubNode: (snippetId, position) => {
    const state = get();
    const snippet = state.subNodeSnippets.find((s) => s.id === snippetId);
    if (!snippet || snippet.nodes.length === 0) return;

    const timestamp = Date.now();
    const firstNode = snippet.nodes[0];
    const offsetX = position.x - firstNode.position.x;
    const offsetY = position.y - firstNode.position.y;

    const idMap = new Map<string, string>();
    const newNodes: Node[] = snippet.nodes.map((node, index) => {
      const newId = `${node.data.type}-${timestamp}-${index}`;
      idMap.set(node.id, newId);
      return {
        ...JSON.parse(JSON.stringify(node)),
        id: newId,
        selected: false,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
      };
    });

    const newEdges: Edge[] = snippet.edges
      .filter((e) => idMap.has(e.source) && idMap.has(e.target))
      .map((edge, index) => ({
        ...JSON.parse(JSON.stringify(edge)),
        id: `edge-${timestamp}-${index}`,
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
      }));

    set({
      nodes: [...state.nodes, ...newNodes],
      edges: [...state.edges, ...newEdges],
    });

    setTimeout(() => get().saveToHistory(), 100);
  },

  deleteSubNode: (snippetId) => {
    const state = get();
    const updated = state.subNodeSnippets.filter((s) => s.id !== snippetId);
    set({ subNodeSnippets: updated });
    persistSubNodes(updated);
  },

  isSubNodeNameTaken: (name) => {
    const state = get();
    return state.subNodeSnippets.some(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
  },
});
