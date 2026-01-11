"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurlParser = void 0;
/**
 * cURL Parser Utility
 * Parses cURL commands into ApiRequestConfig
 * Supports basic cURL syntax: curl -X METHOD -H "Header: value" -d "body" URL
 */
class CurlParser {
    /**
     * Parse a cURL command string into ApiRequestConfig
     *
     * @param curlCommand - Raw cURL command string
     * @returns Parsed ApiRequestConfig
     */
    static parse(curlCommand) {
        if (!curlCommand || typeof curlCommand !== 'string') {
            throw new Error('Invalid cURL command: command is empty or not a string');
        }
        // Remove 'curl' prefix if present
        let command = curlCommand.trim();
        if (command.toLowerCase().startsWith('curl')) {
            command = command.substring(4).trim();
        }
        const config = {
            method: 'GET',
            headers: {},
            bodyType: 'raw',
        };
        // Extract URL (usually at the end, or after last flag)
        const urlMatch = command.match(/(?:^|\s)(https?:\/\/[^\s]+|['"](https?:\/\/[^'"]+)['"]|[^\s-]+\.(com|org|net|io|co|dev)[^\s]*)/i);
        if (urlMatch) {
            config.url = urlMatch[1].replace(/['"]/g, '');
        }
        else {
            throw new Error('Could not find URL in cURL command');
        }
        // Extract method (-X or --request)
        const methodMatch = command.match(/-X\s+(\w+)|--request\s+(\w+)/i);
        if (methodMatch) {
            const method = (methodMatch[1] || methodMatch[2]).toUpperCase();
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
        // Extract data/body (-d or --data or --data-raw or --data-binary)
        // Improved pattern to handle nested quotes in JSON bodies
        const dataFlags = ['-d', '--data', '--data-raw', '--data-binary'];
        let dataMatch = null;
        let dataFlag = '';
        for (const flag of dataFlags) {
            const flagIndex = command.indexOf(flag);
            if (flagIndex !== -1) {
                // Find the start of the quoted value after the flag
                const afterFlag = command.substring(flagIndex + flag.length).trim();
                const quoteMatch = afterFlag.match(/^(['"])(.*)/);
                if (quoteMatch) {
                    const quoteChar = quoteMatch[1];
                    const restOfCommand = quoteMatch[2];
                    // Find the matching closing quote, handling escaped quotes
                    let body = '';
                    let escaped = false;
                    for (let i = 0; i < restOfCommand.length; i++) {
                        const char = restOfCommand[i];
                        if (escaped) {
                            body += char;
                            escaped = false;
                        }
                        else if (char === '\\') {
                            body += char;
                            escaped = true;
                        }
                        else if (char === quoteChar) {
                            // Found closing quote
                            break;
                        }
                        else {
                            body += char;
                        }
                    }
                    if (body) {
                        dataMatch = [flag, body];
                        dataFlag = flag;
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
                }
                else if (contentType.includes('application/x-www-form-urlencoded')) {
                    config.bodyType = 'url-encoded';
                }
                else if (contentType.includes('multipart/form-data')) {
                    config.bodyType = 'form-data';
                }
            }
            else {
                // Try to detect JSON
                try {
                    JSON.parse(config.body);
                    config.bodyType = 'json';
                }
                catch {
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
        return config;
    }
}
exports.CurlParser = CurlParser;
