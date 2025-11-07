import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RoleCard } from './RoleCard';
import type { Role, TeamColor, RoomColor } from '../../types/game.types';

describe('RoleCard', () => {
  const mockRole: Role = {
    id: 'president',
    name: '대통령',
    description: '블루 팀의 리더입니다',
    team: 'BLUE',
    isLeader: true,
    isSpy: false,
  };

  it('should render role name and description', () => {
    render(
      <RoleCard role={mockRole} team={'BLUE' as TeamColor} currentRoom={'BLUE_ROOM' as RoomColor} />
    );

    expect(screen.getByText('당신의 역할')).toBeInTheDocument();
    expect(screen.getByText('대통령')).toBeInTheDocument();
    expect(screen.getByText('블루 팀의 리더입니다')).toBeInTheDocument();
  });

  it('should display blue team color', () => {
    render(
      <RoleCard role={mockRole} team={'BLUE' as TeamColor} currentRoom={'BLUE_ROOM' as RoomColor} />
    );

    expect(screen.getByText('블루 팀')).toBeInTheDocument();
  });

  it('should display red team color', () => {
    const redRole: Role = {
      id: 'bomber',
      name: '폭파범',
      description: '레드 팀의 리더입니다',
      team: 'RED',
      isLeader: true,
      isSpy: false,
    };

    render(
      <RoleCard role={redRole} team={'RED' as TeamColor} currentRoom={'RED_ROOM' as RoomColor} />
    );

    expect(screen.getByText('레드 팀')).toBeInTheDocument();
  });

  it('should show leader badge when role is leader', () => {
    render(
      <RoleCard role={mockRole} team={'BLUE' as TeamColor} currentRoom={'BLUE_ROOM' as RoomColor} />
    );

    expect(screen.getByText(/👑 리더/)).toBeInTheDocument();
  });

  it('should not show leader badge for non-leader', () => {
    const operativeRole: Role = {
      id: 'operative',
      name: '요원',
      description: '블루 팀 요원입니다',
      team: 'BLUE',
      isLeader: false,
      isSpy: false,
    };

    render(
      <RoleCard
        role={operativeRole}
        team={'BLUE' as TeamColor}
        currentRoom={'BLUE_ROOM' as RoomColor}
      />
    );

    expect(screen.queryByText(/👑 리더/)).not.toBeInTheDocument();
  });

  it('should show spy badge when role is spy', () => {
    const spyRole: Role = {
      id: 'spy',
      name: '스파이',
      description: '상대 팀에 침투한 스파이입니다',
      team: 'RED',
      isLeader: false,
      isSpy: true,
    };

    render(
      <RoleCard role={spyRole} team={'RED' as TeamColor} currentRoom={'BLUE_ROOM' as RoomColor} />
    );

    expect(screen.getByText(/🕵️ 스파이/)).toBeInTheDocument();
  });

  it('should not show spy badge for non-spy', () => {
    render(
      <RoleCard role={mockRole} team={'BLUE' as TeamColor} currentRoom={'BLUE_ROOM' as RoomColor} />
    );

    expect(screen.queryByText(/🕵️ 스파이/)).not.toBeInTheDocument();
  });

  it('should display current room location - blue room', () => {
    render(
      <RoleCard role={mockRole} team={'BLUE' as TeamColor} currentRoom={'BLUE_ROOM' as RoomColor} />
    );

    expect(screen.getByText(/📍 현재 위치:/)).toBeInTheDocument();
    expect(screen.getByText('파란 방')).toBeInTheDocument();
  });

  it('should display current room location - red room', () => {
    render(
      <RoleCard role={mockRole} team={'BLUE' as TeamColor} currentRoom={'RED_ROOM' as RoomColor} />
    );

    expect(screen.getByText(/📍 현재 위치:/)).toBeInTheDocument();
    expect(screen.getByText('빨간 방')).toBeInTheDocument();
  });

  it('should render complete role card with all elements', () => {
    const spyLeaderRole: Role = {
      id: 'spy-leader',
      name: '스파이 리더',
      description: '특수 역할입니다',
      team: 'RED',
      isLeader: true,
      isSpy: true,
    };

    render(
      <RoleCard
        role={spyLeaderRole}
        team={'RED' as TeamColor}
        currentRoom={'BLUE_ROOM' as RoomColor}
      />
    );

    expect(screen.getByText('스파이 리더')).toBeInTheDocument();
    expect(screen.getByText('특수 역할입니다')).toBeInTheDocument();
    // For spy, displays opposite team (BLUE) with actual team in parentheses
    expect(screen.getByText(/블루 팀/)).toBeInTheDocument();
    expect(screen.getByText(/실제: 레드 팀/)).toBeInTheDocument();
    expect(screen.getByText(/👑 리더/)).toBeInTheDocument();
    expect(screen.getByText(/🕵️ 스파이/)).toBeInTheDocument();
    expect(screen.getByText(/📍 현재 위치:/)).toBeInTheDocument();
    expect(screen.getByText('파란 방')).toBeInTheDocument();
  });
});
