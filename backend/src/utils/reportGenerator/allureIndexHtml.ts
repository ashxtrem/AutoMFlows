import { Workflow } from '@automflows/shared';
import { ExecutionMetadata } from '../executionTracker';
import { getTestNodes, getNodeDisplayName } from './utils';

export function generateAllureIndexHtml(
  metadata: ExecutionMetadata,
  workflow: Workflow
): string {
  const testNodes = getTestNodes(metadata, workflow);
  const passedNodes = testNodes.filter(n => n.status === 'completed').length;
  const failedNodes = testNodes.filter(n => n.status === 'error').length;
  const skippedNodes = testNodes.filter(n => n.status === 'bypassed').length;
  const totalNodes = testNodes.length;
  const duration = metadata.endTime 
    ? ((metadata.endTime - metadata.startTime) / 1000).toFixed(2)
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
        <td>${getNodeDisplayName(node)}</td>
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
  <title>Allure Report - ${metadata.workflowName}</title>
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
      Execution ID: ${metadata.executionId} | 
      Started: ${new Date(metadata.startTime).toLocaleString()} |
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
        <li>Generate report: <code style="background: #333; padding: 2px 6px; border-radius: 3px;">cd "${metadata.outputDirectory}/allure && allure generate results/ --clean -o report/</code></li>
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
