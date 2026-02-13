/**
 * Path information for validation
 */
export interface PathInfo {
  path: string;
  type: 'primitive' | 'object' | 'array';
  value: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Find duplicate keys at the same level in JSON string
 * This checks the raw string before JSON.parse to catch duplicates
 * Uses a simple tokenizer approach
 */
export function findDuplicateKeys(jsonString: string): string[] {
  const duplicates: string[] = [];
  const trimmed = jsonString.trim();
  
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return duplicates;
  }
  
  /**
   * Extract keys from root level object
   * Simple approach: find all "key": patterns at root level
   */
  const extractRootLevelKeys = (content: string): string[] => {
    const keys: string[] = [];
    let i = 0;
    let depth = 0; // Track object/array nesting depth
    let inString = false;
    let stringChar = '';
    let escapeNext = false;
    
    while (i < content.length) {
      const char = content[i];
      
      if (escapeNext) {
        escapeNext = false;
        i++;
        continue;
      }
      
      if (char === '\\' && inString) {
        escapeNext = true;
        i++;
        continue;
      }
      
      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
          
          // Check if this might be a key (at root level)
          if (depth === 0) {
            // Look ahead to find colon
            let j = i + 1;
            let foundColon = false;
            let keyEnd = -1;
            
            while (j < content.length && j < i + 500) {
              const nextChar = content[j];
              
              if (nextChar === stringChar && content[j - 1] !== '\\') {
                // End of string
                keyEnd = j;
                j++;
                // Skip whitespace
                while (j < content.length && /\s/.test(content[j])) {
                  j++;
                }
                if (j < content.length && content[j] === ':') {
                  foundColon = true;
                }
                break;
              }
              j++;
            }
            
            if (foundColon && keyEnd > i) {
              // Extract key
              const key = content.substring(i + 1, keyEnd);
              // Unescape key
              const unescapedKey = key.replace(/\\(.)/g, (_match, escaped) => {
                const escapes: Record<string, string> = {
                  'n': '\n',
                  't': '\t',
                  'r': '\r',
                  '\\': '\\',
                  '"': '"',
                  "'": "'"
                };
                return escapes[escaped] || escaped;
              });
              keys.push(unescapedKey);
            }
          }
        } else if (char === '{' || char === '[') {
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
        }
      } else {
        // In string
        if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      i++;
    }
    
    return keys;
  };
  
  // Extract root object content (between first { and last })
  const rootContent = trimmed.slice(1, -1);
  const rootKeys = extractRootLevelKeys(rootContent);
  
  // Find duplicates
  const seen = new Map<string, number>();
  for (const key of rootKeys) {
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count === 1 && !duplicates.includes(key)) {
      duplicates.push(key);
    }
  }
  
  return duplicates;
}

/**
 * Collect all paths recursively from an object
 * Handles nested objects and arrays
 */
export function collectAllPaths(obj: any, prefix = '', paths: Map<string, PathInfo> = new Map()): Map<string, PathInfo> {
  if (obj === null || obj === undefined) {
    const path = prefix || 'null';
    if (!paths.has(path)) {
      paths.set(path, {
        path,
        type: 'primitive',
        value: null,
      });
    }
    return paths;
  }
  
  if (Array.isArray(obj)) {
    // Array itself
    const arrayPath = prefix || '[]';
    if (!paths.has(arrayPath)) {
      paths.set(arrayPath, {
        path: arrayPath,
        type: 'array',
        value: obj,
      });
    }
    
    // Process array items
    obj.forEach((item, index) => {
      const itemPath = prefix ? `${prefix}[${index}]` : `[${index}]`;
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Nested object in array
        collectAllPaths(item, itemPath, paths);
      } else if (Array.isArray(item)) {
        // Nested array
        collectAllPaths(item, itemPath, paths);
      } else {
        // Primitive in array
        paths.set(itemPath, {
          path: itemPath,
          type: 'primitive',
          value: item,
        });
      }
    });
    
    return paths;
  }
  
  if (typeof obj === 'object') {
    // Object itself
    const objectPath = prefix || '{}';
    if (!paths.has(objectPath)) {
      paths.set(objectPath, {
        path: objectPath,
        type: 'object',
        value: obj,
      });
    }
    
    // Process object properties
    for (const [key, value] of Object.entries(obj)) {
      const newPath = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        paths.set(newPath, {
          path: newPath,
          type: 'primitive',
          value: null,
        });
      } else if (Array.isArray(value)) {
        collectAllPaths(value, newPath, paths);
      } else if (typeof value === 'object') {
        collectAllPaths(value, newPath, paths);
      } else {
        // Primitive
        paths.set(newPath, {
          path: newPath,
          type: 'primitive',
          value: value,
        });
      }
    }
    
    return paths;
  }
  
  // Primitive value
  const primitivePath = prefix || 'value';
  paths.set(primitivePath, {
    path: primitivePath,
    type: 'primitive',
    value: obj,
  });
  
  return paths;
}

/**
 * Find path conflicts where a path exists with conflicting types
 * or where parent/child paths conflict
 */
export function findPathConflicts(paths: Map<string, PathInfo>): string[] {
  const errors: string[] = [];
  const pathArray = Array.from(paths.entries());
  
  // Check for conflicts where a path is both primitive and non-primitive
  // This shouldn't happen in valid JSON, but we check anyway
  const pathTypes = new Map<string, Set<string>>();
  
  for (const [path, info] of pathArray) {
    if (!pathTypes.has(path)) {
      pathTypes.set(path, new Set());
    }
    pathTypes.get(path)!.add(info.type);
  }
  
  // Check for type conflicts at the same path
  for (const [path, types] of pathTypes.entries()) {
    if (types.size > 1) {
      errors.push(`Path conflict: '${path}' has conflicting types: ${Array.from(types).join(', ')}`);
    }
  }
  
  // Check for parent-child conflicts
  // If "a" is a primitive, then "a.b" shouldn't exist
  // If "a" is an object, then "a.b" is valid
  for (const [path, info] of pathArray) {
    if (info.type === 'primitive') {
      // Check if any child paths exist
      const childPaths = pathArray.filter(([p]) => {
        if (path === '') return false;
        // Check if p is a child of path
        // e.g., path="a", p="a.b" or p="a[0]"
        return p.startsWith(path + '.') || p.startsWith(path + '[');
      });
      
      if (childPaths.length > 0) {
        const childPathList = childPaths.map(([p]) => `'${p}'`).join(', ');
        errors.push(`Path conflict: '${path}' is a primitive value but has child paths: ${childPathList}`);
      }
    }
  }
  
  return errors;
}

/**
 * Validate configuration paths
 * Checks for duplicate keys and path conflicts
 */
export function validateConfigPaths(jsonString: string, parsed: any): ValidationResult {
  const errors: string[] = [];
  
  // 1. Check for duplicate keys at same level
  const duplicateKeys = findDuplicateKeys(jsonString);
  if (duplicateKeys.length > 0) {
    errors.push(`Duplicate keys found at the same level: ${duplicateKeys.map(k => `'${k}'`).join(', ')}`);
  }
  
  // 2. Collect all paths and their types
  const paths = collectAllPaths(parsed);
  
  // 3. Check for conflicts
  const conflicts = findPathConflicts(paths);
  if (conflicts.length > 0) {
    errors.push(...conflicts);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
