import { ContextManager } from '../engine/context';

/**
 * Variable Interpolator Utility
 * Resolves nested JSON paths in template strings
 * Supports patterns: ${data.key.path} or ${variables.key.path}
 */
export class VariableInterpolator {
  /**
   * Interpolate a template string by replacing variable references with actual values
   * Supports nested object access (e.g., data.api1.response.body.customer.id)
   * 
   * @param template - Template string with variable references
   * @param context - ContextManager instance
   * @returns Interpolated string with variables replaced
   */
  static interpolateString(template: string, context: ContextManager): string {
    if (!template || typeof template !== 'string') {
      return template;
    }

    // Match ${data.key.path} or ${variables.key.path} patterns
    // Supports nested paths like data.api1.body.customerId
    const variablePattern = /\$\{((?:data|variables)\.(?:[a-zA-Z0-9_\[\]'"]+\.?)+)\}/g;

    return template.replace(variablePattern, (match, path) => {
      try {
        const value = this.resolvePath(path, context);
        if (value === undefined) {
          // If value is undefined, return the original match (don't replace)
          // This allows for partial interpolation or missing values
          return match;
        }
        // Convert to string, handling objects/arrays
        return this.stringifyValue(value);
      } catch (error: any) {
        // If resolution fails, return original match
        console.warn(`[VariableInterpolator] Failed to resolve path "${path}": ${error.message}`);
        return match;
      }
    });
  }

  /**
   * Resolve a dot-notation path from context
   * Supports: data.key.path or variables.key.path
   * Also supports bracket notation: data.key['path'] or data.key["path"]
   */
  private static resolvePath(path: string, context: ContextManager): any {
    const parts = this.parsePath(path);
    
    if (parts.length === 0) {
      return undefined;
    }

    const [sourceType, ...keyParts] = parts;
    
    if (sourceType !== 'data' && sourceType !== 'variables') {
      throw new Error(`Invalid source type: ${sourceType}. Must be 'data' or 'variables'`);
    }

    // Get the base object
    const baseObject = sourceType === 'data' 
      ? context.getAllData() 
      : context.getAllVariables();

    // Navigate through nested properties
    let current: any = baseObject;
    for (const key of keyParts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Parse a path string into parts, handling bracket notation
   * Examples:
   * - "data.api1.body.customerId" -> ["data", "api1", "body", "customerId"]
   * - "data.api1.headers['content-type']" -> ["data", "api1", "headers", "content-type"]
   * - "variables.key" -> ["variables", "key"]
   */
  private static parsePath(path: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inBrackets = false;
    let bracketQuote = '';

    for (let i = 0; i < path.length; i++) {
      const char = path[i];

      if (char === '[' && !inBrackets) {
        // Start of bracket notation
        if (current) {
          parts.push(current);
          current = '';
        }
        inBrackets = true;
        bracketQuote = '';
      } else if (char === ']' && inBrackets) {
        // End of bracket notation
        if (current || bracketQuote) {
          parts.push(current || bracketQuote);
          current = '';
          bracketQuote = '';
        }
        inBrackets = false;
      } else if ((char === '"' || char === "'") && inBrackets) {
        // Quote inside brackets
        if (!bracketQuote) {
          bracketQuote = char;
        } else if (bracketQuote === char) {
          bracketQuote = '';
        } else {
          current += char;
        }
      } else if (char === '.' && !inBrackets) {
        // Dot separator
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    // Push remaining part
    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Convert a value to string representation
   * Handles objects, arrays, primitives
   */
  private static stringifyValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    // For objects and arrays, use JSON.stringify
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  /**
   * Interpolate an object recursively, replacing all string values
   */
  static interpolateObject(obj: any, context: ContextManager): any {
    if (typeof obj === 'string') {
      return this.interpolateString(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, context));
    }
    
    if (obj && typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, context);
      }
      return result;
    }
    
    return obj;
  }
}
