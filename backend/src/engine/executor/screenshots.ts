import { PlaywrightManager } from '../../utils/playwright';
import { ContextManager } from '../context';
import { ExecutionTracker } from '../../utils/executionTracker';

/**
 * Take a screenshot for a node at a specific timing
 */
export async function takeNodeScreenshot(
  nodeId: string,
  timing: 'pre' | 'post',
  context: ContextManager,
  playwright: PlaywrightManager,
  executionTracker?: ExecutionTracker
): Promise<void> {
  try {
    const page = context.getPage();
    if (!page) {
      return; // No page available, skip screenshot
    }

    const fileName = `${nodeId}-${timing}-${Date.now()}.png`;
    const screenshotPath = await playwright.takeScreenshot(fileName, false);
    
    // Record screenshot in tracker
    if (executionTracker) {
      executionTracker.recordScreenshot(nodeId, screenshotPath, timing);
    }
  } catch (error: any) {
    // Don't fail execution if screenshot fails
    console.warn(`Failed to take ${timing} screenshot for node ${nodeId}: ${error.message}`);
  }
}
