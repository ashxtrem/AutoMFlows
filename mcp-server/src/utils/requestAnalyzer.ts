export interface RequestClarity {
  isClear: boolean;
  clarityScore: number; // 0-1, higher is clearer
  sequentialSteps?: string[];
  ambiguousParts?: string[];
  clarificationQuestions?: string[];
}

export interface ParsedStep {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'fill' | 'submit' | 'unknown';
  target?: string;
  value?: string;
  selector?: string;
  description: string;
}

export class RequestAnalyzer {
  /**
   * Analyzes user request to determine if it's clear and actionable
   */
  static analyzeClarity(userRequest: string): RequestClarity {
    const requestLower = userRequest.toLowerCase();
    
    // Check for sequential indicators
    const sequentialIndicators = [
      /\d+\./g, // Numbered steps: "1. do this 2. do that"
      /then\s+/gi,
      /after\s+that/gi,
      /next\s+/gi,
      /finally\s+/gi,
      /and\s+then/gi,
      /followed\s+by/gi,
    ];

    let hasSequentialStructure = false;
    for (const indicator of sequentialIndicators) {
      if (indicator.test(userRequest)) {
        hasSequentialStructure = true;
        break;
      }
    }

    // Check for action verbs
    const actionVerbs = [
      'navigate', 'goto', 'go to', 'visit', 'open',
      'click', 'press', 'select',
      'type', 'enter', 'fill', 'input',
      'wait', 'pause',
      'submit', 'send',
      'search', 'find',
      'add', 'remove', 'delete',
      'login', 'logout', 'register', 'sign up', 'sign in',
    ];

    const foundActions = actionVerbs.filter(verb => 
      requestLower.includes(verb)
    );

    // Check for URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    const hasUrl = urlPattern.test(userRequest);

    // Check for ambiguous terms
    const ambiguousTerms = [
      'something', 'some', 'thing', 'stuff',
      'etc', 'and so on', 'and more',
      'maybe', 'perhaps', 'possibly',
      'various', 'different', 'multiple',
    ];

    const ambiguousParts: string[] = [];
    for (const term of ambiguousTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = userRequest.match(regex);
      if (matches) {
        ambiguousParts.push(...matches);
      }
    }

    // Calculate clarity score
    let clarityScore = 0;
    
    // Has URL: +0.3
    if (hasUrl) clarityScore += 0.3;
    
    // Has action verbs: +0.2 per action (max 0.4)
    clarityScore += Math.min(foundActions.length * 0.2, 0.4);
    
    // Has sequential structure: +0.2
    if (hasSequentialStructure) clarityScore += 0.2;
    
    // Has ambiguous terms: -0.1 per term (min 0)
    clarityScore = Math.max(0, clarityScore - ambiguousParts.length * 0.1);
    
    // Has specific selectors or element descriptions: +0.1
    const hasSpecificElements = /(button|input|link|form|field|element|selector)/i.test(userRequest);
    if (hasSpecificElements) clarityScore += 0.1;

    const isClear = clarityScore >= 0.5 && foundActions.length > 0;

    // Generate clarification questions if unclear
    const clarificationQuestions: string[] = [];
    if (!isClear) {
      if (!hasUrl && (foundActions.includes('navigate') || foundActions.includes('goto'))) {
        clarificationQuestions.push('What URL should I navigate to?');
      }
      if (foundActions.includes('click') && !/(button|link|element|selector)/i.test(userRequest)) {
        clarificationQuestions.push('What element should I click on? (button, link, etc.)');
      }
      if (foundActions.includes('type') || foundActions.includes('fill')) {
        if (!/(field|input|form|selector)/i.test(userRequest)) {
          clarificationQuestions.push('Which form fields should I fill?');
        }
        if (!/(data|value|text|information)/i.test(userRequest)) {
          clarificationQuestions.push('What data should I enter in the form fields?');
        }
      }
      if (ambiguousParts.length > 0) {
        clarificationQuestions.push(`Could you clarify what you mean by: ${ambiguousParts.join(', ')}?`);
      }
      if (foundActions.length === 0) {
        clarificationQuestions.push('What actions should the workflow perform? (navigate, click, type, etc.)');
      }
    }

    return {
      isClear,
      clarityScore: Math.min(1, Math.max(0, clarityScore)),
      ambiguousParts: ambiguousParts.length > 0 ? ambiguousParts : undefined,
      clarificationQuestions: clarificationQuestions.length > 0 ? clarificationQuestions : undefined,
    };
  }

