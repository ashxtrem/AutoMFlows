import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient, Db as MongoDb } from 'mongodb';
import Database from 'better-sqlite3';

export type DbType = 'postgres' | 'mysql' | 'mongodb' | 'sqlite';

export interface DbConfig {
  dbType: DbType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionString?: string; // For MongoDB or PostgreSQL connection strings
  filePath?: string; // For SQLite
  options?: Record<string, any>; // Database-specific options
}

export interface QueryResult {
  rows?: any[];
  rowCount?: number;
  columns?: string[];
  duration: number;
  timestamp: number;
}

export class DbClient {
  private dbType: DbType;
  private pgPool?: PgPool;
  private mysqlPool?: mysql.Pool;
  private mongoClient?: MongoClient;
  private mongoDb?: MongoDb;
  private sqliteDb?: Database.Database;

  constructor(config: DbConfig) {
    this.dbType = config.dbType;
  }

  async connect(config: DbConfig): Promise<void> {
    const startTime = Date.now();

    try {
      switch (this.dbType) {
        case 'postgres':
          await this.connectPostgres(config);
          break;
        case 'mysql':
          await this.connectMySQL(config);
          break;
        case 'mongodb':
          await this.connectMongoDB(config);
          break;
        case 'sqlite':
          await this.connectSQLite(config);
          break;
        default:
          throw new Error(`Unsupported database type: ${this.dbType}`);
      }

      const duration = Date.now() - startTime;
      console.log(`[DbClient] Connected to ${this.dbType} database in ${duration}ms`);
    } catch (error: any) {
      throw new Error(`Failed to connect to ${this.dbType} database: ${error.message}`);
    }
  }

  private async connectPostgres(config: DbConfig): Promise<void> {
    const poolConfig: any = {
      max: config.options?.maxConnections || 10,
      idleTimeoutMillis: config.options?.idleTimeout || 30000,
      connectionTimeoutMillis: config.options?.connectionTimeout || 10000,
    };

    if (config.connectionString) {
      poolConfig.connectionString = config.connectionString;
    } else {
      poolConfig.host = config.host || 'localhost';
      poolConfig.port = config.port || 5432;
      poolConfig.user = config.user;
      poolConfig.password = config.password;
      poolConfig.database = config.database;
    }

    // Add SSL options if provided
    if (config.options?.ssl) {
      poolConfig.ssl = config.options.ssl;
    }

    this.pgPool = new PgPool(poolConfig);

    // Test connection
    const client = await this.pgPool.connect();
    client.release();
  }

  private async connectMySQL(config: DbConfig): Promise<void> {
    const poolConfig: any = {
      host: config.host || 'localhost',
      port: config.port || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: config.options?.maxConnections || 10,
      queueLimit: 0,
      idleTimeout: config.options?.idleTimeout || 30000,
    };

    // Add SSL options if provided
    if (config.options?.ssl) {
      poolConfig.ssl = config.options.ssl;
    }

    this.mysqlPool = mysql.createPool(poolConfig);

    // Test connection
    const connection = await this.mysqlPool.getConnection();
    connection.release();
  }

  private async connectMongoDB(config: DbConfig): Promise<void> {
    let connectionString: string;

    if (config.connectionString) {
      connectionString = config.connectionString;
    } else {
      const host = config.host || 'localhost';
      const port = config.port || 27017;
      const user = config.user ? encodeURIComponent(config.user) : '';
      const password = config.password ? encodeURIComponent(config.password) : '';
      const auth = user && password ? `${user}:${password}@` : '';
      connectionString = `mongodb://${auth}${host}:${port}`;
    }

    const clientOptions: any = {
      maxPoolSize: config.options?.maxConnections || 10,
    };

    this.mongoClient = new MongoClient(connectionString, clientOptions);
    await this.mongoClient.connect();

    if (config.database) {
      this.mongoDb = this.mongoClient.db(config.database);
    } else {
      // Extract database name from connection string if available
      const dbMatch = connectionString.match(/\/\/(?:[^@]+@)?[^\/]+\/([^?]+)/);
      if (dbMatch && dbMatch[1]) {
        this.mongoDb = this.mongoClient.db(dbMatch[1]);
      } else {
        this.mongoDb = this.mongoClient.db('test');
      }
    }
  }

  private async connectSQLite(config: DbConfig): Promise<void> {
    if (!config.filePath) {
      throw new Error('SQLite requires filePath to be specified');
    }

    const options: Database.Options = {};
    if (config.options?.readonly) {
      options.readonly = true;
    }

    this.sqliteDb = new Database(config.filePath, options);
  }

