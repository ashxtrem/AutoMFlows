import { Workflow, BaseNode, NodeType } from '@automflows/shared';
import { getLLMProvider } from '../llm/index.js';
import { RequestAnalyzer } from '../utils/requestAnalyzer.js';
import { WorkflowModifier } from '../utils/workflowModifier.js';
import { WorkflowValidator } from '../utils/workflowValidator.js';
import { WorkflowBuilder } from '../utils/workflowBuilder.js';
import { loadSnapshotsFromDir, findElementInSnapshot } from '../utils/snapshotWorkflowBuilder.js';
import { BackendClient } from '../utils/backendClient.js';
import { DOMSelectorInference } from '../utils/domSelectorInference.js';

export interface ExtendWorkflowParams {
  workflow: Workflow;
  userRequest: string; // Natural language request
  modificationType?: 'add' | 'update' | 'insert' | 'add_assertion' | 'auto'; // Optional hint
  targetNodeId?: string; // Optional: specific node to modify or insert after
  position?: 'before' | 'after' | 'end'; // For insertions
  snapshotsPath?: string; // Path to snapshot dir (e.g. output/start-1771430710449/snapshots)
  executionId?: string; // Fetch DOM from failed execution for selector inference
}

export async function extendWorkflow(params: ExtendWorkflowParams): Promise<Workflow> {
  const { workflow, userRequest, modificationType, targetNodeId, position, snapshotsPath, executionId } = params;

  // Try LLM-based extension first
  const llmProvider = getLLMProvider();
  if (llmProvider) {
    try {
      const extendedWorkflow = await llmProvider.extendWorkflow(
        workflow,
        userRequest,
        modificationType
      );

      // Validate the extended workflow
      const validation = WorkflowValidator.validate(extendedWorkflow);
      if (validation.valid) {
        return extendedWorkflow;
      }
    } catch (error: any) {
      console.warn('LLM workflow extension failed, falling back to rule-based:', error.message);
      // Fall through to rule-based extension
    }
  }

  // Fallback to rule-based extension
  return extendWorkflowRuleBased(workflow, userRequest, modificationType, targetNodeId, position, snapshotsPath, executionId);
}

function isSelectorRelatedRequest(userRequest: string): boolean {
  const lower = userRequest.toLowerCase();
  return (
    lower.includes('selector') ||
    lower.includes('fix') ||
    lower.includes('click') ||
    lower.includes('button') ||
    lower.includes('element') ||
    lower.includes('locator')
  );
}

function isInteractionNode(node: BaseNode): boolean {
  const interactionTypes = ['action', 'type', 'formInput', 'elementQuery', 'verify'];
  return interactionTypes.includes(node.type);
}

async function extendWorkflowRuleBased(
  workflow: Workflow,
  userRequest: string,
  modificationType?: 'add' | 'update' | 'insert' | 'add_assertion' | 'auto',
  targetNodeId?: string,
  position?: 'before' | 'after' | 'end',
  snapshotsPath?: string,
  executionId?: string
): Promise<Workflow> {
  // Parse the modification request
  const parsed = RequestAnalyzer.parseModificationRequest(userRequest, workflow);
  const modType = modificationType || parsed.modificationType;
  
  let modifiedWorkflow = workflow;

  switch (modType) {
    case 'add':
      modifiedWorkflow = handleAddNode(workflow, userRequest, parsed, targetNodeId, position);
      break;
    
    case 'update':
      modifiedWorkflow = await handleUpdateNode(workflow, userRequest, parsed, targetNodeId, snapshotsPath, executionId);
      break;
    
    case 'insert':
      modifiedWorkflow = handleInsertNode(workflow, userRequest, parsed);
      break;
    
    case 'add_assertion':
      modifiedWorkflow = handleAddAssertion(workflow, userRequest, parsed, targetNodeId, position);
      break;
    
    case 'auto':
      // Try to determine from request
      if (parsed.modificationType !== 'auto') {
        return extendWorkflowRuleBased(workflow, userRequest, parsed.modificationType, targetNodeId, position, snapshotsPath, executionId);
      }
      // Default to add if unclear
      modifiedWorkflow = handleAddNode(workflow, userRequest, parsed, targetNodeId, position);
      break;
  }

  // Validate the modified workflow
  const validation = WorkflowValidator.validate(modifiedWorkflow);
  if (!validation.valid) {
    console.warn('Workflow validation failed after extension:', validation.errors);
    // Return modified workflow anyway, but log warnings
  }

  return modifiedWorkflow;
}

