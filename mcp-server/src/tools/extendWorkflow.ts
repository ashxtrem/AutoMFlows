import { Workflow, BaseNode, NodeType } from '@automflows/shared';
import { getLLMProvider } from '../llm/index.js';
import { RequestAnalyzer } from '../utils/requestAnalyzer.js';
import { WorkflowModifier } from '../utils/workflowModifier.js';
import { WorkflowValidator } from '../utils/workflowValidator.js';
import { WorkflowBuilder } from '../utils/workflowBuilder.js';

export interface ExtendWorkflowParams {
  workflow: Workflow;
  userRequest: string; // Natural language request
  modificationType?: 'add' | 'update' | 'insert' | 'add_assertion' | 'auto'; // Optional hint
  targetNodeId?: string; // Optional: specific node to modify or insert after
  position?: 'before' | 'after' | 'end'; // For insertions
}

export async function extendWorkflow(params: ExtendWorkflowParams): Promise<Workflow> {
  const { workflow, userRequest, modificationType, targetNodeId, position } = params;

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
  return extendWorkflowRuleBased(workflow, userRequest, modificationType, targetNodeId, position);
}

function extendWorkflowRuleBased(
  workflow: Workflow,
  userRequest: string,
  modificationType?: 'add' | 'update' | 'insert' | 'add_assertion' | 'auto',
  targetNodeId?: string,
  position?: 'before' | 'after' | 'end'
): Workflow {
  // Parse the modification request
  const parsed = RequestAnalyzer.parseModificationRequest(userRequest, workflow);
  const modType = modificationType || parsed.modificationType;
  
  let modifiedWorkflow = workflow;

  switch (modType) {
    case 'add':
      modifiedWorkflow = handleAddNode(workflow, userRequest, parsed, targetNodeId, position);
      break;
    
    case 'update':
      modifiedWorkflow = handleUpdateNode(workflow, userRequest, parsed, targetNodeId);
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
        return extendWorkflowRuleBased(workflow, userRequest, parsed.modificationType, targetNodeId, position);
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

function handleUpdateNode(
  workflow: Workflow,
  userRequest: string,
  parsed: ReturnType<typeof RequestAnalyzer.parseModificationRequest>,
  targetNodeId?: string
): Workflow {
  const target = parsed.targetNode || {};
  const nodeId = targetNodeId || target.nodeId;
  const newNodeConfig = parsed.newNodeConfig || {};

  if (!nodeId) {
    // Try to find node by description
    const insertionPoint = WorkflowModifier.findInsertionPoint(workflow, target.description || userRequest);
    if (insertionPoint) {
      const nodeToUpdate = insertionPoint.nodeId;
      
      // Update selector if provided
      if (newNodeConfig.selector) {
        return WorkflowModifier.updateNodeSelector(workflow, nodeToUpdate, newNodeConfig.selector);
      }
      
      // Update other properties
      for (const [key, value] of Object.entries(newNodeConfig)) {
        if (key !== 'nodeType') {
          workflow = WorkflowModifier.updateNodeProperty(workflow, nodeToUpdate, key, value);
        }
      }
      
      return workflow;
    }
    
    throw new Error('Could not determine which node to update');
  }

  // Update specific node
  if (newNodeConfig.selector) {
    return WorkflowModifier.updateNodeSelector(workflow, nodeId, newNodeConfig.selector);
  }

  // Update other properties
  let modifiedWorkflow = workflow;
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
