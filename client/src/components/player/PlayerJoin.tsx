import React, { useState } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useSocket } from '../../hooks/useSocket';
import { IGame, IPlayer } from '../../types';

interface PlayerJoinProps {
  initialCode?: string;
}

export default function PlayerJoin({ initialCode }: PlayerJoinProps) {
  const { dispatch } = useGameContext();
  const { emit } = useSocket();
  const [gameCode, setGameCode] = useState(initialCode || '');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = () => {
    if (!gameCode.trim() || !teamName.trim()) {
      setError('Please enter both a game code and team name.');
      return;
    }

    setJoining(true);
    setError('');

    emit('game:join', {
      gameCode: gameCode.trim().toUpperCase(),
      teamName: teamName.trim(),
    }, (result: { success: boolean; game?: IGame; player?: IPlayer; error?: string }) => {
      setJoining(false);
      if (result.success && result.game && result.player) {
        dispatch({ type: 'SET_GAME', payload: result.game });
        dispatch({ type: 'SET_PLAYER', payload: result.player });
      } else {
        setError(result.error || 'Failed to join game.');
      }
    });
  };

  return (
    <div className="player-join">
      <h1>🍺 Bar Trivia</h1>
      <h2>Join a Game</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Game Code:</label>
        <input
          type="text"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value.toUpperCase())}
          placeholder="Enter 6-letter code"
          maxLength={6}
          className="code-input"
        />
      </div>

      <div className="form-group">
        <label>Team Name:</label>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter your team name"
          maxLength={30}
        />
      </div>

      <button
        className="btn btn-primary btn-large"
        onClick={handleJoin}
        disabled={joining}
      >
        {joining ? 'Joining...' : 'Join Game'}
      </button>
    </div>
  );
}
