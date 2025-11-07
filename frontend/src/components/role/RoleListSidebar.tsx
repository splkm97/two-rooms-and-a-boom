import { useState, useEffect } from 'react';
import { getRoleConfig } from '../../services/api';
import type { RoleConfig, RoleDefinition } from '../../types/roleConfig';

interface RoleListSidebarProps {
  roleConfigId?: string;
  selectedRoles?: Record<string, number>; // Selected role IDs with their counts
  isOpen?: boolean;
  onToggle?: () => void;
}

// Helper function to get team color from CSS variables
function getTeamColor(team: 'RED' | 'BLUE' | 'GREY'): string {
  switch (team) {
    case 'RED':
      return 'var(--color-red)';
    case 'BLUE':
      return 'var(--color-blue)';
    case 'GREY':
      return 'var(--color-grey)';
    default:
      return 'var(--text-secondary)';
  }
}

// Helper function to get team name in Korean
function getTeamNameKo(team: 'RED' | 'BLUE' | 'GREY'): string {
  switch (team) {
    case 'RED':
      return '레드 팀';
    case 'BLUE':
      return '블루 팀';
    case 'GREY':
      return '그레이 팀';
    default:
      return '알 수 없음';
  }
}

// Helper function to format role count
function formatRoleCount(count: number | Record<string, number>): string {
  if (typeof count === 'number') {
    return `${count}명`;
  }
  // For dynamic counts based on player count
  const entries = Object.entries(count);
  if (entries.length === 0) return '0명';
  if (entries.length === 1) return `${entries[0][1]}명`;
  return '가변';
}

