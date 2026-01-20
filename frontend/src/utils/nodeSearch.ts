import { Node } from 'reactflow';

/**
 * Recursively searches through an object for a query string
 * Returns true if the query is found in any string or number value
 */
function searchInObject(obj: any, query: string): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }

  // Convert to string and check
  if (typeof obj === 'string') {
    return obj.toLowerCase().includes(query.toLowerCase());
  }

  if (typeof obj === 'number') {
    return obj.toString().toLowerCase().includes(query.toLowerCase());
  }

  if (typeof obj === 'boolean') {
    return obj.toString().toLowerCase().includes(query.toLowerCase());
  }

  // Skip functions and symbols
  if (typeof obj === 'function' || typeof obj === 'symbol') {
    return false;
  }

  // Recursively search in arrays
  if (Array.isArray(obj)) {
    return obj.some(item => searchInObject(item, query));
  }

  // Recursively search in objects
  if (typeof obj === 'object') {
    // Skip ReactFlow internal properties
    if (obj.__rf || obj.__reactInternalInstance) {
      return false;
    }
    
    return Object.values(obj).some(value => searchInObject(value, query));
  }

  return false;
}

/**
 * Searches through nodes for a query string
 * Searches in: node type, node label, and all properties/values recursively
 * Returns array of matching node IDs
 */
export function searchNodes(query: string, nodes: Node[]): string[] {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchingIds: string[] = [];

  nodes.forEach((node) => {
    let matches = false;

    // Search in node type
    if (node.type && node.type.toLowerCase().includes(normalizedQuery)) {
      matches = true;
    }

    // Search in node data type
    if (node.data?.type && String(node.data.type).toLowerCase().includes(normalizedQuery)) {
      matches = true;
    }

    // Search in node label
    if (node.data?.label && String(node.data.label).toLowerCase().includes(normalizedQuery)) {
      matches = true;
    }

    // Search in all node data properties recursively
    if (node.data && searchInObject(node.data, normalizedQuery)) {
      matches = true;
    }

    // Search in node ID as fallback
    if (node.id.toLowerCase().includes(normalizedQuery)) {
      matches = true;
    }

    if (matches) {
      matchingIds.push(node.id);
    }
  });

  return matchingIds;
}
