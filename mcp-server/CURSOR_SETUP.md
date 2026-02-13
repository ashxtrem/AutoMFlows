# Quick Setup Guide: Adding AutoMFlows MCP Server to Cursor

## Prerequisites

1. **Build the MCP server:**
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```

2. **Note the absolute path** to the built server:
   - Example: `/Users/ashishtripathi/IdeaProjects/autoMflows/mcp-server/dist/server.js`
   - On Windows: `C:\Users\username\projects\autoMflows\mcp-server\dist\server.js`

## Setup Steps

### Option 1: Using Cursor UI (Easiest)

1. **Open Cursor Settings:**
   - macOS: `Cmd + ,`
   - Windows/Linux: `Ctrl + ,`

2. **Navigate to MCP Settings:**
   - Go to **Features > MCP** or **Tools & Integrations > MCP Servers**

3. **Add New Server:**
   - Click **"+ Add New MCP Server"**
   - Fill in:
     - **Name:** `automflows`
     - **Command:** `node`
     - **Args:** `["/absolute/path/to/mcp-server/dist/server.js"]`
     - **Env (optional):**
       ```json
       {
         "AUTOMFLOWS_BACKEND_URL": "http://localhost:3000",
         "LLM_PROVIDER": "none"
       }
       ```

4. **Save and Restart Cursor**

### Option 2: Manual Configuration File

1. **Create/edit MCP config file:**

   **macOS/Linux (Project-specific - Recommended):**
   ```bash
   # In your project root
   mkdir -p .cursor
   nano .cursor/mcp.json
   ```

   **macOS/Linux (Global):**
   ```bash
   mkdir -p ~/.cursor/config
   nano ~/.cursor/config/mcp.json
   ```

   **Windows (Project-specific):**
   ```powershell
   # In your project root
   New-Item -ItemType Directory -Force -Path .cursor
   notepad .cursor\mcp.json
   ```

2. **Add configuration:**

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

3. **Replace the path** with your actual absolute path:
   - macOS: `/Users/YOUR_USERNAME/IdeaProjects/autoMflows/mcp-server/dist/server.js`
   - Linux: `/home/YOUR_USERNAME/projects/autoMflows/mcp-server/dist/server.js`
   - Windows: `C:\\Users\\YOUR_USERNAME\\projects\\autoMflows\\mcp-server\\dist\\server.js`

4. **Restart Cursor**

## Getting Your Absolute Path

### macOS/Linux:
```bash
cd /Users/ashishtripathi/IdeaProjects/autoMflows/mcp-server
pwd
# Output: /Users/ashishtripathi/IdeaProjects/autoMflows/mcp-server
# Full path: /Users/ashishtripathi/IdeaProjects/autoMflows/mcp-server/dist/server.js
```

### Windows (PowerShell):
```powershell
cd C:\Users\username\projects\autoMflows\mcp-server
(Get-Location).Path
# Output: C:\Users\username\projects\autoMflows\mcp-server
# Full path: C:\Users\username\projects\autoMflows\mcp-server\dist\server.js
```

## Verifying Setup

1. **Restart Cursor IDE** after configuration

2. **Check MCP Status:**
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Type "MCP" to see available commands
   - Look for "MCP: List Servers" or similar

3. **Test in Composer/Agent:**
   - Open Composer (`Cmd+I` / `Ctrl+I`)
   - Ask: "What MCP resources are available?"
   - The agent should be able to access workflow examples and node documentation

4. **Check Cursor Logs** (if issues):
   - macOS: `~/Library/Logs/Cursor/`
   - Windows: `%APPDATA%\Cursor\logs\`
   - Linux: `~/.config/Cursor/logs/`

## Configuration Examples

### Basic Setup (No LLM)
```json
{
  "mcpServers": {
    "automflows": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/server.js"]
    }
  }
}
```

### With OpenAI LLM
```json
{
  "mcpServers": {
    "automflows": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/server.js"],
      "env": {
        "AUTOMFLOWS_BACKEND_URL": "http://localhost:3000",
        "LLM_PROVIDER": "openai",
        "OPENAI_API_KEY": "sk-your-api-key-here",
        "OPENAI_MODEL": "gpt-4"
      }
    }
  }
}
```

### With Local LLM (Ollama)
```json
{
  "mcpServers": {
    "automflows": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/server.js"],
      "env": {
        "AUTOMFLOWS_BACKEND_URL": "http://localhost:3000",
        "LLM_PROVIDER": "local",
        "LOCAL_LLM_BASE_URL": "http://localhost:11434",
        "LOCAL_LLM_MODEL": "llama3"
      }
    }
  }
}
```

## Troubleshooting

### Server Not Found
- **Check path:** Ensure the path is absolute (starts with `/` on Unix, `C:\` on Windows)
- **Verify build:** Run `npm run build` in `mcp-server` directory
- **Check file exists:** `ls dist/server.js` (Unix) or `dir dist\server.js` (Windows)

### Node Not Found
- **Check Node version:** `node --version` (should be 18+)
- **Check PATH:** Ensure Node.js is in your system PATH
- **Use full path:** Use full path to node: `"/usr/local/bin/node"` or `"C:\\Program Files\\nodejs\\node.exe"`

### Connection Issues
- **Backend not running:** Start AutoMFlows backend: `npm run dev:backend`
- **Wrong port:** Check `AUTOMFLOWS_BACKEND_URL` matches your backend port
- **Check logs:** Look at Cursor logs for error messages

### MCP Server Not Appearing
- **Restart Cursor:** Always restart after configuration changes
- **Check config syntax:** Validate JSON syntax (no trailing commas)
- **Check file location:** Ensure config file is in correct location

## Next Steps

Once configured, you can use the MCP server in Cursor Composer:

1. **Access Resources:**
   - "Show me workflow examples"
   - "What node types are available?"
   - "Explain the project structure"

2. **Create Workflows:**
   - "Create a workflow that logs into example.com"
   - "Generate a workflow for API testing"

3. **Execute and Fix:**
   - "Execute this workflow and fix any errors"
   - "Analyze workflow errors and suggest fixes"

## Additional Resources

- [Cursor MCP Documentation](https://cursor.com/docs/context/mcp)
- [MCP Server README](./README.md)
- [Example Usage](./example-usage.md)
