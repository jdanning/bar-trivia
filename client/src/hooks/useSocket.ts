import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../services/socket';
import { useGameContext } from '../context/GameContext';
import { IGame, IPlayer, IScoreboard } from '../types';

function saveSession(gameId: string, playerId: string) {
  try { localStorage.setItem('trivia_session', JSON.stringify({ gameId, playerId })); } catch {}
}

function loadSession(): { gameId: string; playerId: string } | null {
  try {
    const raw = localStorage.getItem('trivia_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSession() {
  try { localStorage.removeItem('trivia_session'); } catch {}
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { dispatch, game, player } = useGameContext();

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('game:state', (g: IGame) => {
      dispatch({ type: 'SET_GAME', payload: g });
    });

    socket.on('player:joined', (p: IPlayer) => {
      dispatch({ type: 'PLAYER_JOINED', payload: p });
    });

    socket.on('player:left', (playerId: string) => {
      dispatch({ type: 'PLAYER_LEFT', payload: playerId });
    });

    socket.on('question:revealed', (question) => {
      dispatch({ type: 'REVEAL_QUESTION', payload: question });
    });

    socket.on('question:closed', () => {
      dispatch({ type: 'CLOSE_QUESTION' });
    });

    socket.on('scores:updated', (scoreboard: IScoreboard[]) => {
      dispatch({ type: 'SET_SCOREBOARD', payload: scoreboard });
    });

    socket.on('round:completed', () => {
      dispatch({ type: 'ROUND_COMPLETED' });
    });

    socket.on('game:finished', (scoreboard: IScoreboard[]) => {
      dispatch({ type: 'SET_SCOREBOARD', payload: scoreboard });
      clearSession();
      try { localStorage.removeItem('trivia_host_session'); } catch {}
    });

    socket.on('game:killed', () => {
      clearSession();
      dispatch({ type: 'GAME_KILLED' });
    });

    // Auto-rejoin on reconnect (covers tab switch, phone lock, brief network drops)
    const handleConnect = () => {
      // Player reconnection only — host reconnection is handled by HostDashboard
      const session = loadSession();
      if (session) {
        socket.emit('game:rejoin' as any, session, (result: any) => {
          if (result.success && result.game && result.player) {
            dispatch({ type: 'SET_GAME', payload: result.game });
            dispatch({ type: 'SET_PLAYER', payload: result.player });
          } else {
            clearSession();
          }
        });
      }
    };
    socket.on('connect', handleConnect);

    // If already connected and we have a saved session (e.g. page refresh), rejoin now
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('game:state');
      socket.off('player:joined');
      socket.off('player:left');
      socket.off('question:revealed');
      socket.off('question:closed');
      socket.off('scores:updated');
      socket.off('round:completed');
      socket.off('game:finished');
      socket.off('game:killed');
      socket.off('connect', handleConnect);
    };
  }, [dispatch]);

  // Persist session whenever game/player are set
  useEffect(() => {
    if (game && player) {
      saveSession(game.id, player.id);
    }
  }, [game?.id, player?.id]);

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return { socket: socketRef.current, emit };
}
