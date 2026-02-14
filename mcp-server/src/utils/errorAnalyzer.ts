import { Workflow, BaseNode } from '@automflows/shared';

export interface PageDebugInfo {
  pageUrl?: string;
  pageSource?: string;
  similarSelectors?: Array<{
    selector: string;
    selectorType: 'css' | 'xpath';
    reason: string;
    elementInfo?: string;
  }>;
  screenshotPaths?: {
    pre?: string;
    post?: string;
  };
  executionFolderName?: string;
}

export interface ErrorAnalysis {
  category: 'selector' | 'missing_node' | 'configuration' | 'connection' | 'execution' | 'unknown';
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  nodeType?: string;
  suggestedFix?: string;
  extractedSelectors?: string[]; // Selectors extracted from error message
  correctSelector?: string; // Suggested correct selector
  failedSelector?: string; // The selector that failed
  pageUrl?: string; // Page URL from DOM capture
}

export class ErrorAnalyzer {
  /**
   * Analyze errors with DOM context for better selector suggestions
   */
  static analyzeWithDOM(
    workflow: Workflow,
    errorMessage: string,
    pageDebugInfo: PageDebugInfo,
    executionLogs?: string[],
    currentNodeId?: string
  ): ErrorAnalysis[] {
    // First, do standard analysis
    const analyses = this.analyze(workflow, errorMessage, executionLogs, currentNodeId);

    // Enhance selector errors with DOM-based suggestions
    for (const analysis of analyses) {
      if (analysis.category === 'selector' && pageDebugInfo.similarSelectors) {
        // Extract available selectors from DOM
        const availableSelectors = pageDebugInfo.similarSelectors.map(s => s.selector);
        
        if (!analysis.extractedSelectors) {
          analysis.extractedSelectors = [];
        }
        
        // Add DOM selectors to extracted selectors
        for (const selector of availableSelectors) {
          if (!analysis.extractedSelectors.includes(selector)) {
            analysis.extractedSelectors.push(selector);
          }
        }

        // If we have a failed node and label, try to match with DOM selectors
        if (analysis.nodeId && !analysis.correctSelector) {
          const node = workflow.nodes.find(n => n.id === analysis.nodeId);
          if (node?.data && typeof node.data === 'object') {
            const nodeData = node.data as any;
            const label = nodeData.label as string | undefined;
            
            if (label) {
              analysis.correctSelector = this.matchSelectorToLabel(
                label,
                pageDebugInfo.similarSelectors
              );
            }
          }
        }

        // Update suggested fix with DOM-based selector
        if (analysis.correctSelector) {
          analysis.suggestedFix = `Use selector from DOM: ${analysis.correctSelector}`;
        } else if (analysis.extractedSelectors.length > 0) {
          analysis.suggestedFix = `Try one of these selectors from DOM: ${analysis.extractedSelectors.slice(0, 3).join(', ')}`;
        }

        // Add page URL for context
        if (pageDebugInfo.pageUrl) {
          analysis.pageUrl = pageDebugInfo.pageUrl;
        }
      }
    }

    return analyses;
  }

  /**
   * Match a selector to a node label using DOM similar selectors
   */
  private static matchSelectorToLabel(
    label: string,
    similarSelectors: Array<{ selector: string; selectorType: string; reason: string; elementInfo?: string }>
  ): string | undefined {
    const labelLower = label.toLowerCase();
    
    // Try to find best match based on label keywords
    for (const similar of similarSelectors) {
      const selectorLower = similar.selector.toLowerCase();
      const reasonLower = similar.reason?.toLowerCase() || '';
      const elementInfoLower = similar.elementInfo?.toLowerCase() || '';
      
      // Extract keywords from label
      const keywords = labelLower.split(/\s+/).filter(w => w.length > 2);
      
      for (const keyword of keywords) {
        if (selectorLower.includes(keyword) || 
            reasonLower.includes(keyword) || 
            elementInfoLower.includes(keyword)) {
          return similar.selector;
        }
      }
    }
    
    // Return first selector as fallback
    return similarSelectors.length > 0 ? similarSelectors[0].selector : undefined;
  }

