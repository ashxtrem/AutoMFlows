import { ExecutionContext } from '@automflows/shared';

export class ContextManager {
  private context: ExecutionContext;
  private dbConnections: Map<string, any> = new Map(); // Store database connections

  constructor() {
    this.context = {
      data: {},
      variables: {},
    };
  }

  setPage(page: any): void {
    this.context.page = page;
  }

  getPage(): any {
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

  reset(): void {
    // Close all database connections before resetting
    this.closeAllDbConnections().catch((error) => {
      console.warn(`[ContextManager] Error closing database connections during reset: ${error.message}`);
    });
    
    this.context = {
      data: {},
      variables: {},
    };
  }
}

