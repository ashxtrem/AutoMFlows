import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: 'json' | 'form-data' | 'raw' | 'url-encoded';
  formFields?: Array<{ key: string; value: string; type: 'text' }>;
  formFiles?: Array<{ key: string; filePath: string }>;
  timeout?: number;
}

/**
 * Helper function to resolve file path (relative or absolute)
 * Relative paths are resolved from the project root
 */
function resolveFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  
  // Resolve relative path from project root
  // __dirname in compiled code: backend/dist/utils -> go up 3 levels to project root
  // From backend/dist/utils: ../ = backend/dist, ../../ = backend, ../../../ = project root
  const projectRoot = path.resolve(__dirname, '../../../');
  return path.resolve(projectRoot, filePath);
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any; // Parsed JSON or raw string
  duration: number; // Request duration in milliseconds
  timestamp: number;
}

/**
 * HTTP Client Utility
 * Executes HTTP requests server-side using axios (avoiding CORS restrictions)
 */
export class HttpClient {
  /**
   * Execute an HTTP request
   * 
   * @param config - Request configuration
   * @returns Promise resolving to structured API response
   */
  static async executeRequest(config: ApiRequestConfig): Promise<ApiResponse> {
    const startTime = Date.now();
    const timestamp = startTime;

    try {
      // Build axios request config
      const axiosConfig: AxiosRequestConfig = {
        method: config.method,
        url: config.url,
        headers: config.headers || {},
        timeout: config.timeout || 30000, // Default 30 seconds
        validateStatus: () => true, // Don't throw on HTTP error status codes
      };

      // Ensure headers object exists
      if (!axiosConfig.headers) {
        axiosConfig.headers = {};
      }

      // Handle request body based on bodyType
      // For form-data, also handle when formFields/formFiles are present even without body
      const hasBody = config.body || (config.bodyType === 'form-data' && (config.formFields || config.formFiles));
      const bodyType = config.bodyType || (config.formFields || config.formFiles ? 'form-data' : 'raw');
      if (hasBody && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        switch (bodyType) {
          case 'json':
            axiosConfig.headers!['Content-Type'] = 'application/json';
            try {
              // Try to parse as JSON, if it fails, send as string
              axiosConfig.data = JSON.parse(config.body!);
            } catch {
              // If not valid JSON, send as string
              axiosConfig.data = config.body;
            }
            break;
          
          case 'form-data':
            // Handle true multipart/form-data
            if (config.formFields || config.formFiles) {
              // Use form-data package for true multipart/form-data
              const formData = new FormData();
              
              // Add text fields
              if (config.formFields) {
                for (const field of config.formFields) {
                  if (field.type === 'text') {
                    formData.append(field.key, field.value);
                  }
                }
              }
              
              // Add file fields
              if (config.formFiles) {
                for (const fileField of config.formFiles) {
                  const resolvedPath = resolveFilePath(fileField.filePath);
                  
                  // Check if file exists
                  if (!fs.existsSync(resolvedPath)) {
                    throw new Error(`File not found: ${resolvedPath}`);
                  }
                  
                  // Get file stats to determine filename
                  const stats = fs.statSync(resolvedPath);
                  if (!stats.isFile()) {
                    throw new Error(`Path is not a file: ${resolvedPath}`);
                  }
                  
                  // Read file as stream and append to FormData
                  const fileStream = fs.createReadStream(resolvedPath);
                  const fileName = path.basename(resolvedPath);
                  formData.append(fileField.key, fileStream, {
                    filename: fileName,
                    contentType: undefined, // Let form-data detect content type
                  });
                }
              }
              
              // Set FormData as request data
              axiosConfig.data = formData;
              // Let axios/form-data set Content-Type header with boundary automatically
              // Remove any existing Content-Type header to avoid conflicts
              delete axiosConfig.headers!['Content-Type'];
              delete axiosConfig.headers!['content-type'];
            } else if (config.body) {
              // Backward compatibility: parse body string into key-value pairs
              // Expected format: key1=value1&key2=value2 or JSON object
              try {
                const parsed = JSON.parse(config.body);
                // If it's an object, convert to FormData format
                const formData = new FormData();
                for (const [key, value] of Object.entries(parsed)) {
                  formData.append(key, String(value));
                }
                axiosConfig.data = formData;
                // Let form-data set Content-Type header with boundary automatically
                delete axiosConfig.headers!['Content-Type'];
                delete axiosConfig.headers!['content-type'];
              } catch {
                // If not JSON, assume it's already in form-data format
                // Try to parse as key=value pairs
                const formData = new FormData();
                const pairs = config.body.split('&');
                for (const pair of pairs) {
                  const [key, value] = pair.split('=').map(s => decodeURIComponent(s));
                  if (key && value !== undefined) {
                    formData.append(key, value);
                  }
                }
                axiosConfig.data = formData;
                delete axiosConfig.headers!['Content-Type'];
                delete axiosConfig.headers!['content-type'];
              }
            }
            break;
          
          case 'url-encoded':
            axiosConfig.data = config.body;
            axiosConfig.headers!['Content-Type'] = 'application/x-www-form-urlencoded';
            break;
          
          case 'raw':
          default:
            // Send as raw string
            axiosConfig.data = config.body;
            if (!axiosConfig.headers!['Content-Type']) {
              axiosConfig.headers!['Content-Type'] = 'text/plain';
            }
            break;
        }
      }

      // Execute request
      const response: AxiosResponse = await axios(axiosConfig);
      const duration = Date.now() - startTime;

      // Parse response body
      let body: any;
      const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
      
      if (contentType.includes('application/json')) {
        // Try to parse as JSON
        if (typeof response.data === 'string') {
          try {
            body = JSON.parse(response.data);
          } catch {
            body = response.data;
          }
        } else {
          body = response.data;
        }
      } else {
        // Return as-is (string or other)
        body = response.data;
      }

      // Convert headers to plain object (axios headers can be arrays)
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) {
          headers[key] = value.join(', ');
        } else {
          headers[key] = String(value);
        }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        duration,
        timestamp,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Handle axios errors
      if (error instanceof AxiosError) {
        // Network error or timeout
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error(`Request timeout after ${config.timeout || 30000}ms: ${config.url}`);
        }
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error(`Failed to connect to ${config.url}: ${error.message}`);
        }

        // If we have a response, return it even if it's an error status
        if (error.response) {
          const response = error.response;
          let body: any = response.data;
          
          // Try to parse JSON if content-type suggests it
          const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
          if (contentType.includes('application/json') && typeof body === 'string') {
            try {
              body = JSON.parse(body);
            } catch {
              // Keep as string
            }
          }

          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(response.headers)) {
            if (Array.isArray(value)) {
              headers[key] = value.join(', ');
            } else {
              headers[key] = String(value);
            }
          }

          return {
            status: response.status,
            statusText: response.statusText,
            headers,
            body,
            duration,
            timestamp,
          };
        }

        throw new Error(`HTTP request failed: ${error.message}`);
      }

      // Other errors
      throw new Error(`HTTP request error: ${error.message}`);
    }
  }
}
