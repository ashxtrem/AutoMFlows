# AutoMFlows - No-Code Browser Automation Tool

AutoMFlows is a web-based visual workflow builder for browser automation, inspired by n8n and ComfyUI. Create complex web automation workflows using a drag-and-drop node-based interface without writing code.

## Features

- **Visual Workflow Editor**: Drag-and-drop node-based interface for building automation workflows
- **Browser Automation**: Full Playwright integration for web scraping, form filling, and testing
- **Real-time Execution**: Watch your workflows execute with live node highlighting
- **Node Library**: Pre-built nodes for common browser automation tasks
- **Code Node**: Execute custom JavaScript code for advanced scenarios
- **Workflow Management**: Save, load, and export workflows as JSON
- **Auto-save**: Automatic localStorage caching to prevent data loss

## Architecture

- **Backend**: Node.js/Express server with Playwright execution engine
- **Frontend**: React + ReactFlow visual editor
- **Monorepo**: Shared TypeScript types between frontend and backend

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd autoMflows
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

#### Quick Start (Recommended)

Use the provided startup script to install dependencies, build, and start all servers:

```bash
./start.sh
```

This will:
- Install all dependencies
- Build the shared package
- Start both backend and frontend servers
- Open your browser automatically

To stop all servers, press `Ctrl+C` or run:
```bash
./stop.sh
```

#### Manual Start

Alternatively, you can start servers manually:

1. Start the backend server:
```bash
npm run dev:backend
```

2. In another terminal, start the frontend:
```bash
npm run dev:frontend
```

3. Open your browser to `http://localhost:5173`

### Production Build

1. Build all packages:
```bash
npm run build
```

2. Start the backend server:
```bash
cd backend && npm start
```

The frontend will be served from the backend at `http://localhost:3000`

## Docker Deployment

### Build and run with Docker Compose:

```bash
cd docker
docker-compose up --build
```

### Build Docker image manually:

```bash
docker build -f docker/Dockerfile -t automflows .
docker run -p 3000:3000 automflows
```

## Usage

1. **Create a Workflow**: Drag nodes from the left sidebar onto the canvas
2. **Connect Nodes**: Connect nodes by dragging from output ports to input ports
3. **Configure Nodes**: Click on a node to configure it in the right sidebar
4. **Run Workflow**: Click the "Run" button in the top bar
5. **Save/Load**: Use the Save/Load buttons to export/import workflows as JSON

## Node Types

### Browser Nodes
- **Start**: Entry point of the workflow
- **Open Browser**: Launch a browser instance with configurable settings
- **Navigate**: Navigate to a URL

### Interaction Nodes
- **Click**: Click on an element using CSS or XPath selector
- **Type**: Type text into an input field

### Data Nodes
- **Get Text**: Extract text from an element
- **Screenshot**: Capture a screenshot of the current page

### Control Nodes
- **Wait**: Wait for a timeout or selector
- **Loop**: Iterate over an array

### Code Nodes
- **JavaScript Code**: Execute custom JavaScript code with access to Playwright page object

## Plugin System

AutoMFlows supports a plugin system that allows you to extend functionality with custom nodes. Plugins are stored in the `plugins/` directory and loaded automatically at runtime.

### Creating Plugins

To create a plugin:

1. Create a directory in `plugins/` (e.g., `plugins/my-plugin/`)
2. Create a `plugin.json` manifest file defining your nodes
3. Create handler files implementing the `NodeHandler` interface
4. Restart the backend server to load your plugin

See [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md) for detailed documentation.

### Example Plugin

An example plugin is included in `plugins/example-plugin/` demonstrating:
- Fill Form node (fills multiple form fields at once)
- Scroll To node (scrolls to an element)

## Security Warning

⚠️ **This tool is intended for local/private network use only.**

The JavaScript Code node executes arbitrary code on the server. Only use this tool in trusted environments.

## License

MIT

