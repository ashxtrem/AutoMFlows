import { BaseNode, NodeType, OpenBrowserNodeData, NavigateNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { PlaywrightManager } from '../utils/playwright';

export class OpenBrowserHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as OpenBrowserNodeData;
    const playwright = (context as any).playwright as PlaywrightManager;

    if (!playwright) {
      throw new Error('Playwright manager not found in context');
    }

    const headless = data.headless !== false; // Default to headless
    const viewport = data.viewportWidth && data.viewportHeight
      ? { width: data.viewportWidth, height: data.viewportHeight }
      : undefined;
    const userAgent = data.userAgent;
    const browserType = data.browser || 'chromium';
    const maxWindow = data.maxWindow !== false; // Default to true
    const capabilities = data.capabilities || {};
    const launchOptions = data.launchOptions || {};
    const stealthMode = data.stealthMode || false;

    try {
      const page = await playwright.launch(
        headless,
        viewport,
        userAgent,
        browserType,
        maxWindow,
        capabilities,
        stealthMode,
        launchOptions
      );

      context.setPage(page);
    } catch (error: any) {
      // Re-throw with browser installation info if it's a browser installation error
      if (error.message.includes('is not installed')) {
        throw error;
      }
      throw error;
    }
  }
}

export class NavigateHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as NavigateNodeData;
    const page = context.getPage();

    if (!page) {
      throw new Error('No page available. Ensure Open Browser node is executed first.');
    }

    if (!data.url) {
      throw new Error('URL is required for Navigate node');
    }

    // Normalize URL - add https:// if no protocol is specified
    let url = data.url.trim();
    if (!url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }

    // Prepare navigation options
    const timeout = data.timeout || 30000;
    const waitUntil = data.waitUntil || 'networkidle';
    const gotoOptions: any = {
      waitUntil,
      timeout,
    };

    if (data.referer) {
      gotoOptions.referer = data.referer;
    }

    // Execute navigation with optional fail silently
    try {
      await page.goto(url, gotoOptions);
    } catch (error: any) {
      if (data.failSilently) {
        // Log error but don't throw - allow execution to continue
        console.warn(`Navigation failed silently for ${url}: ${error.message}`);
        return;
      }
      // Re-throw error if fail silently is not enabled
      throw error;
    }
  }
}

