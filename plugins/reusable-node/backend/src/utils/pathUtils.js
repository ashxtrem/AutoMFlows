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
exports.getProjectRoot = getProjectRoot;
exports.resolveFromProjectRoot = resolveFromProjectRoot;
const path = __importStar(require("path"));
/**
 * Get the project root directory path
 * Works from both src/ and dist/ directories
 */
function getProjectRoot() {
    // __dirname in compiled code: backend/dist/utils -> go up 3 levels to project root
    // __dirname in source code: backend/src/utils -> go up 2 levels to project root
    // We use 3 levels to ensure it works from compiled code (dist/)
    // From backend/dist/utils: ../../../ = project root
    // From backend/src/utils: ../../../ = project root (also works, just goes one extra level)
    return path.resolve(__dirname, '../../../');
}
/**
 * Resolve a path relative to project root
 * @param relativePath - Path relative to project root (e.g., './output', 'output', 'plugins')
 */
function resolveFromProjectRoot(relativePath) {
    const projectRoot = getProjectRoot();
    // Remove leading './' if present
    const cleanPath = relativePath.startsWith('./') ? relativePath.slice(2) : relativePath;
    return path.resolve(projectRoot, cleanPath);
}
