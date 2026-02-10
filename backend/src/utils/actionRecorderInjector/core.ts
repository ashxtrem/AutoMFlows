import { Page } from 'playwright';
import { Server } from 'socket.io';
import { RecordedAction } from '@automflows/shared';
import { ActionRecorderSessionManager } from '../actionRecorderSessionManager';
import { injectFinderLibrary } from './finder';
import { getOverlayScript } from './overlay';
import { getWebhookListenersScript } from './webhooks';
import './types'; // Import types to register global Window interface

/**
 * Injects action recorder overlay and webhook listeners into browser pages
 */
export class ActionRecorderInjector {
  /**
   * Inject capture icon overlay and webhook setup into a page
   */
  static async injectActionRecorderOverlay(page: Page, io: Server): Promise<void> {
    const sessionManager = ActionRecorderSessionManager.getInstance();
    
    // Inject finder library first
    await injectFinderLibrary(page);
    
    // Expose function for page to call to send actions (wrap in try-catch to handle already registered)
    try {
      await page.exposeFunction('__sendActionToBackend', (action: RecordedAction) => {
        sessionManager.addAction(action);
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    // Expose functions for overlay to call to start/stop webhook
    try {
      await page.exposeFunction('__startWebhookFromPage', async () => {
        // Activate webhook listeners
        await page.evaluate(() => {
          if (window.__startActionRecording) {
            window.__startActionRecording();
          }
        });
        sessionManager.startRecording();
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    try {
      await page.exposeFunction('__stopWebhookFromPage', async () => {
        await page.evaluate(() => {
          if (window.__stopActionRecording) {
            window.__stopActionRecording();
          }
        });
        sessionManager.stopRecording('user');
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    const overlayScript = getOverlayScript();
    
    await page.addInitScript(overlayScript);
    
    // Also inject directly into current page
    try {
      // Check if already injected before evaluating
      const alreadyInjected = await page.evaluate(() => {
        return !!window.__actionRecorderInjected;
      });
      
      // If not already injected, evaluate the script
      if (!alreadyInjected) {
        await page.evaluate(overlayScript);
        
        // Verify overlay was created
        const overlayExists = await page.evaluate(() => {
          return !!document.getElementById('automflows-action-recorder-overlay');
        });
      } else {
        // Already injected - check if overlay exists
        const overlayExists = await page.evaluate(() => {
          return !!document.getElementById('automflows-action-recorder-overlay');
        });
        
        // If overlay doesn't exist, force recreate it
        if (!overlayExists) {
          // Reset flag and re-evaluate
          await page.evaluate(() => {
            window.__actionRecorderInjected = false;
          });
          await page.evaluate(overlayScript);
        }
      }
    } catch (error: any) {
      console.warn('Failed to inject overlay directly:', error.message);
    }
  }

  /**
   * Start webhook listening for actions
   */
  static async startWebhookListening(page: Page, io: Server): Promise<void> {
    const sessionManager = ActionRecorderSessionManager.getInstance();
    
    // Inject finder library if not already injected
    await injectFinderLibrary(page);
    
    // Expose function for page to call to send actions (wrap in try-catch to handle already registered)
    try {
      await page.exposeFunction('__sendActionToBackend', (action: RecordedAction) => {
        sessionManager.addAction(action);
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    // Expose functions for overlay to call to start/stop webhook
    try {
      await page.exposeFunction('__startWebhookFromPage', async () => {
        // Webhook listeners are already set up, just need to activate them
        await page.evaluate(() => {
          if (window.__startActionRecording) {
            window.__startActionRecording();
          }
        });
        sessionManager.startRecording();
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    try {
      await page.exposeFunction('__stopWebhookFromPage', async () => {
        await page.evaluate(() => {
          if (window.__stopActionRecording) {
            window.__stopActionRecording();
          }
        });
        sessionManager.stopRecording('user');
      });
    } catch (error: any) {
      // Function already exposed, ignore
      if (!error.message?.includes('already registered')) {
        throw error;
      }
    }
    
    const webhookScript = getWebhookListenersScript();
    
    await page.evaluate(webhookScript);
    
    // Update overlay to show recording started
    await page.evaluate(() => {
      if (window.__startActionRecording) {
        window.__startActionRecording();
      }
    });
  }

  /**
   * Stop webhook listening
   */
  static async stopWebhookListening(page: Page): Promise<void> {
    await page.evaluate(() => {
      window.__actionRecorderActive = false;
      window.__webhookListenersActive = false;
      if (window.__stopActionRecording) {
        window.__stopActionRecording();
      }
    });
  }
}
