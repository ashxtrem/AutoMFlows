# AutoMFlows MCP Server

MCP (Model Context Protocol) server for AutoMFlows that enables AI agents to build, execute, and fix workflows.

## Features

- **Workflow Creation**: Generate workflows from natural language descriptions using LLM or rule-based generation
- **Workflow Execution**: Execute workflows on the AutoMFlows backend
- **Error Analysis**: Analyze execution errors and provide suggestions
- **Workflow Fixing**: Automatically fix workflows based on error analysis
- **Workflow Validation**: Validate workflow structure before execution
- **Resource Access**: Access workflow examples, node documentation, and project context

## Prerequisites

- Node.js 18+ and npm 9+
- AutoMFlows backend running (for workflow execution)

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

The MCP server can be configured via environment variables or a config file.

### Environment Variables

- `AUTOMFLOWS_BACKEND_URL` - Backend server URL (default: `http://localhost:3000`)
- `AUTOMFLOWS_WORKFLOWS_PATH` - Path to workflow examples (default: `./tests/workflows/demo`)
- `LLM_PROVIDER` - LLM provider: `openai`, `local`, or `none` (default: `none`)
- `OPENAI_API_KEY` - OpenAI API key (required if using OpenAI)
- `OPENAI_MODEL` - OpenAI model name (default: `gpt-4`)
- `LOCAL_LLM_BASE_URL` - Local LLM server URL (default: `http://localhost:11434`)
- `LOCAL_LLM_MODEL` - Local LLM model name (default: `llama3`)

### Config File

Create `mcp-server/config.json`:

```json
{
  "backendUrl": "http://localhost:3000",
  "workflowsPath": "./tests/workflows/demo",
  "llm": {
    "provider": "openai",
    "openai": {
      "apiKey": "your-api-key",
      "model": "gpt-4"
    }
  }
}
```

## Usage

### Running the Server

```bash
npm start
```

The server communicates via stdio, so it's typically run by an MCP client.

### Connecting from Cursor

> **Quick Start:** See [CURSOR_SETUP.md](./CURSOR_SETUP.md) for a step-by-step setup guide.

There are two ways to add the MCP server to Cursor:

#### Method 1: Using Cursor Settings UI (Recommended)

1. Open Cursor Settings:
   - **macOS:** Press `Cmd + ,`
   - **Windows/Linux:** Press `Ctrl + ,`

2. Navigate to **Features > MCP** or **Tools & Integrations > MCP Servers**

3. Click **"+ Add New MCP Server"** button

4. Configure the server:
   - **Name:** `automflows` (or any name you prefer)
   - **Command:** `node`
   - **Args:** `["/absolute/path/to/autoMflows/mcp-server/dist/server.js"]`
   - **Environment Variables (optional):**
     - `AUTOMFLOWS_BACKEND_URL` - Backend URL (default: `http://localhost:3000`)
     - `LLM_PROVIDER` - `openai`, `local`, or `none` (default: `none`)
     - `OPENAI_API_KEY` - Your OpenAI API key (if using OpenAI)

5. Click **Save** or **Apply**

#### Method 2: Manual Configuration File

Edit the MCP configuration file directly:

**macOS/Linux:**
```bash
# Global configuration (for all projects)
~/.cursor/config/mcp.json

# Project-specific configuration (recommended)
.cursor/mcp.json  # In your project root
```

**Windows:**
```bash
# Global configuration
%USERPROFILE%\.cursor\config\mcp.json

# Project-specific configuration
.cursor\mcp.json  # In your project root
```

Add the following configuration:

```json
{
  "mcpServers": {
    "automflows": {
      "command": "node",
      "args": ["/absolute/path/to/autoMflows/mcp-server/dist/server.js"],
      "env": {
        "AUTOMFLOWS_BACKEND_URL": "http://localhost:3000",
        "LLM_PROVIDER": "none"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/autoMflows/mcp-server/dist/server.js` with the actual absolute path to your built server file.

**Example paths:**
- macOS: `["/Users/ashishtripathi/IdeaProjects/autoMflows/mcp-server/dist/server.js"]`
- Linux: `["/home/username/projects/autoMflows/mcp-server/dist/server.js"]`
- Windows: `["C:\\Users\\username\\projects\\autoMflows\\mcp-server\\dist\\server.js"]`

#### Verifying the Connection

1. Restart Cursor IDE
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Type "MCP" to see available MCP commands
4. In Composer/Agent mode, the MCP server resources and tools should be available

#### Troubleshooting

- **Server not found:** Ensure the path to `dist/server.js` is absolute and correct
- **Build required:** Make sure you've run `npm run build` in the `mcp-server` directory
- **Node version:** Ensure Node.js 18+ is available in your PATH
- **Backend connection:** Make sure AutoMFlows backend is running if you want to execute workflows

### Available Tools

1. **create_workflow** - Create a workflow from description
2. **execute_workflow** - Execute a workflow
3. **get_execution_status** - Get execution status
4. **analyze_workflow_errors** - Analyze errors
5. **fix_workflow** - Fix workflow based on errors
6. **validate_workflow** - Validate workflow structure

### Available Resources

1. **automflows://workflow-examples** - List of example workflows
2. **automflows://node-documentation** - Node type documentation
3. **automflows://project-context** - Project structure and conventions

## Example Usage

```typescript
// Create a workflow
const workflow = await createWorkflow({
  userRequest: "Log into example.com and fill a form",
  useCase: "User login and form submission"
});

// Validate it
const validation = validateWorkflow({ workflow });

// Execute it
const result = await executeWorkflow({ workflow });

// Monitor execution
const status = await getExecutionStatus({
  executionId: result.executionId,
  pollUntilComplete: true
});

// If errors, analyze and fix
if (status.status === 'error') {
  const analysis = analyzeWorkflowErrors({
    workflow,
    errorMessage: status.error!
  });
  
  const fixed = await fixWorkflow({
    workflow,
    errorAnalysis: analysis,
    errorMessage: status.error!
  });
  
  // Re-execute fixed workflow
  await executeWorkflow({ workflow: fixed });
}
```

## Development

```bash
# Development mode with watch
npm run dev

# Build
npm run build

# Type check
npm run type-check
```

## Architecture

- **Resources**: Read-only data (workflow examples, docs, context)
- **Tools**: Executable functions (create, execute, fix workflows)
- **LLM Integration**: Optional OpenAI or local LLM for intelligent generation
- **Backend Integration**: HTTP/WebSocket client for AutoMFlows backend

## License

Same as AutoMFlows project.
