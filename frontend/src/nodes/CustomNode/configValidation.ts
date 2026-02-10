export interface PathInfo {
  path: string;
  type: 'primitive' | 'object' | 'array';
  value: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function findDuplicateKeys(jsonString: string): string[] {
  const duplicates: string[] = [];
  const trimmed = jsonString.trim();
  
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return duplicates;
  }
  
  const extractRootLevelKeys = (content: string): string[] => {
    const keys: string[] = [];
    let i = 0;
    let depth = 0;
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
          
          if (depth === 0) {
            let j = i + 1;
            let foundColon = false;
            let keyEnd = -1;
            
            while (j < content.length && j < i + 500) {
              const nextChar = content[j];
              
              if (nextChar === stringChar && content[j - 1] !== '\\') {
                keyEnd = j;
                j++;
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
              const key = content.substring(i + 1, keyEnd);
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
        if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      i++;
    }
    
    return keys;
  };
  
  const rootContent = trimmed.slice(1, -1);
  const rootKeys = extractRootLevelKeys(rootContent);
  
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

export function collectAllPaths(obj: any, prefix = '', paths: Map<string, PathInfo> = new Map()): Map<string, PathInfo> {
  if (obj === null || obj === undefined) {
    const path = prefix || 'null';
    if (!paths.has(path)) {
      paths.set(path, { path, type: 'primitive', value: null });
    }
    return paths;
  }
  
  if (Array.isArray(obj)) {
    const arrayPath = prefix || '[]';
    if (!paths.has(arrayPath)) {
      paths.set(arrayPath, { path: arrayPath, type: 'array', value: obj });
    }
    
    obj.forEach((item, index) => {
      const itemPath = prefix ? `${prefix}[${index}]` : `[${index}]`;
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        collectAllPaths(item, itemPath, paths);
      } else if (Array.isArray(item)) {
        collectAllPaths(item, itemPath, paths);
      } else {
        paths.set(itemPath, { path: itemPath, type: 'primitive', value: item });
      }
    });
    
    return paths;
  }
  
  if (typeof obj === 'object') {
    const objectPath = prefix || '{}';
    if (!paths.has(objectPath)) {
      paths.set(objectPath, { path: objectPath, type: 'object', value: obj });
    }
    
    for (const [key, value] of Object.entries(obj)) {
      const newPath = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        paths.set(newPath, { path: newPath, type: 'primitive', value: null });
      } else if (Array.isArray(value)) {
        collectAllPaths(value, newPath, paths);
      } else if (typeof value === 'object') {
        collectAllPaths(value, newPath, paths);
      } else {
        paths.set(newPath, { path: newPath, type: 'primitive', value: value });
      }
    }
    
    return paths;
  }
  
  const primitivePath = prefix || 'value';
  paths.set(primitivePath, { path: primitivePath, type: 'primitive', value: obj });
  
  return paths;
}

export function findPathConflicts(paths: Map<string, PathInfo>): string[] {
  const errors: string[] = [];
  const pathArray = Array.from(paths.entries());
  
  const pathTypes = new Map<string, Set<string>>();
  
  for (const [path, info] of pathArray) {
    if (!pathTypes.has(path)) {
      pathTypes.set(path, new Set());
    }
    pathTypes.get(path)!.add(info.type);
  }
  
  for (const [path, types] of pathTypes.entries()) {
    if (types.size > 1) {
      errors.push(`Path conflict: '${path}' has conflicting types: ${Array.from(types).join(', ')}`);
    }
  }
  
  for (const [path, info] of pathArray) {
    if (info.type === 'primitive') {
      const childPaths = pathArray.filter(([p]) => {
        if (path === '') return false;
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

export function validateConfigPaths(jsonString: string, parsed: any): ValidationResult {
  const errors: string[] = [];
  
  const duplicateKeys = findDuplicateKeys(jsonString);
  if (duplicateKeys.length > 0) {
    errors.push(`Duplicate keys found at the same level: ${duplicateKeys.map(k => `'${k}'`).join(', ')}`);
  }
  
  const paths = collectAllPaths(parsed);
  const conflicts = findPathConflicts(paths);
  if (conflicts.length > 0) {
    errors.push(...conflicts);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
