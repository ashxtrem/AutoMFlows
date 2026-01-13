# AutoMFlows - No-Code Browser Automation Tool

AutoMFlows is a web-based visual workflow builder for browser automation, inspired by n8n and ComfyUI. Create complex web automation workflows using a drag-and-drop node-based interface without writing code.

## Features

- **Visual Workflow Editor**: Drag-and-drop node-based interface for building automation workflows
- **Browser Automation**: Full Playwright integration with multi-browser support (Chromium, Firefox, WebKit)
- **Real-time Execution**: Watch your workflows execute with live node highlighting and execution tracking
- **Comprehensive Node Library**: 20+ pre-built nodes for browser automation, API testing, and data manipulation
- **API Testing**: Built-in API Request and cURL nodes for REST API testing
- **Verification System**: Comprehensive verification nodes for browser, API, and data validation
- **Execution Reporting**: Multi-format execution reports (HTML, Allure, JSON, JUnit, CSV, Markdown)
- **Screenshot Capture**: Configurable screenshots (pre/post/both) for debugging and documentation
- **Retry Mechanisms**: Advanced retry strategies with count-based and condition-based retries
- **Wait Strategies**: Flexible wait strategies (sequential/parallel, before/after operations)
- **Property Input Connections**: Type-safe connections between nodes with automatic type validation
- **Node Management**: Pin nodes, toggle edge visibility, bypass nodes, fail silently, and minimize nodes
- **File System Access API**: Native file save/load support in supported browsers
- **Canvas Persistence**: Viewport position and zoom are automatically saved
- **Plugin System**: Extensible architecture for custom nodes and workflows
- **Reusable Flows**: Define and execute reusable sub-workflows (via plugin)
- **Conditional Branching**: Switch node for conditional workflow execution (via plugin)
- **Workflow Management**: Save, load, and export workflows as JSON with auto-save

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
   - Use property input connections to pass data between nodes with type validation
3. **Configure Nodes**: Click on a node to configure it in the right sidebar
   - Use node menu (hover over node) to pin, bypass, minimize, or mark as test/support
4. **Run Workflow**: Click the "Run" button in the top bar
   - Configure execution settings: screenshots, reporting, trace logs
5. **View Results**: Check execution status, view reports, and inspect screenshots
6. **Save/Load**: Use the Save/Load buttons to export/import workflows as JSON
   - File System Access API supported in modern browsers for native file handling

## Node Types

### Browser Nodes
- **Start**: Entry point of the workflow
- **Open Browser**: Launch a browser instance with configurable settings (Chromium, Firefox, WebKit)
- **Navigate**: Navigate to a URL with wait strategies and retry options

### Interaction Nodes
- **Click**: Click on an element using CSS or XPath selector with retry and wait strategies
- **Type**: Type text into an input field with wait strategies (before/after) and retry options

### Data Nodes
- **Get Text**: Extract text from an element and store in workflow context
- **Screenshot**: Capture a screenshot of the current page with configurable options

### Verification Nodes
- **Verify**: Comprehensive verification node supporting:
  - **Browser Domain**: URL patterns, element visibility/existence, text content, attributes, cookies, storage, CSS properties
  - **API Domain**: Status codes, headers, JSON path matching, response body validation
  - Supports retry mechanisms and fail silently options

### API Nodes
- **API Request**: Make HTTP requests (GET, POST, PUT, DELETE, etc.) with headers, body, and retry logic
- **API cURL**: Import and execute cURL commands directly in workflows

### Control Nodes
- **Wait**: Wait for timeout, selector, URL, JavaScript condition, or API response
- **Loop**: Iterate over an array with access to loop variables

### Value Nodes
- **Int Value**: Provide integer values for property input connections
- **String Value**: Provide string values for property input connections
- **Boolean Value**: Provide boolean values for property input connections
- **Input Value**: Generic input value node with configurable data type

### Configuration Nodes
- **Load Config File**: Load JSON configuration files into workflow context
- **Select Config File**: Select and load configuration files at runtime

