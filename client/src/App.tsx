import React, { useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import HostDashboard from './components/host/HostDashboard';
import PlayerJoin from './components/player/PlayerJoin';
import PlayerDashboard from './components/player/PlayerDashboard';
import { useGameContext } from './context/GameContext';
import { clearSession } from './hooks/useSocket';
import './styles/global.css';

function GameKilledScreen() {
  const { dispatch } = useGameContext();
  const navigate = useNavigate();
  return (
    <div className="player-dashboard">
      <h1>🍺 Bar Trivia</h1>
      <h2>Game Ended</h2>
      <p>The host has started a new game. You'll need to rejoin.</p>
      <button className="btn btn-primary btn-large" onClick={() => {
        dispatch({ type: 'DISMISS_KILLED' });
        navigate('/play', { replace: true });
      }}>
        Back to Join
      </button>
    </div>
  );
}

function PlayerPage() {
  const { game, player, gameKilled } = useGameContext();

  if (gameKilled) return <GameKilledScreen />;
  if (game && player) return <PlayerDashboard />;
  return <PlayerJoin />;
}

function JoinWithCode() {
  const { code } = useParams<{ code: string }>();
  const { game, player, gameKilled, dispatch } = useGameContext();
  const prevCodeRef = useRef(code);

  // Only reset when the URL code actually changes (player scanned a new QR),
  // not when the game code changes from joining via the form.
  useEffect(() => {
    if (code !== prevCodeRef.current) {
      prevCodeRef.current = code;
      if (game && player && game.code !== code?.toUpperCase()) {
        clearSession();
        dispatch({ type: 'RESET' });
      }
    }
  }, [code, game, player, dispatch]);

  if (gameKilled) return <GameKilledScreen />;
  if (game && player) return <PlayerDashboard />;
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
