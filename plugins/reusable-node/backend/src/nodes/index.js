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
exports.getNodeHandler = getNodeHandler;
const shared_1 = require("@automflows/shared");
const browser_1 = require("./browser");
const interaction_1 = require("./interaction");
const utility_1 = require("./utility");
const logic_1 = require("./logic");
const api_1 = require("./api");
const config_1 = require("./config");
const registry_1 = require("../plugins/registry");
// Start node handler (no-op)
class StartHandler {
    async execute(node, context) {
        // Start node is a no-op, just marks the beginning of the workflow
    }
}
const handlers = {
    [shared_1.NodeType.START]: new StartHandler(),
    [shared_1.NodeType.OPEN_BROWSER]: new browser_1.OpenBrowserHandler(),
    [shared_1.NodeType.NAVIGATE]: new browser_1.NavigateHandler(),
    [shared_1.NodeType.CLICK]: new interaction_1.ClickHandler(),
    [shared_1.NodeType.TYPE]: new interaction_1.TypeHandler(),
    [shared_1.NodeType.GET_TEXT]: new utility_1.GetTextHandler(),
    [shared_1.NodeType.SCREENSHOT]: new utility_1.ScreenshotHandler(),
    [shared_1.NodeType.WAIT]: new utility_1.WaitHandler(),
    [shared_1.NodeType.JAVASCRIPT_CODE]: new logic_1.JavaScriptCodeHandler(),
    [shared_1.NodeType.LOOP]: new logic_1.LoopHandler(),
    [shared_1.NodeType.INT_VALUE]: new utility_1.IntValueHandler(),
    [shared_1.NodeType.STRING_VALUE]: new utility_1.StringValueHandler(),
    [shared_1.NodeType.BOOLEAN_VALUE]: new utility_1.BooleanValueHandler(),
    [shared_1.NodeType.INPUT_VALUE]: new utility_1.InputValueHandler(),
    [shared_1.NodeType.VERIFY]: new utility_1.VerifyHandler(),
    [shared_1.NodeType.API_REQUEST]: new api_1.ApiRequestHandler(),
    [shared_1.NodeType.API_CURL]: new api_1.ApiCurlHandler(),
    [shared_1.NodeType.LOAD_CONFIG_FILE]: new config_1.LoadConfigFileHandler(),
    [shared_1.NodeType.SELECT_CONFIG_FILE]: new config_1.SelectConfigFileHandler(),
};
function getNodeHandler(nodeType) {
    // First check built-in handlers (check if value exists in enum values)
    if (Object.values(shared_1.NodeType).includes(nodeType)) {
        return handlers[nodeType];
    }
    // Then check plugin registry for custom node types
    return registry_1.pluginRegistry.getHandler(nodeType);
}
__exportStar(require("./base"), exports);
__exportStar(require("./browser"), exports);
__exportStar(require("./interaction"), exports);
__exportStar(require("./utility"), exports);
__exportStar(require("./logic"), exports);
__exportStar(require("./api"), exports);
__exportStar(require("./config"), exports);
