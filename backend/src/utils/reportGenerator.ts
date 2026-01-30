import * as fs from 'fs';
import * as path from 'path';
import { ExecutionMetadata, NodeExecutionEvent } from './executionTracker';
import { ReportType, Workflow, NodeType } from '@automflows/shared';

/**
 * Get the default display label for a node type
 * Returns the human-readable label for built-in node types, or the nodeType string for plugin nodes
 */
function getDefaultNodeLabel(nodeType: string): string {
  // Check if it's a built-in node type
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    const labels: Record<NodeType, string> = {
      [NodeType.START]: 'Start',
      [NodeType.OPEN_BROWSER]: 'Open Browser',
      [NodeType.NAVIGATION]: 'Navigation',
      [NodeType.KEYBOARD]: 'Keyboard',
      [NodeType.SCROLL]: 'Scroll',
      [NodeType.STORAGE]: 'Storage',
      [NodeType.DIALOG]: 'Dialog',
      [NodeType.DOWNLOAD]: 'Download',
      [NodeType.IFRAME]: 'Iframe',
      [NodeType.ACTION]: 'Action',
      [NodeType.ELEMENT_QUERY]: 'Element Query',
      [NodeType.FORM_INPUT]: 'Form Input',
      [NodeType.TYPE]: 'Type',
      [NodeType.SCREENSHOT]: 'Screenshot',
      [NodeType.WAIT]: 'Wait',
      [NodeType.JAVASCRIPT_CODE]: 'JavaScript Code',
      [NodeType.LOOP]: 'Loop',
      [NodeType.INT_VALUE]: 'Int Value',
      [NodeType.STRING_VALUE]: 'String Value',
      [NodeType.BOOLEAN_VALUE]: 'Boolean Value',
      [NodeType.INPUT_VALUE]: 'Input Value',
      [NodeType.VERIFY]: 'Verify',
      [NodeType.API_REQUEST]: 'API Request',
      [NodeType.API_CURL]: 'API cURL',
      [NodeType.LOAD_CONFIG_FILE]: 'Load Config File',
      [NodeType.SELECT_CONFIG_FILE]: 'Select Config File',
      [NodeType.DB_CONNECT]: 'DB Connect',
      [NodeType.DB_DISCONNECT]: 'DB Disconnect',
      [NodeType.DB_QUERY]: 'DB Query',
      [NodeType.CONTEXT_MANIPULATE]: 'Context Manipulate',
    };
    return labels[nodeType as NodeType] || nodeType;
  }
  
  // For plugin nodes or unknown types, return the nodeType string
  return nodeType;
}

export class ReportGenerator {
  private metadata: ExecutionMetadata;
  private outputDirectory: string;
  private workflow: Workflow;

  constructor(metadata: ExecutionMetadata, workflow: Workflow) {
    this.metadata = metadata;
    this.outputDirectory = metadata.outputDirectory;
    this.workflow = workflow;
  }

  /**
   * Get the display name for a node (custom label, default label, or nodeId)
   */
  private getNodeDisplayName(node: NodeExecutionEvent): string {
    return node.nodeLabel || getDefaultNodeLabel(node.nodeType) || node.nodeId;
  }

  /**
   * Filter nodes to only include test nodes (isTest !== false)
   * Nodes with isTest: false are excluded from reports
   */
  private getTestNodes(): NodeExecutionEvent[] {
    return this.metadata.nodes.filter(node => {
      const workflowNode = this.workflow.nodes.find(n => n.id === node.nodeId);
      if (!workflowNode) {
        return true; // Include if node not found in workflow (shouldn't happen)
      }
      const nodeData = workflowNode.data as any;
      // Include node if isTest is true, undefined, or not explicitly false
      return nodeData?.isTest !== false;
    });
  }

