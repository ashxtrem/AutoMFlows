import { Page, BrowserContext } from 'playwright';
import { Server } from 'socket.io';
import { RecordedAction } from '@automflows/shared';

/**
 * Singleton manager for builder mode action recording session
 */
export class ActionRecorderSessionManager {
  private static instance: ActionRecorderSessionManager | null = null;
  private page: Page | null = null;
  private context: BrowserContext | null = null;
  private sessionId: string | null = null;
  private io: Server | null = null;
  private recording: boolean = false;
  private actions: RecordedAction[] = [];
  private executionId: string | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): ActionRecorderSessionManager {
    if (!ActionRecorderSessionManager.instance) {
      ActionRecorderSessionManager.instance = new ActionRecorderSessionManager();
    }
    return ActionRecorderSessionManager.instance;
  }

  /**
   * Set Socket.IO server instance for emitting events
   */
  setIO(io: Server): void {
    this.io = io;
  }

  /**
   * Set page from workflow execution
   */
  setPageFromExecution(page: Page, context: BrowserContext, executionId: string): void {
    this.page = page;
    this.context = context;
    this.executionId = executionId;
    this.sessionId = `builder-mode-${Date.now()}`;
  }

  /**
   * Get current page
   */
  getPage(): Page | null {
    return this.page && !this.page.isClosed() ? this.page : null;
  }

  /**
   * Get current context
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.page !== null && !this.page.isClosed();
  }

  /**
   * Check if recording is active
   */
  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Start recording
   */
  startRecording(): void {
    if (!this.isSessionActive()) {
      throw new Error('No active session for recording');
    }
    this.recording = true;
    
    if (this.io) {
      this.io.emit('builder-mode-event', {
        event: 'recording-started',
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Stop recording
   */
  stopRecording(reason: 'user' | 'execution-stopped' | 'builder-mode-disabled' | 'workflow-rerun' | 'browser-closed' = 'user'): void {
    this.recording = false;
    
    if (this.io) {
      this.io.emit('builder-mode-event', {
        event: 'recording-stopped',
        sessionId: this.sessionId,
        reason,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Add recorded action
   */
  addAction(action: RecordedAction): void {
    this.actions.push(action);
    
    if (this.io) {
      this.io.emit('builder-mode-event', {
        event: 'action-recorded',
        action,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get all recorded actions
   */
  getActions(): RecordedAction[] {
    return [...this.actions];
  }

  /**
   * Reset actions
   */
  resetActions(): void {
    this.actions = [];
    
    if (this.io) {
      this.io.emit('builder-mode-event', {
        event: 'actions-reset',
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Clear session (but keep actions in memory for frontend localStorage)
   */
  clearSession(): void {
    // Don't close page/context - they're managed by executor
    this.page = null;
    this.context = null;
    this.sessionId = null;
    this.executionId = null;
    this.recording = false;
    // Keep actions - they're persisted in frontend localStorage
  }

  /**
   * Reset everything (for workflow rerun)
   */
  reset(): void {
    this.resetActions();
    this.clearSession();
  }
}
