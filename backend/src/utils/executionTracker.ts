import * as fs from 'fs';
import * as path from 'path';
import { Workflow, BaseNode } from '@automflows/shared';

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
  };
}

export interface ExecutionMetadata {
  executionId: string;
  workflowName: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'error' | 'stopped';
  outputDirectory: string;
  screenshotsDirectory: string;
  nodes: NodeExecutionEvent[];
}

export class ExecutionTracker {
  private metadata: ExecutionMetadata;
  private outputDirectory: string;
  private screenshotsDirectory: string;

  constructor(
    executionId: string,
    workflow: Workflow,
    outputPath: string = './output'
  ) {
    // Get workflow name from workflow file or use default
    const workflowName = this.extractWorkflowName(workflow);
    const timestamp = Date.now();
    const folderName = `${workflowName}-${timestamp}`;
    
    this.outputDirectory = path.resolve(outputPath, folderName);
    this.screenshotsDirectory = path.join(this.outputDirectory, 'screenshots');

    // Create directories
    if (!fs.existsSync(this.outputDirectory)) {
      fs.mkdirSync(this.outputDirectory, { recursive: true });
    }
    if (!fs.existsSync(this.screenshotsDirectory)) {
      fs.mkdirSync(this.screenshotsDirectory, { recursive: true });
    }

    this.metadata = {
      executionId,
      workflowName,
      startTime: timestamp,
      status: 'running',
      outputDirectory: this.outputDirectory,
      screenshotsDirectory: this.screenshotsDirectory,
      nodes: [],
    };
  }

  private extractWorkflowName(workflow: Workflow): string {
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

  recordNodeError(nodeId: string, error: string): void {
    const nodeEvent = this.metadata.nodes.find(n => n.nodeId === nodeId);
    if (nodeEvent) {
      nodeEvent.endTime = Date.now();
      nodeEvent.status = 'error';
      nodeEvent.error = error;
    }
  }

  recordNodeBypassed(nodeId: string): void {
    const nodeEvent = this.metadata.nodes.find(n => n.nodeId === nodeId);
    if (nodeEvent) {
      nodeEvent.endTime = Date.now();
      nodeEvent.status = 'bypassed';
    }
  }

  recordScreenshot(nodeId: string, screenshotPath: string, timing: 'pre' | 'post'): void {
    const nodeEvent = this.metadata.nodes.find(n => n.nodeId === nodeId);
    if (nodeEvent) {
      if (!nodeEvent.screenshotPaths) {
        nodeEvent.screenshotPaths = {};
      }
      nodeEvent.screenshotPaths[timing] = screenshotPath;
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
}