  async disconnect(): Promise<void> {
    try {
      switch (this.dbType) {
        case 'postgres':
          if (this.pgPool) {
            await this.pgPool.end();
            this.pgPool = undefined;
          }
          break;
        case 'mysql':
          if (this.mysqlPool) {
            await this.mysqlPool.end();
            this.mysqlPool = undefined;
          }
          break;
        case 'mongodb':
          if (this.mongoClient) {
            await this.mongoClient.close();
            this.mongoClient = undefined;
            this.mongoDb = undefined;
          }
          break;
        case 'sqlite':
          if (this.sqliteDb) {
            this.sqliteDb.close();
            this.sqliteDb = undefined;
          }
          break;
      }
      console.log(`[DbClient] Disconnected from ${this.dbType} database`);
    } catch (error: any) {
      console.warn(`[DbClient] Error disconnecting from ${this.dbType} database: ${error.message}`);
      throw error;
    }
  }

  async executeQuery(query: string | Record<string, any>, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    let result: QueryResult;

    try {
      switch (this.dbType) {
        case 'postgres':
          result = await this.executePostgresQuery(query as string, params);
          break;
        case 'mysql':
          result = await this.executeMySQLQuery(query as string, params);
          break;
        case 'mongodb':
          result = await this.executeMongoDBQuery(query as Record<string, any>);
          break;
        case 'sqlite':
          result = await this.executeSQLiteQuery(query as string, params);
          break;
        default:
          throw new Error(`Unsupported database type: ${this.dbType}`);
      }

      result.duration = Date.now() - startTime;
      result.timestamp = Date.now();
      return result;
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  private async executePostgresQuery(query: string, params?: any[]): Promise<QueryResult> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL connection not established');
    }

    const result = await this.pgPool.query(query, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? undefined,
      columns: result.fields?.map(f => f.name) || [],
      duration: 0, // Will be set by caller
      timestamp: 0, // Will be set by caller
    };
  }

  private async executeMySQLQuery(query: string, params?: any[]): Promise<QueryResult> {
    if (!this.mysqlPool) {
      throw new Error('MySQL connection not established');
    }

    const [rows, fields] = await this.mysqlPool.execute(query, params || []);
    return {
      rows: rows as any[],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      columns: fields?.map(f => f.name) || [],
      duration: 0,
      timestamp: 0,
    };
  }

  private async executeMongoDBQuery(query: Record<string, any>): Promise<QueryResult> {
    if (!this.mongoDb) {
      throw new Error('MongoDB connection not established');
    }

    // MongoDB query format: { collection: 'users', operation: 'find', filter: {...}, options: {...} }
    const { collection, operation, filter = {}, options = {} } = query;

    if (!collection || !operation) {
      throw new Error('MongoDB query must include collection and operation');
    }

    const coll = this.mongoDb.collection(collection);
    let rows: any[] = [];

    switch (operation) {
      case 'find':
        rows = await coll.find(filter, options).toArray();
        break;
      case 'findOne':
        const doc = await coll.findOne(filter, options);
        rows = doc ? [doc] : [];
        break;
      case 'insertOne':
        const insertResult = await coll.insertOne(filter);
        rows = [{ insertedId: insertResult.insertedId }];
        break;
      case 'insertMany':
        const insertManyResult = await coll.insertMany(filter.docs || []);
        rows = [{ insertedIds: insertManyResult.insertedIds }];
        break;
      case 'updateOne':
        const updateResult = await coll.updateOne(filter.query || {}, filter.update || {}, options);
        rows = [{ modifiedCount: updateResult.modifiedCount }];
        break;
      case 'updateMany':
        const updateManyResult = await coll.updateMany(filter.query || {}, filter.update || {}, options);
        rows = [{ modifiedCount: updateManyResult.modifiedCount }];
        break;
      case 'deleteOne':
        const deleteResult = await coll.deleteOne(filter.query || {}, options);
        rows = [{ deletedCount: deleteResult.deletedCount }];
        break;
      case 'deleteMany':
        const deleteManyResult = await coll.deleteMany(filter.query || {}, options);
        rows = [{ deletedCount: deleteManyResult.deletedCount }];
        break;
      case 'count':
        const count = await coll.countDocuments(filter, options);
        rows = [{ count }];
        break;
      default:
        throw new Error(`Unsupported MongoDB operation: ${operation}`);
    }

    return {
      rows,
      rowCount: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      duration: 0,
      timestamp: 0,
    };
  }

  private async executeSQLiteQuery(query: string, params?: any[]): Promise<QueryResult> {
    if (!this.sqliteDb) {
      throw new Error('SQLite connection not established');
    }

    const stmt = this.sqliteDb.prepare(query);
    const rows = stmt.all(params || []) as any[];

    return {
      rows,
      rowCount: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      duration: 0,
      timestamp: 0,
    };
  }

  getConnection(): any {
    switch (this.dbType) {
      case 'postgres':
        return this.pgPool;
      case 'mysql':
        return this.mysqlPool;
      case 'mongodb':
        return this.mongoClient;
      case 'sqlite':
        return this.sqliteDb;
      default:
        return null;
    }
  }
}
