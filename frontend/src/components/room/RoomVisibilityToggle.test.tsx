import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoomVisibilityToggle } from './RoomVisibilityToggle';

describe('RoomVisibilityToggle', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders public and private options', () => {
    render(<RoomVisibilityToggle value={true} onChange={mockOnChange} />);

    expect(screen.getByLabelText('공개 방')).toBeInTheDocument();
    expect(screen.getByLabelText('비공개 방')).toBeInTheDocument();
  });

  it('shows public option as checked when value is true', () => {
    render(<RoomVisibilityToggle value={true} onChange={mockOnChange} />);

    const publicRadio = screen.getByLabelText('공개 방') as HTMLInputElement;
    const privateRadio = screen.getByLabelText('비공개 방') as HTMLInputElement;

    expect(publicRadio.checked).toBe(true);
    expect(privateRadio.checked).toBe(false);
  });

  it('shows private option as checked when value is false', () => {
    render(<RoomVisibilityToggle value={false} onChange={mockOnChange} />);

    const publicRadio = screen.getByLabelText('공개 방') as HTMLInputElement;
    const privateRadio = screen.getByLabelText('비공개 방') as HTMLInputElement;

    expect(publicRadio.checked).toBe(false);
    expect(privateRadio.checked).toBe(true);
  });

  it('calls onChange with true when public option clicked', () => {
    render(<RoomVisibilityToggle value={false} onChange={mockOnChange} />);

    const publicRadio = screen.getByLabelText('공개 방');
    fireEvent.click(publicRadio);

    expect(mockOnChange).toHaveBeenCalledWith(true);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with false when private option clicked', () => {
    render(<RoomVisibilityToggle value={true} onChange={mockOnChange} />);

    const privateRadio = screen.getByLabelText('비공개 방');
    fireEvent.click(privateRadio);

    expect(mockOnChange).toHaveBeenCalledWith(false);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('displays descriptions for both options', () => {
    render(<RoomVisibilityToggle value={true} onChange={mockOnChange} />);

    expect(screen.getByText('다른 플레이어가 방 목록에서 볼 수 있습니다')).toBeInTheDocument();
    expect(screen.getByText('코드를 아는 사람만 참가할 수 있습니다')).toBeInTheDocument();
  });

  it('displays section heading', () => {
    render(<RoomVisibilityToggle value={true} onChange={mockOnChange} />);

    expect(screen.getByText('방 공개 설정')).toBeInTheDocument();
  });

  it('displays icons for public and private options', () => {
    render(<RoomVisibilityToggle value={true} onChange={mockOnChange} />);

    expect(screen.getByText('🔓')).toBeInTheDocument();
    expect(screen.getByText('🔒')).toBeInTheDocument();
  });

  it('has minimum height for touch targets', () => {
    const { container } = render(<RoomVisibilityToggle value={true} onChange={mockOnChange} />);

    const labels = container.querySelectorAll('label');
    labels.forEach((label) => {
      expect(label).toHaveStyle({ minHeight: '60px' });
    });
  });

  it('uses same radio group name for both options', () => {
    render(<RoomVisibilityToggle value={true} onChange={mockOnChange} />);

    const publicRadio = screen.getByLabelText('공개 방') as HTMLInputElement;
    const privateRadio = screen.getByLabelText('비공개 방') as HTMLInputElement;

    expect(publicRadio.name).toBe('roomVisibility');
    expect(privateRadio.name).toBe('roomVisibility');
  });
});