### Code Nodes
- **JavaScript Code**: Execute custom JavaScript code with access to Playwright page object and workflow context

## Plugin System

AutoMFlows supports a plugin system that allows you to extend functionality with custom nodes. Plugins are stored in the `plugins/` directory and loaded automatically at runtime.

### Creating Plugins

To create a plugin:

1. Create a directory in `plugins/` (e.g., `plugins/my-plugin/`)
2. Create a `plugin.json` manifest file defining your nodes
3. Create handler files implementing the `NodeHandler` interface
4. Restart the backend server to load your plugin

See [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md) for detailed documentation.

### Built-in Plugins

AutoMFlows includes several powerful plugins:

#### Reusable Node Plugin (`plugins/reusable-node/`)
Enables defining and executing reusable flows within workflows:
- **Reusable**: Define a reusable flow with a unique context name
- **End**: Mark the end of a reusable flow
- **Run Reusable**: Execute a reusable flow by matching its context name
- Supports nested reusable flows and shared execution context

See [Reusable Node Plugin README](plugins/reusable-node/README.md) for details.

#### Switch Node Plugin (`plugins/switch-node/`)
Provides conditional branching functionality:
- **Switch**: Evaluate conditions and execute matching branch
- Supports multiple condition types: UI element checks, API status/JSON path matching, JavaScript expressions, variable comparisons
- Includes default case for unmatched conditions

See [Switch Node Plugin README](plugins/switch-node/README.md) for details.

#### Example Plugin (`plugins/example-plugin/`)
Demonstrates plugin development:
- Fill Form node (fills multiple form fields at once)
- Scroll To node (scrolls to an element)

## Advanced Features

### Execution Reporting

AutoMFlows generates comprehensive execution reports in multiple formats:
- **HTML**: Rich HTML reports with screenshots, execution timeline, and node details
- **Allure**: Allure TestOps compatible reports for CI/CD integration
- **JSON**: Machine-readable execution data
- **JUnit**: JUnit XML format for test result aggregation
- **CSV**: Spreadsheet-compatible execution logs
- **Markdown**: Documentation-friendly markdown reports

Reports include:
- Execution metadata (start time, duration, status)
- Node execution details with timestamps
- Screenshots (if enabled)
- Error messages and stack traces
- Test case filtering (nodes marked with `isTest: false` are excluded)

### Retry Mechanisms

Nodes support advanced retry strategies:
- **Count-based**: Retry a fixed number of times with configurable delays
- **Condition-based**: Retry until a condition is met (selector appears, URL changes, JavaScript evaluates to true)
- **Delay Strategies**: Fixed or exponential backoff delays
- **Fail Silently**: Option to continue workflow execution even after retries fail

### Wait Strategies

Enhanced wait capabilities:
- **Sequential**: Wait for conditions one after another
- **Parallel**: Wait for any condition to be met
- **Before/After**: Configure waits before or after operations
- **Multiple Types**: Wait for selectors, URLs, JavaScript conditions, or API responses

### Property Input Connections

Type-safe data flow between nodes:
- Connect value nodes to any node property
- Automatic type validation (Int, String, Boolean)
- Visual indicators for connected properties
- Validation errors for missing required connections

### Node Management Features

- **Pin Nodes**: Lock nodes in place to prevent accidental movement
- **Bypass**: Skip node execution during workflow run
- **Fail Silently**: Continue execution even if node fails
- **Minimize**: Collapse node view for cleaner canvas
- **Test/Support Toggle**: Mark nodes as test cases or support nodes (affects reporting)

### Canvas Features

- **Edge Visibility Toggle**: Show/hide connections for cleaner visualization
- **Viewport Persistence**: Canvas position and zoom are saved automatically
- **Node Highlighting**: Real-time highlighting during execution
- **Error Highlighting**: Visual indicators for nodes with errors or validation issues

## Security Warning

⚠️ **This tool is intended for local/private network use only.**

The JavaScript Code node executes arbitrary code on the server. Only use this tool in trusted environments.

## License

MIT

