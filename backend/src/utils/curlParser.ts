import { ApiRequestConfig } from './httpClient';

/**
 * cURL Parser Utility
 * Parses cURL commands into ApiRequestConfig
 * Supports basic cURL syntax: curl -X METHOD -H "Header: value" -d "body" URL
 */
export class CurlParser {
  /**
   * Parse a cURL command string into ApiRequestConfig
   * 
   * @param curlCommand - Raw cURL command string
   * @returns Parsed ApiRequestConfig
   */
  static parse(curlCommand: string): ApiRequestConfig {
    if (!curlCommand || typeof curlCommand !== 'string') {
      throw new Error('Invalid cURL command: command is empty or not a string');
    }

    // Remove 'curl' prefix if present
    let command = curlCommand.trim();
    if (command.toLowerCase().startsWith('curl')) {
      command = command.substring(4).trim();
    }

    const config: Partial<ApiRequestConfig> = {
      method: 'GET',
      headers: {},
      bodyType: 'raw',
    };

    // Extract URL (usually at the end, or after last flag)
    const urlMatch = command.match(/(?:^|\s)(https?:\/\/[^\s]+|['"](https?:\/\/[^'"]+)['"]|[^\s-]+\.(com|org|net|io|co|dev)[^\s]*)/i);
    if (urlMatch) {
      config.url = urlMatch[1].replace(/['"]/g, '');
    } else {
      throw new Error('Could not find URL in cURL command');
    }

    // Extract method (-X or --request)
    const methodMatch = command.match(/-X\s+(\w+)|--request\s+(\w+)/i);
    if (methodMatch) {
      const method = (methodMatch[1] || methodMatch[2]).toUpperCase() as ApiRequestConfig['method'];
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method)) {
        config.method = method;
      }
    }

    // Extract headers (-H or --header)
    const headerPattern = /-H\s+['"]([^'"]+)['"]|--header\s+['"]([^'"]+)['"]|--header\s+([^\s]+)/gi;
    let headerMatch;
    while ((headerMatch = headerPattern.exec(command)) !== null) {
      const headerStr = headerMatch[1] || headerMatch[2] || headerMatch[3];
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex > 0) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        if (!config.headers) {
          config.headers = {};
        }
        config.headers[key] = value;
      }
    }

    // Extract form fields (-F or --form) - must be done before data extraction
    const formFields: Array<{ key: string; value: string; type: 'text' }> = [];
    const formFiles: Array<{ key: string; filePath: string }> = [];
    
    // Pattern to match --form or -F flags
    const formFlagPattern = /--form\s+|-F\s+/gi;
    let formFlagMatch;
    while ((formFlagMatch = formFlagPattern.exec(command)) !== null) {
      const flagIndex = formFlagMatch.index;
      const flagLength = formFlagMatch[0].length;
      const afterFlag = command.substring(flagIndex + flagLength).trim();
      
      // Check if the value starts with a quote
      const quoteMatch = afterFlag.match(/^(['"])(.*)/);
      let formValue = '';
      
      if (quoteMatch) {
        // Handle quoted value (may contain nested quotes)
        const quoteChar = quoteMatch[1];
        const restOfCommand = quoteMatch[2];
        
        // Find the matching closing quote, handling escaped quotes
        let escaped = false;
        for (let i = 0; i < restOfCommand.length; i++) {
          const char = restOfCommand[i];
          if (escaped) {
            formValue += char;
            escaped = false;
          } else if (char === '\\') {
            formValue += char;
            escaped = true;
          } else if (char === quoteChar) {
            // Found matching closing quote
            break;
          } else {
            formValue += char;
          }
        }
      } else {
        // Unquoted value - take until next flag or whitespace boundary
        const nextFlagMatch = afterFlag.match(/^\S+/);
        if (nextFlagMatch) {
          formValue = nextFlagMatch[0];
        }
      }
      
      if (formValue) {
        // Parse form field syntax: key=value or key=@"path/to/file"
        const equalIndex = formValue.indexOf('=');
        if (equalIndex > 0) {
          const key = formValue.substring(0, equalIndex).trim();
          const value = formValue.substring(equalIndex + 1).trim();
          
          // Check if it's a file field (starts with @)
          if (value.startsWith('@')) {
            // File field: remove @ and outer quotes
            let filePath = value.substring(1);
            // Remove outer quotes if present (handles both 'path' and "path")
            filePath = filePath.replace(/^(['"])(.*)\1$/, '$2');
            formFiles.push({ key, filePath });
          } else {
            // Text field: remove outer quotes if present
            const textValue = value.replace(/^(['"])(.*)\1$/, '$2');
            formFields.push({ key, value: textValue, type: 'text' });
          }
        }
      }
    }
    
    // If form fields/files were found, set bodyType to form-data
    if (formFields.length > 0 || formFiles.length > 0) {
      config.bodyType = 'form-data';
      config.formFields = formFields.length > 0 ? formFields : undefined;
      config.formFiles = formFiles.length > 0 ? formFiles : undefined;
      
      // Remove Content-Type header if it's multipart/form-data (let axios set it automatically)
      if (config.headers) {
        const contentType = config.headers['Content-Type'] || config.headers['content-type'];
        if (contentType && contentType.includes('multipart/form-data')) {
          delete config.headers['Content-Type'];
          delete config.headers['content-type'];
        }
      }
    }

    // Extract data/body (-d or --data or --data-raw or --data-binary)
    // Improved pattern to handle nested quotes in JSON bodies and multi-line bodies
    const dataFlags = ['-d', '--data', '--data-raw', '--data-binary'];
    let dataMatch: RegExpMatchArray | null = null;
    
    for (const flag of dataFlags) {
      const flagIndex = command.indexOf(flag);
      if (flagIndex !== -1) {
        // Find the start of the quoted value after the flag
        const afterFlag = command.substring(flagIndex + flag.length).trim();
        // Use dotAll flag (s) to match newlines, or use [\s\S] instead of .
        const quoteMatch = afterFlag.match(/^(['"])([\s\S]*)/);
        if (quoteMatch) {
          const quoteChar = quoteMatch[1];
          const restOfCommand = quoteMatch[2];
          
          // Find the matching closing quote, handling escaped quotes
          // This handles multi-line bodies correctly (newlines are included via [\s\S]*)
          let body = '';
          let escaped = false;
          for (let i = 0; i < restOfCommand.length; i++) {
            const char = restOfCommand[i];
            if (escaped) {
              body += char;
              escaped = false;
            } else if (char === '\\') {
              body += char;
              escaped = true;
            } else if (char === quoteChar) {
              // Found closing quote
              break;
            } else {
              body += char;
            }
          }
          
          if (body) {
            dataMatch = [flag, body] as any;
            break;
          }
        }
      }
    }
    
    if (dataMatch) {
      config.body = dataMatch[1];
      
      // Determine body type based on Content-Type header
      const contentType = config.headers?.['Content-Type'] || config.headers?.['content-type'];
      if (contentType) {
        if (contentType.includes('application/json')) {
          config.bodyType = 'json';
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          config.bodyType = 'url-encoded';
        } else if (contentType.includes('multipart/form-data')) {
          config.bodyType = 'form-data';
        }
      } else {
        // Try to detect JSON
        try {
          JSON.parse(config.body);
          config.bodyType = 'json';
        } catch {
          config.bodyType = 'raw';
        }
      }
    }

    // Extract timeout (--max-time or --connect-timeout)
    const timeoutMatch = command.match(/--max-time\s+(\d+)|--connect-timeout\s+(\d+)/i);
    if (timeoutMatch) {
      config.timeout = parseInt(timeoutMatch[1] || timeoutMatch[2], 10) * 1000; // Convert seconds to milliseconds
    }

    // Validate required fields
    if (!config.url) {
      throw new Error('URL is required in cURL command');
    }

    return config as ApiRequestConfig;
  }
}
