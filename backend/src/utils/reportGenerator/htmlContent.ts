import * as path from 'path';
import { Workflow } from '@automflows/shared';
import { ExecutionMetadata } from '../executionTracker';
import { getTestNodes, getNodeDisplayName } from './utils';

export function generateHTMLContent(
  metadata: ExecutionMetadata,
  workflow: Workflow,
  htmlReportDir?: string
): string {
  const testNodes = getTestNodes(metadata, workflow);
  const duration = metadata.endTime 
    ? ((metadata.endTime - metadata.startTime) / 1000).toFixed(2)
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
              relativePath = path.relative(metadata.outputDirectory, screenshotPath);
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
            relativePath = path.relative(metadata.outputDirectory, node.videoPath);
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
        <td>${getNodeDisplayName(node)}</td>
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
      Execution ID: ${metadata.executionId} | 
      Started: ${new Date(metadata.startTime).toLocaleString()} |
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
        <div class="value">${metadata.status}</div>
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
