export interface ProjectContext {
  name: string;
  description: string;
  architecture: string;
  workflowStructure: string;
  executionFlow: string;
  bestPractices: string[];
  commonPatterns: string[];
}

export function getProjectContext(): ProjectContext {
  return {
    name: 'AutoMFlows',
    description: 'A web-based visual workflow builder for browser automation, inspired by n8n and ComfyUI. Create complex web automation workflows using a drag-and-drop node-based interface without writing code.',
    architecture: `
AutoMFlows follows a Client-Server architecture:

**Backend Server:**
- Node.js/Express server
- Playwright execution engine
- Handles workflow execution, API requests, WebSocket communication
- Located in: backend/

**Frontend Client:**
- React + ReactFlow visual editor
- Manages workflow state and node connections
- Communicates with backend via HTTP and WebSocket
- Located in: frontend/

**Shared Types:**
- TypeScript types shared between frontend and backend
- Defines workflow structure, node types, execution context
- Located in: shared/
    `,
    workflowStructure: `
A workflow is a JSON object with two main properties:

1. **nodes**: Array of node objects
   - Each node has: id, type, position, data
   - Node types include: start, openBrowser, navigation, action, type, wait, apiRequest, etc.
   - Nodes represent actions or data in the workflow

2. **edges**: Array of edge objects
   - Each edge connects nodes: source, target, sourceHandle, targetHandle
   - Control flow edges: connect via 'input'/'output' handles
   - Property input edges: connect via property-specific handles (e.g., 'url-input')

**Workflow Execution:**
- Must start with a 'start' node
- Nodes execute in dependency order
- Execution context is shared between nodes via context manager
- Variables can be referenced using \${data.key} or \${variables.key} syntax
    `,
    executionFlow: `
1. Workflow is validated (WorkflowParser.validate())
2. Execution order is determined (topological sort)
3. Executor creates browser instance (if needed)
4. Nodes execute sequentially:
   - Each node handler receives node and context
   - Node performs its action (browser action, API call, etc.)
   - Results stored in context for subsequent nodes
5. Execution status broadcast via WebSocket
6. Errors are captured and reported
7. Screenshots/reports generated (if configured)
    `,
    bestPractices: [
      'Always start workflows with a Start node',
      'Use appropriate wait conditions before interacting with elements',
      'Use descriptive labels for nodes',
      'Store API responses in context with meaningful keys',
      'Use retry strategies for flaky operations',
      'Validate workflows before execution',
      'Use property input connections for dynamic values',
      'Group related operations using reusable flows',
      'Add verification nodes to validate expected states',
      'Use appropriate timeouts for different operations',
    ],
    commonPatterns: [
      'Browser automation: Start → Open Browser → Navigate → Action → Type → Verify',
      'API testing: Start → API Request → Verify → API Request (chained)',
      'Form filling: Navigate → Wait for form → Type fields → Click submit → Verify success',
      'Data extraction: Navigate → Wait → Element Query → Store in context → Process',
      'Conditional flows: Use Switch nodes for branching logic',
      'Reusable flows: Define reusable sub-workflows for repeated operations',
      'Error handling: Use retry strategies and failSilently flags appropriately',
    ],
  };
}

export function getProjectContextAsResource(): string {
  const context = getProjectContext();
  return JSON.stringify(context, null, 2);
}
