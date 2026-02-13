import { verificationStrategyRegistry } from './registry';
import {
  BrowserUrlStrategy,
  BrowserTextStrategy,
  BrowserElementStrategy,
  BrowserAttributeStrategy,
  BrowserFormFieldStrategy,
  BrowserCookieStrategy,
  BrowserStorageStrategy,
  BrowserCssStrategy,
} from './browser';
import {
  ApiStatusStrategy,
  ApiHeaderStrategy,
  ApiBodyPathStrategy,
  ApiBodyValueStrategy,
} from './api';
import {
  DbRowCountStrategy,
  DbColumnValueStrategy,
  DbRowExistsStrategy,
  DbQueryResultStrategy,
} from './database';

// Register all browser verification strategies
verificationStrategyRegistry.register('browser', 'url', new BrowserUrlStrategy());
verificationStrategyRegistry.register('browser', 'text', new BrowserTextStrategy());
verificationStrategyRegistry.register('browser', 'element', new BrowserElementStrategy());
verificationStrategyRegistry.register('browser', 'attribute', new BrowserAttributeStrategy());
verificationStrategyRegistry.register('browser', 'formField', new BrowserFormFieldStrategy());
verificationStrategyRegistry.register('browser', 'cookie', new BrowserCookieStrategy());
verificationStrategyRegistry.register('browser', 'storage', new BrowserStorageStrategy());
verificationStrategyRegistry.register('browser', 'css', new BrowserCssStrategy());

// Register all API verification strategies
verificationStrategyRegistry.register('api', 'status', new ApiStatusStrategy());
verificationStrategyRegistry.register('api', 'header', new ApiHeaderStrategy());
verificationStrategyRegistry.register('api', 'bodyPath', new ApiBodyPathStrategy());
verificationStrategyRegistry.register('api', 'bodyValue', new ApiBodyValueStrategy());

// Register all database verification strategies
verificationStrategyRegistry.register('database', 'rowCount', new DbRowCountStrategy());
verificationStrategyRegistry.register('database', 'columnValue', new DbColumnValueStrategy());
verificationStrategyRegistry.register('database', 'rowExists', new DbRowExistsStrategy());
verificationStrategyRegistry.register('database', 'queryResult', new DbQueryResultStrategy());

export * from './base';
export * from './registry';
export * from './browser';
export * from './api';
export * from './database';