  /**
   * Parses sequential steps from a clear multi-step request
   * Example: "goto amazon.com and search for toys and add them to cart"
   */
  static parseSequentialSteps(userRequest: string): ParsedStep[] {
    const steps: ParsedStep[] = [];
    const requestLower = userRequest.toLowerCase();

    // Split by sequential indicators
    const stepDelimiters = [
      /\d+\.\s*/g, // Numbered steps
      /\s+then\s+/gi,
      /\s+and\s+then\s+/gi,
      /\s+after\s+that\s+/gi,
      /\s+next\s+/gi,
      /\s+finally\s+/gi,
      /\s+followed\s+by\s+/gi,
      /\s+and\s+/gi, // "and" as separator (less reliable)
    ];

    // Try to split by numbered steps first
    let parts: string[] = [];
    const numberedMatch = userRequest.match(/\d+\.\s*[^\d]+/g);
    if (numberedMatch) {
      parts = numberedMatch.map(m => m.replace(/^\d+\.\s*/, '').trim());
    } else {
      // Try other delimiters
      let workingText = userRequest;
      for (const delimiter of stepDelimiters.slice(1, -1)) { // Skip numbered and "and"
        if (delimiter.test(workingText)) {
          parts = workingText.split(delimiter).map(p => p.trim()).filter(p => p);
          break;
        }
      }
      
      // If no clear delimiter found, try "and" as last resort
      if (parts.length === 0) {
        parts = workingText.split(/\s+and\s+/gi).map(p => p.trim()).filter(p => p);
      }
      
      // If still no parts, treat whole request as one step
      if (parts.length === 0) {
        parts = [userRequest];
      }
    }

    // Parse each part into a step
    for (const part of parts) {
      const step = this.parseStep(part);
      if (step) {
        steps.push(step);
      }
    }

    return steps;
  }

  /**
   * Parses a single step description into a ParsedStep
   */
  private static parseStep(stepText: string): ParsedStep | null {
    const text = stepText.trim();
    if (!text) return null;

    const textLower = text.toLowerCase();

    // Navigate/Goto
    if (/goto|go\s+to|navigate|visit|open\s+(?:the\s+)?(?:url|page|site)/i.test(textLower)) {
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      const urlTextMatch = text.match(/(?:goto|go\s+to|navigate|visit|open)\s+(?:the\s+)?(?:url\s+)?([^\s]+)/i);
      return {
        action: 'navigate',
        target: urlMatch ? urlMatch[0] : urlTextMatch ? urlTextMatch[1] : undefined,
        description: text,
      };
    }

    // Click
    if (/click|press|select|tap/i.test(textLower)) {
      const clickTargetMatch = text.match(/(?:click|press|select|tap)\s+(?:on\s+)?(?:the\s+)?(.+)/i);
      return {
        action: 'click',
        target: clickTargetMatch ? clickTargetMatch[1].trim() : undefined,
        description: text,
      };
    }

    // Type/Fill/Enter
    if (/type|enter|fill|input|put/i.test(textLower)) {
      const typeMatch = text.match(/(?:type|enter|fill|input|put)\s+(.+?)(?:\s+in\s+|\s+into\s+|\s+on\s+)/i);
      const value = typeMatch ? typeMatch[1].trim() : undefined;
      const fieldMatch = text.match(/(?:in\s+|into\s+|on\s+)(?:the\s+)?(.+)/i);
      return {
        action: 'type',
        target: fieldMatch ? fieldMatch[1].trim() : undefined,
        value,
        description: text,
      };
    }

    // Fill form
    if (/fill\s+(?:the\s+)?(?:form|fields)/i.test(textLower)) {
      return {
        action: 'fill',
        target: 'form',
        description: text,
      };
    }

    // Wait
    if (/wait|pause|sleep/i.test(textLower)) {
      const waitTimeMatch = text.match(/(\d+)\s*(?:seconds?|ms|milliseconds?)/i);
      return {
        action: 'wait',
        value: waitTimeMatch ? waitTimeMatch[1] : undefined,
        description: text,
      };
    }

    // Submit
    if (/submit|send/i.test(textLower)) {
      return {
        action: 'submit',
        target: 'form',
        description: text,
      };
    }

    // Search
    if (/search\s+for/i.test(textLower)) {
      const searchMatch = text.match(/search\s+for\s+(.+)/i);
      return {
        action: 'type',
        target: 'search',
        value: searchMatch ? searchMatch[1].trim() : undefined,
        description: text,
      };
    }

    // Add to cart
    if (/add\s+(?:to\s+)?(?:cart|basket)/i.test(textLower)) {
      return {
        action: 'click',
        target: 'add to cart',
        description: text,
      };
    }

    // Login/Register
    if (/login|sign\s+in|log\s+in/i.test(textLower)) {
      return {
        action: 'click',
        target: 'login',
        description: text,
      };
    }

    if (/register|sign\s+up|create\s+account/i.test(textLower)) {
      return {
        action: 'click',
        target: 'register',
        description: text,
      };
    }

    // Default: unknown action
    return {
      action: 'unknown',
      description: text,
    };
  }

