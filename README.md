# AutoMFlows - No-Code Browser Automation Tool

[![GitHub](https://img.shields.io/badge/GitHub-ashxtrem%2FAutoMFlows-blue?logo=github)](https://github.com/ashxtrem/AutoMFlows)

AutoMFlows is a web-based visual workflow builder for browser automation, inspired by n8n and ComfyUI. Create complex web automation workflows using a drag-and-drop node-based interface without writing code.

## Features

- **Visual Workflow Editor**: Drag-and-drop node-based interface
- **Browser Automation**: Playwright integration with multi-browser support (Chromium, Firefox, WebKit)
- **Real-time Execution**: Live node highlighting and execution tracking
- **20+ Node Types**: Browser automation, API testing, data manipulation, verification
- **Execution Reporting**: Multi-format reports (HTML, Allure, JSON, JUnit, CSV, Markdown)
- **Retry & Wait Strategies**: Advanced retry mechanisms and flexible wait options
- **Plugin System**: Extensible architecture for custom nodes
- **Type-safe Connections**: Property input connections with automatic type validation

## Architecture

- **Backend**: Node.js/Express server with Playwright execution engine
- **Frontend**: React + ReactFlow visual editor
- **Shared**: TypeScript types and utilities shared across the monorepo
- **MCP Server**: Model Context Protocol server for AI/IDE integration
- **Monorepo**: npm workspaces (`backend`, `frontend`, `shared`, `mcp-server`)

## Getting Started

### Prerequisites

- Node.js 20+ and npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/ashxtrem/AutoMFlows.git
cd AutoMFlows
```

2. Install dependencies:

```bash
npm install
```

3. Build shared package:

```bash
cd shared && npm run build && cd ..
```

### Development

**Quick Start:**

Unix/Linux/macOS:

```bash
./start.sh
```

Windows:

```powershell
.\start.ps1
```

**Manual Start:**

```bash
npm run dev:backend  # Terminal 1 – backend on http://localhost:3003
npm run dev:frontend # Terminal 2 – frontend on http://localhost:5173
```

- **Backend**: [http://localhost:3003](http://localhost:3003) (API, Swagger at `/api-docs`)
- **Frontend**: [http://localhost:5173](http://localhost:5173)

### Production Build

```bash
npm run build
cd backend && npm start
```

Single server at [http://localhost:3000](http://localhost:3000) (backend serves the built frontend).

## Docker

```bash
cd docker
docker-compose up --build
```

## Usage

1. Drag nodes from the sidebar onto the canvas
2. Connect nodes by dragging between ports
3. Configure nodes in the right sidebar
4. Click **Run** to execute the workflow
5. View results, reports, and screenshots
6. Save/load workflows as JSON

## Node Types

- **Browser**: Start, Open Browser, Navigate
- **Interaction**: Click, Type
- **Data**: Get Text, Screenshot
- **Verification**: Verify (browser & API validation)
- **API**: API Request, API cURL
- **Control**: Wait, Loop
- **Value**: Int, String, Boolean, Input Value
- **Config**: Load Config File, Select Config File
- **Code**: JavaScript Code

## Plugins

AutoMFlows supports plugins for custom nodes. Built-in plugins include:

- **Reusable Node**: Define and execute reusable sub-workflows
- **Switch Node**: Conditional branching
- **Set Config Node**: Set runtime config from workflow
- **Comment Box**: Annotations on the canvas
- **Shortcut**: Keyboard shortcuts in the editor

See [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md) for details.

## Repository

- **GitHub**: [https://github.com/ashxtrem/AutoMFlows](https://github.com/ashxtrem/AutoMFlows)

## Security Warning

⚠️ **This tool is intended for local/private network use only.**

The JavaScript Code node executes arbitrary code on the server. Only use this tool in trusted environments.

## License

MIT
