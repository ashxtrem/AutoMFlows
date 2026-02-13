import { BaseNode, IntValueNodeData, StringValueNodeData, BooleanValueNodeData, InputValueNodeData } from '@automflows/shared';
import { NodeHandler } from '../base';
import { ContextManager } from '../../engine/context';
import { VariableInterpolator } from '../../utils/variableInterpolator';

export class IntValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as IntValueNodeData;
    
    // Handle variable interpolation if value is a string
    let resolvedValue: number;
    const value = data.value;
    if (typeof value === 'string') {
      if (value.includes('${data.') || value.includes('${variables.')) {
        const interpolated = VariableInterpolator.interpolateString(value, context);
        // Try to parse as integer after interpolation
        const parsed = parseInt(interpolated, 10);
        resolvedValue = isNaN(parsed) ? 0 : parsed;
      } else {
        // If it's a string but doesn't contain interpolation, try to parse it
        const parsed = parseInt(value, 10);
        resolvedValue = isNaN(parsed) ? 0 : parsed;
      }
    } else {
      resolvedValue = value;
    }
    
    // Store the resolved value in context with the node ID as key
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, resolvedValue);
    
    // Additionally store under custom variableName if provided (for global variable access)
    if (data.variableName && data.variableName.trim()) {
      context.setVariable(data.variableName.trim(), resolvedValue);
    }
    
    // Also store in data for compatibility
    context.setData('value', resolvedValue);
  }
}

export class StringValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as StringValueNodeData;
    
    // Handle variable interpolation
    let resolvedValue: string = data.value || '';
    if (typeof data.value === 'string' && (data.value.includes('${data.') || data.value.includes('${variables.'))) {
      resolvedValue = VariableInterpolator.interpolateString(data.value, context);
    }
    
    // Store the resolved value in context with the node ID as key
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, resolvedValue);
    
    // Additionally store under custom variableName if provided (for global variable access)
    if (data.variableName && data.variableName.trim()) {
      context.setVariable(data.variableName.trim(), resolvedValue);
    }
    
    // Also store in data for compatibility
    context.setData('value', resolvedValue);
  }
}

export class BooleanValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as BooleanValueNodeData;
    
    // Handle variable interpolation if value is a string
    let resolvedValue: boolean;
    const value = data.value;
    if (typeof value === 'string') {
      if (value.includes('${data.') || value.includes('${variables.')) {
        const interpolated = VariableInterpolator.interpolateString(value, context);
        // Convert interpolated string to boolean
        const lowercased = interpolated.toLowerCase().trim();
        resolvedValue = lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
      } else {
        // If it's a string but doesn't contain interpolation, try to parse it
        const lowercased = value.toLowerCase().trim();
        resolvedValue = lowercased === 'true' || lowercased === '1' || lowercased === 'yes';
      }
    } else {
      resolvedValue = value;
    }
    
    // Store the resolved value in context with the node ID as key
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, resolvedValue);
    
    // Additionally store under custom variableName if provided (for global variable access)
    if (data.variableName && data.variableName.trim()) {
      context.setVariable(data.variableName.trim(), resolvedValue);
    }
    
    // Also store in data for compatibility
    context.setData('value', resolvedValue);
  }
}

export class InputValueHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as InputValueNodeData;
    
    // Convert value based on dataType
    let convertedValue: string | number | boolean = data.value;
    
    if (data.dataType === 'int') {
      convertedValue = typeof data.value === 'number' ? Math.floor(data.value) : parseInt(String(data.value), 10);
      if (isNaN(convertedValue as number)) {
        convertedValue = 0;
      }
    } else if (data.dataType === 'float' || data.dataType === 'double') {
      convertedValue = typeof data.value === 'number' ? data.value : parseFloat(String(data.value));
      if (isNaN(convertedValue as number)) {
        convertedValue = 0;
      }
    } else if (data.dataType === 'boolean') {
      if (typeof data.value === 'boolean') {
        convertedValue = data.value;
      } else {
        convertedValue = data.value === 'true' || data.value === 1 || data.value === '1';
      }
    } else {
      // String
      convertedValue = String(data.value || '');
    }
    
    // Store the converted value in context with the node ID as key
    // This allows other nodes to reference this value via edges
    context.setVariable(node.id, convertedValue);
    
    // Additionally store under custom variableName if provided (for global variable access)
    if (data.variableName && data.variableName.trim()) {
      context.setVariable(data.variableName.trim(), convertedValue);
    }
    
    // Also store in data for compatibility
    context.setData('value', convertedValue);
  }
}
