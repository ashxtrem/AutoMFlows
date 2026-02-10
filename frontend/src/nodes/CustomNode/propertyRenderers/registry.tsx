import { NodeType } from '@automflows/shared';
import { PropertyRenderer } from './types';
import { renderStartProperties } from './start';
import { renderActionProperties } from './action';
import { renderElementQueryProperties } from './elementQuery';
import { renderFormInputProperties } from './formInput';
import { renderNavigationProperties } from './navigation';
import { renderKeyboardProperties } from './keyboard';
import { renderScrollProperties } from './scroll';
import { renderTypeProperties } from './type';
import { renderScreenshotProperties } from './screenshot';
import { renderStorageProperties } from './storage';
import { renderDialogProperties } from './dialog';
import { renderDownloadProperties } from './download';
import { renderIframeProperties } from './iframe';
import { renderWaitProperties } from './wait';
import { renderContextManipulateProperties } from './contextManipulate';
import { renderJavascriptCodeProperties } from './javascriptCode';
import { renderLoopProperties } from './loop';
import { renderOpenBrowserProperties } from './openBrowser';
import { renderIntValueProperties } from './intValue';
import { renderStringValueProperties } from './stringValue';
import { renderBooleanValueProperties } from './booleanValue';
import { renderInputValueProperties } from './inputValue';
import { renderApiRequestProperties } from './apiRequest';
import { renderApiCurlProperties } from './apiCurl';
import { renderLoadConfigFileProperties } from './loadConfigFile';
import { renderDbConnectProperties } from './dbConnect';
import { renderDbDisconnectProperties } from './dbDisconnect';
import { renderDbQueryProperties } from './dbQuery';
import { renderPluginNodeProperties } from './pluginNode';

export const propertyRendererRegistry: Record<string, PropertyRenderer> = {
  [NodeType.START]: renderStartProperties,
  [NodeType.ACTION]: renderActionProperties,
  [NodeType.ELEMENT_QUERY]: renderElementQueryProperties,
  [NodeType.FORM_INPUT]: renderFormInputProperties,
  [NodeType.NAVIGATION]: renderNavigationProperties,
  [NodeType.KEYBOARD]: renderKeyboardProperties,
  [NodeType.SCROLL]: renderScrollProperties,
  [NodeType.TYPE]: renderTypeProperties,
  [NodeType.SCREENSHOT]: renderScreenshotProperties,
  [NodeType.STORAGE]: renderStorageProperties,
  [NodeType.DIALOG]: renderDialogProperties,
  [NodeType.DOWNLOAD]: renderDownloadProperties,
  [NodeType.IFRAME]: renderIframeProperties,
  [NodeType.WAIT]: renderWaitProperties,
  [NodeType.CONTEXT_MANIPULATE]: renderContextManipulateProperties,
  [NodeType.JAVASCRIPT_CODE]: renderJavascriptCodeProperties,
  [NodeType.LOOP]: renderLoopProperties,
  [NodeType.OPEN_BROWSER]: renderOpenBrowserProperties,
  [NodeType.INT_VALUE]: renderIntValueProperties,
  [NodeType.STRING_VALUE]: renderStringValueProperties,
  [NodeType.BOOLEAN_VALUE]: renderBooleanValueProperties,
  [NodeType.INPUT_VALUE]: renderInputValueProperties,
  [NodeType.API_REQUEST]: renderApiRequestProperties,
  [NodeType.API_CURL]: renderApiCurlProperties,
  // Note: LOAD_CONFIG_FILE and SELECT_CONFIG_FILE share the same handler
  [NodeType.LOAD_CONFIG_FILE]: renderLoadConfigFileProperties,
  [NodeType.SELECT_CONFIG_FILE]: renderLoadConfigFileProperties,
  [NodeType.DB_CONNECT]: renderDbConnectProperties,
  [NodeType.DB_DISCONNECT]: renderDbDisconnectProperties,
  [NodeType.DB_QUERY]: renderDbQueryProperties,
};

export function getPropertyRenderer(nodeType: string): PropertyRenderer | null {
  // Check if it's a standard node type
  if (propertyRendererRegistry[nodeType]) {
    return propertyRendererRegistry[nodeType];
  }
  
  // Check if it's a plugin node
  if (nodeType.includes('.')) {
    return renderPluginNodeProperties;
  }
  
  return null;
}
