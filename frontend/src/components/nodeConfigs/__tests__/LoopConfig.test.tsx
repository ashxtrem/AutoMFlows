import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Node } from 'reactflow';
import LoopConfig from '../LoopConfig';

describe('LoopConfig', () => {
  const mockOnChange = vi.fn();
  const mockNode: Node = {
    id: 'loop-1',
    type: 'loop',
    position: { x: 0, y: 0 },
    data: {
      mode: 'forEach',
      arrayVariable: '',
      failSilently: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render mode selector', () => {
    const { container } = render(<LoopConfig node={mockNode} onChange={mockOnChange} />);
    
    const modeSelect = container.querySelector('select') as HTMLSelectElement;
    expect(modeSelect).toBeInTheDocument();
    expect(modeSelect).toHaveValue('forEach');
  });

  it('should show forEach mode fields when forEach is selected', () => {
    render(<LoopConfig node={mockNode} onChange={mockOnChange} />);
    
    expect(screen.getByPlaceholderText(/items \(variable name/i)).toBeInTheDocument();
    expect(screen.queryByText(/condition type/i)).not.toBeInTheDocument();
  });

  it('should show doWhile mode fields when doWhile is selected', () => {
    const doWhileNode: Node = {
      ...mockNode,
      data: {
        mode: 'doWhile',
        condition: {
          type: 'javascript',
          javascriptExpression: '',
        },
        maxIterations: 1000,
      },
    };

    render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    expect(screen.getByText(/condition type/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/items \(variable name/i)).not.toBeInTheDocument();
  });

  it('should call onChange when mode is changed', () => {
    const { container } = render(<LoopConfig node={mockNode} onChange={mockOnChange} />);
    
    const modeSelect = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(modeSelect, { target: { value: 'doWhile' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('mode', 'doWhile');
    expect(mockOnChange).toHaveBeenCalledWith('arrayVariable', undefined);
  });

  it('should clear doWhile fields when switching to forEach', () => {
    const doWhileNode: Node = {
      ...mockNode,
      data: {
        mode: 'doWhile',
        condition: { type: 'javascript' },
        updateStep: 'code',
        maxIterations: 100,
      },
    };

    render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    const { container } = render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    const modeSelect = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(modeSelect, { target: { value: 'forEach' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('mode', 'forEach');
    expect(mockOnChange).toHaveBeenCalledWith('condition', undefined);
    expect(mockOnChange).toHaveBeenCalledWith('updateStep', undefined);
    expect(mockOnChange).toHaveBeenCalledWith('maxIterations', undefined);
  });

  it('should render condition type selector for doWhile mode', () => {
    const doWhileNode: Node = {
      ...mockNode,
      data: {
        mode: 'doWhile',
        condition: {
          type: 'javascript',
          javascriptExpression: '',
        },
      },
    };

    render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    const conditionTypeSelect = screen.getByDisplayValue('JavaScript');
    expect(conditionTypeSelect).toBeInTheDocument();
    expect(conditionTypeSelect).toHaveValue('javascript');
  });

  it('should render JavaScript condition fields', () => {
    const doWhileNode: Node = {
      ...mockNode,
      data: {
        mode: 'doWhile',
        condition: {
          type: 'javascript',
          javascriptExpression: 'counter < 10',
        },
      },
    };

    render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    const textareas = screen.getAllByPlaceholderText(/context\.getVariable/i);
    const javascriptTextarea = textareas.find(textarea => 
      (textarea as HTMLTextAreaElement).value === 'counter < 10' || 
      (textarea as HTMLTextAreaElement).value === ''
    );
    expect(javascriptTextarea).toBeInTheDocument();
  });

  it('should render updateStep textarea for doWhile mode', () => {
    const doWhileNode: Node = {
      ...mockNode,
      data: {
        mode: 'doWhile',
        condition: {
          type: 'javascript',
          javascriptExpression: '',
        },
        updateStep: 'counter++',
      },
    };

    render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    const textarea = screen.getByPlaceholderText(/context\.setVariable/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('counter++');
  });

  it('should render maxIterations input with default value', () => {
    const doWhileNode: Node = {
      ...mockNode,
      data: {
        mode: 'doWhile',
        condition: {
          type: 'javascript',
          javascriptExpression: '',
        },
      },
    };

    render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    const maxIterationsInput = screen.getByDisplayValue('1000');
    expect(maxIterationsInput).toBeInTheDocument();
    expect(maxIterationsInput).toHaveValue(1000);
  });

  it('should call onChange when arrayVariable is changed', () => {
    render(<LoopConfig node={mockNode} onChange={mockOnChange} />);
    
    const input = screen.getByPlaceholderText(/items \(variable name/i);
    fireEvent.change(input, { target: { value: 'myItems' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('arrayVariable', 'myItems');
  });

  it('should call onChange when condition is updated', () => {
    const doWhileNode: Node = {
      ...mockNode,
      data: {
        mode: 'doWhile',
        condition: {
          type: 'javascript',
          javascriptExpression: '',
        },
      },
    };

    render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    const textareas = screen.getAllByPlaceholderText(/context\.getVariable/i);
    const javascriptTextarea = textareas[0]; // First one is the condition textarea
    fireEvent.change(javascriptTextarea, { target: { value: 'counter < 5' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('condition', expect.objectContaining({
      javascriptExpression: 'counter < 5',
    }));
  });

  it('should render failSilently checkbox', () => {
    render(<LoopConfig node={mockNode} onChange={mockOnChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('should call onChange when failSilently is toggled', () => {
    render(<LoopConfig node={mockNode} onChange={mockOnChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(mockOnChange).toHaveBeenCalledWith('failSilently', true);
  });

  it('should render UI element condition fields when condition type is ui-element', () => {
    const doWhileNode: Node = {
      ...mockNode,
      data: {
        mode: 'doWhile',
        condition: {
          type: 'ui-element',
          selector: '#button',
          selectorType: 'css',
          elementCheck: 'visible',
        },
      },
    };

    render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    expect(screen.getByPlaceholderText(/#button/i)).toBeInTheDocument();
    expect(screen.getByText(/selector type/i)).toBeInTheDocument();
    expect(screen.getByText(/element check/i)).toBeInTheDocument();
  });

  it('should render variable condition fields when condition type is variable', () => {
    const doWhileNode: Node = {
      ...mockNode,
      data: {
        mode: 'doWhile',
        condition: {
          type: 'variable',
          variableName: 'counter',
          comparisonOperator: 'lessThan',
          comparisonValue: 10,
        },
      },
    };

    render(<LoopConfig node={doWhileNode} onChange={mockOnChange} />);
    
    expect(screen.getByPlaceholderText(/myVariable/i)).toBeInTheDocument();
    expect(screen.getByText(/comparison operator/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/100/i)).toBeInTheDocument();
  });
});
