# MCP Server Example Usage

This document shows example usage of the AutoMFlows MCP server.

## Basic Workflow Creation

```typescript
// Using the create_workflow tool
const workflow = await createWorkflow({
  userRequest: "Log into example.com with username 'test' and password 'pass123'",
  useCase: "User authentication workflow"
});

// The workflow will include:
// - Start node
// - Open Browser node
// - Navigate to example.com
// - Type username
// - Type password
// - Click login button
```

## Workflow Execution Flow

```typescript
// 1. Create workflow
const workflow = await createWorkflow({
  userRequest: "Navigate to example.com and take a screenshot",
  useCase: "Screenshot capture workflow"
});

// 2. Validate workflow
const validation = validateWorkflow({ workflow });
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // Fix validation errors before proceeding
}

// 3. Execute workflow
const executionResult = await executeWorkflow({
  workflow,
  traceLogs: true
});

console.log('Execution started:', executionResult.executionId);

// 4. Monitor execution
const status = await getExecutionStatus({
  executionId: executionResult.executionId,
  pollUntilComplete: true,
  pollIntervalMs: 1000,
  maxDurationMs: 60000
});

if (status.status === 'completed') {
  console.log('Workflow completed successfully!');
} else if (status.status === 'error') {
  console.error('Workflow failed:', status.error);
  
  // 5. Analyze errors
  const analysis = analyzeWorkflowErrors({
    workflow,
    errorMessage: status.error!,
    executionLogs: [] // Could include logs if available
  });
  
  console.log('Error analysis:', analysis);
  
  // 6. Fix workflow
  const fixedWorkflow = await fixWorkflow({
    workflow,
    errorAnalysis: analysis,
    errorMessage: status.error!
  });
  
  // 7. Re-execute fixed workflow
  const retryResult = await executeWorkflow({ workflow: fixedWorkflow });
  console.log('Retry execution started:', retryResult.executionId);
}
```

## Using Resources

### Access Workflow Examples

```typescript
// List all workflow examples
const examplesResource = await readResource('automflows://workflow-examples');
const examples = JSON.parse(examplesResource.text);
console.log('Available examples:', examples);

// Get a specific example workflow
const exampleWorkflow = await readResource('automflows://workflow-example/sauceDemo');
const workflow = JSON.parse(exampleWorkflow.text);
```

### Access Node Documentation

```typescript
const nodeDocsResource = await readResource('automflows://node-documentation');
const nodeDocs = JSON.parse(nodeDocsResource.text);
console.log('Available node types:', nodeDocs.map((d: any) => d.type));
```

### Access Project Context

```typescript
const contextResource = await readResource('automflows://project-context');
const context = JSON.parse(contextResource.text);
console.log('Project structure:', context.architecture);
console.log('Best practices:', context.bestPractices);
```

## LLM-Powered Workflow Generation

When LLM is configured (OpenAI or local), the server will use it for intelligent workflow generation:

```typescript
// With OpenAI configured
process.env.LLM_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'your-api-key';

const workflow = await createWorkflow({
  userRequest: "Create a complex e-commerce checkout flow with payment processing",
  useCase: "E-commerce automation"
});

// The LLM will generate a sophisticated workflow with:
// - Proper node sequencing
// - Appropriate wait conditions
// - Error handling
// - Best practices
```

## Error Analysis and Fixing

```typescript
// Execute a workflow
const result = await executeWorkflow({ workflow });
const status = await getExecutionStatus({
  executionId: result.executionId,
  pollUntilComplete: true
});

if (status.status === 'error') {
  // Analyze the error
  const analysis = analyzeWorkflowErrors({
    workflow,
    errorMessage: status.error!,
    executionLogs: [
      'Node navigation-123 failed: Timeout waiting for selector .login-form',
      'Element not found: .login-form'
    ]
  });
  
  // Analysis will categorize errors:
  // - selector: Element selector issues
  // - configuration: Node configuration problems
  // - connection: Workflow connection issues
  // - execution: Runtime execution errors
  
  // Fix the workflow
  const fixedWorkflow = await fixWorkflow({
    workflow,
    errorAnalysis: analysis,
    errorMessage: status.error!
  });
  
  // Common fixes applied:
  // - Increased timeouts
  // - Added wait conditions
  // - Fixed selector issues
  // - Corrected node configurations
}
```

## Integration with Cursor Composer

When using Cursor Composer with the MCP server:

1. **Connect to MCP server** in Cursor settings
2. **Ask Composer** to create a workflow:
   ```
   "Create a workflow that logs into example.com and fills a form"
   ```
3. **Composer will**:
   - Read workflow examples and node documentation
   - Call create_workflow tool
   - Validate the generated workflow
   - Execute it if requested
   - Fix errors automatically if execution fails

## Environment Setup

```bash
# Set backend URL
export AUTOMFLOWS_BACKEND_URL=http://localhost:3000

# Enable OpenAI LLM
export LLM_PROVIDER=openai
export OPENAI_API_KEY=your-api-key
export OPENAI_MODEL=gpt-4

# Or enable local LLM (Ollama)
export LLM_PROVIDER=local
export LOCAL_LLM_BASE_URL=http://localhost:11434
export LOCAL_LLM_MODEL=llama3

# Run MCP server
npm start
```

## Testing

To test the MCP server:

1. **Start AutoMFlows backend**:
   ```bash
   npm run dev:backend
   ```

2. **Build MCP server**:
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

3. **Run MCP server**:
   ```bash
   npm start
   ```

4. **Connect from MCP client** (like Cursor) and test tools

## Troubleshooting

### Backend Connection Issues
- Ensure AutoMFlows backend is running on the configured URL
- Check `AUTOMFLOWS_BACKEND_URL` environment variable

### LLM Generation Fails
- Verify API key is set (for OpenAI)
- Check local LLM server is running (for local provider)
- Fallback to rule-based generation if LLM unavailable

### Workflow Validation Errors
- Use `validate_workflow` tool before execution
- Fix validation errors before attempting execution
- Check workflow structure matches expected format

### Execution Timeouts
- Increase timeout values in workflow nodes
- Add appropriate wait conditions
- Check network connectivity
