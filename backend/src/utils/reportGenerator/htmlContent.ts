import * as path from 'path';
import { Workflow, BaseNode } from '@automflows/shared';
import { ExecutionMetadata, NodeExecutionEvent } from '../executionTracker';
import { getTestNodes, getNodeDisplayName, escapeHtml, getNodePropertiesForDisplay } from './utils';

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
    const hasAccessibilitySnapshots = node.accessibilitySnapshotPaths && Object.keys(node.accessibilitySnapshotPaths).length > 0;
    const snapshotCount = hasAccessibilitySnapshots && node.accessibilitySnapshotPaths ? Object.keys(node.accessibilitySnapshotPaths).length : 0;
    const hasVideo = !!node.videoPath;
    
    // Get workflow node for properties
    const workflowNode = workflow.nodes.find(n => n.id === node.nodeId);
    const nodeProperties = workflowNode ? getNodePropertiesForDisplay(workflowNode) : [];
    const hasProperties = nodeProperties.length > 0;
    
    // Screenshot toggle button
    const screenshotToggle = hasScreenshots
      ? `<button class="screenshot-toggle" onclick="toggleScreenshots(${index})" aria-expanded="false">
          <span class="toggle-icon">▼</span>
          Screenshots (${screenshotCount})
        </button>`
      : '-';
    
    // Accessibility snapshot toggle button
    const snapshotToggle = hasAccessibilitySnapshots
      ? `<button class="snapshot-toggle" onclick="toggleSnapshots(${index})" aria-expanded="false">
          <span class="toggle-icon">▼</span>
          Snapshots (${snapshotCount})
        </button>`
      : '-';

    // Video toggle button
    const videoToggle = hasVideo
      ? `<button class="video-toggle" onclick="toggleVideo(${index})" aria-expanded="false">
          <span class="toggle-icon">▼</span>
          Video
        </button>`
      : '-';

    // Helper to get relative path for screenshots
    const getRelativePath = (filePath: string): string => {
      let relativePath: string;
      if (htmlReportDir) {
        relativePath = path.relative(htmlReportDir, filePath);
        relativePath = relativePath.replace(/\\/g, '/');
      } else {
        relativePath = path.relative(metadata.outputDirectory, filePath);
        relativePath = relativePath.replace(/\\/g, '/');
      }
      return relativePath;
    };

    // Screenshot images in collapsible section
    const screenshotContent = hasScreenshots && node.screenshotPaths
      ? Object.entries(node.screenshotPaths)
          .filter(([_, path]) => path) // Filter out undefined paths
          .map(([timing, screenshotPath]) => {
            const relativePath = getRelativePath(screenshotPath);
            const timingLabel = timing === 'failure' ? 'FAILURE' : timing.toUpperCase();
            return `
              <div class="screenshot-item">
                <div class="screenshot-label">${timingLabel}</div>
                <img src="${relativePath}" alt="Screenshot ${timing}" class="screenshot-image" loading="lazy" />
                <a href="${relativePath}" target="_blank" class="screenshot-link">Open in new tab</a>
              </div>
            `;
          })
          .join('')
      : '';

    // Accessibility snapshot content (links to JSON files)
    const snapshotContent = hasAccessibilitySnapshots && node.accessibilitySnapshotPaths
      ? Object.entries(node.accessibilitySnapshotPaths)
          .filter(([_, p]) => p)
          .map(([timing, snapshotPath]) => {
            const relativePath = getRelativePath(snapshotPath);
            const timingLabel = timing === 'failure' ? 'FAILURE' : timing.toUpperCase();
            return `
              <div class="snapshot-item">
                <div class="snapshot-label">${timingLabel}</div>
                <a href="${relativePath}" target="_blank" class="snapshot-link">View JSON</a>
              </div>
            `;
          })
          .join('')
      : '';

    // Video content
    const videoContent = hasVideo && node.videoPath
      ? (() => {
          const relativePath = getRelativePath(node.videoPath!);
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

    // Node properties section
    const propertiesContent = hasProperties
      ? `
        <div class="detail-section">
          <h4 class="detail-section-title">Node Properties</h4>
          <div class="properties-grid">
            ${nodeProperties.map(prop => `
              <div class="property-item">
                <div class="property-key">${escapeHtml(prop.key)}</div>
                <div class="property-value">${escapeHtml(prop.value)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      : '';

    // Error details section
    const errorContent = node.status === 'error' && node.error
      ? `
        <div class="detail-section">
          <h4 class="detail-section-title error-title">Error Message</h4>
          <div class="error-message">${escapeHtml(node.error)}</div>
        </div>
      `
      : '';

    // Trace logs section (trimmed)
    const traceLogsContent = node.traceLogs && node.traceLogs.length > 0
      ? (() => {
          const traceId = `trace-${index}`;
          const traceLogsHtml = node.traceLogs.map(log => escapeHtml(log)).join('\n');
          const lines = node.traceLogs;
          const previewLines = 10;
          const hasMore = lines.length > previewLines;
          const previewText = lines.slice(0, previewLines).map(log => escapeHtml(log)).join('\n');
          const fullText = traceLogsHtml;
          
          return `
            <div class="detail-section">
              <button class="collapsible-header" onclick="toggleCollapsible('${traceId}')">
                <span class="collapsible-icon" id="${traceId}-icon">▼</span>
                <span>Trace Logs (${lines.length} entries)</span>
              </button>
              <div class="collapsible-content" id="${traceId}" style="display: none;">
                <pre class="trace-logs">${previewText}${hasMore ? '\n\n... (click to expand full trace)' : ''}</pre>
                ${hasMore ? `
                  <button class="show-more-btn" onclick="showFullTrace('${traceId}', ${index})">Show Full Trace</button>
                  <pre class="trace-logs full-trace" id="${traceId}-full" style="display: none;">${fullText}</pre>
                ` : ''}
              </div>
            </div>
          `;
        })()
      : '';

    // Debug info section
    const debugInfoContent = node.debugInfo
      ? (() => {
          const debug = node.debugInfo;
          let content = '';
          
          // Page URL
          if (debug.pageUrl) {
            content += `
              <div class="detail-section">
                <h4 class="detail-section-title">Page URL</h4>
                <div class="page-url">${escapeHtml(debug.pageUrl)}</div>
              </div>
            `;
          }
          
          // Similar selectors
          if (debug.similarSelectors && debug.similarSelectors.length > 0) {
            const selectorsId = `selectors-${index}`;
            content += `
              <div class="detail-section">
                <button class="collapsible-header" onclick="toggleCollapsible('${selectorsId}')">
                  <span class="collapsible-icon" id="${selectorsId}-icon">▼</span>
                  <span>Similar Selectors (${debug.similarSelectors.length} suggestions)</span>
                </button>
                <div class="collapsible-content" id="${selectorsId}" style="display: none;">
                  <div class="selectors-list">
                    ${debug.similarSelectors.map((suggestion, idx) => `
                      <div class="selector-item">
                        <div class="selector-code">${escapeHtml(suggestion.selector)}</div>
                        <div class="selector-type">${escapeHtml(suggestion.selectorType)}</div>
                        <div class="selector-reason">${escapeHtml(suggestion.reason)}</div>
                        ${suggestion.elementInfo ? `<div class="selector-element">${escapeHtml(suggestion.elementInfo)}</div>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          }
          
          // Page source
          if (debug.pageSource) {
            const pageSourceId = `pagesource-${index}`;
            content += `
              <div class="detail-section">
                <button class="collapsible-header" onclick="toggleCollapsible('${pageSourceId}')">
                  <span class="collapsible-icon" id="${pageSourceId}-icon">▼</span>
                  <span>Page Source</span>
                </button>
                <div class="collapsible-content" id="${pageSourceId}" style="display: none;">
                  <pre class="page-source">${escapeHtml(debug.pageSource)}</pre>
                </div>
              </div>
            `;
          }
          
          return content;
        })()
      : '';

    // Expandable row content
    const expandableContent = `
      <div class="node-details">
        ${propertiesContent}
        ${errorContent}
        ${traceLogsContent}
        ${debugInfoContent}
        ${hasScreenshots ? `
          <div class="detail-section">
            <h4 class="detail-section-title">Screenshots</h4>
            <div class="screenshot-container">
              ${screenshotContent}
            </div>
          </div>
        ` : ''}
        ${hasAccessibilitySnapshots ? `
          <div class="detail-section">
            <h4 class="detail-section-title">Accessibility Snapshots</h4>
            <div class="snapshot-container">
              ${snapshotContent}
            </div>
          </div>
        ` : ''}
        ${hasVideo ? `
          <div class="detail-section">
            <h4 class="detail-section-title">Video</h4>
            <div class="video-container">
              ${videoContent}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    const hasDetails = hasProperties || node.status === 'error' || (node.traceLogs && node.traceLogs.length > 0) || node.debugInfo || hasScreenshots || hasAccessibilitySnapshots || hasVideo;

    return `
      <tr class="node-row ${hasDetails ? 'expandable' : ''}" ${hasDetails ? `onclick="toggleRow(${index})" style="cursor: pointer;"` : ''}>
        <td>
          ${hasDetails ? '<span class="expand-icon" id="expand-icon-' + index + '">▶</span> ' : ''}
          ${getNodeDisplayName(node)}
        </td>
        <td>${node.nodeType}</td>
        <td>${statusBadge}</td>
        <td>${nodeDuration}s</td>
        <td>${node.error ? escapeHtml(node.error.substring(0, 50)) + (node.error.length > 50 ? '...' : '') : '-'}</td>
        <td>${screenshotToggle}</td>
        <td>${snapshotToggle}</td>
        <td>${videoToggle}</td>
      </tr>
      ${hasDetails ? `
        <tr class="details-row" id="details-row-${index}" style="display: none;">
          <td colspan="8" class="details-cell">
            ${expandableContent}
          </td>
        </tr>
      ` : ''}
      <tr class="screenshot-row" id="screenshot-row-${index}" style="display: none;">
        <td colspan="8" class="screenshot-cell">
          <div class="screenshot-container">
            ${screenshotContent}
          </div>
        </td>
      </tr>
      <tr class="snapshot-row" id="snapshot-row-${index}" style="display: none;">
        <td colspan="8" class="snapshot-cell">
          <div class="snapshot-container">
            ${snapshotContent}
          </div>
        </td>
      </tr>
      <tr class="video-row" id="video-row-${index}" style="display: none;">
        <td colspan="8" class="video-cell">
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
    .container { max-width: 1400px; margin: 0 auto; }
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
    tr:hover:not(.details-row):not(.screenshot-row):not(.snapshot-row):not(.video-row) { background: #333; }
    .node-row.expandable:hover { background: #333; }
    .expand-icon {
      display: inline-block;
      margin-right: 6px;
      transition: transform 0.2s;
      font-size: 10px;
      color: #4a9eff;
    }
    .expand-icon.expanded {
      transform: rotate(90deg);
    }
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
    .screenshot-toggle, .snapshot-toggle, .video-toggle {
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
    .video-toggle {
      background: #10b981;
    }
    .screenshot-toggle:hover { background: #3a8eef; }
    .snapshot-toggle:hover { background: #3a8eef; }
    .video-toggle:hover { background: #059669; }
    .toggle-icon {
      transition: transform 0.2s;
      font-size: 10px;
    }
    .screenshot-toggle[aria-expanded="true"] .toggle-icon,
    .snapshot-toggle[aria-expanded="true"] .toggle-icon,
    .video-toggle[aria-expanded="true"] .toggle-icon {
      transform: rotate(180deg);
    }
    .details-row {
      background: #252525;
    }
    .details-cell {
      padding: 0 !important;
      border-bottom: 2px solid #3a3a3a;
    }
    .node-details {
      padding: 20px;
    }
    .detail-section {
      margin-bottom: 20px;
      background: #1f1f1f;
      border-radius: 8px;
      padding: 15px;
      border: 1px solid #3a3a3a;
    }
    .detail-section-title {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .error-title {
      color: #ef4444;
    }
    .error-message {
      background: #2a1a1a;
      border: 1px solid #ef4444;
      border-radius: 4px;
      padding: 12px;
      color: #ff6b6b;
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .properties-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
    }
    .property-item {
      background: #252525;
      border-radius: 4px;
      padding: 10px;
      border: 1px solid #3a3a3a;
    }
    .property-key {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .property-value {
      font-size: 13px;
      color: #e0e0e0;
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .collapsible-header {
      background: transparent;
      border: none;
      color: #e0e0e0;
      cursor: pointer;
      width: 100%;
      text-align: left;
      padding: 8px 0;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: color 0.2s;
    }
    .collapsible-header:hover {
      color: #4a9eff;
    }
    .collapsible-icon {
      transition: transform 0.2s;
      font-size: 10px;
    }
    .collapsible-content {
      margin-top: 12px;
    }
    .trace-logs {
      background: #1a1a1a;
      border: 1px solid #3a3a3a;
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
      font-family: monospace;
      color: #e0e0e0;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 300px;
      overflow-y: auto;
    }
    .trace-logs.full-trace {
      max-height: 600px;
    }
    .show-more-btn {
      margin-top: 8px;
      background: #4a9eff;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }
    .show-more-btn:hover {
      background: #3a8eef;
    }
    .page-url {
      background: #1a1a1a;
      border: 1px solid #3a3a3a;
      border-radius: 4px;
      padding: 12px;
      font-family: monospace;
      font-size: 12px;
      color: #4a9eff;
      word-break: break-all;
    }
    .selectors-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .selector-item {
      background: #252525;
      border: 1px solid #3a3a3a;
      border-radius: 4px;
      padding: 12px;
    }
    .selector-code {
      font-family: monospace;
      font-size: 13px;
      color: #10b981;
      margin-bottom: 6px;
      word-break: break-all;
    }
    .selector-type {
      font-size: 11px;
      color: #999;
      margin-bottom: 4px;
    }
    .selector-reason {
      font-size: 12px;
      color: #e0e0e0;
      margin-bottom: 4px;
    }
    .selector-element {
      font-size: 11px;
      color: #666;
      font-family: monospace;
    }
    .page-source {
      background: #1a1a1a;
      border: 1px solid #3a3a3a;
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
      font-family: monospace;
      color: #e0e0e0;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 400px;
      overflow-y: auto;
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
    .snapshot-row {
      background: #252525;
    }
    .snapshot-cell {
      padding: 0 !important;
      border-bottom: 2px solid #3a3a3a;
    }
    .snapshot-container {
      padding: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    .snapshot-item {
      background: #1f1f1f;
      border-radius: 8px;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .snapshot-label {
      font-size: 12px;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .snapshot-link {
      color: #4a9eff;
      text-decoration: none;
      font-size: 13px;
    }
    .snapshot-link:hover {
      text-decoration: underline;
    }
    .screenshot-link:hover {
      text-decoration: underline;
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
    const traceData = {
      ${testNodes.map((node, index) => {
        if (node.traceLogs && node.traceLogs.length > 0) {
          const traceIndex = testNodes.indexOf(node);
          try {
            const escapedLogs = node.traceLogs.map(log => 
              String(log).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
            );
            return `${traceIndex}: ${JSON.stringify(escapedLogs)},`;
          } catch {
            return '';
          }
        }
        return '';
      }).filter(Boolean).join('\n      ')}
    };

    function toggleRow(index) {
      const row = document.getElementById('details-row-' + index);
      const icon = document.getElementById('expand-icon-' + index);
      if (row) {
        if (row.style.display === 'none') {
          row.style.display = '';
          if (icon) icon.classList.add('expanded');
        } else {
          row.style.display = 'none';
          if (icon) icon.classList.remove('expanded');
        }
      }
    }

    function toggleCollapsible(id) {
      const content = document.getElementById(id);
      const icon = document.getElementById(id + '-icon');
      if (content) {
        if (content.style.display === 'none') {
          content.style.display = '';
          if (icon) icon.textContent = '▲';
        } else {
          content.style.display = 'none';
          if (icon) icon.textContent = '▼';
        }
      }
    }

    function showFullTrace(traceId, index) {
      const fullTrace = document.getElementById(traceId + '-full');
      const preview = document.querySelector('#' + traceId + ' .trace-logs:not(.full-trace)');
      const button = document.querySelector('#' + traceId + ' .show-more-btn');
      if (fullTrace && preview && button) {
        preview.style.display = 'none';
        fullTrace.style.display = 'block';
        button.style.display = 'none';
      }
    }

    function toggleScreenshots(index) {
      event.stopPropagation();
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
      event.stopPropagation();
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

    function toggleSnapshots(index) {
      event.stopPropagation();
      const row = document.getElementById('snapshot-row-' + index);
      const button = event.target.closest('.snapshot-toggle');
      if (row && button) {
        if (row.style.display === 'none') {
          row.style.display = '';
          button.setAttribute('aria-expanded', 'true');
        } else {
          row.style.display = 'none';
          button.setAttribute('aria-expanded', 'false');
        }
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
          <th>Snapshots</th>
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
