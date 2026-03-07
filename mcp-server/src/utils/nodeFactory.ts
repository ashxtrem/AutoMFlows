import { NodeType } from '@automflows/shared';
import { ParsedStep } from './requestAnalyzer.js';
import { findPluginNodeByKeyword } from '../resources/nodeDocumentation.js';
import { DEFAULT_WAIT_MS } from '../config.js';

export interface SelectorInfo {
  selector: string;
  selectorType: 'text' | 'getByRole' | 'css' | 'xpath';
  /** 0-based index when multiple elements share the same selector text. Undefined when the selector is unique. */
  nth?: number;
}

export interface NodeConfig {
  type: string;
  data: Record<string, any>;
}

/**
 * Central node-creation factory used by all MCP workflow tools.
 * Given a ParsedStep and optional selector information, returns the
 * correct NodeType and data payload.
 */
export function buildNodeConfig(
  step: ParsedStep,
  selectorInfo?: SelectorInfo | null,
  lastExtractVariable?: string
): NodeConfig | null {
  const sel = selectorInfo?.selector;
  const selType = selectorInfo?.selectorType;

  switch (step.action) {
    case 'click':
    case 'submit': {
      const selector = sel || inferFallback(step.target, 'click');
      const selectorType = selType || 'css';
      const data: Record<string, any> = {
        label: step.action === 'submit' ? 'Submit form' : `Click ${step.target || 'element'}`,
        action: 'click',
        selector,
        selectorType,
      };
      if (selectorInfo?.nth !== undefined) {
        data.selectorModifiers = { nth: selectorInfo.nth };
      }
      return { type: NodeType.ACTION, data };
    }

    case 'type': {
      const selector = sel || inferFallback(step.target, 'type');
      const selectorType = selType || 'css';
      const data: Record<string, any> = {
        label: `Type ${step.value || 'text'}`,
        selector,
        selectorType,
        text: step.value || '',
        clearFirst: true,
      };
      if (selectorInfo?.nth !== undefined) {
        data.selectorModifiers = { nth: selectorInfo.nth };
      }
      return { type: NodeType.TYPE, data };
    }

    case 'fill': {
      const selector = sel || 'form input';
      const selectorType = selType || 'css';
      return {
        type: NodeType.TYPE,
        data: {
          label: 'Fill form',
          selector,
          selectorType,
          text: step.value || 'dummy data',
          clearFirst: true,
        },
      };
    }

    case 'keyboard': {
      if (step.shortcut) {
        return {
          type: NodeType.KEYBOARD,
          data: { label: `Shortcut ${step.shortcut}`, action: 'shortcut', shortcut: step.shortcut },
        };
      }
      return {
        type: NodeType.KEYBOARD,
        data: { label: `Press ${step.key || 'Enter'}`, action: 'press', key: step.key || 'Enter' },
      };
    }

    case 'wait': {
      const waitTime = step.value ? parseInt(step.value, 10) * 1000 : DEFAULT_WAIT_MS;
      return {
        type: NodeType.WAIT,
        data: {
          label: `Wait ${step.value || '2'}s`,
          waitType: 'timeout',
          value: String(waitTime),
          timeout: waitTime,
        },
      };
    }

    case 'verify': {
      const vType = step.verifyType || 'visible';
      const vSelector = step.verifySelector || 'body';
      const vExpected = step.verifyExpectedText;

      const genericExpected = /^(the\s+)?(products?|items?|data|results?|elements?|entries|values?)$/i;
      const hasSpecificExpected = vExpected && !genericExpected.test(vExpected.trim());

      if (vType === 'containsText' && !hasSpecificExpected && lastExtractVariable) {
        const verifyCode =
          `const expected = context.getVariable("${lastExtractVariable}") || context.getData("${lastExtractVariable}") || [];\n` +
          `const containerSelector = ${JSON.stringify(vSelector)};\n` +
          `const containerItems = await context.page.locator(containerSelector).allTextContents();\n` +
          `const containerText = containerItems.join(" ").toLowerCase();\n` +
          `let matched = 0;\n` +
          `for (const item of expected) {\n` +
          `  if (containerText.includes(item.toLowerCase())) matched++;\n` +
          `}\n` +
          `console.log("Verification:", matched, "/", expected.length, "items found");\n` +
          `if (matched === 0) throw new Error("None of the expected items found");`;
        return {
          type: NodeType.JAVASCRIPT_CODE,
          data: { label: 'Verify Contents', code: verifyCode },
        };
      }

      if (vType === 'url') {
        return {
          type: NodeType.VERIFY,
          data: {
            label: `Verify: ${step.description.substring(0, 40)}`,
            domain: 'browser',
            verificationType: 'url',
            selector: vSelector,
            expectedValue: vExpected,
          },
        };
      }

      if (vType === 'containsText') {
        return {
          type: NodeType.VERIFY,
          data: {
            label: `Verify: ${step.description.substring(0, 40)}`,
            domain: 'browser',
            verificationType: 'containsText',
            selector: vSelector,
            expectedValue: vExpected,
          },
        };
      }

      return {
        type: NodeType.VERIFY,
        data: {
          label: step.description.substring(0, 50),
          domain: 'browser',
          verificationType: 'visible',
          selector: vSelector,
        },
      };
    }

    case 'extract': {
      const outputVar = step.outputVariable || 'extractedData';
      const code = step.target
        ? `const el = context.page.locator(${JSON.stringify(step.target)});\n` +
          `const items = await el.allTextContents();\n` +
          `context.setData("${outputVar}", items);\n` +
          `context.setVariable("${outputVar}", items);\n` +
          `console.log("Extracted", items.length, "items into ${outputVar}");`
        : `const maxResults = parseInt(context.getData("maxResults") || context.getData("maxProducts")) || 10;\n` +
          `const items = await context.page.locator("h2").allTextContents();\n` +
          `const limited = items.slice(0, maxResults);\n` +
          `context.setData("${outputVar}", limited);\n` +
          `context.setVariable("${outputVar}", limited);\n` +
          `console.log("Extracted", limited.length, "items into ${outputVar}");`;
      return {
        type: NodeType.JAVASCRIPT_CODE,
        data: { label: 'Extract Data', code },
      };
    }

    case 'navigate': {
      if (!step.target) return null;
      return {
        type: NodeType.NAVIGATION,
        data: {
          label: `Navigate to ${step.target}`,
          action: 'navigate',
          url: step.target,
          waitUntil: 'networkidle',
        },
      };
    }

    case 'setConfig': {
      const config = step.configEntries && Object.keys(step.configEntries).length > 0
        ? step.configEntries
        : { key: 'value' };
      return {
        type: 'setConfig.setConfig',
        data: { label: 'Set Config', config },
      };
    }

    case 'loop': {
      const arrayVar = lastExtractVariable || step.loopVariable;
      return {
        type: NodeType.LOOP,
        data: {
          label: `Loop${arrayVar ? ` over ${arrayVar}` : ''}`,
          loopMode: arrayVar ? 'forEach' : 'doWhile',
          arrayVariable: arrayVar,
          condition: step.loopCount ? `index < ${step.loopCount}` : undefined,
          maxIterations: step.loopCount,
        },
      };
    }

    case 'code': {
      return {
        type: NodeType.JAVASCRIPT_CODE,
        data: {
          label: step.description.substring(0, 40),
          code: `// ${step.description}\n// Available: context.page, context.getData(), context.setData(), context.getVariable(), context.setVariable()`,
        },
      };
    }

    case 'unknown': {
      const pluginNode = findPluginNodeByKeyword(step.description.toLowerCase());
      if (pluginNode) {
        return {
          type: pluginNode.type,
          data: {
            label: pluginNode.label,
            ...(pluginNode.defaultData || {}),
          },
        };
      }
      return inferNodeFromDescription(step, selectorInfo);
    }

    default:
      return inferNodeFromDescription(step, selectorInfo);
  }
}

