import { ExecutionContext } from '@automflows/shared';
import { BrowserContext } from 'playwright';

export class ContextManager {
  private context: ExecutionContext;
  private dbConnections: Map<string, any> = new Map(); // Store database connections
  private contexts: Map<string, BrowserContext> = new Map(); // Store multiple browser contexts
  private currentContextKey: string | null = null; // Track active context

  constructor() {
    this.context = {
      data: {},
      variables: {},
    };
  }

  setPage(page: any): void {
    this.context.page = page;
    // If page is set, ensure its context is tracked
    if (page && page.context) {
      const browserContext = page.context();
      if (browserContext && !this.currentContextKey) {
        // Set default context if not already set
        this.setContext('default', browserContext);
        this.setCurrentContextKey('default');
      }
    }
  }

  getPage(): any {
    // If we have a current context key, try to get page from that context
    if (this.currentContextKey) {
      const browserContext = this.contexts.get(this.currentContextKey);
      if (browserContext) {
        const pages = browserContext.pages();
        if (pages.length > 0) {
          return pages[0]; // Return first page from current context
        }
      }
    }
    // Fallback to stored page
    return this.context.page;
  }

  setBrowser(browser: any): void {
    this.context.browser = browser;
  }

  getBrowser(): any {
    return this.context.browser;
  }

  setData(key: string, value: any): void {
    this.context.data[key] = value;
  }

  getData(key: string): any {
    return this.context.data[key];
  }

  getAllData(): Record<string, any> {
    return { ...this.context.data };
  }

  setVariable(key: string, value: any): void {
    this.context.variables[key] = value;
  }

  getVariable(key: string): any {
    return this.context.variables[key];
  }

  getAllVariables(): Record<string, any> {
    return { ...this.context.variables };
  }

  getContext(): ExecutionContext {
    return {
      ...this.context,
      data: { ...this.context.data },
      variables: { ...this.context.variables },
    };
  }

  setDbConnection(key: string, connection: any): void {
    this.dbConnections.set(key, connection);
  }

  getDbConnection(key: string): any {
    return this.dbConnections.get(key);
  }

  removeDbConnection(key: string): void {
    this.dbConnections.delete(key);
  }

  getAllDbConnections(): Record<string, any> {
    const result: Record<string, any> = {};
    this.dbConnections.forEach((connection, key) => {
      result[key] = connection;
    });
    return result;
  }

  async closeAllDbConnections(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    
    // Close all stored DbClient instances first (they manage the actual connections)
    const contextAny = this as any;
    for (const key of Object.keys(contextAny)) {
      if (key.startsWith('_dbClient_')) {
        const dbClient = contextAny[key];
        if (dbClient && typeof dbClient.disconnect === 'function') {
          closePromises.push(
            dbClient.disconnect().catch((error: any) => {
              console.warn(`[ContextManager] Error closing DbClient ${key}: ${error.message}`);
            })
          );
        }
        delete contextAny[key];
      }
    }
    
    // Also close connections directly if they exist
    for (const [key, connection] of this.dbConnections.entries()) {
      try {
        if (connection && typeof connection.end === 'function') {
          // PostgreSQL Pool or MySQL Pool
          closePromises.push(Promise.resolve(connection.end()));
        } else if (connection && typeof connection.close === 'function') {
          // MongoDB Client or SQLite Database
          closePromises.push(Promise.resolve(connection.close()));
        }
      } catch (error: any) {
        console.warn(`[ContextManager] Error closing database connection ${key}: ${error.message}`);
      }
    }
    
    await Promise.all(closePromises);
    this.dbConnections.clear();
  }

  // Browser Context Management Methods
  setContext(key: string, browserContext: BrowserContext): void {
    this.contexts.set(key, browserContext);
  }

  getBrowserContext(key?: string): BrowserContext | null {
    const contextKey = key || this.currentContextKey;
    if (!contextKey) {
      return null;
    }
    return this.contexts.get(contextKey) || null;
  }

  getAllContexts(): Record<string, BrowserContext> {
    const result: Record<string, BrowserContext> = {};
    this.contexts.forEach((context, key) => {
      result[key] = context;
    });
    return result;
  }

  removeContext(key: string): void {
    this.contexts.delete(key);
    if (this.currentContextKey === key) {
      this.currentContextKey = null;
    }
  }

  setCurrentContextKey(key: string): void {
    if (!this.contexts.has(key)) {
      throw new Error(`Context with key "${key}" does not exist`);
    }
    this.currentContextKey = key;
    // Update page reference to first page of new context
    const browserContext = this.contexts.get(key);
    if (browserContext) {
      const pages = browserContext.pages();
      if (pages.length > 0) {
        this.context.page = pages[0];
      }
    }
  }

  getCurrentContextKey(): string | null {
    return this.currentContextKey;
  }

  reset(): void {
    // Close all database connections before resetting
    this.closeAllDbConnections().catch((error) => {
      console.warn(`[ContextManager] Error closing database connections during reset: ${error.message}`);
    });
    
    // Clear browser contexts
    this.contexts.clear();
    this.currentContextKey = null;
    
    this.context = {
      data: {},
      variables: {},
    };
  }
}