function handleAddNode(
  workflow: Workflow,
  userRequest: string,
  parsed: ReturnType<typeof RequestAnalyzer.parseModificationRequest>,
  targetNodeId?: string,
  position?: 'before' | 'after' | 'end'
): Workflow {
  const newNodeConfig = parsed.newNodeConfig || {};
  const target = parsed.targetNode || {};
  const insertPosition = position || target.position || 'after';
  const insertTargetId = targetNodeId || target.nodeId;

  // Create new node based on configuration
  const newNode = createNodeFromConfig(newNodeConfig, userRequest);

  if (insertTargetId) {
    if (insertPosition === 'before') {
      return WorkflowModifier.insertNodeBefore(workflow, insertTargetId, newNode);
    } else {
      return WorkflowModifier.insertNodeAfter(workflow, insertTargetId, newNode);
    }
  } else {
    // Add at end
    return WorkflowModifier.addNodeAtEnd(workflow, newNode);
  }
}

async function handleUpdateNode(
  workflow: Workflow,
  userRequest: string,
  parsed: ReturnType<typeof RequestAnalyzer.parseModificationRequest>,
  targetNodeId?: string,
  snapshotsPath?: string,
  executionId?: string
): Promise<Workflow> {
  const target = parsed.targetNode || {};
  let nodeId = targetNodeId || target.nodeId;
  const newNodeConfig = parsed.newNodeConfig || {};

  if (!nodeId) {
    // Try to find node by description
    const insertionPoint = WorkflowModifier.findInsertionPoint(workflow, target.description || userRequest);
    if (insertionPoint) {
      nodeId = insertionPoint.nodeId;
    }
  }

  if (!nodeId) {
    throw new Error('Could not determine which node to update');
  }

  const nodeToUpdate = workflow.nodes.find((n) => n.id === nodeId);
  if (!nodeToUpdate) {
    throw new Error(`Node ${nodeId} not found`);
  }

  let modifiedWorkflow = workflow;

  const useSnapshotForSelector =
    (snapshotsPath || executionId) &&
    isSelectorRelatedRequest(userRequest) &&
    isInteractionNode(nodeToUpdate) &&
    (nodeToUpdate.data as any)?.selector &&
    !newNodeConfig.selector;

  if (useSnapshotForSelector) {
    const nodeData = nodeToUpdate.data as any;
    const action = nodeData.label || `${nodeToUpdate.type} element`;
    const targetDesc = action.replace(/^(click|type|fill|submit)\s+/i, '').trim() || undefined;

    if (executionId) {
      try {
        const backendClient = new BackendClient();
        const pageDebugInfo = await backendClient.getCapturedDOM(executionId);
        if (pageDebugInfo) {
          const domContext = DOMSelectorInference.convertToOptimizedContext(pageDebugInfo, action);
          const inferredSelectors = DOMSelectorInference.inferSelectorRuleBased(
            action,
            domContext,
            nodeToUpdate.type
          );
          if (inferredSelectors.length > 0) {
            const best = inferredSelectors[0];
            modifiedWorkflow = WorkflowModifier.updateNodeSelector(modifiedWorkflow, nodeId, best.selector);
            modifiedWorkflow = WorkflowModifier.updateNodeProperty(
              modifiedWorkflow,
              nodeId,
              'selectorType',
              best.type
            );
          }
        }
      } catch (err: any) {
        console.warn('DOM-based selector inference failed:', err.message);
      }
    } else if (snapshotsPath) {
      try {
        const snapshots = loadSnapshotsFromDir(snapshotsPath);
        const latestTree = snapshots.get('latest');
        if (latestTree) {
          const actionType = nodeToUpdate.type === 'type' ? 'type' : 'click';
          const match = findElementInSnapshot(latestTree, actionType, targetDesc);
          if (match) {
            modifiedWorkflow = WorkflowModifier.updateNodeSelector(modifiedWorkflow, nodeId, match.selector);
            modifiedWorkflow = WorkflowModifier.updateNodeProperty(
              modifiedWorkflow,
              nodeId,
              'selectorType',
              match.selectorType
            );
          }
        }
      } catch (err: any) {
        console.warn('Snapshot-based selector inference failed:', err.message);
      }
    }
  }

  if (newNodeConfig.selector) {
    modifiedWorkflow = WorkflowModifier.updateNodeSelector(modifiedWorkflow, nodeId, newNodeConfig.selector);
  }

  for (const [key, value] of Object.entries(newNodeConfig)) {
    if (key !== 'nodeType') {
      modifiedWorkflow = WorkflowModifier.updateNodeProperty(modifiedWorkflow, nodeId, key, value);
    }
  }

  return modifiedWorkflow;
}

