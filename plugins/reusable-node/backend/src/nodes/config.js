"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectConfigFileHandler = exports.LoadConfigFileHandler = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Helper function to merge an object into context.data
 * If contextKey is provided, stores under that key, otherwise merges into root
 */
function mergeIntoContext(context, data, contextKey) {
    if (contextKey) {
        // Store under a specific key
        context.setData(contextKey, data);
    }
    else {
        // Merge into root of context.data
        const existingData = context.getAllData();
        const merged = { ...existingData, ...data };
        // Set each top-level key individually to preserve nested structure
        for (const [key, value] of Object.entries(data)) {
            context.setData(key, value);
        }
    }
}
/**
 * Helper function to resolve file path (relative or absolute)
 * Relative paths are resolved from the project root
 */
function resolveFilePath(filePath) {
    if (path_1.default.isAbsolute(filePath)) {
        return filePath;
    }
    // Resolve relative path from project root
    // __dirname in compiled code: backend/dist/nodes -> go up 3 levels to project root
    // Similar to how server.ts resolves plugins path: path.join(__dirname, '../../plugins')
    // From backend/dist/nodes, go up 3 levels: ../../../ = project root
    const projectRoot = path_1.default.resolve(__dirname, '../../../');
    return path_1.default.resolve(projectRoot, filePath);
}
class LoadConfigFileHandler {
    async execute(node, context) {
        const data = node.data;
        if (!data.filePath) {
            throw new Error('File path is required for Load Config File node');
        }
        try {
            // Resolve file path (handles both relative and absolute)
            const resolvedPath = resolveFilePath(data.filePath);
            // Check if file exists
            try {
                await promises_1.default.access(resolvedPath);
            }
            catch {
                throw new Error(`Config file not found: ${resolvedPath}`);
            }
            // Read file content
            const fileContent = await promises_1.default.readFile(resolvedPath, 'utf-8');
            // Parse JSON (trim whitespace first)
            let configData;
            try {
                configData = JSON.parse(fileContent.trim());
            }
            catch (error) {
                throw new Error(`Invalid JSON in config file: ${error.message}`);
            }
            // Validate that it's an object
            if (typeof configData !== 'object' || configData === null || Array.isArray(configData)) {
                throw new Error('Config file must contain a JSON object');
            }
            // Merge into context
            mergeIntoContext(context, configData, data.contextKey);
        }
        catch (error) {
            throw new Error(`Failed to load config file: ${error.message}`);
        }
    }
}
exports.LoadConfigFileHandler = LoadConfigFileHandler;
class SelectConfigFileHandler {
    async execute(node, context) {
        const data = node.data;
        if (!data.fileContent) {
            throw new Error('File content is required for Select Config File node');
        }
        try {
            // Parse JSON (trim whitespace first)
            let configData;
            try {
                configData = JSON.parse(data.fileContent.trim());
            }
            catch (error) {
                throw new Error(`Invalid JSON in config file: ${error.message}`);
            }
            // Validate that it's an object
            if (typeof configData !== 'object' || configData === null || Array.isArray(configData)) {
                throw new Error('Config file must contain a JSON object');
            }
            // Merge into context
            mergeIntoContext(context, configData, data.contextKey);
        }
        catch (error) {
            throw new Error(`Failed to load config file: ${error.message}`);
        }
    }
}
exports.SelectConfigFileHandler = SelectConfigFileHandler;
