import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Placeholder components (will be implemented in Phase 3)
function HomePage() {
  return (
    <div>
      <h1>두개의 방, 한개의 폭탄</h1>
      <p>역할 배분 시스템</p>
    </div>
  );
}

function LobbyPage() {
  return <div>Lobby Page (Phase 3)</div>;
}

function GamePage() {
  return <div>Game Page (Phase 4)</div>;
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
