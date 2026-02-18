import * as fs from 'fs';
import * as path from 'path';
import { Workflow, BaseNode, PageDebugInfo } from '@automflows/shared';
import { resolveFromProjectRoot } from './pathUtils';

export interface NodeExecutionEvent {
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'error' | 'bypassed';
  error?: string;
  screenshotPaths?: {
    pre?: string;
    post?: string;
    failure?: string;
  };
  accessibilitySnapshotPaths?: {
    pre?: string;
    post?: string;
    failure?: string;
  };
  videoPath?: string;
  traceLogs?: string[];
  debugInfo?: PageDebugInfo;
}

export interface ExecutionMetadata {
  executionId: string;
  workflowName: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'error' | 'stopped';
  outputDirectory: string;
  screenshotsDirectory: string;
  snapshotsDirectory: string;
  videosDirectory: string;
  nodes: NodeExecutionEvent[];
}

export class ExecutionTracker {
  private metadata: ExecutionMetadata;
  private outputDirectory: string;
  private screenshotsDirectory: string;
  private snapshotsDirectory: string;
  private videosDirectory: string;
  private workflow: Workflow; // Store workflow to access node properties like isTest

  constructor(
    executionId: string,
    workflow: Workflow,
    outputPath: string = './output',
    workflowFileName?: string
  ) {
    this.workflow = workflow; // Store workflow for later use
    
    // Get workflow name from provided filename or extract from workflow
    const workflowName = this.extractWorkflowName(workflow, workflowFileName);
    const timestamp = Date.now();
    const folderName = `${workflowName}-${timestamp}`;
    
    // Resolve output path relative to project root
    const resolvedOutputPath = resolveFromProjectRoot(outputPath);
    this.outputDirectory = path.resolve(resolvedOutputPath, folderName);
    this.screenshotsDirectory = path.join(this.outputDirectory, 'screenshots');
    this.snapshotsDirectory = path.join(this.outputDirectory, 'snapshots');
    this.videosDirectory = path.join(this.outputDirectory, 'videos');

    // Create directories
    if (!fs.existsSync(this.outputDirectory)) {
      fs.mkdirSync(this.outputDirectory, { recursive: true });
    }
    if (!fs.existsSync(this.screenshotsDirectory)) {
      fs.mkdirSync(this.screenshotsDirectory, { recursive: true });
    }
    if (!fs.existsSync(this.snapshotsDirectory)) {
      fs.mkdirSync(this.snapshotsDirectory, { recursive: true });
    }
    if (!fs.existsSync(this.videosDirectory)) {
      fs.mkdirSync(this.videosDirectory, { recursive: true });
    }

    this.metadata = {
      executionId,
      workflowName,
      startTime: timestamp,
      status: 'running',
      outputDirectory: this.outputDirectory,
      screenshotsDirectory: this.screenshotsDirectory,
      snapshotsDirectory: this.snapshotsDirectory,
      videosDirectory: this.videosDirectory,
      nodes: [],
    };
  }

  private extractWorkflowName(workflow: Workflow, workflowFileName?: string): string {
    // Use provided filename if available (already sanitized from frontend)
    if (workflowFileName) {
      // Sanitize for filesystem compatibility (remove .json extension if present, replace invalid chars)
      return workflowFileName.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'workflow';
    }
    // Try to find a Start node and use its label, or use default
    const startNode = workflow.nodes.find(node => node.type === 'start');
    if (startNode && (startNode.data as any)?.label) {
      // Use start node label, sanitized for filesystem
      return (startNode.data as any).label.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'workflow';
    }
    return 'workflow';
  }

  getOutputDirectory(): string {
    return this.outputDirectory;
  }

  getScreenshotsDirectory(): string {
    return this.screenshotsDirectory;
  }

  getSnapshotsDirectory(): string {
    return this.snapshotsDirectory;
  }

  getVideosDirectory(): string {
    return this.videosDirectory;
  }

  recordNodeStart(node: BaseNode): void {
    const nodeEvent: NodeExecutionEvent = {
      nodeId: node.id,
      nodeType: node.type as string,
      nodeLabel: (node.data as any)?.label,
      startTime: Date.now(),
      status: 'running',
    };
    this.metadata.nodes.push(nodeEvent);
  }

  recordNodeComplete(nodeId: string): void {
    const nodeEvent = this.metadata.nodes.find(n => n.nodeId === nodeId);
    if (nodeEvent) {
      nodeEvent.endTime = Date.now();
      nodeEvent.status = 'completed';
    }
  }

  recordNodeError(nodeId: string, error: string, traceLogs?: string[], debugInfo?: PageDebugInfo): void {
    const nodeEvent = this.metadata.nodes.find(n => n.nodeId === nodeId);
    if (nodeEvent) {
      nodeEvent.endTime = Date.now();
      nodeEvent.status = 'error';
      nodeEvent.error = error;
      if (traceLogs) {
        nodeEvent.traceLogs = traceLogs;
      }
      if (debugInfo) {
        nodeEvent.debugInfo = debugInfo;
      }
    }
  }

  recordNodeBypassed(nodeId: string): void {
    const nodeEvent = this.metadata.nodes.find(n => n.nodeId === nodeId);
    if (nodeEvent) {
      nodeEvent.endTime = Date.now();
      nodeEvent.status = 'bypassed';
    }
  }

  recordScreenshot(nodeId: string, screenshotPath: string, timing: 'pre' | 'post' | 'failure'): void {
    const nodeEvent = this.metadata.nodes.find(n => n.nodeId === nodeId);
    if (nodeEvent) {
      if (!nodeEvent.screenshotPaths) {
        nodeEvent.screenshotPaths = {};
      }
      nodeEvent.screenshotPaths[timing] = screenshotPath;
    } else {
      // If node event doesn't exist yet (shouldn't happen, but handle gracefully),
      // log a warning. This can happen if screenshot is taken before node start is recorded.
      console.warn(`Cannot record screenshot for node ${nodeId}: node event not found. Screenshot path: ${screenshotPath}`);
    }
  }

  recordAccessibilitySnapshot(nodeId: string, snapshotPath: string, timing: 'pre' | 'post' | 'failure'): void {
    const nodeEvent = this.metadata.nodes.find(n => n.nodeId === nodeId);
    if (nodeEvent) {
      if (!nodeEvent.accessibilitySnapshotPaths) {
        nodeEvent.accessibilitySnapshotPaths = {};
      }
      nodeEvent.accessibilitySnapshotPaths[timing] = snapshotPath;
    } else {
      console.warn(`Cannot record accessibility snapshot for node ${nodeId}: node event not found. Path: ${snapshotPath}`);
    }
  }

  recordVideo(nodeId: string, videoPath: string): void {
    const nodeEvent = this.metadata.nodes.find(n => n.nodeId === nodeId);
    if (nodeEvent) {
      nodeEvent.videoPath = videoPath;
    } else {
      console.warn(`Cannot record video for node ${nodeId}: node event not found. Video path: ${videoPath}`);
    }
  }

  completeExecution(status: 'completed' | 'error' | 'stopped'): void {
    this.metadata.endTime = Date.now();
    this.metadata.status = status;
  }

  getMetadata(): ExecutionMetadata {
    return { ...this.metadata };
  }

  getFolderName(): string {
    return path.basename(this.outputDirectory);
  }

  getWorkflow(): Workflow {
    return this.workflow;
  }
}