  /**
   * Identifies the type of modification requested
   */
  static identifyModificationType(userRequest: string): 'add' | 'update' | 'insert' | 'add_assertion' | 'auto' {
    const requestLower = userRequest.toLowerCase();
    
    // Assertion patterns
    if (
      requestLower.includes('assertion') ||
      requestLower.includes('verify') ||
      requestLower.includes('check') ||
      requestLower.includes('validate') ||
      requestLower.includes('ensure')
    ) {
      return 'add_assertion';
    }
    
    // Update patterns
    if (
      requestLower.includes('update') ||
      requestLower.includes('change') ||
      requestLower.includes('modify') ||
      requestLower.includes('replace') ||
      requestLower.includes('fix selector')
    ) {
      return 'update';
    }
    
    // Insert patterns (between two nodes)
    if (
      requestLower.includes('insert') ||
      requestLower.includes('between') ||
      requestLower.includes('in between')
    ) {
      return 'insert';
    }
    
    // Add patterns
    if (
      requestLower.includes('add') ||
      requestLower.includes('append') ||
      requestLower.includes('create') ||
      requestLower.includes('new')
    ) {
      return 'add';
    }
    
    return 'auto';
  }

  /**
   * Extract node ID from request (e.g. "node js-extract-deals", "the JavaScript Code node")
   */
  static extractNodeIdFromRequest(
    userRequest: string,
    workflow: import('@automflows/shared').Workflow
  ): string | undefined {
    // Match explicit node ID: "node js-extract-deals", "node js-extract-deals to", "update js-extract-deals"
    const nodeIdPatterns = [
      /(?:node|update)\s+([a-zA-Z0-9_-]+)(?:\s|$|\.|,)/i,
      /(?:node\s+)?([a-zA-Z][a-zA-Z0-9_-]*)\s+(?:to|with|and)/i,
    ];
    for (const pattern of nodeIdPatterns) {
      const match = userRequest.match(pattern);
      if (match) {
        const candidate = match[1];
        if (workflow.nodes.some((n) => n.id === candidate)) {
          return candidate;
        }
      }
    }

    // Match by type description: "the JavaScript Code node", "the JavaScript node", "csv node"
    const typePatterns: Array<{ pattern: RegExp; type: string }> = [
      { pattern: /(?:the\s+)?javascript\s+(?:code\s+)?node/i, type: 'javascriptCode' },
      { pattern: /(?:the\s+)?csv\s+(?:handle\s+)?node/i, type: 'csvHandle' },
      { pattern: /(?:the\s+)?element\s+query\s+node/i, type: 'elementQuery' },
      { pattern: /(?:the\s+)?extract(?:ion)?\s+node/i, type: 'javascriptCode' },
    ];
    for (const { pattern, type } of typePatterns) {
      if (pattern.test(userRequest)) {
        const match = workflow.nodes.find((n) => n.type === type);
        if (match) return match.id;
      }
    }

    return undefined;
  }

