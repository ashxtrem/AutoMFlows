/**
 * Common Patterns Resource
 * Practical tips, common pitfalls, and proven workflow patterns
 * from real-world usage and debugging sessions.
 */

export interface CommonPatternsGuide {
  pitfalls: Pitfall[];
  provenPatterns: ProvenPattern[];
  pluginNodeGuide: PluginNodeGuideEntry[];
  waitRetryStrategies: string[];
  domainSelectors: Record<string, string>;
}

interface Pitfall {
  title: string;
  problem: string;
  solution: string;
}

interface ProvenPattern {
  name: string;
  description: string;
  nodeSequence: string;
  tips: string[];
}

interface PluginNodeGuideEntry {
  type: string;
  label: string;
  usage: string;
  dataFields: { name: string; description: string }[];
  notes: string[];
}

export function getCommonPatternsGuide(): CommonPatternsGuide {
  return {
    pitfalls: [
      {
        title: 'setConfig stores literal strings, not interpolated values',
        problem:
          'Using ${data.x} inside a setConfig node\'s "value" field stores the literal string "${data.x}" rather than the resolved value.',
        solution:
          'Use setConfig for static configuration only. For dynamic values, use a javascriptCode node with context.setData(key, context.getData("source")).',
      },
      {
        title: 'Playwright strict mode: multiple elements match',
        problem:
          'Playwright throws "strict mode violation" when a selector matches more than one element. Common with generic selectors like "button" or ".btn".',
        solution:
          'Add selectorModifiers.nth (e.g., nth: 0 for first match) or refine the selector. Prefer getByRole with name for specificity.',
      },
      {
        title: 'scrollThenAction interferes with clicks',
        problem:
          'Enabling scrollThenAction scrolls the element into view, but overlays (sticky headers, cookie banners) can cover the target, causing clicks on the wrong element.',
        solution:
          'Set scrollThenAction: false when overlays are present, or dismiss the overlay first. Alternatively, use force: true on the action node.',
      },
      {
        title: 'Overlays/notifications pollute element queries',
        problem:
          'Notification toasts, cookie consent banners, or modal overlays contain text that matches selectors intended for main content, returning wrong data.',
        solution:
          'Extract data BEFORE triggering actions that show overlays. Alternatively, use selectorModifiers.filterSelector to scope queries to a specific container.',
      },
      {
        title: 'New tab opens but actions target old tab',
        problem:
          'Clicking a link that opens a new tab does not automatically switch Playwright\'s context. Subsequent actions still target the original tab.',
        solution:
          'Add a navigation node with action="switchTab" and tabIndex=1 (or the appropriate index) after the click. Close the tab with action="closeTab" when done.',
      },
      {
        title: 'Loop back-edge causes circular dependency',
        problem:
          'Creating an edge from the last loop body node back to the loop node causes topological sort to fail with a circular dependency error.',
        solution:
          'Do NOT connect the last body node back to the loop. The loop node handles iteration internally. Connect loop --[loopComplete]--> next node after the loop.',
      },
      {
        title: 'elementQuery returns undefined for dynamically loaded content',
        problem:
          'Querying text or attributes from elements that haven\'t finished loading returns undefined or empty string.',
        solution:
          'Add a wait node (waitType="selector") before the elementQuery to ensure the target element is present. Or set waitForSelector: true on the elementQuery node.',
      },
      {
        title: 'API request body not sent correctly',
        problem:
          'API request node sends body as string "[object Object]" instead of JSON.',
        solution:
          'Ensure the body field contains a valid JSON object, not a stringified version. The node handles JSON serialization internally.',
      },
      {
        title: 'getByRole selector format errors',
        problem:
          'Using wrong format like "button,Submit" instead of "role:button,name:Submit" causes selector creation to fail.',
        solution:
          'Always use colon-separated key:value pairs: "role:<role>,name:<name>". The format is "role:button,name:Submit,exact:true".',
      },
      {
        title: 'Variable interpolation in non-string fields',
        problem:
          'Using ${data.x} in numeric fields like timeout or tabIndex does not work — the field receives the literal string.',
        solution:
          'Variable interpolation only works on string fields. For dynamic numeric values, use a javascriptCode node to compute and store the value, then reference it in the target field.',
      },
    ],

    provenPatterns: [
      {
        name: 'E-commerce product verification',
        description: 'Search for a product, add to cart, navigate to cart, verify the product is there.',
        nodeSequence: 'start → openBrowser → navigate(url) → type(search) → action(click search) → wait(selector:.results) → action(click product) → elementQuery(getText product name → "productName") → action(click Add to Cart) → navigate(cart) → verify(contains, "${data.productName}")',
        tips: [
          'Extract product name BEFORE adding to cart (overlays may change the page)',
          'Use wait nodes after navigation to ensure page loads',
          'Use selectorModifiers.nth when product listings have identical selectors',
        ],
      },
      {
        name: 'Form filling with validation',
        description: 'Fill a multi-field form and verify success.',
        nodeSequence: 'start → openBrowser → navigate(url) → wait(selector:form) → type(field1) → type(field2) → formInput(select dropdown) → formInput(check checkbox) → action(click submit) → wait(url:*/success*) → verify(text, "Thank you")',
        tips: [
          'Use getByLabel or getByPlaceholder selectors for form inputs — more resilient than CSS',
          'Add wait between form submission and verification (for server response)',
          'Use ${dynamic.randomEmail} for unique test data in email fields',
        ],
      },
      {
        name: 'API + Browser integration test',
        description: 'Create data via API, then verify it appears in the browser UI.',
        nodeSequence: 'start → apiRequest(POST create item) → javascriptCode(extract ID) → openBrowser → navigate(url with ${data.itemId}) → verify(text, "${data.itemName}")',
        tips: [
          'Store API response fields with descriptive keys using contextKey',
          'Use javascriptCode to extract nested response fields',
          'Verify both the API response (verify domain="api") and browser state (verify domain="browser")',
        ],
      },
      {
        name: 'Data extraction and CSV export',
        description: 'Navigate to a page, extract repeating data, save to CSV.',
        nodeSequence: 'start → openBrowser → navigate(url) → wait(selector:.data-loaded) → dataExtractor(containerSelector, fields) → csvHandle(write to file)',
        tips: [
          'Use dataExtractor for structured repeating data (product cards, table rows)',
          'Use smartExtractor for quick extraction without writing selectors (allLinks, tables, repeatedItems)',
          'dataExtractor can write directly to CSV: set saveToCSV=true and csvFilePath',
        ],
      },
      {
        name: 'Multi-page loop scraping',
        description: 'Loop through pages or items, extracting data from each.',
        nodeSequence: 'start → openBrowser → navigate(listing page) → elementQuery(getAllText links → "pageUrls") → loop(forEach, arrayVariable="pageUrls") → [loop body: navigate("${variables.item}") → elementQuery(extract data) → csvHandle(append)] → [loopComplete: verify/cleanup]',
        tips: [
          'Extract all page URLs first, then iterate — avoids stale element issues',
          'Use csvHandle action="append" inside the loop to accumulate data',
          'Connect loop body nodes from loop\'s "output" handle, post-loop from "loopComplete"',
        ],
      },
      {
        name: 'Login with config file',
        description: 'Load credentials from config file, login, verify dashboard.',
        nodeSequence: 'start → loadConfigFile("config/env.json") → openBrowser → navigate("${variables.baseUrl}/login") → type(username, "${variables.username}") → type(password, "${variables.password}") → action(click Login) → wait(url:*/dashboard*) → verify(visible, ".dashboard")',
        tips: [
          'Keep credentials in config files, never hardcode in workflow JSON',
          'loadConfigFile sets values as workflow variables, accessed via ${variables.key}',
          'Use wait after login click to ensure redirect completes before verification',
        ],
      },
    ],

    pluginNodeGuide: [
      {
        type: 'setConfig.setConfig',
        label: 'Set Config',
        usage: 'Store a key-value pair in the data context. Acts as a simple data initialization node. Value is stored as-is (no interpolation).',
        dataFields: [
          { name: 'key', description: 'The key name to store the value under (accessible via ${data.<key>})' },
          { name: 'value', description: 'The literal string value to store' },
        ],
        notes: [
          'Values are stored as literal strings — NO variable interpolation occurs in the value field',
          'Access stored values with ${data.<key>} in subsequent nodes',
          'Use multiple setConfig nodes for multiple key-value pairs',
          'For dynamic values, use javascriptCode with context.setData() instead',
        ],
      },
      {
        type: 'switch.switch',
        label: 'Switch',
        usage: 'Conditional branching based on a condition. Routes execution to different paths based on the evaluation result.',
        dataFields: [
          { name: 'conditionType', description: '"expression" (JS expression), "equals" (simple equality), "contains" (substring check)' },
          { name: 'conditionValue', description: 'The value or expression to evaluate' },
          { name: 'compareWith', description: 'The value to compare against (for equals/contains types)' },
        ],
        notes: [
          'Switch node has two output handles: "true" and "false"',
          'Use sourceHandle="true" for the edge to the true-path nodes',
          'Use sourceHandle="false" for the edge to the false-path nodes',
          'Expression type evaluates JS: supports ${data.x} interpolation in conditionValue',
        ],
      },
      {
        type: 'reusable.runReusable',
        label: 'Run Reusable',
        usage: 'Execute a saved reusable workflow as a sub-flow. Inputs/outputs are passed via the data context.',
        dataFields: [
          { name: 'workflowPath', description: 'Path to the reusable workflow JSON file' },
          { name: 'inputMapping', description: 'Map parent data keys to reusable workflow input keys' },
          { name: 'outputMapping', description: 'Map reusable workflow output keys back to parent data keys' },
        ],
        notes: [
          'Reusable workflows run in the same browser context (shared page)',
          'Input/output mappings allow data to flow between parent and child workflows',
          'Use for repeated sequences like login, search, or cleanup',
        ],
      },
    ],

    waitRetryStrategies: [
      'Always add a wait node after navigation (waitType="selector" for a key element, or waitType="url" for URL change).',
      'Set waitForSelector: true on action/type nodes for dynamic pages where elements may load asynchronously.',
      'Use retryEnabled: true with retryCount: 3 and retryDelay: 1000 for flaky operations (e.g., elements behind animations).',
      'Prefer waitType="selector" over waitType="timeout" — selector-based waits are faster and more reliable.',
      'For SPA navigation (no full page reload), use waitType="selector" targeting a unique element on the destination view.',
      'Set failSilently: true on optional verification nodes that should not abort the workflow on failure.',
      'Use waitAfterOperation (ms) on action nodes when a click triggers an animation or transition that needs to complete before the next step.',
    ],

    domainSelectors: getDomainSelectors(),
  };
}

/**
 * Configurable map of domain keywords to fallback CSS selectors.
 * Used by RequestAnalyzer when no explicit selector is provided in a verify step.
 * Keys are matched against the step text via word-boundary regex.
 */
export function getDomainSelectors(): Record<string, string> {
  return {
    cart: '[class*="cart"], [id*="cart"], [data-testid*="cart"], [role="list"]',
    product: '.product-title, [data-testid*="product"], h1',
    login: '[class*="login"], form[action*="login"], #loginForm',
    search: '[class*="search"], input[type="search"], [role="search"]',
    form: 'form, [role="form"]',
    checkout: '[class*="checkout"], [id*="checkout"], [data-testid*="checkout"]',
    navigation: 'nav, [role="navigation"]',
    modal: '[role="dialog"], .modal, [class*="modal"]',
  };
}

export function getCommonPatternsAsResource(): string {
  return JSON.stringify(getCommonPatternsGuide(), null, 2);
}
