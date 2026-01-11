"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunReusableHandler = exports.EndHandler = exports.ReusableHandler = void 0;
const parser_1 = require("../../backend/src/engine/parser");
const reusableFlowExtractor_1 = require("../../backend/src/utils/reusableFlowExtractor");
const nodes_1 = require("../../backend/src/nodes");
class ReusableHandler {
    async execute(node, context) {
        const data = node.data;
        // Validate that context name is provided
        if (!data.contextName || data.contextName.trim() === '') {
            throw new Error('Reusable node must have a context name');
        }
        // No-op execution - reusable nodes are skipped in main workflow
        // The context name is stored in the node data, which is accessible during parsing
    }
}
exports.ReusableHandler = ReusableHandler;
class EndHandler {
    async execute(node, context) {
        // No-op execution - end nodes are skipped in main workflow
        // They act as markers to indicate the end of a reusable flow
    }
}
exports.EndHandler = EndHandler;
class RunReusableHandler {
    async execute(node, context) {
        const data = node.data;
        if (!data.contextName || data.contextName.trim() === '') {
            throw new Error('Run Reusable node must have a context name');
        }
        // Get the workflow from context (stored by executor)
        const workflow = context.workflow;
        if (!workflow) {
            throw new Error('Workflow not available in context. Cannot execute reusable flow.');
        }
        // Find the Reusable node with matching context name
        const reusableNode = (0, reusableFlowExtractor_1.findReusableByContext)(workflow, data.contextName);
        if (!reusableNode) {
            throw new Error(`No reusable flow found with context name: ${data.contextName}`);
        }
        // Extract the reusable sub-workflow
        const reusableFlow = (0, reusableFlowExtractor_1.extractReusableFlow)(workflow, reusableNode.id);
        if (!reusableFlow || reusableFlow.nodes.length === 0) {
            console.warn(`Reusable flow "${data.contextName}" has no nodes to execute`);
            return;
        }
        // Create a parser for the reusable workflow
        const parser = new parser_1.WorkflowParser(reusableFlow);
        // Get execution order for the reusable flow
        // Note: The reusable flow doesn't have a Start node, so we need to handle this
        // We'll get the execution order starting from nodes connected to the Reusable node
        let executionOrder;
        try {
            executionOrder = parser.getExecutionOrder();
        }
        catch (error) {
            // If there's no start node, we need to find the first node(s) in the flow
            // These are nodes that have no incoming driver connections
            const nodesWithNoDriverInput = reusableFlow.nodes.filter(n => {
                const hasDriverInput = reusableFlow.edges.some(e => e.target === n.id && (!e.targetHandle || e.targetHandle === 'driver' || e.targetHandle === 'input'));
                return !hasDriverInput;
            });
            if (nodesWithNoDriverInput.length === 0) {
                throw new Error(`Reusable flow "${data.contextName}" has no executable nodes`);
            }
            // Build execution order manually starting from nodes with no driver input
            const visited = new Set();
            const result = [];
            const visit = (nodeId) => {
                if (visited.has(nodeId)) {
                    return;
                }
                visited.add(nodeId);
                const node = reusableFlow.nodes.find(n => n.id === nodeId);
                if (!node) {
                    return;
                }
                // Visit dependencies first (nodes that must execute before this one)
                const dependencies = reusableFlow.edges
                    .filter(e => e.target === nodeId && (!e.targetHandle || e.targetHandle === 'driver' || e.targetHandle === 'input'))
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
            // Get handler for node type
            const handler = (0, nodes_1.getNodeHandler)(node.type);
            if (!handler) {
                throw new Error(`No handler found for node type: ${node.type} in reusable flow`);
            }
            // Execute node with the same context
            await handler.execute(node, context);
        }
    }
}
exports.RunReusableHandler = RunReusableHandler;
// Export handlers by node type for plugin loader
module.exports = {
  'reusable.reusable': ReusableHandler,
  'reusable.end': EndHandler,
  'reusable.runReusable': RunReusableHandler,
  default: {
    'reusable.reusable': ReusableHandler,
    'reusable.end': EndHandler,
    'reusable.runReusable': RunReusableHandler,
  },
};
