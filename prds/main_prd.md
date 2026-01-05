Product Requirements Document (PRD): AutoMFlows Automation Tool
1. Introduction
Product Name: AutoMFlows (Working Title)
Type: Web-based No-Code/Low-Code Automation Tool
Inspiration: n8n, ComfyUI
Core Function: Enables users to visually design and execute web automation workflows using a node-based interface.
2. Problem Statement
Current browser automation (using libraries like Playwright or Puppeteer) requires coding knowledge. Existing no-code tools are often SaaS-based, expensive, or lack the granular control of raw code. Users need a self-hosted, visual interface to construct complex web interactions (scraping, testing, form filling) that runs locally or on their own infrastructure.
3. System Architecture
The application follows a standard Client-Server architecture.
3.1 Backend Server
Deployment: Docker container or Node.js application running on a specific IP/Port (e.g., localhost:3000).
Role:
Host the static frontend files.
Handle API requests for saving/loading workflows.
Execution Engine: The core component that interprets the JSON workflow and drives the browser instance (Playwright).
Environment: Node.js.
3.2 Frontend Client
Access: Accessed via a standard web browser at the server's IP.
Role:
Provide the visual canvas for workflow design.
Manage state (node connections, configurations).
Communicate with the backend to trigger execution and retrieve logs/screenshots.
Tech Stack Recommendation: React, ReactFlow (for the node graph), Tailwind CSS.
4. Functional Requirements
4.1 Workflow Management
Blank Canvas: On load, the interface must present an empty grid or the last active session stored in localStorage or server-side session.
Save/Load:
Export: Users can download the current workflow as a .json file.
Import: Users can upload a .json file to restore a workflow.
Auto-save: The browser's local storage should cache the current state to prevent data loss on refresh.
4.2 The Node System (Canvas)
Visual Interface: Infinite canvas with pan and zoom capabilities.
Node Structure:
Header: Title of the action (e.g., "Click Element").
Body: Configuration fields (e.g., Selectors, URL inputs, Timeout values).
Ports:
Input Port (Left): Receives the execution signal. Constraint: A node can strictly have only one active input connection.
Output Port (Right): Passes the execution signal and data (context) to the next node. Feature: Can connect to multiple downstream nodes (parallel execution or branching).
4.3 Node Library (Playwright Integration)
The backend must map these visual nodes to Playwright API calls.
Core Browser Nodes:
Start/Trigger: The entry point of the flow.
Open Browser: Configures headless mode, viewport, user-agent.
Navigate: Takes a URL input and navigates the tab.
Click: Takes a CSS/XPath selector; performs a click.
Type/Input: Takes a selector and a text string; types into a field.
Get Text: Extracts text from a selector and passes it to the output variable.
Screenshot: Captures the current viewport and saves/displays it.
Wait: Explicit wait (time-based) or wait for selector.
Logic & utility Nodes:
9. JavaScript Code: A node containing a code editor (Monaco Editor).
* Input: page object, previous node data.
* Output: Returns data to be used by the next node.
* Security: Runs in a sandboxed context or explicitly trusted mode on the server.
10. Loop: Iterates over a list of items (e.g., URLs extracted from a previous step).
4.4 Execution Engine
Flow Parsing: When "Run" is clicked, the backend receives the JSON graph.
Topological Sort: The engine determines the execution order based on connections.
Browser Control:
Spawns a Playwright browser instance.
Passes the Page context from node to node.
If the browser is running locally, the user should optionally see the headful browser pop up.
Real-time Feedback: The frontend should highlight nodes as they are currently executing (e.g., green border).
5. User Interface (UI) Design Guidelines
Theme: Dark mode by default (industry standard for developer tools like ComfyUI).
Layout:
Left Sidebar: Node Library (Drag and drop nodes onto canvas).
Center: Infinite Canvas.
Right Sidebar: Properties panel for the selected node (fine-tuning parameters).
Top Bar: Run Button, Stop Button, Save/Load, Zoom controls.
Wire Rendering: Bezier curves or Step-lines connecting nodes (similar to Unreal Engine Blueprints or Nuke).
6. Data Flow Specification
User drags "Navigate" node -> connects to "Start".
User drags "Click" node -> connects to "Navigate".
User clicks "Run".
Frontend serializes the graph to JSON:
{
  "nodes": [ ... ],
  "edges": [ ... ]
}


Backend receives JSON.
Backend initializes Playwright.
Backend executes page.goto(url) (Navigate Node).
Backend executes page.click(selector) (Click Node).
Backend returns status "Success" to Frontend.
7. Future Roadmap (Post-MVP)
Headless vs. Headful Toggle: Switch between watching the automation and running it silently in the background.
Cron Jobs: Schedule workflows to run automatically on the server.
API Webhooks: Trigger a workflow via an external HTTP request (e.g., from Zapier).
Sub-flows: Collapse a group of nodes into a single custom node.
8. Technical Constraints & Risks
Security: Allowing arbitrary JS execution (eval) on the server is risky. The MVP must include a warning that this tool is intended for local/private network use only.
Concurrency: Handling multiple users running flows simultaneously on one server instance. (MVP scope: Single concurrent user).
