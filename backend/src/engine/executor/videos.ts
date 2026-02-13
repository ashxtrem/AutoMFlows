import { NodeType, Workflow } from '@automflows/shared';
import { ContextManager } from '../context';
import { PlaywrightManager } from '../../utils/playwright';
import { ExecutionTracker } from '../../utils/executionTracker';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Record videos from browser contexts
 * Videos are finalized when browser context closes
 */
export async function recordVideos(
  playwright: PlaywrightManager,
  context: ContextManager,
  executionTracker: ExecutionTracker | undefined,
  workflow: Workflow,
  traceLog: (message: string) => void
): Promise<void> {
  // Videos are only finalized when browser context closes
  // We need to close context to get video paths, but this happens before cleanup
  if (!playwright || !executionTracker) {
    return;
  }
  
  try {
    // Close all contexts from ContextManager
    const allContexts = context.getAllContexts();
    for (const [key, browserContext] of Object.entries(allContexts)) {
      try {
        const pages = browserContext.pages();
        // Close all pages first
        for (const page of pages) {
          try {
            await page.close();
          } catch (error) {
            // Page might already be closed
          }
        }
        // Close context to finalize videos
        await browserContext.close();
      } catch (error) {
        // Context might already be closed
      }
    }
    
    // Also handle the default context from PlaywrightManager for backward compatibility
    const playwrightAny = playwright as any;
    const contextInstance = playwrightAny.context;
    
    if (contextInstance) {
      const pages = contextInstance.pages();
      
      // Close all pages first
      for (const page of pages) {
        try {
          await page.close();
        } catch (error) {
          // Page might already be closed
        }
      }
      
      // Close context to finalize videos
      try {
        await contextInstance.close();
      } catch (error) {
        // Context might already be closed
      }
      
      // Wait longer for videos to be finalized (Playwright needs time to write the file)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark context as closed in playwright
      playwrightAny.context = null;
      playwrightAny.page = null;
      
      // Find the actual video file - Playwright saves videos in the videos directory
      // The video.path() might return a temp path, so we need to find the actual file
      const videosDirectory = executionTracker.getVideosDirectory();
      let finalVideoPath: string | null = null;
      
      // Look for the most recent .webm file in videos directory
      // Playwright saves videos when the context closes, so we check the directory
      if (fs.existsSync(videosDirectory)) {
        const videoFiles = fs.readdirSync(videosDirectory)
          .filter(file => file.endsWith('.webm'))
          .map(file => ({
            name: file,
            path: path.join(videosDirectory, file),
            mtime: fs.statSync(path.join(videosDirectory, file)).mtime.getTime()
          }))
          .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first
        
        if (videoFiles.length > 0) {
          // Use the most recent video file
          finalVideoPath = videoFiles[0].path;
        }
      }
      
      // Record video path - associate with OpenBrowser node if it exists
      if (finalVideoPath && fs.existsSync(finalVideoPath)) {
        const openBrowserNode = workflow.nodes.find(
          node => node.type === NodeType.OPEN_BROWSER
        );
        
        if (openBrowserNode) {
          executionTracker.recordVideo(openBrowserNode.id, finalVideoPath);
          traceLog(`[TRACE] Recorded video: ${finalVideoPath}`);
        }
      } else {
        traceLog(`[TRACE] No video file found to record`);
      }
    }
  } catch (error) {
    console.error('Error recording videos:', error);
    traceLog(`[TRACE] Error recording videos: ${error}`);
  }
}
