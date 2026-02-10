import * as fs from 'fs';
import * as path from 'path';
import { NodeType } from '@automflows/shared';
import { generateJSONReport } from '../json';
import { ExecutionMetadata } from '../../executionTracker';
import { Workflow } from '@automflows/shared';

jest.mock('fs');

describe('generateJSONReport', () => {
  let metadata: ExecutionMetadata;
  let workflow: Workflow;
  let reportDir: string;

  beforeEach(() => {
    reportDir = '/tmp/test-reports/json';
    metadata = {
      executionId: 'exec1',
      workflowName: 'Test Workflow',
      startTime: 1000,
      endTime: 2000,
      status: 'completed',
      outputDirectory: '/tmp/test-reports',
      screenshotsDirectory: '/tmp/test-reports/screenshots',
      videosDirectory: '/tmp/test-reports/videos',
      nodes: [
        {
          nodeId: 'node1',
          nodeType: NodeType.ACTION,
          startTime: 1000,
          endTime: 1500,
          status: 'completed',
        },
        {
          nodeId: 'node2',
          nodeType: NodeType.VERIFY,
          startTime: 1500,
          endTime: 2000,
          status: 'error',
          error: 'Test error',
        },
      ],
    };
    workflow = {
      nodes: [
        { id: 'node1', type: NodeType.ACTION, position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: NodeType.VERIFY, position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
    };
  });

  it('should generate JSON report file', async () => {
    await generateJSONReport(metadata, workflow, reportDir);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(reportDir, 'report.json'),
      expect.any(String),
      'utf-8'
    );
  });

  it('should include execution metadata', async () => {
    await generateJSONReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const jsonContent = JSON.parse(writeCall[1]);

    expect(jsonContent.executionId).toBe('exec1');
    expect(jsonContent.workflowName).toBe('Test Workflow');
    expect(jsonContent.startTime).toBe(1000);
    expect(jsonContent.endTime).toBe(2000);
    expect(jsonContent.status).toBe('completed');
    expect(jsonContent.duration).toBe(1000);
  });

  it('should include node execution details', async () => {
    await generateJSONReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const jsonContent = JSON.parse(writeCall[1]);

    expect(jsonContent.nodes).toHaveLength(2);
    expect(jsonContent.nodes[0].nodeId).toBe('node1');
    expect(jsonContent.nodes[0].status).toBe('completed');
    expect(jsonContent.nodes[0].duration).toBe(500);
    expect(jsonContent.nodes[1].nodeId).toBe('node2');
    expect(jsonContent.nodes[1].status).toBe('error');
    expect(jsonContent.nodes[1].error).toBe('Test error');
  });

  it('should handle null duration when endTime is missing', async () => {
    // Clear mock calls first
    (fs.writeFileSync as jest.Mock).mockClear();
    
    const metadataWithoutEndTime: ExecutionMetadata = {
      ...metadata,
      endTime: undefined,
    };
    await generateJSONReport(metadataWithoutEndTime, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const jsonContent = JSON.parse(writeCall[1]);

    expect(jsonContent.duration).toBeNull();
  });

  it('should handle nodes without endTime', async () => {
    // Clear mock calls first
    (fs.writeFileSync as jest.Mock).mockClear();
    
    const nodeWithoutEndTime = {
      ...metadata.nodes[0],
      endTime: undefined,
    };
    const metadataWithNodeWithoutEndTime: ExecutionMetadata = {
      ...metadata,
      nodes: [nodeWithoutEndTime, metadata.nodes[1]],
    };
    await generateJSONReport(metadataWithNodeWithoutEndTime, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const jsonContent = JSON.parse(writeCall[1]);

    expect(jsonContent.nodes[0].duration).toBeNull();
  });
});
