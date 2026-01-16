import { BaseNode, Workflow, ExecutionEventType } from '@automflows/shared';
import { NodeHandler } from '../../backend/src/nodes/base';
import { ContextManager } from '../../backend/src/engine/context';
import { WorkflowParser } from '../../backend/src/engine/parser';
import { findReusableByContext, extractReusableFlow } from '../../backend/src/utils/reusableFlowExtractor';
import { getNodeHandler } from '../../backend/src/nodes';

export interface ReusableNodeData {
  contextName: string;
}

export interface EndNodeData {
  // No data needed, just a marker
}

export interface RunReusableNodeData {
  contextName: string;
}

export class ReusableHandler implements NodeHandler {
  async execute(node: BaseNode, _context: ContextManager): Promise<void> {
    const data = node.data as ReusableNodeData;
    
    // Validate that context name is provided
    if (!data.contextName || data.contextName.trim() === '') {
      throw new Error('Reusable node must have a context name');
    }
    
    // No-op execution - reusable nodes are skipped in main workflow
    // The context name is stored in the node data, which is accessible during parsing
  }
}

export class EndHandler implements NodeHandler {
  async execute(_node: BaseNode, _context: ContextManager): Promise<void> {
    // No-op execution - end nodes are skipped in main workflow
    // They act as markers to indicate the end of a reusable flow
  }
}

