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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = require("./registry");
const browser_1 = require("./browser");
const api_1 = require("./api");
// Register all browser verification strategies
registry_1.verificationStrategyRegistry.register('browser', 'url', new browser_1.BrowserUrlStrategy());
registry_1.verificationStrategyRegistry.register('browser', 'text', new browser_1.BrowserTextStrategy());
registry_1.verificationStrategyRegistry.register('browser', 'element', new browser_1.BrowserElementStrategy());
registry_1.verificationStrategyRegistry.register('browser', 'attribute', new browser_1.BrowserAttributeStrategy());
registry_1.verificationStrategyRegistry.register('browser', 'formField', new browser_1.BrowserFormFieldStrategy());
registry_1.verificationStrategyRegistry.register('browser', 'cookie', new browser_1.BrowserCookieStrategy());
registry_1.verificationStrategyRegistry.register('browser', 'storage', new browser_1.BrowserStorageStrategy());
registry_1.verificationStrategyRegistry.register('browser', 'css', new browser_1.BrowserCssStrategy());
// Register all API verification strategies
registry_1.verificationStrategyRegistry.register('api', 'status', new api_1.ApiStatusStrategy());
registry_1.verificationStrategyRegistry.register('api', 'header', new api_1.ApiHeaderStrategy());
registry_1.verificationStrategyRegistry.register('api', 'bodyPath', new api_1.ApiBodyPathStrategy());
registry_1.verificationStrategyRegistry.register('api', 'bodyValue', new api_1.ApiBodyValueStrategy());
__exportStar(require("./base"), exports);
__exportStar(require("./registry"), exports);
__exportStar(require("./browser"), exports);
__exportStar(require("./api"), exports);
