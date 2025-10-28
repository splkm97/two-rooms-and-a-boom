import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { RevealPage } from './pages/RevealPage';

// T107: Browser compatibility check component
function BrowserCompatibilityCheck({ children }: { children: React.ReactNode }) {
  const [isCompatible, setIsCompatible] = useState(true);

  useEffect(() => {
    // Check WebSocket support
    if (typeof WebSocket === 'undefined') {
      setIsCompatible(false);
    }
  }, []);

  if (!isCompatible) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1>❌ 브라우저 호환성 오류</h1>
        <p>죄송합니다. 현재 브라우저는 WebSocket을 지원하지 않습니다.</p>
        <p>다음 브라우저를 사용해주세요:</p>
        <ul style={{ textAlign: 'left', marginTop: '20px' }}>
          <li>Chrome (최신 버전)</li>
          <li>Firefox (최신 버전)</li>
          <li>Safari (최신 버전)</li>
          <li>Edge (최신 버전)</li>
        </ul>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserCompatibilityCheck>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lobby/:roomCode" element={<LobbyPage />} />
          <Route path="/game/:roomCode" element={<GamePage />} />
          <Route path="/reveal/:roomCode" element={<RevealPage />} />
        </Routes>
      </Router>
    </BrowserCompatibilityCheck>
  );
}

export default App;
