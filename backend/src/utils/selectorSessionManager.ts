import { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import { Server } from 'socket.io';

/**
 * Singleton manager for persistent browser session used for selector finding
 */
export class SelectorSessionManager {
  private static instance: SelectorSessionManager | null = null;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private sessionId: string | null = null;
  private io: Server | null = null;
  private currentNodeId: string | null = null;
  private currentFieldName: string | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): SelectorSessionManager {
    if (!SelectorSessionManager.instance) {
      SelectorSessionManager.instance = new SelectorSessionManager();
    }
    return SelectorSessionManager.instance;
  }

  /**
   * Set Socket.IO server instance for emitting events
   */
  setIO(io: Server): void {
    this.io = io;
  }

  /**
   * Set current node ID and field name for selector generation
   */
  setCurrentTarget(nodeId: string, fieldName: string): void {
    this.currentNodeId = nodeId;
    this.currentFieldName = fieldName;
  }

  /**
   * Get current node ID and field name
   */
  getCurrentTarget(): { nodeId: string | null; fieldName: string | null } {
    return {
      nodeId: this.currentNodeId,
      fieldName: this.currentFieldName,
    };
  }

  /**
   * Get or create a browser session
   */
  async getOrCreateSession(): Promise<{ page: Page; sessionId: string }> {
    if (this.page && !this.page.isClosed()) {
      // Session exists, bring to foreground
      await this.bringToForeground();
      return { page: this.page, sessionId: this.sessionId! };
    }

    // Create new session
    try {
      this.browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
      });

      this.page = await this.context.newPage();
      
      // Ensure page is visible and focused immediately
      await this.page.bringToFront();
      try {
        await this.page.evaluate(() => {
          window.focus();
        });
      } catch (e) {
        // Ignore focus errors
      }
      
      this.sessionId = `selector-finder-${Date.now()}`;

      // Emit session started event
      if (this.io) {
        this.io.emit('selector-finder-event', {
          event: 'session-started',
          sessionId: this.sessionId,
        });
      }

      return { page: this.page, sessionId: this.sessionId };
    } catch (error: any) {
      throw new Error(`Failed to create selector finder session: ${error.message}`);
    }
  }

  /**
   * Bring browser window to foreground
   */
  async bringToForeground(): Promise<void> {
    if (!this.page || this.page.isClosed()) {
      return;
    }
    
    // Ensure browser window is visible and focused - try multiple times
    try {
      // Bring page to front
      await this.page.bringToFront();
      
      // Try to focus the page
      await this.page.evaluate(() => {
        window.focus();
        if (document.hasFocus && !document.hasFocus()) {
          // Try to focus again
          window.focus();
        }
      });
      
      // Small delay to ensure window is brought to front
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Bring to front again after delay
      await this.page.bringToFront();
    } catch (error: any) {
      console.warn(`Failed to bring browser to foreground: ${error.message}`);
    }
  }

  /**
   * Get current session
   */
  getSession(): { page: Page; sessionId: string } | null {
    if (this.page && !this.page.isClosed()) {
      return { page: this.page, sessionId: this.sessionId! };
    }
    return null;
  }

  /**
   * Close session
   */
  async closeSession(): Promise<void> {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }

      // Emit session closed event
      if (this.io) {
        this.io.emit('selector-finder-event', {
          event: 'session-closed',
          sessionId: this.sessionId,
        });
      }

      this.page = null;
      this.context = null;
      this.browser = null;
      this.sessionId = null;
    } catch (error: any) {
      console.error(`Error closing selector finder session: ${error.message}`);
    }
  }

  /**
   * Check if session exists and is active
   */
  isSessionActive(): boolean {
    return this.page !== null && !this.page.isClosed();
  }
}