  /**
   * Parses modification request to extract target node information
   */
  static extractTargetNode(userRequest: string, workflow: import('@automflows/shared').Workflow): {
    nodeId?: string;
    description?: string;
    position?: 'before' | 'after' | 'end';
  } {
    const requestLower = userRequest.toLowerCase();
    
    // Check for explicit position indicators
    let position: 'before' | 'after' | 'end' = 'after';
    if (requestLower.includes('before')) {
      position = 'before';
    } else if (requestLower.includes('after')) {
      position = 'after';
    } else if (requestLower.includes('end') || requestLower.includes('append')) {
      position = 'end';
    }
    
    // Try to find node by description
    const nodeKeywords = [
      'login', 'logout', 'register', 'sign up', 'sign in',
      'navigate', 'navigation', 'goto', 'go to',
      'click', 'type', 'fill', 'form', 'submit',
      'api', 'request', 'verify', 'assertion',
      'dashboard', 'home', 'page',
    ];
    
    // Try explicit node ID first
    const explicitNodeId = this.extractNodeIdFromRequest(userRequest, workflow);
    if (explicitNodeId) {
      return { nodeId: explicitNodeId, description: explicitNodeId, position };
    }

    for (const keyword of nodeKeywords) {
      if (requestLower.includes(keyword)) {
        // Try to find matching node
        for (const node of workflow.nodes) {
          const label = ((node.data as any)?.label || '').toLowerCase();
          const nodeType = node.type.toLowerCase();
          
          if (
            label.includes(keyword) ||
            nodeType.includes(keyword) ||
            keyword.includes(nodeType)
          ) {
            return {
              nodeId: node.id,
              description: keyword,
              position,
            };
          }
        }
      }
    }
    
    return {
      description: userRequest,
      position,
    };
  }

  /**
   * Extracts configuration for a new node from the request
   */
  static extractNewNodeConfig(userRequest: string): {
    nodeType?: string;
    selector?: string;
    text?: string;
    url?: string;
    headers?: string[];
    dataSource?: string;
    filePath?: string;
    code?: string;
    action?: string;
    outputVariable?: string;
    selectorType?: string;
    config?: Record<string, any>;
  } {
    const requestLower = userRequest.toLowerCase();
    const config: Record<string, any> = {};
    
    // Extract URL
    const urlMatch = userRequest.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      config.url = urlMatch[0];
    }
    
    // Extract selector patterns
    const selectorPatterns = [
      /selector[:\s]+['"]([^'"]+)['"]/i,
      /selector[:\s]+([^\s]+)/i,
      /['"]([^'"]+)['"]\s+selector/i,
    ];
    
    for (const pattern of selectorPatterns) {
      const match = userRequest.match(pattern);
      if (match) {
        config.selector = match[1];
        break;
      }
    }
    
    // Extract text/value
    const textPatterns = [
      /text[:\s]+['"]([^'"]+)['"]/i,
      /value[:\s]+['"]([^'"]+)['"]/i,
      /with\s+['"]([^'"]+)['"]/i,
      /['"]([^'"]+)['"]\s+text/i,
    ];
    
    for (const pattern of textPatterns) {
      const match = userRequest.match(pattern);
      if (match) {
        config.text = match[1];
        break;
      }
    }
    
