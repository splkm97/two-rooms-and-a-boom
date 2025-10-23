import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NicknameEditor } from '../NicknameEditor';

describe('NicknameEditor', () => {
  it('should render current nickname in display mode', () => {
    render(<NicknameEditor currentNickname="TestUser" onUpdate={vi.fn()} />);

    expect(screen.getByText('내 닉네임')).toBeInTheDocument();
    expect(screen.getByText('TestUser')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '변경' })).toBeInTheDocument();
  });

  it('should switch to edit mode when clicking edit button', () => {
    render(<NicknameEditor currentNickname="TestUser" onUpdate={vi.fn()} />);

    const editButton = screen.getByRole('button', { name: '변경' });
    fireEvent.click(editButton);

    expect(screen.getByText('새 닉네임 입력')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
  });

  it('should call onUpdate with new nickname on save', async () => {
    const mockOnUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NicknameEditor currentNickname="OldName" onUpdate={mockOnUpdate} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    // Change nickname
    const input = screen.getByDisplayValue('OldName');
    fireEvent.change(input, { target: { value: 'NewName' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('NewName');
    });
  });

  it('should show error for too short nickname', async () => {
    const mockOnUpdate = vi.fn();
    render(<NicknameEditor currentNickname="TestUser" onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    const input = screen.getByDisplayValue('TestUser');
    fireEvent.change(input, { target: { value: 'A' } });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.getByText('닉네임은 2자 이상 20자 이하여야 합니다')).toBeInTheDocument();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should show error for too long nickname', async () => {
    const mockOnUpdate = vi.fn();
    render(<NicknameEditor currentNickname="TestUser" onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    const input = screen.getByDisplayValue('TestUser');
    fireEvent.change(input, { target: { value: 'A'.repeat(21) } });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.getByText('닉네임은 2자 이상 20자 이하여야 합니다')).toBeInTheDocument();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should cancel edit and revert to original nickname', () => {
    render(<NicknameEditor currentNickname="OriginalName" onUpdate={vi.fn()} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    // Change nickname
    const input = screen.getByDisplayValue('OriginalName');
    fireEvent.change(input, { target: { value: 'ChangedName' } });

    // Cancel
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    // Should be back to display mode with original name
    expect(screen.getByText('OriginalName')).toBeInTheDocument();
    expect(screen.queryByText('새 닉네임 입력')).not.toBeInTheDocument();
  });

  it('should show character count', () => {
    render(<NicknameEditor currentNickname="Test" onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    expect(screen.getByText('4/20자')).toBeInTheDocument();

    const input = screen.getByDisplayValue('Test');
    fireEvent.change(input, { target: { value: 'TestUser' } });

    expect(screen.getByText('8/20자')).toBeInTheDocument();
  });

  it('should show loading state while updating', async () => {
    const mockOnUpdate = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<NicknameEditor currentNickname="TestUser" onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    const input = screen.getByDisplayValue('TestUser');
    fireEvent.change(input, { target: { value: 'NewName' } });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.getByText('저장 중...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '저장 중...' })).toBeDisabled();
    });
  });

  it('should handle update error', async () => {
    const mockOnUpdate = vi.fn().mockRejectedValue(new Error('Update failed'));
    render(<NicknameEditor currentNickname="TestUser" onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    const input = screen.getByDisplayValue('TestUser');
    fireEvent.change(input, { target: { value: 'NewName' } });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('should limit input to 20 characters', () => {
    render(<NicknameEditor currentNickname="TestUser" onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    const input = screen.getByDisplayValue('TestUser') as HTMLInputElement;

    expect(input.maxLength).toBe(20);
  });

  it('should exit edit mode after successful update', async () => {
    const mockOnUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NicknameEditor currentNickname="OldName" onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    const input = screen.getByDisplayValue('OldName');
    fireEvent.change(input, { target: { value: 'NewName' } });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.queryByText('새 닉네임 입력')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '변경' })).toBeInTheDocument();
    });
  });
});
