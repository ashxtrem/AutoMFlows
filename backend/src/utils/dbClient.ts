/// <reference path="../types/oracledb.d.ts" />
/// <reference path="../types/mssql.d.ts" />
import { Pool as PgPool, PoolClient } from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient, Db as MongoDb, ClientSession } from 'mongodb';
import Database from 'better-sqlite3';
import oracledb from 'oracledb';
import sql from 'mssql';
import Redis, { RedisOptions } from 'ioredis';

export type DbType = 'postgres' | 'mysql' | 'mongodb' | 'sqlite' | 'oracle' | 'sqlserver' | 'redis';

export interface DbConfig {
  dbType: DbType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionString?: string; // For MongoDB, PostgreSQL, or Oracle connection strings
  filePath?: string; // For SQLite
  server?: string; // For SQL Server (alias for host)
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
  private oraclePool?: oracledb.Pool;
  private mssqlPool?: sql.ConnectionPool;
  private redisClient?: Redis;
  // Transaction state
  private pgTransactionClient?: PoolClient;
  private mysqlTransactionConnection?: mysql.PoolConnection;
  private mongoSession?: ClientSession;
  private sqliteInTransaction = false;

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
        case 'oracle':
          await this.connectOracle(config);
          break;
        case 'sqlserver':
          await this.connectSQLServer(config);
          break;
        case 'redis':
          await this.connectRedis(config);
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

  private async connectOracle(config: DbConfig): Promise<void> {
    const poolConfig: oracledb.PoolAttributes = {
      user: config.user,
      password: config.password,
      connectString: config.connectionString || `${config.host || 'localhost'}:${config.port || 1521}/${config.database || 'ORCL'}`,
      poolMin: 1,
      poolMax: config.options?.maxConnections || 10,
      poolIncrement: 1,
    };
    this.oraclePool = await oracledb.createPool(poolConfig);
    const conn = await this.oraclePool.getConnection();
    await conn.close();
  }

  private async connectSQLServer(config: DbConfig): Promise<void> {
    const poolConfig: sql.config = {
      server: config.server || config.host || 'localhost',
      port: config.port || 1433,
      user: config.user,
      password: config.password,
      database: config.database || 'master',
      options: {
        encrypt: config.options?.encrypt ?? true,
        trustServerCertificate: config.options?.trustServerCertificate ?? true,
      },
      pool: {
        max: config.options?.maxConnections || 10,
        min: 0,
        idleTimeoutMillis: config.options?.idleTimeout || 30000,
      },
    };
    this.mssqlPool = await sql.connect(poolConfig);
  }

  private async connectRedis(config: DbConfig): Promise<void> {
    const redisConfig: RedisOptions = {
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password || undefined,
    };
    this.redisClient = new Redis(redisConfig);
    await this.redisClient.ping();
  }

  async beginTransaction(): Promise<void> {
    try {
      switch (this.dbType) {
        case 'postgres':
          if (!this.pgPool) throw new Error('PostgreSQL connection not established');
          if (this.pgTransactionClient) throw new Error('Transaction already in progress');
          this.pgTransactionClient = await this.pgPool.connect();
          await this.pgTransactionClient.query('BEGIN');
          break;
        case 'mysql':
          if (!this.mysqlPool) throw new Error('MySQL connection not established');
          if (this.mysqlTransactionConnection) throw new Error('Transaction already in progress');
          this.mysqlTransactionConnection = await this.mysqlPool.getConnection();
          await this.mysqlTransactionConnection.beginTransaction();
          break;
        case 'mongodb':
          if (!this.mongoClient) throw new Error('MongoDB connection not established');
          if (this.mongoSession) throw new Error('Transaction already in progress');
          this.mongoSession = this.mongoClient.startSession();
          await this.mongoSession.startTransaction();
          break;
        case 'sqlite':
          if (!this.sqliteDb) throw new Error('SQLite connection not established');
          if (this.sqliteInTransaction) throw new Error('Transaction already in progress');
          this.sqliteDb.exec('BEGIN');
          this.sqliteInTransaction = true;
          break;
        default:
          throw new Error(`Unsupported database type: ${this.dbType}`);
      }
      console.log(`[DbClient] Transaction started for ${this.dbType}`);
    } catch (error: any) {
      throw new Error(`Failed to begin transaction: ${error.message}`);
    }
  }

