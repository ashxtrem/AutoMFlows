declare module 'mssql' {
  export interface config {
    server?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    options?: { encrypt?: boolean; trustServerCertificate?: boolean };
    pool?: { max?: number; min?: number; idleTimeoutMillis?: number };
  }

  export interface ConnectionPool {
    request(): Request;
    close(): Promise<void>;
  }

  export interface Request {
    input(name: string, value: any): Request;
    query(command: string): Promise<QueryResult>;
  }

  export interface QueryResult {
    recordset?: any[];
  }

  export function connect(config: config): Promise<ConnectionPool>;
}
