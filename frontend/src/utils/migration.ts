import { BaseNode, NodeType, Workflow } from '@automflows/shared';

/**
 * Migration utilities to convert old node types to new consolidated node types
 * Used during workflow load to automatically migrate old workflows
 */

export interface MigrationResult {
  migrated: boolean;
  newNode?: BaseNode;
  warning?: string;
}

/**
 * Convert old node to consolidated node format
 */
export function convertOldNodeToConsolidated(oldNode: BaseNode): MigrationResult {
  switch (oldNode.type) {
    case NodeType.CLICK:
      return {
        migrated: true,
        newNode: {
          ...oldNode,
          type: NodeType.ACTION,
          data: {
            ...oldNode.data,
            action: 'click',
          },
        },
        warning: 'Click node has been migrated to Action node with action="click"',
      };

    case NodeType.GET_TEXT:
      return {
        migrated: true,
        newNode: {
          ...oldNode,
          type: NodeType.ELEMENT_QUERY,
          data: {
            ...oldNode.data,
            action: 'getText',
            outputVariable: (oldNode.data as any).outputVariable || 'text',
          },
        },
        warning: 'Get Text node has been migrated to Element Query node with action="getText"',
      };

    case NodeType.NAVIGATE:
      return {
        migrated: true,
        newNode: {
          ...oldNode,
          type: NodeType.NAVIGATION,
          data: {
            ...oldNode.data,
            action: 'navigate',
          },
        },
        warning: 'Navigate node has been migrated to Navigation node with action="navigate"',
      };

    // Add more conversions as needed:
    // - Select → Form Input (action='select')
    // - Checkbox → Form Input (action='check')
    // - Upload → Form Input (action='upload')
    // - Screenshot → Screenshot (action='fullPage') - when enhanced

    default:
      return {
        migrated: false,
      };
  }
}

/**
 * Migrate entire workflow by converting all old nodes
 */
export function migrateWorkflow(workflow: Workflow): {
  workflow: Workflow;
  warnings: string[];
} {
  const warnings: string[] = [];
  const migratedNodes: BaseNode[] = [];

  for (const node of workflow.nodes) {
    const result = convertOldNodeToConsolidated(node);
    if (result.migrated && result.newNode) {
      migratedNodes.push(result.newNode);
      if (result.warning) {
        warnings.push(`Node "${node.id}": ${result.warning}`);
      }
    } else {
      migratedNodes.push(node);
    }
  }

  return {
    workflow: {
      ...workflow,
      nodes: migratedNodes,
    },
    warnings,
  };
}

/**
 * Check if a node type is deprecated
 */
export function isDeprecatedNodeType(nodeType: NodeType): boolean {
  const deprecatedTypes: NodeType[] = [
    NodeType.CLICK, // Migrated to ACTION
    NodeType.GET_TEXT, // Migrated to ELEMENT_QUERY
    NodeType.NAVIGATE, // Migrated to NAVIGATION
    // Add more as they get migrated
  ];
  return deprecatedTypes.includes(nodeType);
}

/**
 * Get migration suggestion for a deprecated node type
 */
export function getMigrationSuggestion(oldType: NodeType): { newType: NodeType; action?: string } | null {
  switch (oldType) {
    case NodeType.CLICK:
      return { newType: NodeType.ACTION, action: 'click' };
    case NodeType.GET_TEXT:
      return { newType: NodeType.ELEMENT_QUERY, action: 'getText' };
    case NodeType.NAVIGATE:
      return { newType: NodeType.NAVIGATION, action: 'navigate' };
    default:
      return null;
  }
}
