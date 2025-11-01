// T060: Create NicknameEditor component for editing own nickname
import { useState } from 'react';

interface NicknameEditorProps {
  currentNickname: string;
  onUpdate: (newNickname: string) => Promise<void>;
}

export function NicknameEditor({ currentNickname, onUpdate }: NicknameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(currentNickname);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    // Validate nickname length (2-20 characters)
    if (nickname.length < 2 || nickname.length > 20) {
      setError('닉네임은 2자 이상 20자 이하여야 합니다');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(nickname);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || '닉네임 변경에 실패했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setNickname(currentNickname);
    setError('');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              내 닉네임
            </label>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {currentNickname}
            </span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            변경
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1rem',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
        새 닉네임 입력
      </label>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          disabled={isUpdating}
          style={{
            flex: 1,
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-primary)',
          }}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={isUpdating}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            opacity: isUpdating ? 0.6 : 1,
          }}
        >
          {isUpdating ? '저장 중...' : '저장'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isUpdating}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
          }}
        >
          취소
        </button>
      </div>

      {error && (
        <div style={{ fontSize: '0.9rem', color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
        {nickname.length}/20자
      </div>
    </div>
  );
}
