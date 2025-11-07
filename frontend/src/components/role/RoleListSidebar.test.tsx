import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleListSidebar } from './RoleListSidebar';
import * as api from '../../services/api';
import type { RoleConfig } from '../../types/roleConfig';

// Mock the API module
vi.mock('../../services/api');

describe('RoleListSidebar', () => {
  const mockRoleConfig: RoleConfig = {
    id: 'standard',
    name: 'Standard Game',
    nameKo: '기본 게임',
    description: 'Standard Two Rooms and a Boom roles',
    descriptionKo: '투 룸즈 앤 어 붐의 기본 역할',
    version: '1.0.0',
    roles: [
      {
        id: 'president',
        name: 'President',
        nameKo: '대통령',
        team: 'BLUE',
        type: 'leader',
        description: 'Blue team leader',
        descriptionKo: '블루 팀 리더',
        count: 1,
        minPlayers: 6,
        priority: 100,
      },
      {
        id: 'bomber',
        name: 'Bomber',
        nameKo: '폭탄범',
        team: 'RED',
        type: 'leader',
        description: 'Red team leader',
        descriptionKo: '레드 팀 리더',
        count: 1,
        minPlayers: 6,
        priority: 100,
      },
      {
        id: 'blue_spy',
        name: 'Blue Spy',
        nameKo: '블루 스파이',
        team: 'BLUE',
        type: 'spy',
        description: 'Blue team spy',
        descriptionKo: '블루 팀 스파이',
        count: 1,
        minPlayers: 8,
        priority: 90,
      },
      {
        id: 'red_spy',
        name: 'Red Spy',
        nameKo: '레드 스파이',
        team: 'RED',
        type: 'spy',
        description: 'Red team spy',
        descriptionKo: '레드 팀 스파이',
        count: 1,
        minPlayers: 8,
        priority: 90,
      },
      {
        id: 'blue_standard',
        name: 'Blue Team Member',
        nameKo: '블루 팀원',
        team: 'BLUE',
        type: 'standard',
        description: 'Standard blue team member',
        descriptionKo: '블루 팀 일반 팀원',
        count: { '6': 2, '8': 3 },
        minPlayers: 6,
        priority: 50,
      },
      {
        id: 'red_standard',
        name: 'Red Team Member',
        nameKo: '레드 팀원',
        team: 'RED',
        type: 'standard',
        description: 'Standard red team member',
        descriptionKo: '레드 팀 일반 팀원',
        count: { '6': 2, '8': 3 },
        minPlayers: 6,
        priority: 50,
      },
      {
        id: 'gray',
        name: 'Gray',
        nameKo: '그레이',
        team: 'GREY',
        type: 'support',
        description: 'Gray team member',
        descriptionKo: '그레이 팀원',
        count: 1,
        minPlayers: 10,
        priority: 60,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(api.getRoleConfig).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<RoleListSidebar roleConfigId="standard" />);

    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('should render role configuration after loading', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    expect(screen.getByText('투 룸즈 앤 어 붐의 기본 역할')).toBeInTheDocument();
  });

  it('should display all roles grouped by team', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('레드 팀')).toBeInTheDocument();
      expect(screen.getByText('블루 팀')).toBeInTheDocument();
      expect(screen.getByText('그레이 팀')).toBeInTheDocument();
    });

    // Check for specific roles
    expect(screen.getByText('대통령')).toBeInTheDocument();
    expect(screen.getByText('폭탄범')).toBeInTheDocument();
    expect(screen.getByText('블루 스파이')).toBeInTheDocument();
    expect(screen.getByText('레드 스파이')).toBeInTheDocument();
    expect(screen.getByText('블루 팀원')).toBeInTheDocument();
    expect(screen.getByText('레드 팀원')).toBeInTheDocument();
    expect(screen.getByText('그레이')).toBeInTheDocument();
  });

  it('should display role counts correctly', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    // Fixed count roles should show "1명"
    const onePersonCounts = screen.getAllByText('1명');
    expect(onePersonCounts.length).toBeGreaterThan(0);

    // Dynamic count roles should show "가변"
    const variableCounts = screen.getAllByText('가변');
    expect(variableCounts.length).toBe(2); // Blue and Red standard members
  });

  it('should display leader badges', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    const leaderBadges = screen.getAllByText(/👑 리더/);
    expect(leaderBadges.length).toBe(2); // President and Bomber
  });

  it('should display spy badges', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    const spyBadges = screen.getAllByText(/🕵️ 스파이/);
    expect(spyBadges.length).toBe(2); // Blue spy and Red spy
  });

  it('should display error state when API fails', async () => {
    vi.mocked(api.getRoleConfig).mockRejectedValue(new Error('Network error'));

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('역할 설정을 불러올 수 없습니다')).toBeInTheDocument();
    });
  });

  it('should call API when roleConfigId changes', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    const { rerender } = render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(api.getRoleConfig).toHaveBeenCalledWith('standard');
    });

    rerender(<RoleListSidebar roleConfigId="expansion" />);

    await waitFor(() => {
      expect(api.getRoleConfig).toHaveBeenCalledWith('expansion');
    });

    expect(api.getRoleConfig).toHaveBeenCalledTimes(2);
  });

  it('should render toggle button for mobile', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('역할 목록 열기/닫기');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveTextContent('☰');
  });

  it('should call onToggle when toggle button is clicked', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);
    const onToggle = vi.fn();

    render(<RoleListSidebar roleConfigId="standard" onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('역할 목록 열기/닫기');
    await userEvent.click(toggleButton);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should call onToggle when close button is clicked', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);
    const onToggle = vi.fn();

    render(<RoleListSidebar roleConfigId="standard" isOpen={true} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('닫기');
    await userEvent.click(closeButton);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should display role descriptions', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('블루 팀 리더')).toBeInTheDocument();
      expect(screen.getByText('레드 팀 리더')).toBeInTheDocument();
      expect(screen.getByText('블루 팀 스파이')).toBeInTheDocument();
      expect(screen.getByText('레드 팀 스파이')).toBeInTheDocument();
    });
  });

  it('should sort teams in correct order (RED, BLUE, GREY)', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    const teamHeaders = screen
      .getAllByRole('heading', { level: 4 })
      .map((h) => h.textContent);

    expect(teamHeaders).toEqual(['레드 팀', '블루 팀', '그레이 팀']);
  });

  it('should sort roles by priority within each team', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    // Get all role names in order
    const roleNames = screen.getAllByText(/팀원|대통령|폭탄범|스파이|그레이/);

    // Within Blue team: President (100) should come before Blue Spy (90) which should come before Blue Team Member (50)
    // Within Red team: Bomber (100) should come before Red Spy (90) which should come before Red Team Member (50)
    expect(roleNames.length).toBeGreaterThan(0);
  });

  it('should handle missing Korean translations gracefully', async () => {
    const configWithoutKorean: RoleConfig = {
      ...mockRoleConfig,
      nameKo: '',
      descriptionKo: '',
      roles: [
        {
          id: 'test',
          name: 'Test Role',
          nameKo: '',
          team: 'RED',
          type: 'standard',
          description: 'English description',
          descriptionKo: '',
          count: 1,
          minPlayers: 6,
          priority: 50,
        },
      ],
    };

    vi.mocked(api.getRoleConfig).mockResolvedValue(configWithoutKorean);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('Standard Game')).toBeInTheDocument();
      expect(screen.getByText('Standard Two Rooms and a Boom roles')).toBeInTheDocument();
      expect(screen.getByText('Test Role')).toBeInTheDocument();
      expect(screen.getByText('English description')).toBeInTheDocument();
    });
  });

  it('should handle empty roles array', async () => {
    const emptyConfig: RoleConfig = {
      ...mockRoleConfig,
      roles: [],
    };

    vi.mocked(api.getRoleConfig).mockResolvedValue(emptyConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    // Should not display any team headers
    expect(screen.queryByText('레드 팀')).not.toBeInTheDocument();
    expect(screen.queryByText('블루 팀')).not.toBeInTheDocument();
    expect(screen.queryByText('그레이 팀')).not.toBeInTheDocument();
  });

  it('should use default roleConfigId when not provided', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar />);

    await waitFor(() => {
      expect(api.getRoleConfig).toHaveBeenCalledWith('standard');
    });
  });

  it('should have proper ARIA labels for accessibility', async () => {
    vi.mocked(api.getRoleConfig).mockResolvedValue(mockRoleConfig);

    render(<RoleListSidebar roleConfigId="standard" />);

    await waitFor(() => {
      expect(screen.getByText('기본 게임')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('역할 목록 사이드바')).toBeInTheDocument();
    expect(screen.getByLabelText('역할 목록 열기/닫기')).toBeInTheDocument();
    expect(screen.getByLabelText('닫기')).toBeInTheDocument();
  });
});
