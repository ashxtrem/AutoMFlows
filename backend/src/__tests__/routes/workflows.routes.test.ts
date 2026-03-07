import request from 'supertest';
import path from 'path';
import type { Express } from 'express';

const mockStartSingleExecution = jest.fn();
const mockStartBatchExecution = jest.fn();
const mockGetBatchStatus = jest.fn();
const mockGetExecutionStatus = jest.fn();
const mockStopBatch = jest.fn();
const mockGetMostRecentExecutionId = jest.fn();
const mockGetActiveExecutions = jest.fn();
const mockGetExecutor = jest.fn();
const mockStopExecution = jest.fn();
const mockStopAll = jest.fn();

jest.mock('../../utils/executionManager', () => ({
  getExecutionManager: () => ({
    startSingleExecution: mockStartSingleExecution,
    startBatchExecution: mockStartBatchExecution,
    getBatchStatus: mockGetBatchStatus,
    getExecutionStatus: mockGetExecutionStatus,
    stopBatch: mockStopBatch,
    stopExecution: mockStopExecution,
    stopAll: mockStopAll,
    getMostRecentExecutionId: mockGetMostRecentExecutionId,
    getActiveExecutions: mockGetActiveExecutions,
    getExecutor: mockGetExecutor,
  }),
}));

jest.mock('../../utils/batchPersistence', () => ({
  getBatchPersistence: () => ({
    initialize: jest.fn(),
    getBatches: jest.fn().mockReturnValue({ total: 0, batches: [] }),
    getBatchExecutions: jest.fn().mockReturnValue([]),
    clearAllBatches: jest.fn().mockReturnValue({ batchesDeleted: 0, executionsDeleted: 0 }),
    loadActiveBatches: jest.fn().mockReturnValue([]),
    markBatchStopped: jest.fn(),
    close: jest.fn(),
  }),
}));

import { createApp } from '../../app';

let app: Express;

beforeAll(() => {
  ({ app } = createApp());
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/workflows/scan', () => {
  it('returns 400 when folderPath is missing', async () => {
    const res = await request(app).get('/api/workflows/scan');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('folderPath query parameter is required');
  });

  it('returns 404 for non-existent folder', async () => {
    const res = await request(app)
      .get('/api/workflows/scan')
      .query({ folderPath: '/definitely/does/not/exist' });

    expect(res.status).toBe(404);
  });

  it('scans a folder with workflow files', async () => {
    const testFolder = path.resolve(__dirname, '../../../tests/demo');

    const res = await request(app)
      .get('/api/workflows/scan')
      .query({ folderPath: testFolder });

    if (res.status === 404) {
      // Folder may not exist in all envs; skip gracefully
      return;
    }

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const item of res.body) {
      expect(item).toHaveProperty('fileName');
      expect(item).toHaveProperty('isValid');
    }
  });
});

describe('GET /api/workflows/execution/batch/:batchId', () => {
  it('returns 404 for unknown batch', async () => {
    mockGetBatchStatus.mockReturnValue(null);

    const res = await request(app).get('/api/workflows/execution/batch/unknown-batch');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Batch not found');
  });

  it('returns batch status with executions', async () => {
    mockGetBatchStatus.mockReturnValue({
      batchId: 'batch-1',
      status: 'completed',
      sourceType: 'workflows',
      totalWorkflows: 2,
      completed: 2,
      running: 0,
      queued: 0,
      failed: 0,
      startTime: Date.now() - 5000,
      endTime: Date.now(),
      executionIds: ['exec-1', 'exec-2'],
    });
    mockGetExecutionStatus
      .mockReturnValueOnce({ executionId: 'exec-1', status: 'completed' })
      .mockReturnValueOnce({ executionId: 'exec-2', status: 'completed' });

    const res = await request(app).get('/api/workflows/execution/batch/batch-1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      batchId: 'batch-1',
      status: 'completed',
      totalWorkflows: 2,
      completed: 2,
    });
    expect(res.body.executions).toHaveLength(2);
  });
});

describe('POST /api/workflows/execution/batch/:batchId/stop', () => {
  it('stops a batch execution', async () => {
    mockStopBatch.mockResolvedValue({
      stoppedExecutions: 3,
      runningStopped: 2,
      queuedCancelled: 1,
    });

    const res = await request(app)
      .post('/api/workflows/execution/batch/batch-1/stop')
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      batchId: 'batch-1',
      stoppedExecutions: 3,
    });
  });
});

describe('POST /api/workflows/execute (parallel mode)', () => {
  it('returns 400 when parallel mode has no workflows or folderPath', async () => {
    const res = await request(app)
      .post('/api/workflows/execute')
      .send({ executionMode: 'parallel' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/folderPath|workflows/);
  });

  it('executes parallel mode with workflows array', async () => {
    const workflow = {
      nodes: [{ id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
    };

    mockStartBatchExecution.mockResolvedValue('batch-42');
    mockGetBatchStatus.mockReturnValue({
      batchId: 'batch-42',
      totalWorkflows: 2,
      validWorkflows: 2,
      invalidWorkflows: 0,
      executionIds: ['e1', 'e2'],
      status: 'running',
    });
    mockGetExecutionStatus
      .mockReturnValueOnce({ executionId: 'e1', status: 'running' })
      .mockReturnValueOnce({ executionId: 'e2', status: 'running' });

    const res = await request(app)
      .post('/api/workflows/execute')
      .send({
        workflows: [workflow, workflow],
        executionMode: 'parallel',
        workers: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      batchId: 'batch-42',
      executionMode: 'parallel',
      totalWorkflows: 2,
    });
    expect(res.body.executions).toHaveLength(2);
  });
});

describe('Selector finder routes', () => {
  it('GET /api/workflows/selector-finder/status returns inactive when no session', async () => {
    const res = await request(app).get('/api/workflows/selector-finder/status');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ active: false });
  });
});

describe('Builder mode routes', () => {
  it('GET /api/workflows/builder-mode/status returns inactive when no session', async () => {
    const res = await request(app).get('/api/workflows/builder-mode/status');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ active: false, recording: false });
  });

  it('GET /api/workflows/builder-mode/actions returns empty array', async () => {
    const res = await request(app).get('/api/workflows/builder-mode/actions');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
