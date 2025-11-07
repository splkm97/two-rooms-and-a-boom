import { useState, useEffect } from 'react';
import { getRoleConfigs } from '../../services/api';
import type { RoleConfigMeta } from '../../types/roleConfig';

interface RoleConfigSelectorProps {
  value: string;
  onChange: (configId: string) => void;
}

export function RoleConfigSelector({ value, onChange }: RoleConfigSelectorProps) {
  const [configs, setConfigs] = useState<RoleConfigMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getRoleConfigs();
      setConfigs(response.configs);

      // If no configs loaded and current value is empty, default to 'standard'
      if (response.configs.length === 0 && !value) {
        onChange('standard');
      }
    } catch (err) {
      console.error('Failed to load role configs:', err);
      setError('역할 설정을 불러올 수 없습니다');
      // Set default config on error
      setConfigs([
        {
          id: 'standard',
          name: 'Standard Game',
          nameKo: '기본 게임',
          description: 'Standard Two Rooms and a Boom roles',
          descriptionKo: '투 룸즈 앤 어 붐의 기본 역할',
        },
      ]);
      if (!value) {
        onChange('standard');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedConfig = configs.find((c) => c.id === value);

  if (loading) {
    return (
      <div
        style={{
          padding: 'clamp(0.75rem, 2vw, 1rem)',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        로딩 중...
      </div>
    );
  }

  if (error && configs.length === 0) {
    return (
      <div
        style={{
          padding: 'clamp(0.75rem, 2vw, 1rem)',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          color: '#cc0000',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(0.5rem, 2vw, 0.75rem)',
        width: '100%',
      }}
    >
      <label
        htmlFor="role-config-select"
        style={{
          display: 'block',
          marginBottom: '0.25rem',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        게임 모드
      </label>

      <select
        id="role-config-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: 'clamp(0.75rem, 2vw, 0.875rem)',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          border: '1px solid var(--border-color, #ddd)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          minHeight: '44px',
          boxSizing: 'border-box',
        }}
        aria-label="게임 모드 선택"
      >
        {configs.map((config) => (
          <option key={config.id} value={config.id}>
            {config.nameKo || config.name}
          </option>
        ))}
      </select>

      {selectedConfig && (selectedConfig.descriptionKo || selectedConfig.description) && (
        <div
          style={{
            padding: 'clamp(0.5rem, 2vw, 0.75rem)',
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
            color: 'var(--text-secondary, #666)',
            backgroundColor: 'rgba(0, 123, 255, 0.05)',
            border: '1px solid rgba(0, 123, 255, 0.1)',
            borderRadius: '6px',
            lineHeight: '1.5',
          }}
        >
          {selectedConfig.descriptionKo || selectedConfig.description}
        </div>
      )}
    </div>
  );
}