function handleInsertNode(
  workflow: Workflow,
  userRequest: string,
  parsed: ReturnType<typeof RequestAnalyzer.parseModificationRequest>
): Workflow {
  const newNodeConfig = parsed.newNodeConfig || {};
  const sourceNodeId = parsed.sourceNodeId;
  const targetNodeId = parsed.targetNodeId;

  if (!sourceNodeId || !targetNodeId) {
    throw new Error('Insert operation requires both source and target nodes. Use "insert [node] between [node1] and [node2]"');
  }

  const newNode = createNodeFromConfig(newNodeConfig, userRequest);
  return WorkflowModifier.insertNodeBetween(workflow, sourceNodeId, targetNodeId, newNode);
}

function handleAddAssertion(
  workflow: Workflow,
  userRequest: string,
  parsed: ReturnType<typeof RequestAnalyzer.parseModificationRequest>,
  targetNodeId?: string,
  position?: 'before' | 'after' | 'end'
): Workflow {
  const target = parsed.targetNode || {};
  const insertTargetId = targetNodeId || target.nodeId;
  const insertPosition = position || target.position || 'after';

  // Parse assertion configuration from request
  const assertionConfig = parseAssertionConfig(userRequest, parsed.newNodeConfig);

  if (insertTargetId) {
    if (insertPosition === 'before') {
      return WorkflowModifier.addAssertionBefore(workflow, insertTargetId, assertionConfig);
    } else {
      return WorkflowModifier.addAssertionAfter(workflow, insertTargetId, assertionConfig);
    }
  } else {
    // Find insertion point
    const insertionPoint = WorkflowModifier.findInsertionPoint(workflow, target.description || userRequest);
    if (insertionPoint) {
      if (insertionPoint.position === 'before') {
        return WorkflowModifier.addAssertionBefore(workflow, insertionPoint.nodeId, assertionConfig);
      } else {
        return WorkflowModifier.addAssertionAfter(workflow, insertionPoint.nodeId, assertionConfig);
      }
    }
    
    // Default: add at end
    const endNodes = WorkflowModifier.findNodesByType(workflow, NodeType.START);
    if (endNodes.length > 0) {
      // Find last node in workflow
      const nodesWithOutgoing = new Set(workflow.edges.map(e => e.source));
      const lastNodes = workflow.nodes.filter(n => !nodesWithOutgoing.has(n.id));
      if (lastNodes.length > 0) {
        const lastNode = lastNodes.reduce((rightmost, node) => 
          node.position.x > rightmost.position.x ? node : rightmost
        );
        return WorkflowModifier.addAssertionAfter(workflow, lastNode.id, assertionConfig);
      }
    }
    
    throw new Error('Could not determine where to add assertion');
  }
}

