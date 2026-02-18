import * as fs from 'fs';
import * as path from 'path';
import { Workflow } from '@automflows/shared';
import { ExecutionMetadata } from '../executionTracker';
import { getTestNodes, getNodeDisplayName } from './utils';
import { generateAllureIndexHtml } from './allureIndexHtml';

export async function generateAllureReport(
  metadata: ExecutionMetadata,
  workflow: Workflow,
  reportDir: string
): Promise<void> {
  // Allure requires specific directory structure
  const resultsDir = path.join(reportDir, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const testNodes = getTestNodes(metadata, workflow);
  // Generate Allure results JSON files for each test node
  testNodes.forEach((node) => {
    const allureResult = {
      uuid: `${metadata.executionId}-${node.nodeId}`,
      name: getNodeDisplayName(node),
      fullName: `${metadata.workflowName}.${node.nodeId}`,
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
        { name: 'suite', value: metadata.workflowName },
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
        // Accessibility snapshot attachments
        ...(node.accessibilitySnapshotPaths 
          ? Object.entries(node.accessibilitySnapshotPaths).map(([timing, snapshotPath]) => ({
              name: `accessibility-snapshot-${timing}`,
              source: path.basename(snapshotPath),
              type: 'application/json',
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

    const filePath = path.join(resultsDir, `${metadata.executionId}-${node.nodeId}-result.json`);
    fs.writeFileSync(filePath, JSON.stringify(allureResult, null, 2), 'utf-8');
  });

  // Copy screenshots to allure results directory (attachments must be in same dir as results JSON)
  // Allure expects attachments to be in the same directory as the results JSON files
  if (fs.existsSync(metadata.screenshotsDirectory)) {
    // Copy screenshots to results directory (same directory as JSON files)
    try {
      const screenshotFiles = fs.readdirSync(metadata.screenshotsDirectory);
      screenshotFiles.forEach(file => {
        if (file.endsWith('.png')) {
          const srcPath = path.join(metadata.screenshotsDirectory, file);
          const destPath = path.join(resultsDir, file);
          fs.copyFileSync(srcPath, destPath);
        }
      });
    } catch (error: any) {
      console.warn('Failed to copy screenshots for Allure report:', error.message);
    }
  }

  // Copy accessibility snapshots to allure results directory
  if (metadata.snapshotsDirectory && fs.existsSync(metadata.snapshotsDirectory)) {
    try {
      const snapshotFiles = fs.readdirSync(metadata.snapshotsDirectory);
      snapshotFiles.forEach(file => {
        if (file.endsWith('.json')) {
          const srcPath = path.join(metadata.snapshotsDirectory, file);
          const destPath = path.join(resultsDir, file);
          fs.copyFileSync(srcPath, destPath);
        }
      });
    } catch (error: any) {
      console.warn('Failed to copy accessibility snapshots for Allure report:', error.message);
    }
  }

  // Copy videos to allure results directory
  if (fs.existsSync(metadata.videosDirectory)) {
    try {
      const videoFiles = fs.readdirSync(metadata.videosDirectory);
      videoFiles.forEach(file => {
        if (file.endsWith('.webm')) {
          const srcPath = path.join(metadata.videosDirectory, file);
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
    buildName: metadata.workflowName,
    buildOrder: metadata.executionId,
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
          const { readPortFile } = require('../writePort');
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
      const indexHtml = generateAllureIndexHtml(metadata, workflow);
      const indexPath = path.join(reportDir, 'index.html');
      fs.writeFileSync(indexPath, indexHtml, 'utf-8');
    }
  } catch (error: any) {
    console.warn('Failed to generate Allure report with CLI:', error.message);
    // Fallback to simple viewer
    const indexHtml = generateAllureIndexHtml(metadata, workflow);
    const indexPath = path.join(reportDir, 'index.html');
    fs.writeFileSync(indexPath, indexHtml, 'utf-8');
  }
}
