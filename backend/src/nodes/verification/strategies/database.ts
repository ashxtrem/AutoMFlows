import { VerifyNodeData } from '@automflows/shared';
import { ContextManager } from '../../../engine/context';
import { BaseVerificationStrategy, VerificationResult } from './base';

/**
 * Database Row Count Verification Strategy
 * Verifies the number of rows returned matches expected count
 */
export class DbRowCountStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const dbContextKey = config.dbContextKey || 'dbResult';
    const queryResult = context.getData(dbContextKey);

    if (!queryResult) {
      throw new Error(`Query result not found in context with key: ${dbContextKey}. Available keys: ${Object.keys(context.getAllData()).join(', ') || 'none'}`);
    }

    const expectedCount = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    if (expectedCount === undefined || expectedCount === null) {
      throw new Error('Expected count is required for row count verification');
    }

    const comparisonOperator = config.comparisonOperator || 'equals';
    const actualCount = queryResult.rowCount || (Array.isArray(queryResult.rows) ? queryResult.rows.length : 0);

    const passed = this.compareValues(Number(actualCount), Number(expectedCount), comparisonOperator);

    return {
      passed,
      message: passed
        ? `Row count verification passed: ${actualCount} rows ${this.getOperatorSymbol(comparisonOperator)} ${expectedCount}`
        : `Row count verification failed: Expected ${actualCount} ${this.getOperatorSymbol(comparisonOperator)} ${expectedCount}, but got ${actualCount}`,
      actualValue: actualCount,
      expectedValue: expectedCount,
      details: {
        dbContextKey,
        comparisonOperator,
      },
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (config.expectedValue === undefined || config.expectedValue === null) {
      return { valid: false, error: 'Expected count is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['expectedValue'];
  }

  private getOperatorSymbol(operator: string): string {
    switch (operator) {
      case 'equals':
        return '=';
      case 'greaterThan':
        return '>';
      case 'lessThan':
        return '<';
      case 'greaterThanOrEqual':
        return '>=';
      case 'lessThanOrEqual':
        return '<=';
      default:
        return '=';
    }
  }
}

/**
 * Database Column Value Verification Strategy
 * Verifies a specific column value in a specific row
 */
export class DbColumnValueStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const dbContextKey = config.dbContextKey || 'dbResult';
    const queryResult = context.getData(dbContextKey);

    if (!queryResult) {
      throw new Error(`Query result not found in context with key: ${dbContextKey}. Available keys: ${Object.keys(context.getAllData()).join(', ') || 'none'}`);
    }

    const columnName = this.resolveValue(config.columnName, context, config, 'columnName');
    if (!columnName) {
      throw new Error('Column name is required for column value verification');
    }

    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    if (expectedValue === undefined || expectedValue === null) {
      throw new Error('Expected value is required');
    }

    const rowIndex = this.resolveValue(config.rowIndex, context, config, 'rowIndex') || 0;
    const matchType = config.matchType || 'equals';
    const caseSensitive = config.caseSensitive || false;

    const rows = queryResult.rows || [];
    if (rows.length === 0) {
      return {
        passed: false,
        message: 'Column value verification failed: Query returned no rows',
        actualValue: undefined,
        expectedValue,
        details: {
          dbContextKey,
          columnName,
          rowIndex,
        },
      };
    }

    if (rowIndex >= rows.length) {
      return {
        passed: false,
        message: `Column value verification failed: Row index ${rowIndex} is out of bounds (query returned ${rows.length} rows)`,
        actualValue: undefined,
        expectedValue,
        details: {
          dbContextKey,
          columnName,
          rowIndex,
          totalRows: rows.length,
        },
      };
    }

    const row = rows[rowIndex];
    let actualValue = row[columnName];

    // Support JSON path for nested values
    if (config.jsonPath && actualValue !== undefined && actualValue !== null) {
      actualValue = this.getNestedValue(actualValue, config.jsonPath);
    }

    if (actualValue === undefined) {
      return {
        passed: false,
        message: `Column value verification failed: Column "${columnName}" not found in row ${rowIndex}`,
        actualValue: undefined,
        expectedValue,
        details: {
          dbContextKey,
          columnName,
          rowIndex,
          availableColumns: Object.keys(row),
        },
      };
    }

    const passed = this.matchValue(actualValue, expectedValue, matchType, caseSensitive);

    return {
      passed,
      message: passed
        ? `Column value verification passed: Column "${columnName}" in row ${rowIndex} has value "${actualValue}" matching expected "${expectedValue}"`
        : `Column value verification failed: Column "${columnName}" in row ${rowIndex} has value "${actualValue}" but expected "${expectedValue}" (match type: ${matchType})`,
      actualValue,
      expectedValue,
      details: {
        dbContextKey,
        columnName,
        rowIndex,
        matchType,
      },
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (!config.columnName) {
      return { valid: false, error: 'Column name is required' };
    }
    if (config.expectedValue === undefined || config.expectedValue === null) {
      return { valid: false, error: 'Expected value is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['columnName', 'expectedValue'];
  }

  /**
   * Get nested value from object using dot notation path
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}

/**
 * Database Row Exists Verification Strategy
 * Verifies that at least one row exists in result set
 */
export class DbRowExistsStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const dbContextKey = config.dbContextKey || 'dbResult';
    const queryResult = context.getData(dbContextKey);

    if (!queryResult) {
      throw new Error(`Query result not found in context with key: ${dbContextKey}. Available keys: ${Object.keys(context.getAllData()).join(', ') || 'none'}`);
    }

    const rowCount = queryResult.rowCount || (Array.isArray(queryResult.rows) ? queryResult.rows.length : 0);
    const passed = rowCount > 0;

    return {
      passed,
      message: passed
        ? `Row exists verification passed: Query returned ${rowCount} row(s)`
        : `Row exists verification failed: Query returned no rows`,
      actualValue: rowCount,
      expectedValue: '> 0',
      details: {
        dbContextKey,
      },
    };
  }

  validateConfig(_config: VerifyNodeData): { valid: boolean; error?: string } {
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return [];
  }
}

/**
 * Database Query Result Verification Strategy
 * Verifies entire query result matches expected value
 */
export class DbQueryResultStrategy extends BaseVerificationStrategy {
  async execute(context: ContextManager, config: VerifyNodeData): Promise<VerificationResult> {
    const dbContextKey = config.dbContextKey || 'dbResult';
    const queryResult = context.getData(dbContextKey);

    if (!queryResult) {
      throw new Error(`Query result not found in context with key: ${dbContextKey}. Available keys: ${Object.keys(context.getAllData()).join(', ') || 'none'}`);
    }

    const expectedValue = this.resolveValue(config.expectedValue, context, config, 'expectedValue');
    if (expectedValue === undefined || expectedValue === null) {
      throw new Error('Expected value is required');
    }

    const matchType = config.matchType || 'equals';
    const caseSensitive = config.caseSensitive || false;

    let actualValue = queryResult.rows || queryResult;

    // Support JSON path for nested value matching
    if (config.jsonPath) {
      actualValue = this.getNestedValue(actualValue, config.jsonPath);
      if (actualValue === undefined) {
        return {
          passed: false,
          message: `Query result verification failed: JSON path "${config.jsonPath}" not found in result`,
          actualValue: undefined,
          expectedValue,
          details: {
            dbContextKey,
            jsonPath: config.jsonPath,
          },
        };
      }
    }

    // Convert both to strings for comparison
    const actualStr = typeof actualValue === 'object' ? JSON.stringify(actualValue) : String(actualValue);
    const expectedStr = typeof expectedValue === 'object' ? JSON.stringify(expectedValue) : String(expectedValue);

    const passed = this.matchValue(actualStr, expectedStr, matchType, caseSensitive);

    return {
      passed,
      message: passed
        ? `Query result verification passed: Result matches expected value`
        : `Query result verification failed: Result does not match expected value (match type: ${matchType})`,
      actualValue,
      expectedValue,
      details: {
        dbContextKey,
        jsonPath: config.jsonPath,
        matchType,
      },
    };
  }

  validateConfig(config: VerifyNodeData): { valid: boolean; error?: string } {
    if (config.expectedValue === undefined || config.expectedValue === null) {
      return { valid: false, error: 'Expected value is required' };
    }
    return { valid: true };
  }

  getRequiredFields(): string[] {
    return ['expectedValue'];
  }

  /**
   * Get nested value from object using dot notation path
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (Array.isArray(current)) {
        const index = parseInt(part, 10);
        if (isNaN(index)) {
          return undefined;
        }
        current = current[index];
      } else {
        current = current[part];
      }
    }

    return current;
  }
}