  async generateReports(reportTypes: ReportType[]): Promise<void> {
    for (const reportType of reportTypes) {
      const reportDir = path.join(this.outputDirectory, reportType);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      try {
        switch (reportType) {
          case 'html':
            await this.generateHTMLReport(reportDir);
            break;
          case 'json':
            await this.generateJSONReport(reportDir);
            break;
          case 'junit':
            await this.generateJUnitReport(reportDir);
            break;
          case 'csv':
            await this.generateCSVReport(reportDir);
            break;
          case 'markdown':
            await this.generateMarkdownReport(reportDir);
            break;
          case 'allure':
            await this.generateAllureReport(reportDir);
            break;
        }
      } catch (error: any) {
        console.error(`Failed to generate ${reportType} report:`, error);
        // Don't throw - continue with other report types
      }
    }
  }

  private async generateHTMLReport(reportDir: string): Promise<void> {
    // reportDir is the html directory (e.g., output/workflow-timestamp/html)
    // Screenshots are in the parent directory's screenshots folder
    const html = this.generateHTMLContent(reportDir);
    const filePath = path.join(reportDir, 'report.html');
    fs.writeFileSync(filePath, html, 'utf-8');
  }

  private generateHTMLContent(htmlReportDir?: string): string {
    const testNodes = this.getTestNodes();
    const duration = this.metadata.endTime 
      ? ((this.metadata.endTime - this.metadata.startTime) / 1000).toFixed(2)
      : 'N/A';
    
    const passedNodes = testNodes.filter(n => n.status === 'completed').length;
    const failedNodes = testNodes.filter(n => n.status === 'error').length;
    const totalNodes = testNodes.length;

    const nodeRows = testNodes.map((node, index) => {
      const nodeDuration = node.endTime && node.startTime
        ? ((node.endTime - node.startTime) / 1000).toFixed(2)
        : 'N/A';
      
      const statusBadge = node.status === 'completed' 
        ? '<span class="badge badge-success">Passed</span>'
        : node.status === 'error'
        ? '<span class="badge badge-error">Failed</span>'
        : node.status === 'bypassed'
        ? '<span class="badge badge-skipped">Bypassed</span>'
        : '<span class="badge badge-running">Running</span>';

      const hasScreenshots = node.screenshotPaths && Object.keys(node.screenshotPaths).length > 0;
      const screenshotCount = hasScreenshots && node.screenshotPaths ? Object.keys(node.screenshotPaths).length : 0;
      const hasVideo = !!node.videoPath;
      
      // Screenshot toggle button
      const screenshotToggle = hasScreenshots
        ? `<button class="screenshot-toggle" onclick="toggleScreenshots(${index})" aria-expanded="false">
            <span class="toggle-icon">▼</span>
            Screenshots (${screenshotCount})
          </button>`
        : '-';
      
      // Video toggle button
      const videoToggle = hasVideo
        ? `<button class="video-toggle" onclick="toggleVideo(${index})" aria-expanded="false">
            <span class="toggle-icon">▼</span>
            Video
          </button>`
        : '-';

      // Screenshot images in collapsible section
      const screenshotContent = hasScreenshots
        ? Object.entries(node.screenshotPaths!)
            .map(([timing, screenshotPath]) => {
              // Calculate path relative to HTML report directory
              // HTML report is in: output/workflow-timestamp/html/report.html
              // Screenshots are in: output/workflow-timestamp/screenshots/
              // So we need to go up one level from html/ to access screenshots/
              let relativePath: string;
              if (htmlReportDir) {
                // Calculate relative path from HTML report directory to screenshot
                relativePath = path.relative(htmlReportDir, screenshotPath);
                // Normalize path separators for web (use forward slashes)
                relativePath = relativePath.replace(/\\/g, '/');
              } else {
                // Fallback: relative to output directory (for backwards compatibility)
                relativePath = path.relative(this.outputDirectory, screenshotPath);
                relativePath = relativePath.replace(/\\/g, '/');
              }
              return `
                <div class="screenshot-item">
                  <div class="screenshot-label">${timing.toUpperCase()}</div>
                  <img src="${relativePath}" alt="Screenshot ${timing}" class="screenshot-image" loading="lazy" />
                  <a href="${relativePath}" target="_blank" class="screenshot-link">Open in new tab</a>
                </div>
              `;
            })
            .join('')
        : '';

      // Video content
      const videoContent = hasVideo && node.videoPath
        ? (() => {
            let relativePath: string;
            if (htmlReportDir) {
              relativePath = path.relative(htmlReportDir, node.videoPath);
              relativePath = relativePath.replace(/\\/g, '/');
            } else {
              relativePath = path.relative(this.outputDirectory, node.videoPath);
              relativePath = relativePath.replace(/\\/g, '/');
            }
            return `
              <div class="video-item">
                <video controls class="video-player">
                  <source src="${relativePath}" type="video/webm">
                  Your browser does not support the video tag.
                </video>
                <a href="${relativePath}" target="_blank" class="video-link">Download video</a>
              </div>
            `;
          })()
        : '';

      return `
        <tr class="node-row">
          <td>${this.getNodeDisplayName(node)}</td>
          <td>${node.nodeType}</td>
          <td>${statusBadge}</td>
          <td>${nodeDuration}s</td>
          <td>${node.error || '-'}</td>
          <td>${screenshotToggle}</td>
          <td>${videoToggle}</td>
        </tr>
        <tr class="screenshot-row" id="screenshot-row-${index}" style="display: none;">
          <td colspan="7" class="screenshot-cell">
            <div class="screenshot-container">
              ${screenshotContent}
            </div>
          </td>
        </tr>
        <tr class="video-row" id="video-row-${index}" style="display: none;">
          <td colspan="7" class="video-cell">
            <div class="video-container">
              ${videoContent}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workflow Execution Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #fff; margin-bottom: 10px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .summary-card {
      background: #2a2a2a;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #4a9eff;
    }
    .summary-card h3 {
      font-size: 12px;
      color: #999;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #fff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #2a2a2a;
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background: #333;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #fff;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #3a3a3a;
    }
    tr:hover { background: #333; }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success { background: #10b981; color: #fff; }
    .badge-error { background: #ef4444; color: #fff; }
    .badge-skipped { background: #f59e0b; color: #fff; }
    .badge-running { background: #3b82f6; color: #fff; }
    a { color: #4a9eff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .screenshot-toggle {
      background: #4a9eff;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .screenshot-toggle:hover {
      background: #3a8eef;
    }
    .toggle-icon {
      transition: transform 0.2s;
      font-size: 10px;
    }
    .screenshot-toggle[aria-expanded="true"] .toggle-icon {
      transform: rotate(180deg);
    }
    .screenshot-row {
      background: #252525;
    }
    .screenshot-cell {
      padding: 0 !important;
      border-bottom: 2px solid #3a3a3a;
    }
    .screenshot-container {
      padding: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .screenshot-item {
      background: #1f1f1f;
      border-radius: 8px;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .screenshot-label {
      font-size: 12px;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .screenshot-image {
      width: 100%;
      height: auto;
      border-radius: 4px;
      border: 1px solid #3a3a3a;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .screenshot-image:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
    }
    .screenshot-link {
      font-size: 12px;
      color: #4a9eff;
      text-align: center;
      padding: 4px;
    }
    .screenshot-link:hover {
      text-decoration: underline;
    }
    .video-toggle {
      background: #10b981;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .video-toggle:hover {
      background: #059669;
    }
    .video-row {
      background: #252525;
    }
    .video-cell {
      padding: 0 !important;
      border-bottom: 2px solid #3a3a3a;
    }
    .video-container {
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .video-item {
      background: #1f1f1f;
      border-radius: 8px;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 800px;
      width: 100%;
    }
    .video-player {
      width: 100%;
      height: auto;
      border-radius: 4px;
      border: 1px solid #3a3a3a;
    }
    .video-link {
      font-size: 12px;
      color: #4a9eff;
      text-align: center;
      padding: 4px;
    }
    .video-link:hover {
      text-decoration: underline;
    }
  </style>
  <script>
    function toggleScreenshots(index) {
      const row = document.getElementById('screenshot-row-' + index);
      const button = event.target.closest('.screenshot-toggle');
      
      if (row.style.display === 'none') {
        row.style.display = '';
        button.setAttribute('aria-expanded', 'true');
      } else {
        row.style.display = 'none';
        button.setAttribute('aria-expanded', 'false');
      }
    }
    
    function toggleVideo(index) {
      const row = document.getElementById('video-row-' + index);
      const button = event.target.closest('.video-toggle');
      
      if (row.style.display === 'none') {
        row.style.display = '';
        button.setAttribute('aria-expanded', 'true');
      } else {
        row.style.display = 'none';
        button.setAttribute('aria-expanded', 'false');
      }
    }
    
    // Make screenshots clickable to open in new tab
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.screenshot-image').forEach(img => {
        img.addEventListener('click', function() {
          window.open(this.src, '_blank');
        });
      });
    });
  </script>
</head>
<body>
  <div class="container">
    <h1>Workflow Execution Report</h1>
    <p style="color: #999; margin-bottom: 20px;">
      Execution ID: ${this.metadata.executionId} | 
      Started: ${new Date(this.metadata.startTime).toLocaleString()} |
      Duration: ${duration}s
    </p>
    
    <div class="summary">
      <div class="summary-card">
        <h3>Total Nodes</h3>
        <div class="value">${totalNodes}</div>
      </div>
      <div class="summary-card">
        <h3>Passed</h3>
        <div class="value" style="color: #10b981;">${passedNodes}</div>
      </div>
      <div class="summary-card">
        <h3>Failed</h3>
        <div class="value" style="color: #ef4444;">${failedNodes}</div>
      </div>
      <div class="summary-card">
        <h3>Status</h3>
        <div class="value">${this.metadata.status}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Node</th>
          <th>Type</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Error</th>
          <th>Screenshots</th>
          <th>Video</th>
        </tr>
      </thead>
      <tbody>
        ${nodeRows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  private async generateJSONReport(reportDir: string): Promise<void> {
    const testNodes = this.getTestNodes();
    const reportData = {
      executionId: this.metadata.executionId,
      workflowName: this.metadata.workflowName,
      startTime: this.metadata.startTime,
      endTime: this.metadata.endTime,
      status: this.metadata.status,
      duration: this.metadata.endTime 
        ? this.metadata.endTime - this.metadata.startTime 
        : null,
      nodes: testNodes.map(node => ({
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        nodeLabel: node.nodeLabel,
        startTime: node.startTime,
        endTime: node.endTime,
        duration: node.endTime && node.startTime 
          ? node.endTime - node.startTime 
          : null,
        status: node.status,
        error: node.error,
        screenshotPaths: node.screenshotPaths,
      })),
    };

    const filePath = path.join(reportDir, 'report.json');
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf-8');
  }

  private async generateJUnitReport(reportDir: string): Promise<void> {
    const testNodes = this.getTestNodes();
    const testsuites = testNodes.map((node, index) => {
      const duration = node.endTime && node.startTime
        ? (node.endTime - node.startTime) / 1000
        : 0;
      
      if (node.status === 'error') {
        return `    <testcase name="${this.escapeXml(this.getNodeDisplayName(node))}" classname="${node.nodeType}" time="${duration}">
      <failure message="${this.escapeXml(node.error || 'Unknown error')}">${this.escapeXml(node.error || 'Unknown error')}</failure>
    </testcase>`;
      } else if (node.status === 'bypassed') {
        return `    <testcase name="${this.escapeXml(this.getNodeDisplayName(node))}" classname="${node.nodeType}" time="${duration}">
      <skipped/>
    </testcase>`;
      } else {
        return `    <testcase name="${this.escapeXml(this.getNodeDisplayName(node))}" classname="${node.nodeType}" time="${duration}"/>`;
      }
    }).join('\n');

    const totalTests = testNodes.length;
    const failures = testNodes.filter(n => n.status === 'error').length;
    const skipped = testNodes.filter(n => n.status === 'bypassed').length;
    const totalTime = this.metadata.endTime && this.metadata.startTime
      ? (this.metadata.endTime - this.metadata.startTime) / 1000
      : 0;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="${this.metadata.workflowName}" tests="${totalTests}" failures="${failures}" skipped="${skipped}" time="${totalTime}" timestamp="${new Date(this.metadata.startTime).toISOString()}">
${testsuites}
  </testsuite>
</testsuites>`;

    const filePath = path.join(reportDir, 'junit.xml');
    fs.writeFileSync(filePath, xml, 'utf-8');
  }

  private async generateCSVReport(reportDir: string): Promise<void> {
    const testNodes = this.getTestNodes();
    const headers = ['Node ID', 'Node Label', 'Node Type', 'Status', 'Start Time', 'End Time', 'Duration (ms)', 'Error'];
    const rows = testNodes.map(node => {
      const duration = node.endTime && node.startTime
        ? node.endTime - node.startTime
        : '';
      return [
        node.nodeId,
        node.nodeLabel || '',
        node.nodeType,
        node.status,
        new Date(node.startTime).toISOString(),
        node.endTime ? new Date(node.endTime).toISOString() : '',
        duration.toString(),
        node.error || '',
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const filePath = path.join(reportDir, 'report.csv');
    fs.writeFileSync(filePath, csv, 'utf-8');
  }

  private async generateMarkdownReport(reportDir: string): Promise<void> {
    const testNodes = this.getTestNodes();
    const duration = this.metadata.endTime 
      ? ((this.metadata.endTime - this.metadata.startTime) / 1000).toFixed(2)
      : 'N/A';
    
    const passedNodes = testNodes.filter(n => n.status === 'completed').length;
    const failedNodes = testNodes.filter(n => n.status === 'error').length;
    const totalNodes = testNodes.length;

    const nodeRows = testNodes.map(node => {
      const nodeDuration = node.endTime && node.startTime
        ? ((node.endTime - node.startTime) / 1000).toFixed(2)
        : 'N/A';
      
      const statusIcon = node.status === 'completed' ? '✅' 
        : node.status === 'error' ? '❌'
        : node.status === 'bypassed' ? '⏭️'
        : '⏳';

      return `| ${this.getNodeDisplayName(node)} | ${node.nodeType} | ${statusIcon} ${node.status} | ${nodeDuration}s | ${node.error || '-'} |`;
    }).join('\n');

    const markdown = `# Workflow Execution Report

**Execution ID:** ${this.metadata.executionId}  
**Workflow:** ${this.metadata.workflowName}  
**Started:** ${new Date(this.metadata.startTime).toLocaleString()}  
**Duration:** ${duration}s  
**Status:** ${this.metadata.status}

## Summary

- **Total Nodes:** ${totalNodes}
- **Passed:** ${passedNodes}
- **Failed:** ${failedNodes}

## Node Execution Details

| Node | Type | Status | Duration | Error |
|------|------|--------|----------|-------|
${nodeRows}
`;

    const filePath = path.join(reportDir, 'report.md');
    fs.writeFileSync(filePath, markdown, 'utf-8');
  }

  private async generateAllureReport(reportDir: string): Promise<void> {
    // Allure requires specific directory structure
    const resultsDir = path.join(reportDir, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const testNodes = this.getTestNodes();
    // Generate Allure results JSON files for each test node
    testNodes.forEach((node, index) => {
      const allureResult = {
        uuid: `${this.metadata.executionId}-${node.nodeId}`,
        name: this.getNodeDisplayName(node),
        fullName: `${this.metadata.workflowName}.${node.nodeId}`,
        historyId: node.nodeId,
        status: node.status === 'completed' ? 'passed' 
          : node.status === 'error' ? 'failed'
          : node.status === 'bypassed' ? 'skipped'
          : 'broken',
        statusDetails: node.error ? { message: node.error } : undefined,
        stage: 'finished',
        start: node.startTime,
        stop: node.endTime || node.startTime,
        description: `Node type: ${node.nodeType}`,
        labels: [
          { name: 'suite', value: this.metadata.workflowName },
          { name: 'testClass', value: node.nodeType },
        ],
        links: [],
        parameters: [],
        steps: [],
        attachments: [
          // Screenshot attachments
          ...(node.screenshotPaths 
            ? Object.entries(node.screenshotPaths).map(([timing, screenshotPath]) => ({
                name: `screenshot-${timing}`,
                source: path.basename(screenshotPath),
                type: 'image/png',
              }))
            : []),
          // Video attachment
          ...(node.videoPath ? [{
            name: 'video-recording',
            source: path.basename(node.videoPath),
            type: 'video/webm',
          }] : []),
        ],
      };

      const filePath = path.join(resultsDir, `${this.metadata.executionId}-${node.nodeId}-result.json`);
      fs.writeFileSync(filePath, JSON.stringify(allureResult, null, 2), 'utf-8');
    });

    // Copy screenshots to allure results directory (attachments must be in same dir as results JSON)
    // Allure expects attachments to be in the same directory as the results JSON files
    if (fs.existsSync(this.metadata.screenshotsDirectory)) {
      // Copy screenshots to results directory (same directory as JSON files)
      try {
        const screenshotFiles = fs.readdirSync(this.metadata.screenshotsDirectory);
        screenshotFiles.forEach(file => {
          if (file.endsWith('.png')) {
            const srcPath = path.join(this.metadata.screenshotsDirectory, file);
            const destPath = path.join(resultsDir, file);
            fs.copyFileSync(srcPath, destPath);
          }
        });
      } catch (error: any) {
        console.warn('Failed to copy screenshots for Allure report:', error.message);
      }
    }

    // Copy videos to allure results directory
    if (fs.existsSync(this.metadata.videosDirectory)) {
      try {
        const videoFiles = fs.readdirSync(this.metadata.videosDirectory);
        videoFiles.forEach(file => {
          if (file.endsWith('.webm')) {
            const srcPath = path.join(this.metadata.videosDirectory, file);
            const destPath = path.join(resultsDir, file);
            fs.copyFileSync(srcPath, destPath);
          }
        });
      } catch (error: any) {
        console.warn('Failed to copy videos for Allure report:', error.message);
      }
    }

    // Generate executor.json (required for Allure)
    const executorData = {
      name: 'AutoMFlows',
      type: 'automflows',
      buildName: this.metadata.workflowName,
      buildOrder: this.metadata.executionId,
      reportName: 'AutoMFlows Execution Report',
      reportUrl: '',
      buildUrl: '',
    };
    const executorPath = path.join(reportDir, 'executor.json');
    fs.writeFileSync(executorPath, JSON.stringify(executorData, null, 2), 'utf-8');

    // Try to generate Allure report using Allure CLI if available
    try {
      const { execSync } = require('child_process');
      
      // Check if allure command is available
      try {
        execSync('allure --version', { stdio: 'pipe', timeout: 5000 });
        
        // Allure CLI is available, generate the report
        const reportOutputDir = path.join(reportDir, 'report');
        execSync(`allure generate "${resultsDir}" --clean -o "${reportOutputDir}"`, {
          cwd: reportDir,
          stdio: 'pipe',
          timeout: 30000,
        });
        
        // Copy ALL generated files from report/ to root (not just index.html)
        // This ensures CSS, JS, and other assets are accessible
        if (fs.existsSync(reportOutputDir)) {
          const generatedFiles = fs.readdirSync(reportOutputDir);
          generatedFiles.forEach(file => {
            // Skip copying results and attachments directories (they're already in root)
            if (file === 'results' || file === 'attachments') {
              return;
            }
            const srcPath = path.join(reportOutputDir, file);
            const destPath = path.join(reportDir, file);
            try {
              if (fs.statSync(srcPath).isDirectory()) {
                if (fs.existsSync(destPath)) {
                  fs.rmSync(destPath, { recursive: true, force: true });
                }
                fs.cpSync(srcPath, destPath, { recursive: true });
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            } catch (copyError: any) {
              console.warn(`Failed to copy ${file} for Allure report:`, copyError.message);
            }
          });
          
          // Create a README with access instructions
          const folderName = path.basename(path.dirname(reportDir));
          
          // Try to get the backend port from port file
          let portInfo = '{PORT}';
          try {
            const { readPortFile } = require('./writePort');
            const port = readPortFile();
            if (port) {
              portInfo = port.toString();
            }
          } catch (error) {
            // Ignore errors, use placeholder
          }
          
          const accessNote = `Allure Report Access Instructions
========================================

⚠️ IMPORTANT: Allure reports must be accessed via HTTP, not by opening the file directly (file:// protocol).

The report files have been generated successfully. To view the report:

1. Via HTTP Server (Recommended):
   Open in browser: http://localhost:${portInfo}/reports/${folderName}/allure/index.html
   
   ${portInfo === '{PORT}' ? 'Replace {PORT} with your backend server port (check .automflows-port file or server logs).' : `Server is running on port ${portInfo}.`}

2. Via Allure CLI (Alternative):
   cd "${reportDir}"
   allure open .
   
   This will start a local server and open the report in your browser.

Note: Opening index.html directly via file:// protocol will NOT work due to browser CORS restrictions.
Allure reports require HTTP access to load JSON data files dynamically.

Report generated at: ${new Date().toLocaleString()}
`;
          fs.writeFileSync(path.join(reportDir, 'README.txt'), accessNote, 'utf-8');
        }
        
          // Successfully generated with Allure CLI, exit early
        return;
      } catch (allureError: any) {
        // Allure CLI not available, generate a note and simple viewer
        
        // Generate instruction file
        const instructionText = `Allure Report Generation Instructions
========================================

To generate a full Allure report, you need to install Allure CLI:

1. Install Allure:
   - macOS: brew install allure
   - Windows: scoop install allure
   - Linux: See https://docs.qameta.io/allure/#_installing_a_commandline

2. Generate the report:
   cd "${reportDir}"
   allure generate results/ --clean -o report/

3. View the report:
   allure open report/

Or use allure serve to generate and serve:
   allure serve results/

The results JSON files are already generated in the results/ directory.
They are in the correct format for Allure CLI to process.
`;
        fs.writeFileSync(path.join(reportDir, 'README.txt'), instructionText, 'utf-8');
        
        // Generate a simple viewer as fallback
        const indexHtml = this.generateAllureIndexHtml();
        const indexPath = path.join(reportDir, 'index.html');
        fs.writeFileSync(indexPath, indexHtml, 'utf-8');
      }
    } catch (error: any) {
      console.warn('Failed to generate Allure report with CLI:', error.message);
      // Fallback to simple viewer
      const indexHtml = this.generateAllureIndexHtml();
      const indexPath = path.join(reportDir, 'index.html');
      fs.writeFileSync(indexPath, indexHtml, 'utf-8');
    }
    
  }

  private generateAllureIndexHtml(): string {
    const testNodes = this.getTestNodes();
    const passedNodes = testNodes.filter(n => n.status === 'completed').length;
    const failedNodes = testNodes.filter(n => n.status === 'error').length;
    const skippedNodes = testNodes.filter(n => n.status === 'bypassed').length;
    const totalNodes = testNodes.length;
    const duration = this.metadata.endTime 
      ? ((this.metadata.endTime - this.metadata.startTime) / 1000).toFixed(2)
      : 'N/A';

    const nodeRows = testNodes.map(node => {
      const nodeDuration = node.endTime && node.startTime
        ? ((node.endTime - node.startTime) / 1000).toFixed(2)
        : 'N/A';
      
      const statusClass = node.status === 'completed' ? 'passed' 
        : node.status === 'error' ? 'failed'
        : node.status === 'bypassed' ? 'skipped'
        : 'broken';
      
      const statusText = node.status === 'completed' ? 'PASSED'
        : node.status === 'error' ? 'FAILED'
        : node.status === 'bypassed' ? 'SKIPPED'
        : 'BROKEN';

      return `
        <tr class="test-result ${statusClass}">
          <td>${this.getNodeDisplayName(node)}</td>
          <td>${node.nodeType}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>${nodeDuration}s</td>
          <td>${node.error || '-'}</td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Allure Report - ${this.metadata.workflowName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #fff; margin-bottom: 10px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .summary-card {
      background: #2a2a2a;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card h3 {
      font-size: 12px;
      color: #999;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
    }
    .summary-card.total .value { color: #4a9eff; }
    .summary-card.passed .value { color: #10b981; }
    .summary-card.failed .value { color: #ef4444; }
    .summary-card.skipped .value { color: #f59e0b; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #2a2a2a;
      border-radius: 8px;
      overflow: hidden;
      margin-top: 20px;
    }
    th {
      background: #333;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #fff;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #3a3a3a;
    }
    tr:hover { background: #333; }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.passed { background: #10b981; color: #fff; }
    .status-badge.failed { background: #ef4444; color: #fff; }
    .status-badge.skipped { background: #f59e0b; color: #fff; }
    .status-badge.broken { background: #3b82f6; color: #fff; }
    .note {
      background: #2a2a2a;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .note p {
      color: #999;
      font-size: 14px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Allure Test Report</h1>
    <p style="color: #999; margin-bottom: 20px;">
      Execution ID: ${this.metadata.executionId} | 
      Started: ${new Date(this.metadata.startTime).toLocaleString()} |
      Duration: ${duration}s
    </p>
    
    <div class="summary">
      <div class="summary-card total">
        <h3>Total</h3>
        <div class="value">${totalNodes}</div>
      </div>
      <div class="summary-card passed">
        <h3>Passed</h3>
        <div class="value">${passedNodes}</div>
      </div>
      <div class="summary-card failed">
        <h3>Failed</h3>
        <div class="value">${failedNodes}</div>
      </div>
      <div class="summary-card skipped">
        <h3>Skipped</h3>
        <div class="value">${skippedNodes}</div>
      </div>
    </div>

    <div class="note">
      <p><strong>⚠️ This is a simplified viewer. For a full Allure report:</strong></p>
      <ol style="margin-left: 20px; margin-top: 10px; color: #999;">
        <li>Install Allure CLI: <code style="background: #333; padding: 2px 6px; border-radius: 3px;">brew install allure</code> (macOS) or see <a href="https://docs.qameta.io/allure/#_installing_a_commandline" target="_blank" style="color: #4a9eff;">installation guide</a></li>
        <li>Generate report: <code style="background: #333; padding: 2px 6px; border-radius: 3px;">cd "${this.metadata.outputDirectory}/allure && allure generate results/ --clean -o report/</code></li>
        <li>View report: <code style="background: #333; padding: 2px 6px; border-radius: 3px;">allure open report/</code> or <code style="background: #333; padding: 2px 6px; border-radius: 3px;">allure serve results/</code></li>
      </ol>
      <p style="margin-top: 10px; color: #999;">The results JSON files in the <code style="background: #333; padding: 2px 6px; border-radius: 3px;">results/</code> directory are in the correct format for Allure CLI.</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>Test Name</th>
          <th>Type</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        ${nodeRows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
