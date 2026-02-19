import { BaseNode, DbConnectNodeData, DbDisconnectNodeData, DbQueryNodeData, DbTransactionBeginNodeData, DbTransactionCommitNodeData, DbTransactionRollbackNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { VariableInterpolator } from '../utils/variableInterpolator';
import { DbClient, DbConfig, QueryResult } from '../utils/dbClient';

export class DbConnectHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as DbConnectNodeData;

    if (!data.dbType) {
      throw new Error('Database type is required for DB Connect node');
    }

    const connectionKey = data.connectionKey || 'dbConnection';
    const failSilently = data.failSilently || false;

    try {
      // Load config from context if configKey is provided
      let config: DbConfig = {
        dbType: data.dbType,
      };

      if (data.configKey) {
        const configObject = context.getData(data.configKey);
        if (configObject && typeof configObject === 'object') {
          // Merge config object with individual fields (individual fields override config)
          config = {
            ...configObject,
            ...config,
            dbType: data.dbType, // Always use node's dbType
          };
        }
      }

      // Interpolate all connection parameters
      if (data.host !== undefined) {
        config.host = VariableInterpolator.interpolateString(String(data.host), context);
      } else if (config.host) {
        config.host = VariableInterpolator.interpolateString(String(config.host), context);
      }

      if (data.port !== undefined) {
        const portStr = VariableInterpolator.interpolateString(String(data.port), context);
        config.port = parseInt(portStr, 10) || (config.port as number);
      } else if (config.port) {
        const portStr = VariableInterpolator.interpolateString(String(config.port), context);
        config.port = parseInt(portStr, 10);
      }

      if (data.user !== undefined) {
        config.user = VariableInterpolator.interpolateString(String(data.user), context);
      } else if (config.user) {
        config.user = VariableInterpolator.interpolateString(String(config.user), context);
      }

      if (data.password !== undefined) {
        config.password = VariableInterpolator.interpolateString(String(data.password), context);
      } else if (config.password) {
        config.password = VariableInterpolator.interpolateString(String(config.password), context);
      }

      if (data.database !== undefined) {
        config.database = VariableInterpolator.interpolateString(String(data.database), context);
      } else if (config.database) {
        config.database = VariableInterpolator.interpolateString(String(config.database), context);
      }

      if (data.server !== undefined) {
        config.server = VariableInterpolator.interpolateString(String(data.server), context);
      } else if (config.server) {
        config.server = VariableInterpolator.interpolateString(String(config.server), context);
      }

      if (data.connectionString !== undefined) {
        config.connectionString = VariableInterpolator.interpolateString(String(data.connectionString), context);
      } else if (config.connectionString) {
        config.connectionString = VariableInterpolator.interpolateString(String(config.connectionString), context);
      }

      if (data.filePath !== undefined) {
        config.filePath = VariableInterpolator.interpolateString(String(data.filePath), context);
      } else if (config.filePath) {
        config.filePath = VariableInterpolator.interpolateString(String(config.filePath), context);
      }

      // Interpolate options if provided
      if (data.options) {
        config.options = VariableInterpolator.interpolateObject(data.options, context);
      } else if (config.options) {
        config.options = VariableInterpolator.interpolateObject(config.options, context);
      }

      // Create and connect database client
      const dbClient = new DbClient(config);
      await dbClient.connect(config);

      // Store connection in context
      const connection = dbClient.getConnection();
      context.setDbConnection(connectionKey, connection);

      // Also store the DbClient instance for later use
      (context as any)[`_dbClient_${connectionKey}`] = dbClient;

      console.log(`[DB Connect] Connected to ${data.dbType} database and stored in context under key: ${connectionKey}`);
    } catch (error: any) {
      const errorMessage = `Failed to connect to database: ${error.message}`;
      console.error(`[DB Connect] ${errorMessage}`);
      
      if (failSilently) {
        console.warn(`[DB Connect] Connection failed silently, continuing execution`);
        return;
      }
      
      throw new Error(errorMessage);
    }
  }
}

export class DbDisconnectHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as DbDisconnectNodeData;

    const connectionKey = data.connectionKey || 'dbConnection';
    const failSilently = data.failSilently || false;

    try {
      // Interpolate connection key if it contains variables
      const resolvedConnectionKey = VariableInterpolator.interpolateString(connectionKey, context);

      // Get DbClient instance if stored
      const dbClientKey = `_dbClient_${resolvedConnectionKey}`;
      const dbClient = (context as any)[dbClientKey];

      if (dbClient && typeof dbClient.disconnect === 'function') {
        await dbClient.disconnect();
        delete (context as any)[dbClientKey];
      }

      // Remove connection from context
      context.removeDbConnection(resolvedConnectionKey);

      console.log(`[DB Disconnect] Disconnected from database and removed from context key: ${resolvedConnectionKey}`);
    } catch (error: any) {
      const errorMessage = `Failed to disconnect from database: ${error.message}`;
      console.error(`[DB Disconnect] ${errorMessage}`);
      
      if (failSilently) {
        console.warn(`[DB Disconnect] Disconnect failed silently, continuing execution`);
        return;
      }
      
      throw new Error(errorMessage);
    }
  }
}

