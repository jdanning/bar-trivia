import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { IGame, IPlayer, IScoreboard } from '../types';

interface GameState {
  game: IGame | null;
  player: IPlayer | null;
  isHost: boolean;
  scoreboard: IScoreboard[];
  currentRevealedQuestion: { id: string; text: string; roundNumber: number; questionNumber: number } | null;
  questionClosed: boolean;
}

type GameAction =
  | { type: 'SET_GAME'; payload: IGame }
  | { type: 'SET_PLAYER'; payload: IPlayer }
  | { type: 'SET_HOST'; payload: boolean }
  | { type: 'SET_SCOREBOARD'; payload: IScoreboard[] }
  | { type: 'REVEAL_QUESTION'; payload: { id: string; text: string; roundNumber: number; questionNumber: number } }
  | { type: 'CLOSE_QUESTION' }
  | { type: 'PLAYER_JOINED'; payload: IPlayer }
  | { type: 'PLAYER_LEFT'; payload: string }
  | { type: 'RESET' };

const initialState: GameState = {
  game: null,
  player: null,
  isHost: false,
  scoreboard: [],
  currentRevealedQuestion: null,
  questionClosed: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_GAME': {
      const g = action.payload;
      // Derive currentRevealedQuestion from game state so rejoining
      // players see the active question without needing the original event
      let revealed = state.currentRevealedQuestion;
      let closed = state.questionClosed;
      if (g.questionRevealed && g.currentRound > 0 && g.currentQuestion > 0) {
        const round = g.rounds.find(r => r.roundNumber === g.currentRound);
        const q = round?.questions.find(q => q.questionNumber === g.currentQuestion);
        if (q && (!revealed || revealed.id !== q.id)) {
          revealed = { id: q.id, text: q.text, roundNumber: q.roundNumber, questionNumber: q.questionNumber };
          closed = false;
        }
      } else if (!g.questionRevealed && revealed) {
        closed = true;
      }
      return { ...state, game: g, currentRevealedQuestion: revealed, questionClosed: closed };
    }
    case 'SET_PLAYER':
      return { ...state, player: action.payload };
    case 'SET_HOST':
      return { ...state, isHost: action.payload };
    case 'SET_SCOREBOARD':
      return { ...state, scoreboard: action.payload };
    case 'REVEAL_QUESTION':
      return { ...state, currentRevealedQuestion: action.payload, questionClosed: false };
    case 'CLOSE_QUESTION':
      return { ...state, questionClosed: true };
    case 'PLAYER_JOINED':
      if (!state.game) return state;
      return {
        ...state,
        game: {
          ...state.game,
          players: [...state.game.players.filter(p => p.id !== action.payload.id), action.payload],
        },
      };
    case 'PLAYER_LEFT':
      if (!state.game) return state;
      return {
        ...state,
        game: {
          ...state.game,
          players: state.game.players.map(p =>
            p.id === action.payload ? { ...p, connected: false } : p
          ),
        },
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface GameContextType extends GameState {
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ ...state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext(): GameContextType {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameContext must be used within GameProvider');
  return context;
}
