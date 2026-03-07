/**
 * Variable Interpolation Resource
 * Documents ${data.key}, ${variables.name}, and ${dynamic.key} syntax,
 * supported fields, and data flow patterns.
 */

export interface VariableInterpolationGuide {
  overview: string;
  syntaxPatterns: SyntaxPattern[];
  dataFlowPatterns: DataFlowPattern[];
  supportedFields: string;
  dynamicVariableKeys: string[];
  pitfalls: string[];
}

interface SyntaxPattern {
  pattern: string;
  source: string;
  description: string;
  examples: string[];
}

interface DataFlowPattern {
  name: string;
  description: string;
  steps: string[];
}

export function getVariableInterpolationGuide(): VariableInterpolationGuide {
  return {
    overview:
      'AutoMFlows supports variable interpolation in most string fields of node configurations. ' +
      'At execution time, ${data.key}, ${variables.key}, and ${dynamic.key} patterns in string values are replaced with actual values from the execution context. ' +
      'Interpolation uses dot-notation for nested access and bracket notation for keys with special characters.',

    syntaxPatterns: [
      {
        pattern: '${data.<key>[.<nested>...]}',
        source: 'Inter-node data store (context.setData / elementQuery / apiRequest results)',
        description:
          'Access data set by previous nodes. elementQuery stores results under outputVariable; apiRequest stores responses under contextKey. Supports nested paths.',
        examples: [
          '${data.productTitle}           — value set by elementQuery outputVariable="productTitle"',
          '${data.apiResponse.body.id}    — nested access into API response body',
          '${data.items[0].name}          — array index access',
          "${data.headers['content-type']} — bracket notation for special keys",
        ],
      },
      {
        pattern: '${variables.<key>[.<nested>...]}',
        source: 'Workflow variables (context.setVariable, loop variables, config values)',
        description:
          'Access workflow variables. Loop nodes set "item" and "index" variables each iteration. ' +
          'loadConfigFile loads all keys as variables. javascriptCode nodes can set variables via context.setVariable().',
        examples: [
          '${variables.baseUrl}           — variable set by loadConfigFile or javascriptCode',
          '${variables.item.name}         — current loop item property (forEach mode)',
          '${variables.index}             — current loop iteration index',
        ],
      },
      {
        pattern: '${dynamic.<key>}',
        source: 'Faker.js dynamic data generation (generated fresh each time)',
        description:
          'Generates random test data on each evaluation. Useful for creating unique usernames, emails, etc. during test execution.',
        examples: [
          '${dynamic.randomEmail}         — e.g. "john.doe@example.com"',
          '${dynamic.randomFirstName}     — e.g. "Alice"',
          '${dynamic.guid}               — UUID v4',
          '${dynamic.timestamp}          — Unix timestamp',
          '${dynamic.randomPassword}     — random 12-char password',
        ],
      },
    ],

    dataFlowPatterns: [
      {
        name: 'elementQuery → type/verify (extract-then-use)',
        description:
          'Extract a value from the page, store it in the data context, then reference it in a later node.',
        steps: [
          'elementQuery node: action="getText", selector=".product-name", outputVariable="productName"',
          'type node: text="${data.productName}" to type the extracted value into a search field',
          'verify node: expectedValue="${data.productName}" to assert the value appears elsewhere',
        ],
      },
      {
        name: 'setConfig → browser nodes (config-driven)',
        description:
          'Use a setConfig.setConfig plugin node to store key-value pairs, then reference them throughout the workflow. ' +
          'IMPORTANT: setConfig stores literal strings — it does NOT interpolate values. Use it for static configuration.',
        steps: [
          'setConfig.setConfig node: key="loginUrl", value="https://example.com/login"',
          'navigation node: url="${data.loginUrl}"',
          'setConfig.setConfig node: key="username", value="testuser@example.com"',
          'type node: text="${data.username}" selector="input[name=email]"',
        ],
      },
      {
        name: 'loadConfigFile → variable references',
        description:
          'Load a JSON or Env config file to populate workflow variables, then reference them anywhere.',
        steps: [
          'loadConfigFile node: filePath="config/env.json"  (file contains {"baseUrl":"https://app.example.com","apiKey":"abc123"})',
          'navigation node: url="${variables.baseUrl}/dashboard"',
          'apiRequest node: headers={"Authorization": "Bearer ${variables.apiKey}"}',
        ],
      },
      {
        name: 'apiRequest → browser interaction (API-to-UI)',
        description:
          'Make an API call, store the response, then use response data in browser actions.',
        steps: [
          'apiRequest node: method="POST", url="https://api.example.com/login", contextKey="loginApi"',
          'javascriptCode node: extract token with context.setData("token", context.getData("loginApi").body.token)',
          'navigation node: url="https://app.example.com/dashboard?token=${data.token}"',
        ],
      },
      {
        name: 'loop forEach (iterating over extracted data)',
        description:
          'Extract a list of items, then loop over each item to perform actions.',
        steps: [
          'elementQuery node: action="getAllText", selector=".product-link", outputVariable="productLinks"',
          'loop node: mode="forEach", arrayVariable="productLinks"',
          'Inside loop body — navigation node: url="${variables.item}" (each link)',
          'Inside loop body — screenshot or elementQuery to capture data from each page',
        ],
      },
    ],

    supportedFields:
      'Interpolation works on ALL string-typed node data fields that go through the variable interpolator. ' +
      'This includes: url, text, selector, value, expectedValue, body, headers, filePath, contextKey, key, and most other string properties. ' +
      'Non-string fields (booleans, numbers, enums like action/waitType) are NOT interpolated.',

    dynamicVariableKeys: [
      'guid', 'randomUUID', 'timestamp', 'isoTimestamp',
      'randomAlphaNumeric', 'randomBoolean', 'randomInt', 'randomColor', 'randomHexColor',
      'randomFirstName', 'randomLastName', 'randomFullName', 'randomNamePrefix', 'randomNameSuffix',
      'randomEmail', 'randomPassword', 'randomUsername', 'randomUrl', 'randomDomain',
      'randomIP', 'randomIPV6', 'randomMACAddress', 'randomUserAgent', 'randomProtocol',
      'randomCity', 'randomCountry', 'randomCountryCode', 'randomLatitude', 'randomLongitude',
      'randomStreetName', 'randomStreetAddress', 'randomPhoneNumber', 'randomZipCode', 'randomState',
      'randomCompanyName', 'randomJobTitle', 'randomDepartment', 'randomProductName',
      'randomBankAccount', 'randomCreditCardNumber', 'randomCurrency', 'randomCurrencyCode', 'randomAmount',
      'randomDatePast', 'randomDateFuture', 'randomDateRecent', 'randomMonth', 'randomWeekday', 'randomYear',
      'randomWord', 'randomWords', 'randomSentence', 'randomParagraph',
      'randomNumber', 'randomFloat', 'randomAlpha', 'randomNumeric',
      'randomImageUrl', 'randomAvatar',
    ],

    pitfalls: [
      'setConfig stores LITERAL strings. Writing value="${data.x}" in a setConfig node will store the literal text "${data.x}", not the resolved value. Use setConfig for static values only; for dynamic values, use javascriptCode with context.setData().',
      'If a ${...} reference cannot be resolved (key not found), the original placeholder is left as-is — it does not throw an error. Check for missing data keys if you see raw ${...} in output.',
      'Interpolation only applies to string fields. Setting a number field like "timeout" to "${data.myTimeout}" will NOT work — it will be treated as a literal string.',
      'Bracket notation (data.headers["content-type"]) is required when keys contain hyphens or dots.',
      'Array index access uses bracket notation: ${data.items[0].name}.',
      'Dynamic variables (${dynamic.*}) generate a NEW random value each time they are evaluated. Use data context (setData) to persist a generated value across multiple nodes.',
    ],
  };
}

export function getVariableInterpolationGuideAsResource(): string {
  return JSON.stringify(getVariableInterpolationGuide(), null, 2);
}
