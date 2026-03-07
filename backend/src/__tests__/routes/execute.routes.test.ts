import request from 'supertest';
import type { Express } from 'express';

const mockStartSingleExecution = jest.fn();
const mockStartBatchExecution = jest.fn();
const mockGetBatchStatus = jest.fn();
const mockGetExecutionStatus = jest.fn();
const mockStopExecution = jest.fn();
const mockStopAll = jest.fn();
const mockGetMostRecentExecutionId = jest.fn();
const mockGetActiveExecutions = jest.fn();
const mockGetExecutor = jest.fn();

jest.mock('../../utils/executionManager', () => ({
  getExecutionManager: () => ({
    startSingleExecution: mockStartSingleExecution,
    startBatchExecution: mockStartBatchExecution,
    getBatchStatus: mockGetBatchStatus,
    getExecutionStatus: mockGetExecutionStatus,
    stopExecution: mockStopExecution,
    stopAll: mockStopAll,
    getMostRecentExecutionId: mockGetMostRecentExecutionId,
    getActiveExecutions: mockGetActiveExecutions,
    getExecutor: mockGetExecutor,
    stopBatch: jest.fn().mockResolvedValue({ stoppedExecutions: 0, runningStopped: 0, queuedCancelled: 0 }),
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

describe('POST /api/workflows/execute', () => {
  const minimalWorkflow = {
    nodes: [{ id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: {} }],
    edges: [],
  };

  it('returns 200 with executionId for single workflow', async () => {
    mockStartSingleExecution.mockResolvedValue('exec-123');

    const res = await request(app)
      .post('/api/workflows/execute')
      .send({ workflow: minimalWorkflow });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      executionId: 'exec-123',
      status: 'running',
      executionMode: 'single',
    });
    expect(mockStartSingleExecution).toHaveBeenCalledWith(
      minimalWorkflow,
      expect.objectContaining({ traceLogs: false }),
    );
  });

  it('returns 400 when no workflow or folderPath provided', async () => {
    const res = await request(app)
      .post('/api/workflows/execute')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for invalid workflow format (missing nodes)', async () => {
    const res = await request(app)
      .post('/api/workflows/execute')
      .send({ workflow: { edges: [] } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid workflow format');
  });

  it('returns 400 for invalid workflow format (missing edges)', async () => {
    const res = await request(app)
      .post('/api/workflows/execute')
      .send({ workflow: { nodes: [] } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid workflow format');
  });

  it('returns 400 when both workflow and folderPath provided in auto mode', async () => {
    const res = await request(app)
      .post('/api/workflows/execute')
      .send({ workflow: minimalWorkflow, folderPath: './some/path' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot provide both/);
  });

  it('passes execution options to startSingleExecution', async () => {
    mockStartSingleExecution.mockResolvedValue('exec-456');

    await request(app)
      .post('/api/workflows/execute')
      .send({
        workflow: minimalWorkflow,
        traceLogs: true,
        recordSession: true,
        workflowFileName: 'test.json',
      });

    expect(mockStartSingleExecution).toHaveBeenCalledWith(
      minimalWorkflow,
      expect.objectContaining({
        traceLogs: true,
        recordSession: true,
        workflowFileName: 'test.json',
      }),
    );
  });

  it('returns 500 when execution engine throws', async () => {
    mockStartSingleExecution.mockRejectedValue(new Error('Engine boom'));

    const res = await request(app)
      .post('/api/workflows/execute')
      .send({ workflow: minimalWorkflow });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      error: 'Failed to execute workflow',
      message: 'Engine boom',
    });
  });
});

describe('GET /api/workflows/execution/status', () => {
  it('returns idle status when no execution exists', async () => {
    mockGetMostRecentExecutionId.mockReturnValue(null);

    const res = await request(app).get('/api/workflows/execution/status');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'idle' });
  });

  it('returns status for most recent execution', async () => {
    mockGetMostRecentExecutionId.mockReturnValue('exec-789');
    mockGetExecutionStatus.mockReturnValue({
      executionId: 'exec-789',
      status: 'completed',
    });

    const res = await request(app).get('/api/workflows/execution/status');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      executionId: 'exec-789',
      status: 'completed',
    });
  });

  it('returns status for specific execution via query param', async () => {
    mockGetExecutionStatus.mockReturnValue({
      executionId: 'exec-specific',
      status: 'running',
    });

    const res = await request(app)
      .get('/api/workflows/execution/status')
      .query({ executionId: 'exec-specific' });

    expect(res.status).toBe(200);
    expect(res.body.executionId).toBe('exec-specific');
  });

  it('returns 404 for unknown executionId', async () => {
    mockGetExecutionStatus.mockReturnValue(null);

    const res = await request(app)
      .get('/api/workflows/execution/status')
      .query({ executionId: 'nonexistent' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/workflows/execution/:executionId', () => {
  it('returns status for existing execution', async () => {
    mockGetExecutionStatus.mockReturnValue({
      executionId: 'exec-abc',
      status: 'running',
      currentNodeId: 'node-2',
    });

    const res = await request(app).get('/api/workflows/execution/exec-abc');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      executionId: 'exec-abc',
      status: 'running',
    });
  });

  it('returns 404 for unknown execution', async () => {
    mockGetExecutionStatus.mockReturnValue(null);

    const res = await request(app).get('/api/workflows/execution/unknown-id');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Execution not found');
  });
});

describe('GET /api/workflows/executions/active', () => {
  it('returns empty array when no active executions', async () => {
    mockGetActiveExecutions.mockReturnValue([]);

    const res = await request(app).get('/api/workflows/executions/active');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalActive: 0, executions: [] });
  });

  it('returns active executions', async () => {
    mockGetActiveExecutions.mockReturnValue([
      { executionId: 'exec-1', status: 'running' },
      { executionId: 'exec-2', status: 'running' },
    ]);

    const res = await request(app).get('/api/workflows/executions/active');

    expect(res.status).toBe(200);
    expect(res.body.totalActive).toBe(2);
    expect(res.body.executions).toHaveLength(2);
  });
});

describe('POST /api/workflows/execution/stop', () => {
  it('stops most recent execution when no executionId provided', async () => {
    mockGetMostRecentExecutionId.mockReturnValue('exec-latest');
    mockStopExecution.mockResolvedValue({ wasRunning: true, wasQueued: false });

    const res = await request(app)
      .post('/api/workflows/execution/stop')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      executionId: 'exec-latest',
      wasRunning: true,
    });
  });

  it('stops specific execution by id', async () => {
    mockStopExecution.mockResolvedValue({ wasRunning: true, wasQueued: false });

    const res = await request(app)
      .post('/api/workflows/execution/stop')
      .send({ executionId: 'exec-specific' });

    expect(res.status).toBe(200);
    expect(res.body.executionId).toBe('exec-specific');
  });

  it('returns success false when no execution running', async () => {
    mockGetMostRecentExecutionId.mockReturnValue(null);

    const res = await request(app)
      .post('/api/workflows/execution/stop')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/workflows/execution/stop-all', () => {
  it('stops all executions', async () => {
    mockStopAll.mockResolvedValue({
      totalBatches: 2,
      totalStopped: 3,
      runningStopped: 2,
      queuedCancelled: 1,
      batches: [],
    });

    const res = await request(app)
      .post('/api/workflows/execution/stop-all')
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      totalBatches: 2,
      totalStopped: 3,
    });
  });
});

describe('GET /api/workflows/executions/batches', () => {
  it('returns empty batch history', async () => {
    const res = await request(app).get('/api/workflows/executions/batches');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 0, batches: [] });
  });
});

describe('DELETE /api/workflows/executions/batches/clear', () => {
  it('clears all batch history', async () => {
    const res = await request(app).delete('/api/workflows/executions/batches/clear');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      batchesDeleted: 0,
      executionsDeleted: 0,
    });
  });
});
