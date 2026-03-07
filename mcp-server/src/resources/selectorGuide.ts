/**
 * Selector Guide Resource
 * Comprehensive reference for selector types, format strings, SelectorModifiers,
 * and their application order with examples.
 */

export interface SelectorGuide {
  selectorTypes: SelectorTypeDoc[];
  selectorModifiers: SelectorModifierDoc;
  modifierApplicationOrder: string[];
  tips: string[];
}

interface SelectorTypeDoc {
  type: string;
  description: string;
  format: string;
  examples: string[];
}

interface SelectorModifierDoc {
  description: string;
  fields: { name: string; type: string; description: string; example: string }[];
}

export function getSelectorGuide(): SelectorGuide {
  return {
    selectorTypes: [
      {
        type: 'css',
        description: 'Standard CSS selector. Pierces shadow DOM by default in Playwright.',
        format: '<CSS selector string>',
        examples: [
          'button.submit',
          '#login-form input[type="email"]',
          '.product-card:nth-child(2) .price',
          '[data-testid="checkout-btn"]',
        ],
      },
      {
        type: 'xpath',
        description: 'XPath selector. Use when CSS cannot express the query (e.g., text-based or ancestor traversal).',
        format: '<XPath expression>',
        examples: [
          '//button[contains(text(),"Submit")]',
          '//div[@class="product"]//span[@class="price"]',
          '//input[@name="username"]',
        ],
      },
      {
        type: 'text',
        description: 'Auto-detect selector: resolves plain text to the best Playwright locator (getByRole, getByLabel, getByPlaceholder, getByText) at runtime. Throws if multiple elements match without disambiguation modifiers. Use for simple text-based targeting.',
        format: '<visible text or label>',
        examples: ['Submit', 'Add to Cart', 'Email Address'],
      },
      {
        type: 'getByRole',
        description: 'Playwright getByRole locator. Best for accessibility-first selectors. Supports ARIA roles and options.',
        format: 'role:<ariaRole>,name:<accessibleName>[,exact:true][,hidden:true]',
        examples: [
          'role:button,name:Submit',
          'role:link,name:Sign In',
          'role:textbox,name:Email',
          'role:heading,name:Welcome,exact:true',
          'role:checkbox,name:Remember me',
          'role:combobox,name:Country',
          'role:tab,name:Settings',
        ],
      },
      {
        type: 'getByText',
        description: 'Match elements by visible text content. Supports exact strings or regex.',
        format: 'text:<value> or text:/<regex>/',
        examples: [
          'text:Add to Cart',
          'text:Welcome back',
          'text:/^Total: \\$\\d+/',
        ],
      },
      {
        type: 'getByLabel',
        description: 'Match form inputs by their associated label text.',
        format: 'label:<label text>',
        examples: ['label:Email Address', 'label:Password', 'label:First Name'],
      },
      {
        type: 'getByPlaceholder',
        description: 'Match inputs by placeholder text.',
        format: 'placeholder:<placeholder text>',
        examples: ['placeholder:Search...', 'placeholder:Enter your email'],
      },
      {
        type: 'getByTestId',
        description: 'Match elements by data-testid attribute.',
        format: 'testid:<testid value>',
        examples: ['testid:submit-button', 'testid:product-card'],
      },
      {
        type: 'getByTitle',
        description: 'Match elements by title attribute.',
        format: 'title:<title text>',
        examples: ['title:Close', 'title:More options'],
      },
      {
        type: 'getByAltText',
        description: 'Match images by alt text. Supports exact strings or regex.',
        format: 'alt:<alt text> or alt:/<regex>/',
        examples: ['alt:Company Logo', 'alt:/product-image-.*/'],
      },
    ],
    selectorModifiers: {
      description:
        'SelectorModifiers refine a locator after the base selector resolves. Place in the node\'s "selectorModifiers" object alongside "selector" and "selectorType". All fields are optional.',
      fields: [
        {
          name: 'nth',
          type: 'number',
          description:
            'Select the nth matching element (0-based, -1 = last). CRITICAL for avoiding Playwright strict-mode errors when multiple elements match.',
          example: '{ "selectorModifiers": { "nth": 0 } }',
        },
        {
          name: 'filterText',
          type: 'string',
          description:
            'Filter matches to those containing this text (or regex if filterTextRegex is true). Maps to Playwright .filter({ hasText }).',
          example: '{ "selectorModifiers": { "filterText": "Add to Cart" } }',
        },
        {
          name: 'filterTextRegex',
          type: 'boolean',
          description:
            'When true, treat filterText as a regular expression instead of a literal string.',
          example: '{ "selectorModifiers": { "filterText": "^\\\\$\\\\d+", "filterTextRegex": true } }',
        },
        {
          name: 'filterSelector',
          type: 'string',
          description:
            'Filter matches to those containing a child matching this selector. Maps to Playwright .filter({ has: locator }).',
          example: '{ "selectorModifiers": { "filterSelector": ".in-stock" } }',
        },
        {
          name: 'filterSelectorType',
          type: 'SelectorType',
          description:
            'Selector type for filterSelector (default: "css").',
          example: '{ "selectorModifiers": { "filterSelector": "role:img", "filterSelectorType": "getByRole" } }',
        },
        {
          name: 'chainSelector',
          type: 'string',
          description:
            'Scoped sub-query within each match. Maps to Playwright .locator(chainSelector). Use to drill into a container.',
          example: '{ "selectorModifiers": { "chainSelector": ".price" } }',
        },
        {
          name: 'chainSelectorType',
          type: 'SelectorType',
          description:
            'Selector type for chainSelector (default: "css"). Set to "xpath" for XPath chain queries.',
          example: '{ "selectorModifiers": { "chainSelector": ".//span", "chainSelectorType": "xpath" } }',
        },
        {
          name: 'pierceShadow',
          type: 'boolean',
          description:
            'CSS selectors pierce shadow DOM by default in Playwright. Set to false to restrict to light DOM only (adds css:light= prefix). Only applies to selectorType "css".',
          example: '{ "selectorModifiers": { "pierceShadow": false } }',
        },
      ],
    },
    modifierApplicationOrder: [
      '1. filterText  →  locator.filter({ hasText })',
      '2. filterSelector  →  locator.filter({ has: childLocator })',
      '3. chainSelector  →  locator.locator(chainSelector)',
      '4. nth  →  locator.nth(n)',
    ],
    tips: [
      'Prefer getByRole over CSS/XPath for resilience. Accessibility selectors survive UI refactors.',
      'When multiple elements match, use selectorModifiers.nth (e.g., nth: 0 for first) to avoid Playwright strict-mode errors.',
      'Combine filterText + nth when you need "the first product card containing text X".',
      'chainSelector is useful for extracting sub-elements: set the main selector to a container, then chain to the child element.',
      'The "text" selectorType auto-detects the best strategy at runtime. Great for quick prototyping, but getByRole is more explicit and reliable.',
      'getByRole format uses colon-separated key:value pairs separated by commas: "role:button,name:Submit,exact:true".',
      'For regex in getByText/getByAltText, wrap the pattern in forward slashes: "text:/pattern/".',
    ],
  };
}

export function getSelectorGuideAsResource(): string {
  return JSON.stringify(getSelectorGuide(), null, 2);
}