    // Extract headers (CSV columns): "headers: title, price, discountPercent" or "add columns discountPercent, link"
    const headersPatterns = [
      /headers?[:\s]+\[([^\]]+)\]/i,
      /headers?[:\s]+["']([^"']+)["']/i,
      /(?:include|add)\s+columns?\s+([a-zA-Z0-9_,\s]+)/i,
      /columns?\s*[:\s]+\s*\[([^\]]+)\]/i,
    ];
    for (const pattern of headersPatterns) {
      const match = userRequest.match(pattern);
      if (match) {
        const raw = match[1];
        config.headers = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        break;
      }
    }
    
    // Extract dataSource: "dataSource: deals" or "from deals"
    const dataSourceMatch = userRequest.match(/(?:dataSource|data\s+source|from)\s*[:\s]+\s*["']?([a-zA-Z0-9_]+)["']?/i);
    if (dataSourceMatch) {
      config.dataSource = dataSourceMatch[1];
    }
    
    // Extract filePath: "filePath: output/x.csv" or "to output/x.csv"
    const filePathMatch = userRequest.match(/(?:filePath|file\s*path|to|save\s+to)\s*[:\s]+\s*["']?([a-zA-Z0-9_/.\-${}]+)["']?/i);
    if (filePathMatch) {
      config.filePath = filePathMatch[1];
    }
    
    // Determine node type
    if (requestLower.includes('navigate') || requestLower.includes('goto') || config.url) {
      config.nodeType = 'navigation';
    } else if (requestLower.includes('click')) {
      config.nodeType = 'action';
    } else if (requestLower.includes('type') || requestLower.includes('fill') || requestLower.includes('input')) {
      config.nodeType = 'type';
    } else if (requestLower.includes('api') || requestLower.includes('request')) {
      config.nodeType = 'apiRequest';
    } else if (requestLower.includes('verify') || requestLower.includes('assertion')) {
      config.nodeType = 'verify';
    } else if (requestLower.includes('wait')) {
      config.nodeType = 'wait';
    } else if (requestLower.includes('javascript') || requestLower.includes('extract') || requestLower.includes('code')) {
      config.nodeType = 'javascriptCode';
    } else if (requestLower.includes('csv') || config.headers) {
      config.nodeType = 'csvHandle';
    } else if (requestLower.includes('element') || requestLower.includes('query')) {
      config.nodeType = 'elementQuery';
    }
    
    // Extract elementQuery action: "change to getAllText", "use getCount"
    if (config.nodeType === 'elementQuery') {
      if (requestLower.includes('getalltext') || requestLower.includes('get all text')) {
        config.action = 'getAllText';
      } else if (requestLower.includes('getcount') || requestLower.includes('get count')) {
        config.action = 'getCount';
      } else if (requestLower.includes('gettext') || requestLower.includes('get text')) {
        config.action = 'getText';
      } else if (requestLower.includes('getattribute')) {
        config.action = 'getAttribute';
      }
      const outputVarMatch = userRequest.match(/outputVariable[:\s]+["']?([a-zA-Z0-9_]+)["']?/i);
      if (outputVarMatch) {
        config.outputVariable = outputVarMatch[1];
      }
    }
    
    return config;
  }

  /**
   * Parses modification request to extract all relevant information
   */
  static parseModificationRequest(
    userRequest: string,
    workflow: import('@automflows/shared').Workflow
  ): {
    modificationType: 'add' | 'update' | 'insert' | 'add_assertion' | 'auto';
    targetNode?: { nodeId?: string; description?: string; position?: 'before' | 'after' | 'end' };
    newNodeConfig?: ReturnType<typeof RequestAnalyzer.extractNewNodeConfig>;
    sourceNodeId?: string;
    targetNodeId?: string;
  } {
    const modificationType = this.identifyModificationType(userRequest);
    const targetNode = this.extractTargetNode(userRequest, workflow);
    const newNodeConfig = this.extractNewNodeConfig(userRequest);
    
    // For insert operations, try to find source and target nodes
    let sourceNodeId: string | undefined;
    let targetNodeId: string | undefined;
    
    if (modificationType === 'insert') {
      const betweenMatch = userRequest.match(/between\s+(.+?)\s+and\s+(.+)/i);
      if (betweenMatch) {
        const sourceDesc = betweenMatch[1].trim();
        const targetDesc = betweenMatch[2].trim();
        
        // Find nodes matching descriptions
        for (const node of workflow.nodes) {
          const label = ((node.data as any)?.label || '').toLowerCase();
          if (label.includes(sourceDesc.toLowerCase()) || sourceDesc.toLowerCase().includes(label)) {
            sourceNodeId = node.id;
          }
          if (label.includes(targetDesc.toLowerCase()) || targetDesc.toLowerCase().includes(label)) {
            targetNodeId = node.id;
          }
        }
      }
    }
    
    return {
      modificationType,
      targetNode,
      newNodeConfig,
      sourceNodeId,
      targetNodeId,
    };
  }
}
