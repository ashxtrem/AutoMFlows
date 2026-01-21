import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { ExecuteWorkflowRequest, ExecutionStatusResponse, StopExecutionResponse, SelectorFinderEvent, SelectorOption } from '@automflows/shared';
import { Executor } from '../engine/executor';
import { SelectorSessionManager } from '../utils/selectorSessionManager';
import { FinderInjector } from '../utils/finderInjector';

let currentExecutor: Executor | null = null;

export default function workflowRoutes(io: Server) {
  const router = Router();

  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const { workflow, traceLogs = false, screenshotConfig, reportConfig, recordSession = false, breakpointConfig } = req.body as ExecuteWorkflowRequest;

      if (!workflow || !workflow.nodes || !workflow.edges) {
        return res.status(400).json({ error: 'Invalid workflow format' });
      }

      // Stop any existing execution
      if (currentExecutor) {
        await currentExecutor.stop();
      }

      // Create new executor with screenshot, report config, recording flag, and breakpoint config
      currentExecutor = new Executor(workflow, io, traceLogs, screenshotConfig, reportConfig, recordSession, breakpointConfig);
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
      pausedNodeId: currentExecutor.getPausedNodeId(),
      pauseReason: currentExecutor.getPauseReason(),
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

  router.post('/execution/continue', async (req: Request, res: Response) => {
    try {
      if (currentExecutor) {
        if (!currentExecutor.isExecutionPaused()) {
          return res.status(400).json({
            success: false,
            message: 'Execution is not paused',
          });
        }
        currentExecutor.continueExecution();
        res.json({
          success: true,
          message: 'Execution continued',
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'No execution running',
        });
      }
    } catch (error: any) {
      console.error('Continue execution error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  router.post('/execution/pause-control', async (req: Request, res: Response) => {
    try {
      const { action } = req.body as { action: 'continue' | 'stop' | 'skip' | 'continueWithoutBreakpoint' };
      
      if (!currentExecutor) {
        return res.status(400).json({
          success: false,
          message: 'No execution running',
        });
      }

      if (!currentExecutor.isExecutionPaused()) {
        return res.status(400).json({
          success: false,
          message: 'Execution is not paused',
        });
      }

      switch (action) {
        case 'continue':
          currentExecutor.continueExecution();
          res.json({
            success: true,
            message: 'Execution continued',
          });
          break;
        case 'stop':
          currentExecutor.stopExecutionFromPause();
          currentExecutor = null;
          res.json({
            success: true,
            message: 'Execution stopped',
          });
          break;
        case 'skip':
          // Skip next node execution (only valid for pre breakpoint)
          currentExecutor.skipNextNodeExecution();
          res.json({
            success: true,
            message: 'Node will be skipped',
          });
          break;
        case 'continueWithoutBreakpoint':
          // Disable breakpoint and continue
          currentExecutor.disableBreakpointAndContinue();
          res.json({
            success: true,
            message: 'Execution continued without breakpoint',
          });
          break;
        default:
          res.status(400).json({
            success: false,
            message: `Invalid action: ${action}`,
          });
      }
    } catch (error: any) {
      console.error('Pause control error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Selector Finder Routes
  router.post('/selector-finder/start', async (req: Request, res: Response) => {
    try {
      const { nodeId, fieldName } = req.body as { nodeId: string; fieldName: string };

      if (!nodeId || !fieldName) {
        return res.status(400).json({ error: 'nodeId and fieldName are required' });
      }

      const sessionManager = SelectorSessionManager.getInstance();
      sessionManager.setIO(io);
      sessionManager.setCurrentTarget(nodeId, fieldName); // Store nodeId and fieldName in session manager

      const { page, sessionId } = await sessionManager.getOrCreateSession();
      const context = page.context();

      // Bring browser window to front BEFORE injection
      await sessionManager.bringToForeground();
      
      // Inject finder if not already injected
      try {
        await FinderInjector.injectFinder(page, io, nodeId, fieldName, context);
        
        // Bring browser window to front AGAIN after injection to ensure it's visible
        await sessionManager.bringToForeground();
        
        // Wait a bit and bring to front one more time
        setTimeout(async () => {
          await sessionManager.bringToForeground();
        }, 500);
      } catch (error: any) {
        console.warn('Finder already injected or injection failed:', error.message);
      }

      // Bring browser to foreground
      await sessionManager.bringToForeground();

      const pageUrl = page.url();

      res.json({
        sessionId,
        pageUrl,
      });
    } catch (error: any) {
      console.error('Start selector finder error:', error);
      res.status(500).json({
        error: 'Failed to start selector finder',
        message: error.message,
      });
    }
  });

  router.post('/selector-finder/stop', async (req: Request, res: Response) => {
    try {
      const sessionManager = SelectorSessionManager.getInstance();
      await sessionManager.closeSession();

      res.json({
        success: true,
        message: 'Selector finder session closed',
      });
    } catch (error: any) {
      console.error('Stop selector finder error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  router.get('/selector-finder/status', async (req: Request, res: Response) => {
    try {
      const sessionManager = SelectorSessionManager.getInstance();
      const session = sessionManager.getSession();

      if (session) {
        const pageUrl = session.page.url();
        res.json({
          active: true,
          sessionId: session.sessionId,
          pageUrl,
        });
      } else {
        res.json({
          active: false,
          sessionId: null,
          pageUrl: null,
        });
      }
    } catch (error: any) {
      console.error('Get selector finder status error:', error);
      res.status(500).json({
        error: 'Failed to get selector finder status',
        message: error.message,
      });
    }
  });

  router.post('/selector-finder/selectors', async (req: Request, res: Response) => {
    try {
      const { selectors, selectedIndex, nodeId, fieldName } = req.body as {
        selectors: SelectorOption[];
        selectedIndex: number;
        nodeId: string;
        fieldName: string;
      };

      if (!selectors || selectedIndex === undefined || !nodeId || !fieldName) {
        return res.status(400).json({ error: 'selectors, selectedIndex, nodeId, and fieldName are required' });
      }

      if (selectedIndex < 0 || selectedIndex >= selectors.length) {
        return res.status(400).json({ error: 'Invalid selectedIndex' });
      }

      const selectedSelector = selectors[selectedIndex];

      // Emit Socket.IO event to frontend
      io.emit('selector-finder-event', {
        event: 'selectors-generated',
        selectors,
        nodeId,
        fieldName,
        selectedSelector,
      } as SelectorFinderEvent);

      res.json({
        success: true,
        message: 'Selector selected',
        selector: selectedSelector,
      });
    } catch (error: any) {
      console.error('Select selector error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Handle element click and selector generation
  // This will be called from the browser context via exposeFunction
  router.post('/selector-finder/generate', async (req: Request, res: Response) => {
    try {
      const { nodeId, fieldName, elementInfo } = req.body as {
        nodeId: string;
        fieldName: string;
        elementInfo: any;
      };

      const sessionManager = SelectorSessionManager.getInstance();
      const session = sessionManager.getSession();

      if (!session) {
        return res.status(400).json({ error: 'No active selector finder session' });
      }

      // Generate selectors will be handled by the exposed function in finderInjector
      // The selectors will be sent back via the exposeFunction callback
      res.json({
        success: true,
        message: 'Selector generation initiated',
      });
    } catch (error: any) {
      console.error('Generate selectors error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
}