  static analyze(workflow: Workflow, errorMessage: string, executionLogs?: string[], currentNodeId?: string): ErrorAnalysis[] {
    const analyses: ErrorAnalysis[] = [];

    // Analyze error message patterns
    const errorLower = errorMessage.toLowerCase();

    // Check for strict mode violations first (most specific)
    const strictModeAnalysis = this.analyzeStrictModeViolation(workflow, errorMessage, currentNodeId);
    if (strictModeAnalysis) {
      analyses.push(strictModeAnalysis);
    }

    // Selector-related errors
    if (
      errorLower.includes('selector') ||
      errorLower.includes('element') ||
      errorLower.includes('locator') ||
      errorLower.includes('not found') ||
      errorLower.includes('timeout')
    ) {
      // Skip if we already have a strict mode analysis
      if (!strictModeAnalysis) {
        const selectorAnalysis = this.analyzeSelectorError(workflow, errorMessage, currentNodeId);
        if (selectorAnalysis) {
          analyses.push(selectorAnalysis);
        } else {
          analyses.push({
            category: 'selector',
            severity: 'error',
            message: 'Element selector issue detected',
            nodeId: currentNodeId,
            nodeType: currentNodeId ? workflow.nodes.find(n => n.id === currentNodeId)?.type : undefined,
            suggestedFix: 'Verify selector exists on page, add wait conditions, or use more specific selector',
          });
        }
      }
    }

    // Missing node errors
    if (
      errorLower.includes('missing') ||
      errorLower.includes('not found') ||
      errorLower.includes('undefined')
    ) {
      analyses.push({
        category: 'missing_node',
        severity: 'error',
        message: 'Required node or dependency missing',
        suggestedFix: 'Check workflow connections and ensure all required nodes are present',
      });
    }

    // Configuration errors
    if (
      errorLower.includes('invalid') ||
      errorLower.includes('configuration') ||
      errorLower.includes('required') ||
      errorLower.includes('missing property')
    ) {
      analyses.push({
        category: 'configuration',
        severity: 'error',
        message: 'Node configuration issue',
        suggestedFix: 'Review node configuration and ensure all required fields are set',
      });
    }

    // Connection errors
    if (
      errorLower.includes('connection') ||
      errorLower.includes('edge') ||
      errorLower.includes('dependency')
    ) {
      analyses.push({
        category: 'connection',
        severity: 'error',
        message: 'Workflow connection issue',
        suggestedFix: 'Check node connections and ensure proper edge configuration',
      });
    }

    // Execution errors
    if (
      errorLower.includes('execution') ||
      errorLower.includes('runtime') ||
      errorLower.includes('failed to execute')
    ) {
      analyses.push({
        category: 'execution',
        severity: 'error',
        message: 'Workflow execution error',
        suggestedFix: 'Check execution logs for detailed error information',
      });
    }

    // Analyze logs if provided
    if (executionLogs) {
      const logAnalysis = this.analyzeLogs(executionLogs, workflow);
      analyses.push(...logAnalysis);
    }

    // If no specific category found, add unknown
    if (analyses.length === 0) {
      analyses.push({
        category: 'unknown',
        severity: 'error',
        message: errorMessage,
        suggestedFix: 'Review error message and workflow structure',
      });
    }

    return analyses;
  }

