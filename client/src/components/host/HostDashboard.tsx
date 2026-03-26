import React, { useEffect, useState, useCallback } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useSocket } from '../../hooks/useSocket';
import { IGame } from '../../types';
import { api } from '../../services/api';
import QuestionManager from './QuestionManager';
import GameControls from './GameControls';
import ScoreManager from './ScoreManager';
import Scoreboard from '../common/Scoreboard';

function saveHostSession(gameId: string) {
  try { localStorage.setItem('trivia_host_session', gameId); } catch {}
}

function loadHostSession(): string | null {
  try { return localStorage.getItem('trivia_host_session'); } catch { return null; }
}

function clearHostSession() {
  try { localStorage.removeItem('trivia_host_session'); } catch {}
}

export default function HostDashboard() {
  const { game, dispatch } = useGameContext();
  const { socket, emit } = useSocket();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'game' | 'questions' | 'scores'>('game');
  const [rejoining, setRejoining] = useState(true);
  const [savedGame, setSavedGame] = useState<IGame | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<string>('checking');
  const [tunnelUrl, setTunnelUrl] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Poll tunnel status until connected or errored
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const data = await api.getTunnel();
        if (cancelled) return;
        setTunnelStatus(data.status);
        setTunnelUrl(data.url || '');
        if (data.status === 'starting') {
          setTimeout(check, 2000);
        }
      } catch {
        if (!cancelled) setTunnelStatus('error');
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  // Load templates on mount
  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(() => {});
  }, []);

  // On mount, check for an existing session but let the host decide
  useEffect(() => {
    const savedGameId = loadHostSession();
    if (!savedGameId || game) {
      setRejoining(false);
      return;
    }

    emit('game:getState', savedGameId, (existingGame: IGame | null) => {
      if (existingGame && existingGame.status !== 'finished') {
        setSavedGame(existingGame);
      } else {
        clearHostSession();
      }
      setRejoining(false);
    });
  // eslint-disable-next-line
  }, []);

  const createGame = useCallback(() => {
    // Kill the old game — check both in-memory state and localStorage
    const oldGameId = game?.id || loadHostSession();
    if (oldGameId) {
      emit('game:abandon' as any, oldGameId);
    }
    clearHostSession();
    setSavedGame(null);
    emit('game:create', selectedTemplate || undefined, (newGame: IGame & { qrCode?: string }) => {
      dispatch({ type: 'SET_GAME', payload: newGame });
      dispatch({ type: 'SET_HOST', payload: true });
      saveHostSession(newGame.id);
      if (newGame.qrCode) setQrCode(newGame.qrCode);
    });
  }, [emit, dispatch, selectedTemplate, game?.id]);

  const continueGame = useCallback(() => {
    if (!savedGame) return;
    emit('host:join', savedGame.id);
    dispatch({ type: 'SET_GAME', payload: savedGame });
    dispatch({ type: 'SET_HOST', payload: true });
    setSavedGame(null);
  }, [emit, dispatch, savedGame]);

  useEffect(() => {
    if (game?.id && !qrCode) {
      api.getQRCode(game.id).then((data) => setQrCode(data.qrCode)).catch(() => {});
    }
  }, [game?.id, qrCode]);

  // Save host session whenever game is set
  useEffect(() => {
    if (game?.id) {
      saveHostSession(game.id);
    }
  }, [game?.id]);

  if (rejoining) {
    return (
      <div className="host-dashboard">
        <h1>Bar Trivia Host</h1>
        <p>Reconnecting to your game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="host-dashboard">
        <h1>Bar Trivia Host</h1>
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: tunnelStatus === 'connected' ? '#e8f5e9' : tunnelStatus === 'starting' ? '#fff3e0' : '#fce4ec', borderRadius: '6px' }}>
          {tunnelStatus === 'starting' && <p>⏳ Starting Cloudflare tunnel...</p>}
          {tunnelStatus === 'connected' && <p>✅ Tunnel ready: <strong>{tunnelUrl}</strong></p>}
          {tunnelStatus === 'error' && <p>⚠️ Tunnel failed — QR will use LAN IP instead</p>}
          {tunnelStatus === 'checking' && <p>Checking tunnel status...</p>}
        </div>

        {savedGame && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>Resume Existing Game?</h3>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#555' }}>
              Game code <strong>{savedGame.code}</strong> · {savedGame.players.length} player(s) · Status: <strong>{savedGame.status}</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={continueGame}>Continue Game</button>
              <button className="btn" onClick={() => {
                emit('game:abandon' as any, savedGame.id);
                clearHostSession();
                setSavedGame(null);
              }}>Start Fresh</button>
            </div>
          </div>
        )}

        {!savedGame && (
          <>
            {templates.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Question Template:</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '100%', maxWidth: '400px' }}
                >
                  <option value="">Default (Sample Questions)</option>
                  {templates.filter(t => t.id !== 'default').map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn btn-primary btn-large" onClick={createGame}>
              Create New Game
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="host-dashboard">
      <div className="host-header">
        <h1>Bar Trivia - Host</h1>
        <div className="game-info">
          <span className="game-code">Code: <strong>{game.code}</strong></span>
          <span className="game-status">Status: <strong>{game.status}</strong></span>
          <span className="player-count">Players: <strong>{game.players.length}</strong></span>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab ${activeTab === 'game' ? 'active' : ''}`} onClick={() => setActiveTab('game')}>
          Game Control
        </button>
        <button className={`tab ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>
          Questions
        </button>
        <button className={`tab ${activeTab === 'scores' ? 'active' : ''}`} onClick={() => setActiveTab('scores')}>
          Scores
        </button>
      </div>

      {activeTab === 'game' && (
        <div className="tab-content">
          {game.status === 'lobby' && (
            <div className="lobby-section">
              <h2>Lobby</h2>
              {qrCode && (
                <div className="qr-section">
                  <p>Players scan this QR code to join:</p>
                  <img src={qrCode} alt="QR Code to join game" className="qr-code" />
                  <p className="join-code">Or go to the site and enter code: <strong>{game.code}</strong></p>
                </div>
              )}
              <div className="players-list">
                <h3>Teams Joined ({game.players.length})</h3>
                {game.players.length === 0 ? (
                  <p className="muted">Waiting for players to join...</p>
                ) : (
                  <ul>
                    {game.players.map((p) => (
                      <li key={p.id} className={p.connected ? 'connected' : 'disconnected'}>
                        {p.teamName} {p.connected ? '✓' : '(disconnected)'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <GameControls />
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="tab-content">
          <QuestionManager />
        </div>
      )}

      {activeTab === 'scores' && (
        <div className="tab-content">
          <ScoreManager />
          <Scoreboard />
        </div>
      )}
    </div>
  );
}
