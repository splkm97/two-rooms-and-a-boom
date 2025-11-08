import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Role, TeamColor } from '../types/game.types';

// 역할 공개 전체화면 페이지 - 정보 교환시 사용
export function RevealPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [team, setTeam] = useState<TeamColor | null>(null);
  const [revealMode, setRevealMode] = useState<'color' | 'full'>('color');

  useEffect(() => {
    // localStorage에서 역할 정보 가져오기
    const storedRole = localStorage.getItem(`role_${roomCode}`);
    const storedTeam = localStorage.getItem(`team_${roomCode}`);

    if (storedRole && storedTeam) {
      setRole(JSON.parse(storedRole));
      setTeam(storedTeam as TeamColor);
    } else {
      // 역할 정보가 없으면 게임 페이지로 리다이렉트
      navigate(`/room/${roomCode}?view=game`);
    }
  }, [roomCode, navigate]);

  if (!role || !team) {
    return null;
  }

  // Color mode: 스파이는 반대 팀 색상 표시
  // Full mode: 실제 팀 색상 표시
  const displayTeam = revealMode === 'color' && role.isSpy
    ? (team === 'RED' ? 'BLUE' : 'RED')
    : team;

  const bgColor = displayTeam === 'RED' ? '#dc2626' : team === 'BLUE' ? '#2563eb' : '#6b7280';
  const textColor = '#ffffff';

  const handleBack = () => {
    navigate(`/game/${roomCode}`);
  };

  const toggleRevealMode = () => {
    setRevealMode(prev => prev === 'color' ? 'full' : 'color');
  };

  const getTeamName = (teamColor: TeamColor) => {
    if (teamColor === 'RED') return '레드 팀';
    if (teamColor === 'BLUE') return '블루 팀';
    return '그레이 팀';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: bgColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
      }}
    >
      {/* 뒤로가기 버튼 */}
      <button
        onClick={handleBack}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: bgColor,
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}
      >
        ← 돌아가기
      </button>

      {/* 모드 전환 버튼 */}
      <button
        onClick={toggleRevealMode}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: bgColor,
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}
      >
        {revealMode === 'color' ? '🃏 전체 공개' : '🎨 색상만'}
      </button>

      {/* 중앙 콘텐츠 */}
      <div style={{ textAlign: 'center', maxWidth: '800px', width: '100%' }}>
        {revealMode === 'color' ? (
          /* 색상 공개 모드: 팀 색상만 표시 */
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '3rem 4rem',
              borderRadius: '24px',
              border: `4px solid rgba(255, 255, 255, 0.5)`,
            }}
          >
            <h1
              style={{
                color: textColor,
                fontSize: '5rem',
                fontWeight: 'bold',
                margin: 0,
                textShadow: '3px 3px 6px rgba(0, 0, 0, 0.4)',
              }}
            >
              {getTeamName(displayTeam)}
            </h1>
          </div>
        ) : (
          /* 전체 공개 모드: 역할 전체 정보 표시 */
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '2rem 3rem',
              borderRadius: '24px',
              border: `4px solid rgba(255, 255, 255, 0.8)`,
              color: '#1f2937',
            }}
          >
            {/* 역할 아이콘 */}
            {role.icon && (
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                {role.icon}
              </div>
            )}

            {/* 역할 이름 */}
            <h1
              style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                margin: '0 0 1rem 0',
                color: bgColor,
              }}
            >
              {role.nameKo || role.name}
            </h1>

            {/* 팀 표시 */}
            <div
              style={{
                display: 'inline-block',
                padding: '0.5rem 1.5rem',
                borderRadius: '12px',
                backgroundColor: bgColor,
                color: textColor,
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1.5rem',
              }}
            >
              {getTeamName(team)}
            </div>

            {/* 역할 배지 */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {role.isLeader && (
                <span
                  style={{
                    fontSize: '1rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(251, 191, 36, 0.3)',
                    color: '#92400e',
                    fontWeight: 600,
                    border: '2px solid #fbbf24',
                  }}
                >
                  👑 리더
                </span>
              )}
              {role.isSpy && (
                <span
                  style={{
                    fontSize: '1rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(167, 139, 250, 0.3)',
                    color: '#5b21b6',
                    fontWeight: 600,
                    border: '2px solid #a78bfa',
                  }}
                >
                  🕵️ 스파이
                </span>
              )}
              {team === 'GREY' && (
                <span
                  style={{
                    fontSize: '1rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(107, 114, 128, 0.3)',
                    color: '#1f2937',
                    fontWeight: 600,
                    border: '2px solid #6b7280',
                  }}
                >
                  ⚡ 독립
                </span>
              )}
            </div>

            {/* 역할 설명 */}
            <p
              style={{
                fontSize: '1.25rem',
                lineHeight: 1.8,
                margin: 0,
                color: '#4b5563',
                maxWidth: '600px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              {role.descriptionKo || role.description}
            </p>
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      <div
        style={{
          position: 'absolute',
          bottom: '2rem',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.1rem',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
          zIndex: 500,
        }}
      >
        <p style={{ margin: 0 }}>
          {revealMode === 'color'
            ? '진영 정보 교환: 다른 플레이어에게 이 화면을 보여주세요'
            : '역할 카드 교환: 다른 플레이어에게 이 화면을 보여주세요'}
        </p>
      </div>
    </div>
  );
}