export class RunReusableHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as RunReusableNodeData;
    
    if (!data.contextName || data.contextName.trim() === '') {
      throw new Error('Run Reusable node must have a context name');
    }
    
    // Get the workflow from context (stored by executor)
    const workflow = context.getData('fullWorkflow') as Workflow | undefined;
    if (!workflow) {
      throw new Error('Workflow not available in context. Cannot execute reusable flow.');
    }
    
    // Find the Reusable node with matching context name
    const reusableNode = findReusableByContext(workflow, data.contextName);
    if (!reusableNode) {
      throw new Error(`No reusable flow found with context name: ${data.contextName}`);
    }
    
    // Extract the reusable sub-workflow
    const reusableFlow = extractReusableFlow(workflow, reusableNode.id);
    if (!reusableFlow || reusableFlow.nodes.length === 0) {
      console.warn(`Reusable flow "${data.contextName}" has no nodes to execute`);
      return;
    }
    
    // Create a parser for the reusable workflow
    const parser = new WorkflowParser(reusableFlow);
    
    // Get execution order for the reusable flow
    // Note: The reusable flow doesn't have a Start node, so we need to handle this
    // We'll get the execution order starting from nodes connected to the Reusable node
    let executionOrder: string[];
    try {
      executionOrder = parser.getExecutionOrder();
    } catch (error: any) {
      // If there's no start node, we need to find the first node(s) in the flow
      // These are nodes that have no incoming driver connections from nodes within the reusable flow
      // (edges from the Reusable node itself don't count since it's excluded from the nodes list)
      const nodeIdsInFlow = new Set(reusableFlow.nodes.map(n => n.id));
      const nodesWithNoDriverInput = reusableFlow.nodes.filter(n => {
        const hasDriverInput = reusableFlow.edges.some(
          e => e.target === n.id && 
               nodeIdsInFlow.has(e.source) && // Only count edges from nodes that exist in the extracted workflow
               (!e.targetHandle || e.targetHandle === 'driver' || e.targetHandle === 'input')
        );
        return !hasDriverInput;
      });
      
      if (nodesWithNoDriverInput.length === 0) {
        throw new Error(`Reusable flow "${data.contextName}" has no executable nodes`);
      }
      
      // Build execution order manually starting from nodes with no driver input
      const visited = new Set<string>();
      const result: string[] = [];
      
      const visit = (nodeId: string): void => {
        if (visited.has(nodeId)) {
          return;
        }
        visited.add(nodeId);
        
        const node = reusableFlow.nodes.find(n => n.id === nodeId);
        if (!node) {
          return;
        }
        
        // Visit dependencies first (nodes that must execute before this one)
        // Only consider edges from nodes that exist in the extracted workflow
        const dependencies = reusableFlow.edges
          .filter(e => e.target === nodeId && 
                       nodeIdsInFlow.has(e.source) && // Only count edges from nodes in the workflow
                       (!e.targetHandle || e.targetHandle === 'driver' || e.targetHandle === 'input'))
          .map(e => e.source);
        
        for (const depId of dependencies) {
          visit(depId);
        }
        
        result.push(nodeId);
        
        // Visit dependents (nodes that come after this one)
        const dependents = reusableFlow.edges
          .filter(e => e.source === nodeId && (!e.sourceHandle || e.sourceHandle === 'output' || e.sourceHandle === 'driver'))
          .map(e => e.target);
        
        for (const depId of dependents) {
          visit(depId);
        }
      };
      
      // Start from nodes with no driver input
      for (const startNode of nodesWithNoDriverInput) {
        visit(startNode.id);
      }
      
      executionOrder = result;
    }
    
    // Get property input resolver and trace logging functions from context
    const resolvePropertyInputs = context.getData('resolvePropertyInputs') as ((node: BaseNode) => BaseNode) | undefined;
    const traceLog = context.getData('traceLog') as ((message: string) => void) | undefined;
    const emitEvent = context.getData('emitEvent') as ((event: any) => void) | undefined;
    const setCurrentNodeId = context.getData('setCurrentNodeId') as ((nodeId: string | null) => void) | undefined;
    const getCurrentNodeId = context.getData('getCurrentNodeId') as (() => string | null) | undefined;
    const traceLogsEnabled = context.getData('traceLogs') as boolean | undefined;
    
    // Store original node ID to restore after reusable flow execution
    const originalNodeId = getCurrentNodeId ? getCurrentNodeId() : null;
    
    // Execute nodes in order
    for (const nodeId of executionOrder) {
      const node = parser.getNode(nodeId);
      if (!node) {
        console.warn(`Node ${nodeId} not found in reusable flow`);
        continue;
      }
      
      // Skip Reusable and End nodes within the reusable flow
      if (node.type === 'reusable.reusable' || node.type === 'reusable.end') {
        continue;
      }
      
      // Check if node is bypassed
      const nodeDataInReusable = node.data as any;
      if (nodeDataInReusable?.bypass === true) {
        if (traceLog) {
          traceLog(`[TRACE] Skipping bypassed node in reusable flow: ${nodeId} (type: ${node.type})`);
        }
        if (emitEvent) {
          emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            message: 'Node bypassed',
            timestamp: Date.now(),
          });
        }
        continue;
      }
      
      // Set current node ID for trace logging
      if (setCurrentNodeId) {
        setCurrentNodeId(nodeId);
      }
      
      // Trace log node start
      if (traceLog) {
        traceLog(`[TRACE] Starting node in reusable flow "${data.contextName}": ${nodeId} (type: ${node.type})`);
        if (traceLogsEnabled && node.data) {
          traceLog(`[TRACE] Node config: ${JSON.stringify(node.data, null, 2)}`);
        }
      }
      
      // Emit node start event
      if (emitEvent) {
        emitEvent({
          type: ExecutionEventType.NODE_START,
          nodeId,
          timestamp: Date.now(),
        });
      }
      
      // Resolve property input connections if resolver is available
      let nodeToExecute = node;
      if (resolvePropertyInputs) {
        nodeToExecute = resolvePropertyInputs(node);
      }
      
      // Get handler for node type
      const handler = getNodeHandler(nodeToExecute.type);
      if (!handler) {
        throw new Error(`No handler found for node type: ${nodeToExecute.type} in reusable flow`);
      }
      
      try {
        // Execute node with the same context
        if (traceLog) {
          traceLog(`[TRACE] Executing node handler for: ${nodeToExecute.type}`);
        }
        await handler.execute(nodeToExecute, context);
        
        // Trace log node completion
        if (traceLog) {
          traceLog(`[TRACE] Node ${nodeId} completed successfully`);
        }
        
        // Emit node complete event
        if (emitEvent) {
          emitEvent({
            type: ExecutionEventType.NODE_COMPLETE,
            nodeId,
            timestamp: Date.now(),
          });
        }
      } catch (error: any) {
        // Trace log node error
        if (traceLog) {
          traceLog(`[TRACE] Node ${nodeId} failed: ${error.message}`);
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'handler.ts:237',message:'Error caught in reusable flow',data:{nodeId,errorMessage:error.message,failSilentlyValue:(nodeToExecute.data as any)?.failSilently,failSilentlyType:typeof (nodeToExecute.data as any)?.failSilently},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Check if node has failSilently enabled
        const nodeDataInReusable = nodeToExecute.data as any;
        const failSilently = nodeDataInReusable?.failSilently === true;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'handler.ts:245',message:'failSilently check result',data:{nodeId,failSilently,willContinue:failSilently},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Emit node error event
        if (emitEvent) {
          emitEvent({
            type: ExecutionEventType.NODE_ERROR,
            nodeId,
            message: error.message,
            failSilently: failSilently,
            timestamp: Date.now(),
          });
        }
        
        // If failSilently is enabled, continue execution instead of throwing
        if (failSilently) {
          if (traceLog) {
            traceLog(`[TRACE] Node ${nodeId} failed silently in reusable flow, continuing execution`);
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9e444106-9553-445b-b71d-eeb363325ed2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'handler.ts:267',message:'Executing continue - skipping error throw',data:{nodeId,failSilently},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          // Continue to next node instead of throwing
          continue;
        }
        
        // Re-throw error to propagate it
        throw error;
      }
    }
    
    // Restore original node ID
    if (setCurrentNodeId) {
      setCurrentNodeId(originalNodeId);
    }
  }
}

// Export handlers by node type for plugin loader
export default {
  'reusable.reusable': ReusableHandler,
  'reusable.end': EndHandler,
  'reusable.runReusable': RunReusableHandler,
};