  /**
   * Analyzes strict mode violation errors to extract specific selectors
   * Example: "strict mode violation: locator('input[id*='address']') resolved to 4 elements"
   */
  private static analyzeStrictModeViolation(workflow: Workflow, errorMessage: string, currentNodeId?: string): ErrorAnalysis | null {
    const strictModePattern = /strict\s+mode\s+violation/i;
    if (!strictModePattern.test(errorMessage)) {
      return null;
    }

    // Extract the failed selector
    const failedSelectorMatch = errorMessage.match(/locator\(['"]([^'"]+)['"]\)/i);
    const failedSelector = failedSelectorMatch ? failedSelectorMatch[1] : undefined;

    // Extract element count
    const elementCountMatch = errorMessage.match(/resolved\s+to\s+(\d+)\s+elements?/i);
    const elementCount = elementCountMatch ? parseInt(elementCountMatch[1], 10) : 0;

    // Extract all element IDs from the error message
    const elementIdPattern = /id=["']([^"']+)["']/g;
    const extractedSelectors: string[] = [];
    let match;
    while ((match = elementIdPattern.exec(errorMessage)) !== null) {
      const id = match[1];
      // Convert to CSS selector format (escape dots)
      const cssSelector = `#${id.replace(/\./g, '\\.')}`;
      if (!extractedSelectors.includes(cssSelector)) {
        extractedSelectors.push(cssSelector);
      }
    }

    // Try to find the node that failed
    let failedNode: BaseNode | undefined;
    let correctSelector: string | undefined;

    // First, try to use currentNodeId if provided
    if (currentNodeId) {
      failedNode = workflow.nodes.find(n => n.id === currentNodeId);
    }

    // If not found, try to match by selector
    if (!failedNode && failedSelector) {
      // Find node with matching selector
      for (const node of workflow.nodes) {
        if (node.data && typeof node.data === 'object') {
          const nodeData = node.data as any;
          if (nodeData.selector === failedSelector || 
              (typeof nodeData.selector === 'string' && nodeData.selector.includes(failedSelector))) {
            failedNode = node;
            
            // Try to determine correct selector based on node label
            if (extractedSelectors.length > 0 && nodeData.label) {
              const labelLower = (nodeData.label as string).toLowerCase();
              
              // Match label to selector
              if (labelLower.includes('first') || labelLower.includes('name')) {
                correctSelector = extractedSelectors.find(s => s.includes('firstName') || s.includes('first'));
              } else if (labelLower.includes('last') || labelLower.includes('name')) {
                correctSelector = extractedSelectors.find(s => s.includes('lastName') || s.includes('last'));
              } else if (labelLower.includes('address') || labelLower.includes('street')) {
                correctSelector = extractedSelectors.find(s => s.includes('street') || s.includes('address'));
              } else if (labelLower.includes('city')) {
                correctSelector = extractedSelectors.find(s => s.includes('city'));
              } else if (labelLower.includes('state')) {
                correctSelector = extractedSelectors.find(s => s.includes('state'));
              } else if (labelLower.includes('zip') || labelLower.includes('postal')) {
                correctSelector = extractedSelectors.find(s => s.includes('zipCode') || s.includes('zip') || s.includes('postal'));
              } else if (labelLower.includes('phone')) {
                correctSelector = extractedSelectors.find(s => s.includes('phone'));
              } else if (labelLower.includes('ssn')) {
                correctSelector = extractedSelectors.find(s => s.includes('ssn'));
              } else if (labelLower.includes('username')) {
                correctSelector = extractedSelectors.find(s => s.includes('username'));
              } else if (labelLower.includes('password')) {
                correctSelector = extractedSelectors.find(s => s.includes('password'));
              }
              
              // If no match found, use first selector as fallback
              if (!correctSelector && extractedSelectors.length > 0) {
                correctSelector = extractedSelectors[0];
              }
            }
            break;
          }
        }
      }
    }

    // If we found extracted selectors but no specific match, use the first one
    if (!correctSelector && extractedSelectors.length > 0) {
      correctSelector = extractedSelectors[0];
    }

    return {
      category: 'selector',
      severity: 'error',
      message: `Strict mode violation: selector matched ${elementCount} elements`,
      nodeId: failedNode?.id,
      nodeType: failedNode?.type,
      failedSelector,
      extractedSelectors,
      correctSelector,
      suggestedFix: correctSelector 
        ? `Use more specific selector: ${correctSelector}`
        : `Selector matched ${elementCount} elements. Use a more specific selector from: ${extractedSelectors.join(', ')}`,
    };
  }