export function RoleListSidebar({ roleConfigId = 'standard', selectedRoles, isOpen = false, onToggle }: RoleListSidebarProps) {
  const [roleConfig, setRoleConfig] = useState<RoleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoleConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleConfigId]);

  const loadRoleConfig = async () => {
    if (!roleConfigId) return;

    try {
      setLoading(true);
      setError('');
      const config = await getRoleConfig(roleConfigId);
      setRoleConfig(config);
    } catch (err) {
      console.error('Failed to load role config:', err);
      setError('역할 설정을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  // Filter roles to show only selected ones, and group by team
  const groupedRoles = roleConfig?.roles
    .filter(role => selectedRoles && selectedRoles[role.id] !== undefined)
    .reduce((acc, role) => {
      if (!acc[role.team]) {
        acc[role.team] = [];
      }
      acc[role.team].push(role);
      return acc;
    }, {} as Record<string, RoleDefinition[]>);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 200,
          display: 'none',
          padding: '0.75rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '1.2rem',
          lineHeight: 1,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}
        className="role-sidebar-toggle"
        aria-label="역할 목록 열기/닫기"
      >
        ☰
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onToggle}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            display: 'none',
          }}
          className="role-sidebar-backdrop"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderLeft: 'none',
          overflowY: 'auto',
          zIndex: 100,
          padding: '1.5rem',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.3s ease-in-out',
        }}
        className={`role-sidebar ${isOpen ? 'open' : ''}`}
        aria-label="역할 목록 사이드바"
      >
        {/* Header */}
        <div
          style={{
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid var(--border-color)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '0.5rem',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
              }}
            >
              역할 목록
            </h2>
            <button
              onClick={onToggle}
              style={{
                display: 'none',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1.5rem',
                lineHeight: 1,
              }}
              className="role-sidebar-close"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2rem 0',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
            }}
          >
            로딩 중...
          </div>
        ) : error ? (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        ) : roleConfig ? (
          <>
            {/* Config name and description */}
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                }}
              >
                {roleConfig.nameKo || roleConfig.name}
              </h3>
              {(roleConfig.descriptionKo || roleConfig.description) && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {roleConfig.descriptionKo || roleConfig.description}
                </p>
              )}
            </div>

            {/* Roles list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {groupedRoles &&
                Object.entries(groupedRoles)
                  .sort(([teamA], [teamB]) => {
                    // Sort order: RED, BLUE, GREY
                    const order = { RED: 0, BLUE: 1, GREY: 2 };
                    return order[teamA as keyof typeof order] - order[teamB as keyof typeof order];
                  })
                  .map(([team, roles]) => (
                    <div key={team}>
                      {/* Team header */}
                      <div
                        style={{
                          marginBottom: '0.75rem',
                          paddingBottom: '0.5rem',
                          borderBottom: `2px solid ${getTeamColor(team as 'RED' | 'BLUE' | 'GREY')}`,
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            color: getTeamColor(team as 'RED' | 'BLUE' | 'GREY'),
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {getTeamNameKo(team as 'RED' | 'BLUE' | 'GREY')}
                        </h4>
                      </div>

                      {/* Team roles */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {roles
                          .sort((a, b) => b.priority - a.priority)
                          .map((role) => (
                            <div
                              key={role.id}
                              style={{
                                padding: '0.75rem',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                transition: 'background-color 0.2s',
                              }}
                              className="role-item"
                            >
                              {/* Role name and count */}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '0.5rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      backgroundColor: getTeamColor(role.team),
                                      flexShrink: 0,
                                    }}
                                    aria-hidden="true"
                                  />
                                  <span
                                    style={{
                                      fontSize: '0.875rem',
                                      fontWeight: 600,
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    {role.nameKo || role.name}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                    backgroundColor: 'var(--bg-primary)',
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '12px',
                                  }}
                                >
                                  {selectedRoles && selectedRoles[role.id] ? `${selectedRoles[role.id]}명` : formatRoleCount(role.count)}
                                </span>
                              </div>

                              {/* Role description */}
                              {(role.descriptionKo || role.description) && (
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {role.descriptionKo || role.description}
                                </p>
                              )}

                              {/* Role type badges */}
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.25rem',
                                  marginTop: '0.5rem',
                                  flexWrap: 'wrap',
                                }}
                              >
                                {role.type === 'leader' && (
                                  <span
                                    style={{
                                      fontSize: '0.625rem',
                                      padding: '0.125rem 0.375rem',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(251, 191, 36, 0.2)',
                                      color: '#fbbf24',
                                      fontWeight: 600,
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    👑 리더
                                  </span>
                                )}
                                {role.type === 'spy' && (
                                  <span
                                    style={{
                                      fontSize: '0.625rem',
                                      padding: '0.125rem 0.375rem',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(167, 139, 250, 0.2)',
                                      color: '#a78bfa',
                                      fontWeight: 600,
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    🕵️ 스파이
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
            </div>
          </>
        ) : (
          <div
            style={{
              padding: '2rem 0',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            역할 정보를 불러올 수 없습니다
          </div>
        )}
      </aside>

      {/* Responsive styles */}
      <style>{`
        /* Desktop - always visible */
        @media (min-width: 769px) {
          .role-sidebar {
            transform: translateX(0) !important;
          }
          .role-sidebar-toggle,
          .role-sidebar-close,
          .role-sidebar-backdrop {
            display: none !important;
          }
        }

        /* Mobile - collapsible */
        @media (max-width: 768px) {
          .role-sidebar-toggle {
            display: block !important;
          }
          .role-sidebar-close {
            display: block !important;
          }
          .role-sidebar {
            width: 100%;
            max-width: 320px;
            transform: translateX(-100%);
          }
          .role-sidebar.open {
            transform: translateX(0);
          }
          .role-sidebar-backdrop {
            display: block !important;
          }
          .role-sidebar.open ~ * {
            pointer-events: none;
          }
        }

        /* Hover effect for role items on desktop */
        @media (hover: hover) {
          .role-item:hover {
            background-color: var(--bg-primary) !important;
            cursor: pointer;
          }
        }

        /* Smooth scrolling for sidebar */
        .role-sidebar {
          scrollbar-width: thin;
          scrollbar-color: var(--border-color) transparent;
        }
        .role-sidebar::-webkit-scrollbar {
          width: 8px;
        }
        .role-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }
        .role-sidebar::-webkit-scrollbar-thumb {
          background-color: var(--border-color);
          border-radius: 4px;
        }
        .role-sidebar::-webkit-scrollbar-thumb:hover {
          background-color: var(--text-secondary);
        }
      `}</style>
    </>
  );
}
