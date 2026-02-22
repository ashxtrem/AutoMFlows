import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubNodeNameDialog from '../SubNodeNameDialog';

const mockSaveAsSubNode = vi.fn();
const mockIsSubNodeNameTaken = vi.fn();

vi.mock('../../store/workflowStore', () => ({
  useWorkflowStore: vi.fn(() => ({
    saveAsSubNode: mockSaveAsSubNode,
    isSubNodeNameTaken: mockIsSubNodeNameTaken,
  })),
}));

describe('SubNodeNameDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSubNodeNameTaken.mockReturnValue(false);
  });

  it('should render the dialog with title and input', () => {
    render(<SubNodeNameDialog nodeIds={['n1', 'n2']} onClose={mockOnClose} />);

    expect(screen.getByText('Save as Sub Node')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter sub node name...')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should show correct node count for multiple nodes', () => {
    render(<SubNodeNameDialog nodeIds={['n1', 'n2', 'n3']} onClose={mockOnClose} />);
    expect(screen.getByText('3 nodes will be saved')).toBeInTheDocument();
  });

  it('should show singular form for single node', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);
    expect(screen.getByText('1 node will be saved')).toBeInTheDocument();
  });

  it('should show error when saving with empty name', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    expect(mockSaveAsSubNode).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should show error when saving with whitespace-only name', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('Enter sub node name...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    expect(mockSaveAsSubNode).not.toHaveBeenCalled();
  });

  it('should show error when name is already taken', () => {
    mockIsSubNodeNameTaken.mockReturnValue(true);
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('Enter sub node name...');
    fireEvent.change(input, { target: { value: 'Existing Name' } });
    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText('A sub node with this name already exists')).toBeInTheDocument();
    expect(mockSaveAsSubNode).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should save and close on valid name', () => {
    render(<SubNodeNameDialog nodeIds={['n1', 'n2']} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('Enter sub node name...');
    fireEvent.change(input, { target: { value: 'My Sub Node' } });
    fireEvent.click(screen.getByText('Save'));

    expect(mockSaveAsSubNode).toHaveBeenCalledWith('My Sub Node', ['n1', 'n2']);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should trim the name before saving', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('Enter sub node name...');
    fireEvent.change(input, { target: { value: '  Trimmed Name  ' } });
    fireEvent.click(screen.getByText('Save'));

    expect(mockSaveAsSubNode).toHaveBeenCalledWith('Trimmed Name', ['n1']);
  });

  it('should save on Enter key press', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('Enter sub node name...');
    fireEvent.change(input, { target: { value: 'Enter Save' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockSaveAsSubNode).toHaveBeenCalledWith('Enter Save', ['n1']);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close on Cancel click', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close on Escape key press', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close on backdrop click', () => {
    const { container } = render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not close when clicking inside the dialog', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('Enter sub node name...');
    fireEvent.click(input);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should clear error when user types after an error', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Enter sub node name...');
    fireEvent.change(input, { target: { value: 'a' } });
    expect(screen.queryByText('Name cannot be empty')).not.toBeInTheDocument();
  });

  it('should close on X button click', () => {
    render(<SubNodeNameDialog nodeIds={['n1']} onClose={mockOnClose} />);

    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(
      (btn) => !btn.textContent || (!btn.textContent.includes('Save') && !btn.textContent.includes('Cancel'))
    );
    if (xButton) {
      fireEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });
});
