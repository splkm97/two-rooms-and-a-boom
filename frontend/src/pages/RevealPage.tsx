import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Role, TeamColor } from '../types/game.types';

// 역할 공개 전체화면 페이지 - 정보 교환시 사용
export function RevealPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [team, setTeam] = useState<TeamColor | null>(null);

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

  // 스파이는 반대 팀 색상 표시
  const displayTeam = role.isSpy ? (team === 'RED' ? 'BLUE' : 'RED') : team;
  const bgColor = displayTeam === 'RED' ? '#dc2626' : '#2563eb';
  const textColor = '#ffffff';

  const handleBack = () => {
    navigate(`/game/${roomCode}`);
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
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          color: textColor,
          border: `2px solid ${textColor}`,
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        ← 돌아가기
      </button>

      {/* 중앙 팀 색상만 표시 (역할 정보는 숨김) */}
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        {/* 팀 색상만 크게 표시 */}
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
            {displayTeam === 'RED' ? '레드 팀' : '블루 팀'}
          </h1>
        </div>
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
        }}
      >
        <p style={{ margin: 0 }}>
          다른 플레이어에게 이 화면을 보여주세요
        </p>
      </div>
    </div>
  );
}
