declare module 'oracledb' {
  export interface PoolAttributes {
    user?: string;
    password?: string;
    connectString?: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
    close(grace?: number): Promise<void>;
  }

  export interface Connection {
    execute(sql: string, params?: any[] | object, options?: object): Promise<ExecuteResult>;
    close(): Promise<void>;
  }

  export interface ExecuteResult {
    rows?: any[];
    metaData?: Array<{ name: string }>;
  }

  export const OUT_FORMAT_OBJECT: number;

  export function createPool(poolAttrs: PoolAttributes): Promise<Pool>;
}
