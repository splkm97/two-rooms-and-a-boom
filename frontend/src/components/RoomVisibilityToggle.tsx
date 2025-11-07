interface RoomVisibilityToggleProps {
  value: boolean;
  onChange: (isPublic: boolean) => void;
}

export function RoomVisibilityToggle({ value, onChange }: RoomVisibilityToggleProps) {
  const handleChange = (isPublic: boolean) => {
    onChange(isPublic);
  };

  const radioStyles = (isSelected: boolean) => ({
    padding: 'clamp(0.75rem, 2vw, 1rem)',
    border: `2px solid ${isSelected ? '#007bff' : 'var(--border-color)'}`,
    borderRadius: '8px',
    backgroundColor: isSelected ? '#007bff' : 'var(--bg-card)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    minHeight: '60px',
  });

  const radioLabelStyles = (isSelected: boolean) => ({
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
    color: isSelected ? '#ffffff' : 'var(--text-primary)',
    fontWeight: '500',
    marginBottom: '0.25rem',
  });

  const radioDescriptionStyles = (isSelected: boolean) => ({
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    color: isSelected ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-secondary)',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(0.75rem, 2vw, 1rem)',
        width: '100%',
      }}
    >
      <div
        style={{
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '0.25rem',
        }}
      >
        방 공개 설정
      </div>

      <label
        style={radioStyles(value === true)}
        onMouseEnter={(e) => {
          if (value !== true) {
            e.currentTarget.style.borderColor = '#007bff';
            e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (value !== true) {
            const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
            const bgCard = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim();
            e.currentTarget.style.borderColor = borderColor;
            e.currentTarget.style.backgroundColor = bgCard;
          }
        }}
      >
        <input
          type="radio"
          name="roomVisibility"
          value="public"
          checked={value === true}
          onChange={() => handleChange(true)}
          style={{
            width: 'clamp(1.25rem, 3vw, 1.5rem)',
            height: 'clamp(1.25rem, 3vw, 1.5rem)',
            cursor: 'pointer',
            accentColor: '#007bff',
            flexShrink: 0,
          }}
          aria-label="공개 방"
        />
        <div style={{ flex: 1 }}>
          <div style={radioLabelStyles(value === true)}>
            <span style={{ marginRight: '0.5rem' }}>🔓</span>
            공개 방
          </div>
          <div style={radioDescriptionStyles(value === true)}>
            다른 플레이어가 방 목록에서 볼 수 있습니다
          </div>
        </div>
      </label>

      <label
        style={radioStyles(value === false)}
        onMouseEnter={(e) => {
          if (value !== false) {
            e.currentTarget.style.borderColor = '#007bff';
            e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (value !== false) {
            const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
            const bgCard = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim();
            e.currentTarget.style.borderColor = borderColor;
            e.currentTarget.style.backgroundColor = bgCard;
          }
        }}
      >
        <input
          type="radio"
          name="roomVisibility"
          value="private"
          checked={value === false}
          onChange={() => handleChange(false)}
          style={{
            width: 'clamp(1.25rem, 3vw, 1.5rem)',
            height: 'clamp(1.25rem, 3vw, 1.5rem)',
            cursor: 'pointer',
            accentColor: '#007bff',
            flexShrink: 0,
          }}
          aria-label="비공개 방"
        />
        <div style={{ flex: 1 }}>
          <div style={radioLabelStyles(value === false)}>
            <span style={{ marginRight: '0.5rem' }}>🔒</span>
            비공개 방
          </div>
          <div style={radioDescriptionStyles(value === false)}>
            코드를 아는 사람만 참가할 수 있습니다
          </div>
        </div>
      </label>
    </div>
  );
}
