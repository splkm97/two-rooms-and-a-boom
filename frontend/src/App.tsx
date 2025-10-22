import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';

// Placeholder component (will be implemented in Phase 4)
function GamePage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Game Page</h1>
      <p>게임 화면은 Phase 4에서 구현됩니다</p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:roomCode" element={<LobbyPage />} />
        <Route path="/game/:roomCode" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

export default App;