/**
 * Attempt to infer a node type from the step description when the action is 'unknown'
 * or falls through the default case. Matches description keywords to NodeTypes
 * that aren't directly represented in the ParsedStep action union.
 */
export function inferNodeFromDescription(
  step: ParsedStep,
  selectorInfo?: SelectorInfo | null
): NodeConfig | null {
  const desc = step.description.toLowerCase();
  const sel = selectorInfo?.selector;

  if (/\bscreenshot\b|\bcapture\s+page\b|\bcapture\s+screen\b/.test(desc)) {
    return {
      type: NodeType.SCREENSHOT,
      data: {
        label: 'Take Screenshot',
        action: 'fullPage',
        path: '${data.outputDirectory}/screenshot.png',
      },
    };
  }

  if (/\bscroll\s+down\b/.test(desc)) {
    return {
      type: NodeType.SCROLL,
      data: { label: 'Scroll Down', action: 'scrollBy', deltaY: 500 },
    };
  }
  if (/\bscroll\s+up\b/.test(desc)) {
    return {
      type: NodeType.SCROLL,
      data: { label: 'Scroll Up', action: 'scrollBy', deltaY: -500 },
    };
  }
  if (/\bscroll\s+to\s+top\b/.test(desc)) {
    return {
      type: NodeType.SCROLL,
      data: { label: 'Scroll to Top', action: 'scrollToTop' },
    };
  }
  if (/\bscroll\s+to\s+bottom\b/.test(desc)) {
    return {
      type: NodeType.SCROLL,
      data: { label: 'Scroll to Bottom', action: 'scrollToBottom' },
    };
  }
  if (/\bscroll\b/.test(desc)) {
    const selector = sel || step.target || '';
    return {
      type: NodeType.SCROLL,
      data: {
        label: `Scroll to ${step.target || 'element'}`,
        action: selector ? 'scrollToElement' : 'scrollBy',
        selector: selector || undefined,
        selectorType: selectorInfo?.selectorType || 'css',
        deltaY: selector ? undefined : 300,
      },
    };
  }

  if (/\bcurl\b/.test(desc)) {
    return {
      type: NodeType.API_CURL,
      data: {
        label: 'API cURL',
        curlCommand: step.value || step.target || 'curl https://api.example.com',
        contextKey: 'apiResponse',
      },
    };
  }

  if (/\bapi\b|\bhttp\b|\bfetch\b|\brequest\b/.test(desc)) {
    const urlMatch = step.description.match(/https?:\/\/[^\s,]+/);
    const methodMatch = desc.match(/\b(get|post|put|patch|delete)\b/);
    return {
      type: NodeType.API_REQUEST,
      data: {
        label: 'API Request',
        method: (methodMatch?.[1] || 'GET').toUpperCase(),
        url: urlMatch?.[0] || step.target || 'https://api.example.com',
        contextKey: 'apiResponse',
      },
    };
  }

  if (/\bget\s+text\b|\bget\s+attribute\b|\bcount\s+elements?\b|\bis\s+visible\b|\bis\s+enabled\b/.test(desc)) {
    let action = 'getText';
    if (/attribute/.test(desc)) action = 'getAttribute';
    if (/count/.test(desc)) action = 'getCount';
    if (/visible/.test(desc)) action = 'isVisible';
    if (/enabled/.test(desc)) action = 'isEnabled';
    const selector = sel || step.target || 'body';
    return {
      type: NodeType.ELEMENT_QUERY,
      data: {
        label: `Query: ${action}`,
        action,
        selector,
        selectorType: selectorInfo?.selectorType || 'css',
        outputVariable: step.outputVariable || 'queryResult',
      },
    };
  }

  if (/\bselect\s+dropdown\b|\bselect\s+option\b|\bcheck\s*box\b|\buncheck\b|\bupload\s+file\b/.test(desc)) {
    let action = 'select';
    if (/check/i.test(desc) && !/uncheck/i.test(desc)) action = 'check';
    if (/uncheck/i.test(desc)) action = 'uncheck';
    if (/upload/i.test(desc)) action = 'upload';
    const selector = sel || step.target || 'select';
    return {
      type: NodeType.FORM_INPUT,
      data: {
        label: `${action.charAt(0).toUpperCase() + action.slice(1)} ${step.target || 'element'}`,
        action,
        selector,
        selectorType: selectorInfo?.selectorType || 'css',
        values: step.value ? [step.value] : [],
      },
    };
  }

  if (/\bextract\s+all\s+links\b/.test(desc)) {
    return {
      type: NodeType.SMART_EXTRACTOR,
      data: { label: 'Extract All Links', mode: 'allLinks', outputVariable: 'extractedLinks', includeMetadata: true },
    };
  }
  if (/\bextract\s+(all\s+)?images?\b/.test(desc)) {
    return {
      type: NodeType.SMART_EXTRACTOR,
      data: { label: 'Extract Images', mode: 'allImages', outputVariable: 'extractedImages', includeMetadata: true },
    };
  }
  if (/\bextract\s+table\b/.test(desc)) {
    return {
      type: NodeType.SMART_EXTRACTOR,
      data: { label: 'Extract Table', mode: 'tables', tableIndex: 0, outputVariable: 'extractedTable' },
    };
  }
  if (/\bscrape\b|\bextract\s+structured\b|\bdata\s+extract/.test(desc)) {
    return {
      type: NodeType.DATA_EXTRACTOR,
      data: {
        label: 'Extract Data',
        containerSelector: step.target || '.item',
        containerSelectorType: 'css',
        fields: [],
        outputVariable: step.outputVariable || 'extractedData',
      },
    };
  }

  if (/\bsave\s+to\s+csv\b|\bwrite\s+csv\b|\bexport\s+csv\b/.test(desc)) {
    return {
      type: NodeType.CSV_HANDLE,
      data: {
        label: 'Save to CSV',
        action: 'write',
        filePath: '${data.outputDirectory}/output.csv',
        dataSource: 'extractedData',
        headers: [],
        delimiter: ',',
      },
    };
  }
  if (/\bread\s+csv\b|\bload\s+csv\b|\bimport\s+csv\b/.test(desc)) {
    return {
      type: NodeType.CSV_HANDLE,
      data: {
        label: 'Read CSV',
        action: 'read',
        filePath: step.target || step.value || 'input.csv',
        contextKey: 'csvData',
        delimiter: ',',
      },
    };
  }

  if (/\baccept\s+(alert|dialog|popup)\b/.test(desc)) {
    return {
      type: NodeType.DIALOG,
      data: { label: 'Accept Dialog', action: 'accept' },
    };
  }
  if (/\bdismiss\s+(alert|dialog|popup)\b/.test(desc)) {
    return {
      type: NodeType.DIALOG,
      data: { label: 'Dismiss Dialog', action: 'dismiss' },
    };
  }
  if (/\bwait\s+for\s+(alert|dialog|popup)\b/.test(desc)) {
    return {
      type: NodeType.DIALOG,
      data: { label: 'Wait for Dialog', action: 'waitForDialog' },
    };
  }

  if (/\bwait\s+for\s+download\b/.test(desc)) {
    return {
      type: NodeType.DOWNLOAD,
      data: { label: 'Wait for Download', action: 'waitForDownload', outputVariable: 'downloadPath' },
    };
  }
  if (/\bsave\s+download\b|\bdownload\b/.test(desc)) {
    return {
      type: NodeType.DOWNLOAD,
      data: { label: 'Save Download', action: 'saveDownload', outputVariable: 'downloadPath', savePath: step.value },
    };
  }

  if (/\bswitch\s+to\s+iframe\b|\benter\s+iframe\b/.test(desc)) {
    const selector = sel || step.target || 'iframe';
    return {
      type: NodeType.IFRAME,
      data: {
        label: 'Switch to Iframe',
        action: 'switchToIframe',
        selector,
        selectorType: selectorInfo?.selectorType || 'css',
      },
    };
  }
  if (/\bswitch\s+to\s+main\s*frame\b|\bleave\s+iframe\b|\bexit\s+iframe\b/.test(desc)) {
    return {
      type: NodeType.IFRAME,
      data: { label: 'Switch to Main Frame', action: 'switchToMainFrame' },
    };
  }

  if (/\bset\s+viewport\b|\bresize\s+viewport\b/.test(desc)) {
    return {
      type: NodeType.CONTEXT_MANIPULATE,
      data: { label: 'Set Viewport Size', action: 'setViewportSize', viewportWidth: 1280, viewportHeight: 720 },
    };
  }
  if (/\bset\s+geolocation\b|\bgeo\s*location\b/.test(desc)) {
    return {
      type: NodeType.CONTEXT_MANIPULATE,
      data: { label: 'Set Geolocation', action: 'setGeolocation', geolocation: { latitude: 0, longitude: 0 } },
    };
  }
  if (/\bemulate\s+device\b|\bmobile\s+emulation\b/.test(desc)) {
    return {
      type: NodeType.CONTEXT_MANIPULATE,
      data: { label: 'Emulate Device', action: 'emulateDevice', device: 'iPhone 12' },
    };
  }
  if (/\bset\s+user\s*agent\b/.test(desc)) {
    return {
      type: NodeType.CONTEXT_MANIPULATE,
      data: { label: 'Set User Agent', action: 'setUserAgent', userAgent: step.value || '' },
    };
  }
  if (/\bdark\s*mode\b|\bcolor\s*scheme\b/.test(desc)) {
    return {
      type: NodeType.CONTEXT_MANIPULATE,
      data: { label: 'Set Color Scheme', action: 'setColorScheme', colorScheme: 'dark' },
    };
  }

  if (/\bget\s+cookie\b|\bread\s+cookie\b/.test(desc)) {
    return {
      type: NodeType.STORAGE,
      data: { label: 'Get Cookies', action: 'getCookie', contextKey: 'cookies' },
    };
  }
  if (/\bset\s+cookie\b/.test(desc)) {
    return {
      type: NodeType.STORAGE,
      data: { label: 'Set Cookie', action: 'setCookie', name: step.target || 'cookie', value: step.value || '', url: '' },
    };
  }
  if (/\bclear\s+cookie\b/.test(desc)) {
    return {
      type: NodeType.STORAGE,
      data: { label: 'Clear Cookies', action: 'clearCookies' },
    };
  }
  if (/\bget\s+local\s*storage\b|\bread\s+local\s*storage\b/.test(desc)) {
    return {
      type: NodeType.STORAGE,
      data: { label: 'Get localStorage', action: 'getLocalStorage', key: step.target || '', contextKey: 'storageValue' },
    };
  }
  if (/\bset\s+local\s*storage\b/.test(desc)) {
    return {
      type: NodeType.STORAGE,
      data: { label: 'Set localStorage', action: 'setLocalStorage', key: step.target || '', value: step.value || '' },
    };
  }

  const pluginNode = findPluginNodeByKeyword(desc);
  if (pluginNode) {
    return {
      type: pluginNode.type,
      data: { label: pluginNode.label, ...(pluginNode.defaultData || {}) },
    };
  }

  return null;
}

/**
 * CSS fallback selector when no snapshot/text selector is available.
 */
export function inferFallback(target: string | undefined, action: string): string {
  if (!target) return action === 'click' ? 'button' : 'input';
  const t = target.toLowerCase();
  if (t.includes('search')) return 'input[type="search"], input[name*="search"]';
  if (t.includes('button')) return 'button';
  if (t.includes('link')) return 'a';
  if (t.includes('input') || t.includes('field')) return 'input';
  if (/^[a-zA-Z\s]+$/.test(target.trim())) {
    return action === 'click'
      ? `button:has-text("${target.trim()}"), a:has-text("${target.trim()}")`
      : 'input';
  }
  return action === 'click' ? 'button' : 'input';
}
