import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PathAssertionsEditor from '../PathAssertionsEditor';

describe('PathAssertionsEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render empty state when value is empty', () => {
      render(<PathAssertionsEditor value="" onChange={mockOnChange} />);
      expect(screen.getByText(/No assertions defined/i)).toBeInTheDocument();
    });

    it('should render add assertion button', () => {
      render(<PathAssertionsEditor value="" onChange={mockOnChange} />);
      expect(screen.getByRole('button', { name: /Add Assertion/i })).toBeInTheDocument();
    });

    it('should render existing assertions from JSON', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      expect(screen.getByDisplayValue('data.status')).toBeInTheDocument();
      expect(screen.getByDisplayValue('healthy')).toBeInTheDocument();
    });

    it('should render multiple assertions', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' },
        { path: 'data.uptime', operator: 'exists', value: '' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      expect(screen.getByDisplayValue('data.status')).toBeInTheDocument();
      expect(screen.getByDisplayValue('data.uptime')).toBeInTheDocument();
    });
  });

  describe('Adding assertions', () => {
    it('should add new assertion when button clicked', () => {
      render(<PathAssertionsEditor value="" onChange={mockOnChange} />);
      
      const addButton = screen.getByRole('button', { name: /Add Assertion/i });
      fireEvent.click(addButton);
      
      expect(mockOnChange).toHaveBeenCalledWith(
        JSON.stringify([{ path: '', operator: 'equals', value: '' }])
      );
    });

    it('should add assertion to existing list', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const addButton = screen.getByRole('button', { name: /Add Assertion/i });
      fireEvent.click(addButton);
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed).toHaveLength(2);
    });
  });

  describe('Removing assertions', () => {
    it('should remove assertion when delete button clicked', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const removeButton = screen.getByRole('button', { name: '×' });
      fireEvent.click(removeButton);
      
      expect(mockOnChange).toHaveBeenCalledWith('[]');
    });

    it('should remove correct assertion from multiple', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' },
        { path: 'data.uptime', operator: 'exists', value: '' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const removeButtons = screen.getAllByRole('button', { name: '×' });
      fireEvent.click(removeButtons[0]);
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].path).toBe('data.uptime');
    });
  });

  describe('Updating assertions', () => {
    it('should update path when changed', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const pathInput = screen.getByDisplayValue('data.status');
      fireEvent.change(pathInput, { target: { value: 'response.status' } });
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed[0].path).toBe('response.status');
    });

    it('should update operator when changed', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const operatorSelect = screen.getByRole('combobox');
      fireEvent.change(operatorSelect, { target: { value: 'contains' } });
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed[0].operator).toBe('contains');
    });

    it('should update value when changed', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const valueInput = screen.getByDisplayValue('healthy');
      fireEvent.change(valueInput, { target: { value: 'ok' } });
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed[0].value).toBe('ok');
    });
  });

  describe('Operator-specific behavior', () => {
    it('should disable value field for exists operator', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'exists', value: '' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const valueInputs = screen.getAllByRole('textbox');
      const valueInput = valueInputs.find(input => input.placeholder === 'Not used for exists');
      expect(valueInput).toBeDisabled();
    });

    it('should enable value field for non-exists operators', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const valueInput = screen.getByDisplayValue('healthy');
      expect(valueInput).not.toBeDisabled();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON gracefully', () => {
      const { container } = render(
        <PathAssertionsEditor value="invalid json" onChange={mockOnChange} />
      );
      
      expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();
    });

    it('should handle non-array JSON', () => {
      const value = JSON.stringify({ path: 'test' });
      const { container } = render(
        <PathAssertionsEditor value={value} onChange={mockOnChange} />
      );
      
      expect(screen.getByText(/Invalid format/i)).toBeInTheDocument();
    });
  });

  describe('UI elements', () => {
    it('should display operator options', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const operatorSelect = screen.getByRole('combobox');
      expect(operatorSelect).toBeInTheDocument();
    });

    it('should display helpful hints', () => {
      render(<PathAssertionsEditor value="" onChange={mockOnChange} />);
      
      expect(screen.getByText(/Operators:/i)).toBeInTheDocument();
      expect(screen.getByText(/Path examples:/i)).toBeInTheDocument();
    });

    it('should have JSON viewer toggle button', () => {
      render(<PathAssertionsEditor value="" onChange={mockOnChange} />);
      
      expect(screen.getByRole('button', { name: /Show Raw JSON Configuration/i })).toBeInTheDocument();
    });

    it('should toggle JSON viewer when button clicked', () => {
      const value = JSON.stringify([
        { path: 'data.status', operator: 'equals', value: 'healthy' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const toggleButton = screen.getByRole('button', { name: /Show Raw JSON Configuration/i });
      fireEvent.click(toggleButton);
      
      expect(screen.getByRole('button', { name: /Hide Raw JSON Configuration/i })).toBeInTheDocument();
    });
  });

  describe('Type conversion', () => {
    it('should convert string "true" to boolean true', () => {
      const value = JSON.stringify([
        { path: 'data.active', operator: 'equals', value: '' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const valueInput = screen.getByPlaceholderText(/e.g., true, false/i);
      fireEvent.change(valueInput, { target: { value: 'true' } });
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed[0].value).toBe(true);
      expect(typeof parsed[0].value).toBe('boolean');
    });

    it('should convert string "false" to boolean false', () => {
      const value = JSON.stringify([
        { path: 'data.enabled', operator: 'equals', value: '' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const valueInput = screen.getByPlaceholderText(/e.g., true, false/i);
      fireEvent.change(valueInput, { target: { value: 'false' } });
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed[0].value).toBe(false);
      expect(typeof parsed[0].value).toBe('boolean');
    });

    it('should convert string "null" to null', () => {
      const value = JSON.stringify([
        { path: 'data.optional', operator: 'equals', value: '' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const valueInput = screen.getByPlaceholderText(/e.g., true, false/i);
      fireEvent.change(valueInput, { target: { value: 'null' } });
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed[0].value).toBe(null);
    });

    it('should convert numeric string to number', () => {
      const value = JSON.stringify([
        { path: 'data.count', operator: 'equals', value: '' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const valueInput = screen.getByPlaceholderText(/e.g., true, false/i);
      fireEvent.change(valueInput, { target: { value: '123' } });
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed[0].value).toBe(123);
      expect(typeof parsed[0].value).toBe('number');
    });

    it('should keep text as string', () => {
      const value = JSON.stringify([
        { path: 'data.name', operator: 'equals', value: '' }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      const valueInput = screen.getByPlaceholderText(/e.g., true, false/i);
      fireEvent.change(valueInput, { target: { value: 'hello' } });
      
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed[0].value).toBe('hello');
      expect(typeof parsed[0].value).toBe('string');
    });

    it('should display boolean values correctly', () => {
      const value = JSON.stringify([
        { path: 'data.active', operator: 'equals', value: true }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      expect(screen.getByDisplayValue('true')).toBeInTheDocument();
    });

    it('should display null correctly', () => {
      const value = JSON.stringify([
        { path: 'data.optional', operator: 'equals', value: null }
      ]);
      render(<PathAssertionsEditor value={value} onChange={mockOnChange} />);
      
      expect(screen.getByDisplayValue('null')).toBeInTheDocument();
    });
  });
});
