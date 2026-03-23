import React from 'react';
import { BrowserRouter, Routes, Route, useParams, Link } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import HostDashboard from './components/host/HostDashboard';
import PlayerJoin from './components/player/PlayerJoin';
import PlayerDashboard from './components/player/PlayerDashboard';
import { useGameContext } from './context/GameContext';
import './styles/global.css';

function PlayerPage() {
  const { game, player } = useGameContext();

  if (game && player) {
    return <PlayerDashboard />;
  }

  return <PlayerJoin />;
}

function JoinWithCode() {
  const { code } = useParams<{ code: string }>();
  const { game, player } = useGameContext();

  if (game && player) {
    return <PlayerDashboard />;
  }

  return <PlayerJoin initialCode={code} />;
}

function Home() {
  return (
    <div className="home-page">
      <h1>🍺 Bar Trivia</h1>
      <p>Welcome to Bar Trivia! Choose your role:</p>
      <div className="home-buttons">
        <Link to="/host" className="btn btn-primary btn-large">I'm the Host</Link>
        <Link to="/play" className="btn btn-secondary btn-large">I'm a Player</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/host" element={<HostDashboard />} />
            <Route path="/play" element={<PlayerPage />} />
            <Route path="/join/:code" element={<JoinWithCode />} />
          </Routes>
        </div>
      </GameProvider>
    </BrowserRouter>
  );
}
