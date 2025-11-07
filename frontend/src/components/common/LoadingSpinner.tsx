// T105: Loading spinner component
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export function LoadingSpinner({ size = 'medium', message }: LoadingSpinnerProps) {
  const sizeMap = {
    small: '20px',
    medium: '40px',
    large: '60px',
  };

  return (
    <div className="loading-spinner-container">
      <div
        className="loading-spinner"
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
        }}
      />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}