  /**
   * Analyzes general selector errors to extract selector information
   */
  private static analyzeSelectorError(workflow: Workflow, errorMessage: string, currentNodeId?: string): ErrorAnalysis | null {
    // Try to extract selector from error message
    const selectorPatterns = [
      /selector[:\s]+['"]([^'"]+)['"]/i,
      /locator\(['"]([^'"]+)['"]\)/i,
      /['"]([^'"]+)['"]\s+not\s+found/i,
      /element\s+['"]([^'"]+)['"]/i,
    ];

    let extractedSelector: string | undefined;
    for (const pattern of selectorPatterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        extractedSelector = match[1];
        break;
      }
    }

    // Try to find the node that failed
    let failedNode: BaseNode | undefined;
    
    // First, try to use currentNodeId if provided
    if (currentNodeId) {
      failedNode = workflow.nodes.find(n => n.id === currentNodeId);
    }
    
    // If not found, try to match by selector
    if (!failedNode && extractedSelector) {
      for (const node of workflow.nodes) {
        if (node.data && typeof node.data === 'object') {
          const nodeData = node.data as any;
          if (nodeData.selector === extractedSelector || 
              (typeof nodeData.selector === 'string' && nodeData.selector.includes(extractedSelector))) {
            failedNode = node;
            break;
          }
        }
      }
    }

    if (extractedSelector || failedNode) {
      return {
        category: 'selector',
        severity: 'error',
        message: 'Selector error detected',
        nodeId: failedNode?.id,
        nodeType: failedNode?.type,
        failedSelector: extractedSelector,
        suggestedFix: 'Verify selector exists on page or use a more specific selector',
      };
    }

    return null;
  }

  private static analyzeLogs(logs: string[], workflow: Workflow): ErrorAnalysis[] {
    const analyses: ErrorAnalysis[] = [];
    const nodeIdPattern = /node[_-]?id[:\s]+([a-zA-Z0-9_-]+)/i;
    const selectorPattern = /selector[:\s]+([^\s]+)/i;

    for (const log of logs) {
      const logLower = log.toLowerCase();

      // Extract node ID if present
      const nodeIdMatch = log.match(nodeIdPattern);
      const nodeId = nodeIdMatch ? nodeIdMatch[1] : undefined;
      const node = nodeId ? workflow.nodes.find(n => n.id === nodeId) : undefined;

      // Check for timeout errors
      if (logLower.includes('timeout')) {
        analyses.push({
          category: 'selector',
          severity: 'error',
          message: 'Timeout waiting for element',
          nodeId,
          nodeType: node?.type,
          suggestedFix: 'Increase timeout value or verify selector is correct',
        });
      }

      // Check for validation errors
      if (logLower.includes('validation')) {
        analyses.push({
          category: 'configuration',
          severity: 'error',
          message: 'Workflow validation failed',
          nodeId,
          nodeType: node?.type,
          suggestedFix: 'Fix validation errors before execution',
        });
      }
    }

    return analyses;
  }

  static suggestFixes(analysis: ErrorAnalysis[], workflow: Workflow): Partial<Workflow> {
    const fixes: Partial<Workflow> = {
      nodes: [...workflow.nodes],
      edges: [...workflow.edges],
    };

    for (const issue of analysis) {
      if (issue.nodeId) {
        const nodeIndex = fixes.nodes!.findIndex(n => n.id === issue.nodeId);
        if (nodeIndex !== -1) {
          const node = fixes.nodes![nodeIndex];

          // Apply fixes based on category
          switch (issue.category) {
            case 'selector':
              // Fix selector if we have a correct one
              if (node.data && typeof node.data === 'object') {
                const nodeData = node.data as any;
                
                // Update selector with correct one if available
                if (issue.correctSelector && nodeData.selector) {
                  nodeData.selector = issue.correctSelector;
                }
                
                // Add wait condition or increase timeout
                if (!nodeData.timeout || nodeData.timeout < 30000) {
                  nodeData.timeout = 30000;
                }
              }
              break;

            case 'configuration':
              // Ensure required fields are present
              if (node.data && typeof node.data === 'object') {
                const nodeData = node.data as any;
                // Add default label if missing
                if (!nodeData.label) {
                  nodeData.label = node.type;
                }
              }
              break;
          }
        }
      }
    }

    return fixes;
  }
}
