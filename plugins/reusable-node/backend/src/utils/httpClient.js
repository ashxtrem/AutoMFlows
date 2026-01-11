"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const axios_1 = __importStar(require("axios"));
/**
 * HTTP Client Utility
 * Executes HTTP requests server-side using axios (avoiding CORS restrictions)
 */
class HttpClient {
    /**
     * Execute an HTTP request
     *
     * @param config - Request configuration
     * @returns Promise resolving to structured API response
     */
    static async executeRequest(config) {
        const startTime = Date.now();
        const timestamp = startTime;
        try {
            // Build axios request config
            const axiosConfig = {
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
            if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
                switch (config.bodyType) {
                    case 'json':
                        axiosConfig.headers['Content-Type'] = 'application/json';
                        try {
                            // Try to parse as JSON, if it fails, send as string
                            axiosConfig.data = JSON.parse(config.body);
                        }
                        catch {
                            // If not valid JSON, send as string
                            axiosConfig.data = config.body;
                        }
                        break;
                    case 'form-data':
                        // For form-data, we need to parse the body string into key-value pairs
                        // Expected format: key1=value1&key2=value2 or JSON object
                        try {
                            const parsed = JSON.parse(config.body);
                            // If it's an object, convert to FormData format
                            const formData = new URLSearchParams();
                            for (const [key, value] of Object.entries(parsed)) {
                                formData.append(key, String(value));
                            }
                            axiosConfig.data = formData.toString();
                            axiosConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                        }
                        catch {
                            // If not JSON, assume it's already in form-data format
                            axiosConfig.data = config.body;
                            axiosConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                        }
                        break;
                    case 'url-encoded':
                        axiosConfig.data = config.body;
                        axiosConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                        break;
                    case 'raw':
                    default:
                        // Send as raw string
                        axiosConfig.data = config.body;
                        if (!axiosConfig.headers['Content-Type']) {
                            axiosConfig.headers['Content-Type'] = 'text/plain';
                        }
                        break;
                }
            }
            // Execute request
            const response = await (0, axios_1.default)(axiosConfig);
            const duration = Date.now() - startTime;
            // Parse response body
            let body;
            const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
            if (contentType.includes('application/json')) {
                // Try to parse as JSON
                if (typeof response.data === 'string') {
                    try {
                        body = JSON.parse(response.data);
                    }
                    catch {
                        body = response.data;
                    }
                }
                else {
                    body = response.data;
                }
            }
            else {
                // Return as-is (string or other)
                body = response.data;
            }
            // Convert headers to plain object (axios headers can be arrays)
            const headers = {};
            for (const [key, value] of Object.entries(response.headers)) {
                if (Array.isArray(value)) {
                    headers[key] = value.join(', ');
                }
                else {
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
        catch (error) {
            const duration = Date.now() - startTime;
            // Handle axios errors
            if (error instanceof axios_1.AxiosError) {
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
                    let body = response.data;
                    // Try to parse JSON if content-type suggests it
                    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
                    if (contentType.includes('application/json') && typeof body === 'string') {
                        try {
                            body = JSON.parse(body);
                        }
                        catch {
                            // Keep as string
                        }
                    }
                    const headers = {};
                    for (const [key, value] of Object.entries(response.headers)) {
                        if (Array.isArray(value)) {
                            headers[key] = value.join(', ');
                        }
                        else {
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
exports.HttpClient = HttpClient;