function createNodeFromConfig(
  config: ReturnType<typeof RequestAnalyzer.extractNewNodeConfig>,
  userRequest: string
): BaseNode {
  const nodeType = config.nodeType || 'wait';
  const label = extractLabel(userRequest) || config.nodeType || 'New Node';
  
  const baseNode: BaseNode = {
    id: `${nodeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: nodeType,
    position: { x: 0, y: 0 }, // Will be calculated by modifier
    data: {
      type: nodeType,
      label,
    },
  };

  // Add type-specific data
  switch (nodeType) {
    case 'navigation':
      (baseNode.data as any).url = config.url || '';
      (baseNode.data as any).waitUntil = 'networkidle';
      break;
    
    case 'action':
      (baseNode.data as any).action = 'click';
      (baseNode.data as any).selector = config.selector || 'button';
      break;
    
    case 'type':
      (baseNode.data as any).selector = config.selector || 'input';
      (baseNode.data as any).text = config.text || '';
      (baseNode.data as any).clearFirst = true;
      break;
    
    case 'apiRequest':
      (baseNode.data as any).method = 'GET';
      (baseNode.data as any).url = config.url || '';
      break;
    
    case 'wait':
      (baseNode.data as any).waitType = 'timeout';
      (baseNode.data as any).value = 2000;
      break;
    
    case 'verify':
      (baseNode.data as any).domain = 'browser';
      (baseNode.data as any).verificationType = 'visible';
      (baseNode.data as any).selector = config.selector;
      break;
    
    case 'javascriptCode':
      (baseNode.data as any).code = config.code || '// Add your code here\ncontext.setData("result", null);';
      break;
    
    case 'csvHandle':
      (baseNode.data as any).action = 'write';
      (baseNode.data as any).filePath = config.filePath || '${data.outputDirectory}/output.csv';
      (baseNode.data as any).dataSource = config.dataSource || 'data';
      (baseNode.data as any).headers = config.headers || ['value'];
      (baseNode.data as any).delimiter = ',';
      break;
    
    case 'elementQuery':
      (baseNode.data as any).action = config.action || 'getText';
      (baseNode.data as any).selector = config.selector || '';
      (baseNode.data as any).selectorType = config.selectorType || 'css';
      (baseNode.data as any).outputVariable = config.outputVariable || 'text';
      break;
  }

  // Add any additional config properties
  if (config.config) {
    Object.assign(baseNode.data, config.config);
  }

  return baseNode;
}

function parseAssertionConfig(
  userRequest: string,
  newNodeConfig?: ReturnType<typeof RequestAnalyzer.extractNewNodeConfig>
): {
  domain: string;
  verificationType: string;
  selector?: string;
  expectedValue?: string | number;
  label?: string;
} {
  const requestLower = userRequest.toLowerCase();
  
  // Determine domain
  let domain = 'browser';
  if (requestLower.includes('api')) {
    domain = 'api';
  } else if (requestLower.includes('database') || requestLower.includes('db')) {
    domain = 'database';
  }

  // Determine verification type
  let verificationType = 'visible';
  if (requestLower.includes('text') || requestLower.includes('contains')) {
    verificationType = 'text';
  } else if (requestLower.includes('attribute')) {
    verificationType = 'attribute';
  } else if (requestLower.includes('status') || requestLower.includes('code')) {
    verificationType = 'status';
  } else if (requestLower.includes('visible') || requestLower.includes('exists')) {
    verificationType = 'visible';
  }

  // Extract expected value
  let expectedValue: string | number | undefined;
  const containsMatch = userRequest.match(/contains?\s+['"]([^'"]+)['"]/i);
  if (containsMatch) {
    expectedValue = containsMatch[1];
  }
  
  const equalsMatch = userRequest.match(/equals?\s+['"]?([^'"]+)['"]?/i);
  if (equalsMatch) {
    expectedValue = equalsMatch[1];
  }

  return {
    domain,
    verificationType,
    selector: newNodeConfig?.selector,
    expectedValue,
    label: extractLabel(userRequest) || 'Verify',
  };
}

function extractLabel(userRequest: string): string | undefined {
  // Try to extract a meaningful label
  const addMatch = userRequest.match(/add\s+(?:a\s+)?(?:new\s+)?(.+?)(?:\s+after|\s+before|\s+at|\s+to|$)/i);
  if (addMatch) {
    return addMatch[1].trim();
  }
  
  const verifyMatch = userRequest.match(/verify\s+(.+?)(?:\s+after|\s+before|$)/i);
  if (verifyMatch) {
    return `Verify ${verifyMatch[1].trim()}`;
  }
  
  return undefined;
}