  async commit(): Promise<void> {
    try {
      switch (this.dbType) {
        case 'postgres':
          if (!this.pgTransactionClient) throw new Error('No transaction in progress');
          await this.pgTransactionClient.query('COMMIT');
          this.pgTransactionClient.release();
          this.pgTransactionClient = undefined;
          break;
        case 'mysql':
          if (!this.mysqlTransactionConnection) throw new Error('No transaction in progress');
          await this.mysqlTransactionConnection.commit();
          this.mysqlTransactionConnection.release();
          this.mysqlTransactionConnection = undefined;
          break;
        case 'mongodb':
          if (!this.mongoSession) throw new Error('No transaction in progress');
          await this.mongoSession.commitTransaction();
          this.mongoSession.endSession();
          this.mongoSession = undefined;
          break;
        case 'sqlite':
          if (!this.sqliteInTransaction) throw new Error('No transaction in progress');
          this.sqliteDb!.exec('COMMIT');
          this.sqliteInTransaction = false;
          break;
        default:
          throw new Error(`Unsupported database type: ${this.dbType}`);
      }
      console.log(`[DbClient] Transaction committed for ${this.dbType}`);
    } catch (error: any) {
      throw new Error(`Failed to commit transaction: ${error.message}`);
    }
  }

  async rollback(): Promise<void> {
    try {
      switch (this.dbType) {
        case 'postgres':
          if (this.pgTransactionClient) {
            await this.pgTransactionClient.query('ROLLBACK');
            this.pgTransactionClient.release();
            this.pgTransactionClient = undefined;
          }
          break;
        case 'mysql':
          if (this.mysqlTransactionConnection) {
            await this.mysqlTransactionConnection.rollback();
            this.mysqlTransactionConnection.release();
            this.mysqlTransactionConnection = undefined;
          }
          break;
        case 'mongodb':
          if (this.mongoSession) {
            await this.mongoSession.abortTransaction();
            this.mongoSession.endSession();
            this.mongoSession = undefined;
          }
          break;
        case 'sqlite':
          if (this.sqliteInTransaction) {
            this.sqliteDb!.exec('ROLLBACK');
            this.sqliteInTransaction = false;
          }
          break;
      }
      console.log(`[DbClient] Transaction rolled back for ${this.dbType}`);
    } catch (error: any) {
      console.warn(`[DbClient] Error during rollback: ${error.message}`);
      // Clean up state even on rollback error
      this.pgTransactionClient?.release();
      this.pgTransactionClient = undefined;
      this.mysqlTransactionConnection?.release();
      this.mysqlTransactionConnection = undefined;
      this.mongoSession?.endSession();
      this.mongoSession = undefined;
      this.sqliteInTransaction = false;
      throw new Error(`Failed to rollback transaction: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Clean up any active transaction
      if (this.pgTransactionClient) {
        await this.pgTransactionClient.query('ROLLBACK');
        this.pgTransactionClient.release();
        this.pgTransactionClient = undefined;
      }
      if (this.mysqlTransactionConnection) {
        await this.mysqlTransactionConnection.rollback();
        this.mysqlTransactionConnection.release();
        this.mysqlTransactionConnection = undefined;
      }
      if (this.mongoSession) {
        await this.mongoSession.abortTransaction();
        this.mongoSession.endSession();
        this.mongoSession = undefined;
      }
      this.sqliteInTransaction = false;

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
        case 'oracle':
          if (this.oraclePool) {
            await this.oraclePool.close(10);
            this.oraclePool = undefined;
          }
          break;
        case 'sqlserver':
          if (this.mssqlPool) {
            await this.mssqlPool.close();
            this.mssqlPool = undefined;
          }
          break;
        case 'redis':
          if (this.redisClient) {
            this.redisClient.disconnect();
            this.redisClient = undefined;
          }
          break;
      }
      console.log(`[DbClient] Disconnected from ${this.dbType} database`);
    } catch (error: any) {
      console.warn(`[DbClient] Error disconnecting from ${this.dbType} database: ${error.message}`);
      throw error;
    }
  }

  async executeQuery(query: string | Record<string, any>, params?: any[], timeout?: number): Promise<QueryResult> {
    const startTime = Date.now();
    let result: QueryResult;

    try {
      switch (this.dbType) {
        case 'postgres':
          result = await this.executePostgresQuery(query as string, params, timeout);
          break;
        case 'mysql':
          result = await this.executeMySQLQuery(query as string, params, timeout);
          break;
        case 'mongodb':
          result = await this.executeMongoDBQuery(query as Record<string, any>, timeout);
          break;
        case 'sqlite':
          result = await this.executeSQLiteQuery(query as string, params, timeout);
          break;
        case 'oracle':
          result = await this.executeOracleQuery(query as string, params, timeout);
          break;
        case 'sqlserver':
          result = await this.executeSQLServerQuery(query as string, params, timeout);
          break;
        case 'redis':
          result = await this.executeRedisQuery(query as string | Record<string, any>, params, timeout);
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

  private async executePostgresQuery(query: string, params?: any[], timeout?: number): Promise<QueryResult> {
    if (!this.pgPool && !this.pgTransactionClient) {
      throw new Error('PostgreSQL connection not established');
    }
    const client = this.pgTransactionClient ?? await this.pgPool!.connect();
    const shouldRelease = !this.pgTransactionClient;

    try {
      if (timeout && timeout > 0) {
        await client.query(`SET LOCAL statement_timeout = '${timeout}ms'`);
      }
      const result = await client.query(query, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? undefined,
        columns: result.fields?.map(f => f.name) || [],
        duration: 0, // Will be set by caller
        timestamp: 0, // Will be set by caller
      };
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  private async executeMySQLQuery(query: string, params?: any[], timeout?: number): Promise<QueryResult> {
    const poolOrConn = this.mysqlTransactionConnection ?? this.mysqlPool;
    if (!poolOrConn) {
      throw new Error('MySQL connection not established');
    }

    const executePromise = poolOrConn.execute(query, params || []);
    if (timeout && timeout > 0) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timed out after ${timeout}ms`)), timeout);
      });
      const [rows, fields] = await Promise.race([executePromise, timeoutPromise]);
      return {
        rows: rows as any[],
        rowCount: Array.isArray(rows) ? rows.length : 0,
        columns: (fields as any)?.map((f: any) => f.name) || [],
        duration: 0,
        timestamp: 0,
      };
    }
    const [rows, fields] = await executePromise;
    return {
      rows: rows as any[],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      columns: fields?.map(f => f.name) || [],
      duration: 0,
      timestamp: 0,
    };
  }

  private async executeMongoDBQuery(query: Record<string, any>, timeout?: number): Promise<QueryResult> {
    if (!this.mongoDb) {
      throw new Error('MongoDB connection not established');
    }

    // MongoDB query format: { collection: 'users', operation: 'find', filter: {...}, options: {...} }
    const { collection, operation, filter = {}, options = {} } = query;

    if (!collection || !operation) {
      throw new Error('MongoDB query must include collection and operation');
    }

    const mergedOptions = { ...options };
    if (timeout && timeout > 0) {
      mergedOptions.maxTimeMS = timeout;
    }
    if (this.mongoSession) {
      mergedOptions.session = this.mongoSession;
    }

    const coll = this.mongoDb.collection(collection);
    let rows: any[] = [];

    switch (operation) {
      case 'find':
        rows = await coll.find(filter, mergedOptions).toArray();
        break;
      case 'findOne':
        const doc = await coll.findOne(filter, mergedOptions);
        rows = doc ? [doc] : [];
        break;
      case 'insertOne':
        const insertResult = await coll.insertOne(filter, mergedOptions);
        rows = [{ insertedId: insertResult.insertedId }];
        break;
      case 'insertMany':
        const insertManyResult = await coll.insertMany(filter.docs || [], mergedOptions);
        rows = [{ insertedIds: insertManyResult.insertedIds }];
        break;
      case 'updateOne':
        const updateResult = await coll.updateOne(filter.query || {}, filter.update || {}, mergedOptions);
        rows = [{ modifiedCount: updateResult.modifiedCount }];
        break;
      case 'updateMany':
        const updateManyResult = await coll.updateMany(filter.query || {}, filter.update || {}, mergedOptions);
        rows = [{ modifiedCount: updateManyResult.modifiedCount }];
        break;
      case 'deleteOne':
        const deleteResult = await coll.deleteOne(filter.query || {}, mergedOptions);
        rows = [{ deletedCount: deleteResult.deletedCount }];
        break;
      case 'deleteMany':
        const deleteManyResult = await coll.deleteMany(filter.query || {}, mergedOptions);
        rows = [{ deletedCount: deleteManyResult.deletedCount }];
        break;
      case 'count':
        const count = await coll.countDocuments(filter, mergedOptions);
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

  private async executeSQLiteQuery(query: string, params?: any[], timeout?: number): Promise<QueryResult> {
    if (!this.sqliteDb) {
      throw new Error('SQLite connection not established');
    }

    const runQuery = () =>
      new Promise<QueryResult>((resolve, reject) => {
        try {
          const stmt = this.sqliteDb!.prepare(query);
          const rows = stmt.all(params || []) as any[];
          resolve({
            rows,
            rowCount: rows.length,
            columns: rows.length > 0 ? Object.keys(rows[0]) : [],
            duration: 0,
            timestamp: 0,
          });
        } catch (err) {
          reject(err);
        }
      });

    if (timeout && timeout > 0) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timed out after ${timeout}ms`)), timeout);
      });
      return Promise.race([runQuery(), timeoutPromise]);
    }
    return runQuery();
  }

  private async executeOracleQuery(query: string, params?: any[], _timeout?: number): Promise<QueryResult> {
    if (!this.oraclePool) {
      throw new Error('Oracle connection not established');
    }

    const conn = await this.oraclePool.getConnection();
    try {
      const bindParams = params && params.length > 0 ? params : [];
      const result = await conn.execute(query, bindParams, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchArraySize: 100,
      });
      const rows = result.rows as any[] || [];
      const metaData = result.metaData || [];
      return {
        rows,
        rowCount: rows.length,
        columns: metaData.map((m: any) => m.name),
        duration: 0,
        timestamp: 0,
      };
    } finally {
      await conn.close();
    }
  }

  private async executeSQLServerQuery(query: string, params?: any[], _timeout?: number): Promise<QueryResult> {
    if (!this.mssqlPool) {
      throw new Error('SQL Server connection not established');
    }

    const request = this.mssqlPool.request();
    let paramIndex = 0;
    const processedQuery = (params && params.length > 0)
      ? query.replace(/\?/g, () => {
          const paramName = `p${paramIndex}`;
          request.input(paramName, params![paramIndex]);
          paramIndex++;
          return `@${paramName}`;
        })
      : query;
    const result = await request.query(processedQuery);
    const rows = result.recordset || [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return {
      rows,
      rowCount: rows.length,
      columns,
      duration: 0,
      timestamp: 0,
    };
  }

  private async executeRedisQuery(query: string | Record<string, any>, _params?: any[], _timeout?: number): Promise<QueryResult> {
    if (!this.redisClient) {
      throw new Error('Redis connection not established');
    }

    let command: string;
    let args: any[];

    if (typeof query === 'string') {
      const parts = query.trim().split(/\s+/);
      command = (parts[0] || '').toUpperCase();
      args = parts.slice(1);
    } else if (typeof query === 'object' && query.command) {
      command = String(query.command).toUpperCase();
      args = Array.isArray(query.args) ? query.args : [];
    } else {
      throw new Error('Redis query must be a string (e.g., "GET key") or object with command and args');
    }

    const redisCmd = (this.redisClient as any)[command.toLowerCase()];
    if (typeof redisCmd !== 'function') {
      throw new Error(`Unsupported Redis command: ${command}`);
    }

    const result = await redisCmd.apply(this.redisClient, args);
    const rows = [{ result }];
    return {
      rows,
      rowCount: 1,
      columns: ['result'],
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
      case 'oracle':
        return this.oraclePool;
      case 'sqlserver':
        return this.mssqlPool;
      case 'redis':
        return this.redisClient;
      default:
        return null;
    }
  }
}
