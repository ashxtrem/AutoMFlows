import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { ExecuteWorkflowRequest, ExecutionStatusResponse, StopExecutionResponse, SelectorFinderEvent, SelectorOption, RecordedAction } from '@automflows/shared';
import { Executor } from '../engine/executor';
import { SelectorSessionManager } from '../utils/selectorSessionManager';
import { FinderInjector } from '../utils/finderInjector';
import { ActionRecorderSessionManager } from '../utils/actionRecorderSessionManager';
import { ActionRecorderInjector } from '../utils/actionRecorderInjector';

let currentExecutor: Executor | null = null;

export default function workflowRoutes(io: Server) {
  const router = Router();

  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const { workflow, traceLogs = false, screenshotConfig, reportConfig, recordSession = false, breakpointConfig, builderModeEnabled = false } = req.body as ExecuteWorkflowRequest;

      if (!workflow || !workflow.nodes || !workflow.edges) {
        return res.status(400).json({ error: 'Invalid workflow format' });
      }

      // Stop any existing execution
      if (currentExecutor) {
        await currentExecutor.stop();
      }

      // Create new executor with screenshot, report config, recording flag, breakpoint config, and builder mode
      currentExecutor = new Executor(workflow, io, traceLogs, screenshotConfig, reportConfig, recordSession, breakpointConfig, builderModeEnabled);
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

  router.post('/execution/update-workflow', async (req: Request, res: Response) => {
    try {
      const { workflow } = req.body as { workflow: any };

      if (!workflow || !workflow.nodes || !workflow.edges) {
        return res.status(400).json({
          success: false,
          message: 'Invalid workflow format',
        });
      }

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

      // Check pause reason is breakpoint (not wait-pause)
      const pauseReason = currentExecutor.getPauseReason();
      if (pauseReason !== 'breakpoint') {
        return res.status(400).json({
          success: false,
          message: 'Workflow updates are only allowed during breakpoint pauses, not wait-pause',
          code: 'WAIT_PAUSE_NOT_ALLOWED',
        });
      }

      // Update workflow in executor
      try {
        currentExecutor.updateWorkflow(workflow);
        
        // Get updated execution state
        const executedNodeIds = currentExecutor.getExecutedNodeIds();
        const currentExecutionOrder = currentExecutor.getCurrentExecutionOrder();

        res.json({
          success: true,
          message: 'Workflow updated successfully',
          executionOrder: currentExecutionOrder,
          executedNodes: executedNodeIds,
        });
      } catch (error: any) {
        console.error('Update workflow error:', error);
        res.status(400).json({
          success: false,
          message: error.message || 'Failed to update workflow',
        });
      }
    } catch (error: any) {
      console.error('Update workflow error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update workflow',
      });
    }
  });

  // Capture DOM at current breakpoint
  router.post('/execution/capture-dom', async (req: Request, res: Response) => {
    try {
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

      // Get page from executor context
      const page = (currentExecutor as any).context?.getPage();
      if (!page || page.isClosed()) {
        return res.status(400).json({
          success: false,
          message: 'No active page available',
        });
      }

      // Import PageDebugHelper
      const { PageDebugHelper } = await import('../utils/pageDebugHelper');
      
      // Capture debug info
      const debugInfo = await PageDebugHelper.captureDebugInfo(page);

      res.json({
        success: true,
        debugInfo,
      });
    } catch (error: any) {
      console.error('Capture DOM error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to capture DOM',
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

      // Check if there's a paused execution with an active browser
      if (currentExecutor && currentExecutor.isExecutionPaused()) {
        // Use context to get page instead of accessing private playwright property
        const page = (currentExecutor as any).context?.getPage();
        
        if (page && !page.isClosed()) {
          const sessionManager = SelectorSessionManager.getInstance();
          sessionManager.setIO(io);
          sessionManager.setCurrentTarget(nodeId, fieldName);
          
          // Attach to existing page
          const executionId = currentExecutor.getExecutionId();
          sessionManager.attachToExistingPage(page, `execution-${executionId}`);
          
          // Refresh the page with timeout and more lenient wait condition
          // Use 'load' instead of 'networkidle' to avoid timeout on pages with continuous network activity
          // 'networkidle' waits for network to be idle for 500ms, which can timeout on pages with continuous requests
          try {
            await page.reload({ 
              waitUntil: 'load', 
              timeout: 30000 
            });
          } catch (error: any) {
            // If reload times out, try with domcontentloaded as fallback (faster, less strict)
            if (error.message && (error.message.includes('timeout') || error.message.includes('Timeout'))) {
              console.warn('Page reload with "load" timed out, trying "domcontentloaded"');
              try {
                await page.reload({ 
                  waitUntil: 'domcontentloaded', 
                  timeout: 15000 
                });
              } catch (fallbackError: any) {
                console.warn('Page reload failed, continuing anyway - page may still be usable:', fallbackError.message);
                // Continue even if reload fails - page might still be usable for selector finder
              }
            } else {
              // Re-throw if it's not a timeout error
              throw error;
            }
          }
          
          // Bring browser to foreground
          await page.bringToFront();
          
          // Inject finder overlay
          const context = page.context();
          await FinderInjector.injectFinder(page, io, nodeId, fieldName, context);
          
          // Bring to foreground again after injection
          await page.bringToFront();
          
          return res.json({
            sessionId: `execution-${executionId}`,
            pageUrl: page.url(),
          });
        }
      }
      
      // Fallback to current behavior: create new session
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

  // Builder Mode Routes
  router.post('/builder-mode/start', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      sessionManager.setIO(io);
      
      const page = sessionManager.getPage();
      
      if (!page) {
        return res.status(400).json({ error: 'No active browser session for builder mode' });
      }

      // Inject overlay
      await ActionRecorderInjector.injectActionRecorderOverlay(page, io);

      const sessionId = sessionManager.getSessionId();
      const pageUrl = page.url();

      res.json({
        sessionId,
        pageUrl,
      });
    } catch (error: any) {
      console.error('Start builder mode error:', error);
      res.status(500).json({
        error: 'Failed to start builder mode',
        message: error.message,
      });
    }
  });

  router.post('/builder-mode/stop', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      const page = sessionManager.getPage();
      
      if (page) {
        await ActionRecorderInjector.stopWebhookListening(page);
      }
      
      sessionManager.stopRecording('user');

      res.json({
        success: true,
        message: 'Builder mode stopped',
      });
    } catch (error: any) {
      console.error('Stop builder mode error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  router.get('/builder-mode/status', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      const page = sessionManager.getPage();

      if (page && sessionManager.isSessionActive()) {
        const pageUrl = page.url();
        res.json({
          active: true,
          recording: sessionManager.isRecording(),
          sessionId: sessionManager.getSessionId(),
          pageUrl,
        });
      } else {
        res.json({
          active: false,
          recording: false,
          sessionId: null,
          pageUrl: null,
        });
      }
    } catch (error: any) {
      console.error('Get builder mode status error:', error);
      res.status(500).json({
        error: 'Failed to get builder mode status',
        message: error.message,
      });
    }
  });

  router.get('/builder-mode/actions', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      const actions = sessionManager.getActions();

      res.json(actions);
    } catch (error: any) {
      console.error('Get builder mode actions error:', error);
      res.status(500).json({
        error: 'Failed to get builder mode actions',
        message: error.message,
      });
    }
  });

  router.post('/builder-mode/actions/reset', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      sessionManager.resetActions();

      res.json({
        success: true,
        message: 'Actions reset',
      });
    } catch (error: any) {
      console.error('Reset builder mode actions error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  router.post('/builder-mode/webhook/start', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      sessionManager.setIO(io);
      
      const page = sessionManager.getPage();
      if (!page) {
        return res.status(400).json({ error: 'No active browser session for builder mode' });
      }

      // Start webhook listening
      await ActionRecorderInjector.startWebhookListening(page, io);
      sessionManager.startRecording();

      const sessionId = sessionManager.getSessionId();
      const pageUrl = page.url();

      res.json({
        sessionId,
        pageUrl,
      });
    } catch (error: any) {
      console.error('Start webhook listening error:', error);
      res.status(500).json({
        error: 'Failed to start webhook listening',
        message: error.message,
      });
    }
  });

  router.post('/builder-mode/webhook/stop', async (req: Request, res: Response) => {
    try {
      const sessionManager = ActionRecorderSessionManager.getInstance();
      const page = sessionManager.getPage();
      
      if (page) {
        await ActionRecorderInjector.stopWebhookListening(page);
      }
      
      sessionManager.stopRecording('user');

      res.json({
        success: true,
        message: 'Webhook listening stopped',
      });
    } catch (error: any) {
      console.error('Stop webhook listening error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
}