export class DbQueryHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as DbQueryNodeData;

    const connectionKey = data.connectionKey || 'dbConnection';
    const contextKey = data.contextKey || 'dbResult';
    const failSilently = data.failSilently || false;

    try {
      // Interpolate connection key if it contains variables
      const resolvedConnectionKey = VariableInterpolator.interpolateString(connectionKey, context);

      // Get DbClient instance
      const dbClientKey = `_dbClient_${resolvedConnectionKey}`;
      const dbClient = (context as any)[dbClientKey];

      if (!dbClient) {
        throw new Error(`Database connection not found for key: ${resolvedConnectionKey}. Available keys: ${Object.keys(context.getAllDbConnections()).join(', ') || 'none'}`);
      }

      // Load query from context if queryKey is provided
      let query: string | Record<string, any> | undefined = data.query;

      if (data.queryKey) {
        const queryFromContext = context.getData(data.queryKey);
        if (queryFromContext !== undefined) {
          query = queryFromContext;
        }
      }

      if (!query) {
        throw new Error('Query is required. Provide either query or queryKey property');
      }

      // Interpolate query
      let interpolatedQuery: string | Record<string, any>;
      if (typeof query === 'string') {
        interpolatedQuery = VariableInterpolator.interpolateString(query, context);
      } else {
        interpolatedQuery = VariableInterpolator.interpolateObject(query, context);
      }

      // Interpolate parameters
      let interpolatedParams: any[] | undefined;
      if (data.params && Array.isArray(data.params)) {
        interpolatedParams = data.params.map(param => {
          if (typeof param === 'string') {
            return VariableInterpolator.interpolateString(param, context);
          }
          return param;
        });
      }

      // Interpolate context key for results
      const resolvedContextKey = VariableInterpolator.interpolateString(contextKey, context);

      // Resolve timeout (supports variable interpolation)
      let resolvedTimeout: number | undefined;
      if (data.timeout !== undefined) {
        const timeoutVal = VariableInterpolator.interpolateString(String(data.timeout), context);
        resolvedTimeout = parseInt(timeoutVal, 10) || undefined;
      }

      // Execute query
      const queryResult: QueryResult = await dbClient.executeQuery(interpolatedQuery, interpolatedParams, resolvedTimeout);

      // Store results in context
      const resultData = {
        rows: queryResult.rows || [],
        rowCount: queryResult.rowCount || 0,
        columns: queryResult.columns || [],
        duration: queryResult.duration,
        timestamp: queryResult.timestamp,
      };

      context.setData(resolvedContextKey, resultData);

      console.log(`[DB Query] Executed query and stored ${queryResult.rowCount || 0} rows in context under key: ${resolvedContextKey}`);
    } catch (error: any) {
      const errorMessage = `Query execution failed: ${error.message}`;
      console.error(`[DB Query] ${errorMessage}`);
      
      if (failSilently) {
        console.warn(`[DB Query] Query failed silently, continuing execution`);
        return;
      }
      
      throw new Error(errorMessage);
    }
  }
}

function executeTransactionNode(
  _node: BaseNode,
  context: ContextManager,
  action: 'begin' | 'commit' | 'rollback',
  data: DbTransactionBeginNodeData | DbTransactionCommitNodeData | DbTransactionRollbackNodeData
): Promise<void> {
  const connectionKey = data.connectionKey || 'dbConnection';
  const failSilently = data.failSilently || false;

  const resolvedConnectionKey = VariableInterpolator.interpolateString(connectionKey, context);
  const dbClientKey = `_dbClient_${resolvedConnectionKey}`;
  const dbClient = (context as any)[dbClientKey];

  if (!dbClient) {
    const err = new Error(`Database connection not found for key: ${resolvedConnectionKey}. Available keys: ${Object.keys(context.getAllDbConnections()).join(', ') || 'none'}`);
    if (failSilently) {
      console.warn(`[DB Transaction ${action}] ${err.message}`);
      return Promise.resolve();
    }
    throw err;
  }

  const method = action === 'begin' ? 'beginTransaction' : action === 'commit' ? 'commit' : 'rollback';
  return dbClient[method]().catch((error: any) => {
    const errorMessage = `Transaction ${action} failed: ${error.message}`;
    console.error(`[DB Transaction ${action}] ${errorMessage}`);
    if (failSilently) {
      console.warn(`[DB Transaction ${action}] Failed silently, continuing execution`);
      return;
    }
    throw new Error(errorMessage);
  });
}

export class DbTransactionBeginHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    await executeTransactionNode(node, context, 'begin', node.data as DbTransactionBeginNodeData);
  }
}

export class DbTransactionCommitHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    await executeTransactionNode(node, context, 'commit', node.data as DbTransactionCommitNodeData);
  }
}

export class DbTransactionRollbackHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    await executeTransactionNode(node, context, 'rollback', node.data as DbTransactionRollbackNodeData);
  }
}
