import * as fs from 'fs';
import * as path from 'path';
import { NodeType } from '@automflows/shared';
import { generateAllureReport } from '../allure';
import { generateAllureIndexHtml } from '../allureIndexHtml';
import { ExecutionMetadata } from '../../executionTracker';
import { Workflow } from '@automflows/shared';

jest.mock('fs');
jest.mock('child_process');

describe('generateAllureReport', () => {
  let metadata: ExecutionMetadata;
  let workflow: Workflow;
  let reportDir: string;

  beforeEach(() => {
    reportDir = '/tmp/test-reports/allure';
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
          screenshotPaths: {
            pre: '/tmp/screenshots/pre.png',
          },
        },
      ],
    };
    workflow = {
      nodes: [
        { id: 'node1', type: NodeType.ACTION, position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.readdirSync as jest.Mock).mockReturnValue(['pre.png']);
    (fs.copyFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
  });

  it('should create results directory', async () => {
    await generateAllureReport(metadata, workflow, reportDir);

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.join(reportDir, 'results'),
      { recursive: true }
    );
  });

  it('should generate Allure result JSON files', async () => {
    await generateAllureReport(metadata, workflow, reportDir);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('exec1-node1-result.json'),
      expect.any(String),
      'utf-8'
    );
  });

  it('should include node execution details in result JSON', async () => {
    await generateAllureReport(metadata, workflow, reportDir);

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
      (call: any[]) => call[0].includes('result.json')
    );
    const resultJson = JSON.parse(writeCall[1]);

    expect(resultJson.name).toBe('Action');
    expect(resultJson.status).toBe('passed');
    expect(resultJson.labels).toContainEqual({ name: 'suite', value: 'Test Workflow' });
    expect(resultJson.labels).toContainEqual({ name: 'testClass', value: 'action' });
  });

  it('should copy screenshots to results directory', async () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
      return p === metadata.screenshotsDirectory;
    });

    await generateAllureReport(metadata, workflow, reportDir);

    expect(fs.copyFileSync).toHaveBeenCalledWith(
      path.join(metadata.screenshotsDirectory, 'pre.png'),
      path.join(reportDir, 'results', 'pre.png')
    );
  });

  it('should generate executor.json', async () => {
    await generateAllureReport(metadata, workflow, reportDir);

    const executorCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
      (call: any[]) => call[0].includes('executor.json')
    );
    const executorData = JSON.parse(executorCall[1]);

    expect(executorData.name).toBe('AutoMFlows');
    expect(executorData.buildName).toBe('Test Workflow');
    expect(executorData.buildOrder).toBe('exec1');
  });
});

describe('generateAllureIndexHtml', () => {
  let metadata: ExecutionMetadata;
  let workflow: Workflow;

  beforeEach(() => {
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

  it('should generate HTML content', () => {
    const html = generateAllureIndexHtml(metadata, workflow);

    expect(html).toContain('Allure Test Report');
    expect(html).toContain('exec1');
    expect(html).toContain('Test Workflow');
  });

  it('should include summary cards', () => {
    const html = generateAllureIndexHtml(metadata, workflow);

    expect(html).toContain('Total');
    expect(html).toContain('Passed');
    expect(html).toContain('Failed');
    expect(html).toContain('Skipped');
  });

  it('should include test results table', () => {
    const html = generateAllureIndexHtml(metadata, workflow);

    expect(html).toContain('<table>');
    expect(html).toContain('Test Name');
    expect(html).toContain('Status');
    expect(html).toContain('PASSED');
    expect(html).toContain('FAILED');
  });
});
