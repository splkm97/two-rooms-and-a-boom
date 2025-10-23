import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RoomCodeInput } from '../RoomCodeInput';

describe('RoomCodeInput', () => {
  it('should render input and button', () => {
    render(<RoomCodeInput onSubmit={vi.fn()} />);

    expect(screen.getByPlaceholderText('방 코드 입력 (6자리)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '참가' })).toBeInTheDocument();
  });

  it('should call onSubmit with valid room code', () => {
    const mockOnSubmit = vi.fn();
    render(<RoomCodeInput onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)');
    const button = screen.getByRole('button', { name: '참가' });

    fireEvent.change(input, { target: { value: 'ABC123' } });
    fireEvent.click(button);

    expect(mockOnSubmit).toHaveBeenCalledWith('ABC123');
  });

  it('should show error for invalid room code length', () => {
    const mockOnSubmit = vi.fn();
    render(<RoomCodeInput onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)');
    const button = screen.getByRole('button', { name: '참가' });

    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(button);

    expect(screen.getByText('방 코드는 6자리여야 합니다')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error for invalid characters', () => {
    const mockOnSubmit = vi.fn();
    render(<RoomCodeInput onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)');
    const button = screen.getByRole('button', { name: '참가' });

    fireEvent.change(input, { target: { value: 'ABC-12' } });
    fireEvent.click(button);

    expect(screen.getByText('방 코드는 영문자와 숫자만 가능합니다')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should convert input to uppercase', () => {
    render(<RoomCodeInput onSubmit={vi.fn()} />);

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'abc123' } });

    expect(input.value).toBe('ABC123');
  });

  it('should submit on Enter key press', () => {
    const mockOnSubmit = vi.fn();
    render(<RoomCodeInput onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)');

    fireEvent.change(input, { target: { value: 'ABC123' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(mockOnSubmit).toHaveBeenCalledWith('ABC123');
  });

  it('should limit input to 6 characters', () => {
    render(<RoomCodeInput onSubmit={vi.fn()} />);

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)') as HTMLInputElement;

    expect(input.maxLength).toBe(6);
  });

  it('should clear error on new submission attempt', () => {
    const mockOnSubmit = vi.fn();
    render(<RoomCodeInput onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)');
    const button = screen.getByRole('button', { name: '참가' });

    // First invalid submission
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(button);
    expect(screen.getByText('방 코드는 6자리여야 합니다')).toBeInTheDocument();

    // Second valid submission should clear error
    fireEvent.change(input, { target: { value: 'ABC123' } });
    fireEvent.click(button);
    expect(screen.queryByText('방 코드는 6자리여야 합니다')).not.toBeInTheDocument();
  });
});
