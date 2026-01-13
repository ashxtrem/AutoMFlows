import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { ExecuteWorkflowRequest, ExecutionStatusResponse, StopExecutionResponse } from '@automflows/shared';
import { Executor } from '../engine/executor';

let currentExecutor: Executor | null = null;

export default function workflowRoutes(io: Server) {
  const router = Router();

  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const { workflow, traceLogs = false, screenshotConfig, reportConfig, recordSession = false } = req.body as ExecuteWorkflowRequest;

      if (!workflow || !workflow.nodes || !workflow.edges) {
        return res.status(400).json({ error: 'Invalid workflow format' });
      }

      // Stop any existing execution
      if (currentExecutor) {
        await currentExecutor.stop();
      }

      // Create new executor with screenshot, report config, and recording flag
      currentExecutor = new Executor(workflow, io, traceLogs, screenshotConfig, reportConfig, recordSession);
      const executionId = currentExecutor.getExecutionId();

      // Start execution asynchronously
      currentExecutor.execute().catch((error) => {
        console.error('Execution error:', error);
      });

      res.json({
        executionId,
        status: 'running',
      });
    } catch (error: any) {
      console.error('Execute workflow error:', error);
      res.status(500).json({
        error: 'Failed to execute workflow',
        message: error.message,
      });
    }
  });

  router.get('/execution/status', (req: Request, res: Response) => {
    if (!currentExecutor) {
      return res.json({
        executionId: '',
        status: 'idle',
      } as ExecutionStatusResponse);
    }

    res.json({
      executionId: currentExecutor.getExecutionId(),
      status: currentExecutor.getStatus(),
      currentNodeId: currentExecutor.getCurrentNodeId(),
      error: currentExecutor.getError(),
    } as ExecutionStatusResponse);
  });

  router.post('/execution/stop', async (req: Request, res: Response) => {
    try {
      if (currentExecutor) {
        await currentExecutor.stop();
        currentExecutor = null;
        res.json({
          success: true,
          message: 'Execution stopped',
        } as StopExecutionResponse);
      } else {
        res.json({
          success: false,
          message: 'No execution running',
        } as StopExecutionResponse);
      }
    } catch (error: any) {
      console.error('Stop execution error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      } as StopExecutionResponse);
    }
  });

  return router;
}

