import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoleConfigs, createRoom } from '../services/api';
import type { RoleConfig } from '../types/roleConfig';
import { Layout } from '../components/common/Layout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface RoleDefinition {
  id: string;
  name: string;
  nameKo: string;
  team: string;
  type: string;
  description: string;
  descriptionKo: string;
  count: number | Record<string, number>;
  minPlayers: number;
  priority: number;
  color: string;
  icon: string;
  required?: boolean;
}

interface RoleSelection {
  roleId: string;
  count: number;
}

export function RoleConfigPage() {
  const navigate = useNavigate();
  const [allRoles, setAllRoles] = useState<RoleDefinition[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all available roles
      const response = await getRoleConfigs();
      const allRolesConfig = response.configs.find((c: any) => c.id === 'all-roles');

      if (!allRolesConfig) {
        throw new Error('All roles configuration not found');
      }

      // Fetch the full config to get role details
      const fullConfigResponse = await fetch(`http://localhost:8080/api/v1/role-configs/all-roles`);
      const fullConfig: RoleConfig = await fullConfigResponse.json();

      setAllRoles(fullConfig.roles as RoleDefinition[]);

      // Pre-select required roles with count = 1
      const requiredRoles = new Map<string, number>();
      fullConfig.roles
        .filter((r: any) => r.required)
        .forEach((r: any) => {
          requiredRoles.set(r.id, 1);
        });
      setSelectedRoles(requiredRoles);
    } catch {
      setError('역할 목록을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId: string) => {
    const role = allRoles.find(r => r.id === roleId);
    if (role?.required) return; // Can't deselect required roles

    const newSelected = new Map(selectedRoles);
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId);
    } else {
      newSelected.set(roleId, 1); // Default to 1 when selected
    }
    setSelectedRoles(newSelected);
  };

  const updateRoleCount = (roleId: string, count: number) => {
    if (count < 0) return;
    if (count > 99) return; // Max limit

    const newSelected = new Map(selectedRoles);
    if (count === 0) {
      const role = allRoles.find(r => r.id === roleId);
      if (!role?.required) {
        newSelected.delete(roleId);
      }
    } else {
      newSelected.set(roleId, count);
    }
    setSelectedRoles(newSelected);
  };

  const getTotalRoleCount = () => {
    return Array.from(selectedRoles.values()).reduce((sum, count) => sum + count, 0);
  };

  const handleCreateRoom = async () => {
    if (selectedRoles.size < 4) {
      setError('최소 4개의 역할을 선택해주세요 (대통령, 폭파범, 블루 팀원, 레드 팀원)');
      return;
    }

    const totalCount = getTotalRoleCount();
    if (totalCount < 6) {
      setError('최소 6명의 플레이어가 필요합니다. 역할 인원을 늘려주세요.');
      return;
    }

    try {
      setCreating(true);
      setError('');

      // Convert Map to Record for API
      const selectedRolesRecord: Record<string, number> = {};
      selectedRoles.forEach((count, roleId) => {
        selectedRolesRecord[roleId] = count;
      });

      // Create room with selected roles
      const room = await createRoom(totalCount, true, 'all-roles', selectedRolesRecord);

      // Store player ID and owner status
      localStorage.setItem(`playerId_${room.code}`, room.ownerId);
      localStorage.setItem(`isOwner_${room.code}`, 'true');

      // Navigate to lobby
      navigate(`/room/${room.code}?view=lobby`);
    } catch {
      setError('방 생성에 실패했습니다');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  // Group roles by team
  const blueRoles = allRoles.filter(r => r.team === 'BLUE');
  const redRoles = allRoles.filter(r => r.team === 'RED');
  const greyRoles = allRoles.filter(r => r.team === 'GREY');

  const totalCount = getTotalRoleCount();

  return (
    <Layout>
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: 'clamp(1rem, 4vw, 2rem)',
        }}
      >
        {/* Left Sidebar - Selected Roles Summary */}
        <div
          style={{
            width: '280px',
            flexShrink: 0,
            position: 'sticky',
            top: '1rem',
            height: 'fit-content',
            display: window.innerWidth < 768 ? 'none' : 'block',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, white)',
              border: '2px solid var(--border-color, #ddd)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
          >
            <h3
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1.25rem',
                color: 'var(--text-primary)',
              }}
            >
              선택된 역할
            </h3>

            {/* Total Count */}
            <div
              style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                backgroundColor: totalCount >= 6 ? '#e6f7ff' : '#fff7e6',
                border: `2px solid ${totalCount >= 6 ? '#91d5ff' : '#ffd591'}`,
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: totalCount >= 6 ? '#0050b3' : '#d46b08',
              }}
            >
              총 {totalCount}명
            </div>

            {/* Selected Roles List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Array.from(selectedRoles.entries()).map(([roleId, count]) => {
                const role = allRoles.find((r) => r.id === roleId);
                if (!role) return null;

                return (
                  <div
                    key={roleId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      backgroundColor: `${role.color}15`,
                      border: `1px solid ${role.color}`,
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{role.icon}</span>
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {role.nameKo}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        color: role.color,
                        minWidth: '2rem',
                        textAlign: 'right',
                      }}
                    >
                      ×{count}
                    </span>
                  </div>
                );
              })}

              {selectedRoles.size === 0 && (
                <div
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                  }}
                >
                  역할을 선택해주세요
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
            textAlign: 'center',
            color: 'var(--text-primary)',
          }}
        >
          역할 선택
        </h1>

        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          }}
        >
          게임에 포함할 역할과 각 역할의 인원 수를 설정하세요
        </p>

        {/* Total count display */}
        <div
          style={{
            padding: 'clamp(0.75rem, 2vw, 1rem)',
            marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
            backgroundColor: totalCount >= 6 ? '#e6f7ff' : '#fff7e6',
            border: `1px solid ${totalCount >= 6 ? '#91d5ff' : '#ffd591'}`,
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
            fontWeight: 'bold',
            color: totalCount >= 6 ? '#0050b3' : '#d46b08',
          }}
        >
          총 인원: {totalCount}명 {totalCount < 6 && '(최소 6명 필요)'}
        </div>

        {error && (
          <div
            style={{
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
              textAlign: 'center',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            }}
          >
            {error}
          </div>
        )}

        {/* Blue Team Roles */}
        <div style={{ marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
          <h2
            style={{
              fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
              marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
              color: '#0066CC',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>💙</span> 블루 팀
          </h2>
          <div
            style={{
              display: 'grid',
              gap: 'clamp(0.5rem, 2vw, 0.75rem)',
            }}
          >
            {blueRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                count={selectedRoles.get(role.id) || 0}
                selected={selectedRoles.has(role.id)}
                onToggle={() => toggleRole(role.id)}
                onCountChange={(count) => updateRoleCount(role.id, count)}
              />
            ))}
          </div>
        </div>

        {/* Red Team Roles */}
        <div style={{ marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
          <h2
            style={{
              fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
              marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
              color: '#CC0000',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>❤️</span> 레드 팀
          </h2>
          <div
            style={{
              display: 'grid',
              gap: 'clamp(0.5rem, 2vw, 0.75rem)',
            }}
          >
            {redRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                count={selectedRoles.get(role.id) || 0}
                selected={selectedRoles.has(role.id)}
                onToggle={() => toggleRole(role.id)}
                onCountChange={(count) => updateRoleCount(role.id, count)}
              />
            ))}
          </div>
        </div>

        {/* Grey Team Roles */}
        {greyRoles.length > 0 && (
          <div style={{ marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
            <h2
              style={{
                fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                color: '#808080',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>⚪</span> 중립
            </h2>
            <div
              style={{
                display: 'grid',
                gap: 'clamp(0.5rem, 2vw, 0.75rem)',
              }}
            >
              {greyRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  count={selectedRoles.get(role.id) || 0}
                  selected={selectedRoles.has(role.id)}
                  onToggle={() => toggleRole(role.id)}
                  onCountChange={(count) => updateRoleCount(role.id, count)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 'clamp(0.75rem, 2vw, 1rem)',
            flexDirection: 'column',
            marginTop: 'clamp(2rem, 5vw, 3rem)',
          }}
        >
          <button
            onClick={handleCreateRoom}
            disabled={creating || selectedRoles.size < 4 || totalCount < 6}
            style={{
              padding: 'clamp(0.875rem, 3vw, 1.25rem)',
              fontSize: 'clamp(1rem, 3vw, 1.25rem)',
              fontWeight: 'bold',
              backgroundColor: creating || selectedRoles.size < 4 || totalCount < 6 ? '#999' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: creating || selectedRoles.size < 4 || totalCount < 6 ? 'not-allowed' : 'pointer',
              minHeight: '48px',
              opacity: creating || selectedRoles.size < 4 || totalCount < 6 ? 0.6 : 1,
            }}
          >
            {creating ? '방 생성 중...' : `방 만들기 (총 ${totalCount}명)`}
          </button>

          <button
            onClick={() => navigate('/')}
            disabled={creating}
            style={{
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color, #ddd)',
              borderRadius: '8px',
              cursor: creating ? 'not-allowed' : 'pointer',
              minHeight: '44px',
            }}
          >
            뒤로 가기
          </button>
        </div>
        </div>
      </div>
    </Layout>
  );
}

// Role Card Component
function RoleCard({
  role,
  count,
  selected,
  onToggle,
  onCountChange,
}: {
  role: RoleDefinition;
  count: number;
  selected: boolean;
  onToggle: () => void;
  onCountChange: (count: number) => void;
}) {
  const isRequired = role.required;

  return (
    <div
      style={{
        padding: 'clamp(0.75rem, 2vw, 1rem)',
        border: `2px solid ${selected ? role.color : 'var(--border-color, #ddd)'}`,
        borderRadius: '8px',
        backgroundColor: selected ? `${role.color}10` : 'var(--bg-card)',
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(0.5rem, 2vw, 0.75rem)',
        }}
      >
        {/* Checkbox */}
        <button
          onClick={onToggle}
          disabled={isRequired}
          style={{
            width: 'clamp(20px, 4vw, 24px)',
            height: 'clamp(20px, 4vw, 24px)',
            borderRadius: '4px',
            border: `2px solid ${selected ? role.color : '#999'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: selected ? role.color : 'transparent',
            cursor: isRequired ? 'not-allowed' : 'pointer',
            padding: 0,
            opacity: isRequired ? 0.6 : 1,
          }}
        >
          {selected && <span style={{ color: 'white', fontSize: '0.75rem' }}>✓</span>}
        </button>

        {/* Icon */}
        <span style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>{role.icon}</span>

        {/* Role Info */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 'clamp(0.938rem, 2.5vw, 1.125rem)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.125rem',
            }}
          >
            {role.nameKo} {isRequired && <span style={{ color: '#999', fontSize: '0.875em' }}>(필수)</span>}
          </div>
          <div
            style={{
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              color: 'var(--text-secondary)',
              lineHeight: '1.4',
            }}
          >
            {role.descriptionKo}
          </div>
        </div>

        {/* Count Input */}
        {selected && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginLeft: 'auto',
            }}
          >
            <button
              onClick={() => onCountChange(count - 1)}
              disabled={isRequired && count <= 1}
              style={{
                width: 'clamp(28px, 6vw, 32px)',
                height: 'clamp(28px, 6vw, 32px)',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: role.color,
                color: 'white',
                fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                cursor: (isRequired && count <= 1) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (isRequired && count <= 1) ? 0.5 : 1,
              }}
            >
              −
            </button>
            <input
              type="number"
              min={isRequired ? 1 : 0}
              max={99}
              value={count}
              onChange={(e) => {
                const newCount = parseInt(e.target.value) || 0;
                onCountChange(newCount);
              }}
              style={{
                width: 'clamp(45px, 10vw, 60px)',
                height: 'clamp(32px, 6vw, 36px)',
                textAlign: 'center',
                fontSize: 'clamp(0.938rem, 2.5vw, 1.125rem)',
                fontWeight: 'bold',
                border: `2px solid ${role.color}`,
                borderRadius: '4px',
                backgroundColor: 'white',
                color: role.color,
              }}
            />
            <button
              onClick={() => onCountChange(count + 1)}
              style={{
                width: 'clamp(28px, 6vw, 32px)',
                height: 'clamp(28px, 6vw, 32px)',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: role.color,
                color: 'white',
                fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
