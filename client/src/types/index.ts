export type WagerValue = number;

export interface IQuestion {
  id: string;
  gameId: string;
  roundNumber: number;
  questionNumber: number;
  category: string;
  text: string;
  answer: string;
  createdAt: string;
}

export interface IPlayer {
  id: string;
  gameId: string;
  teamName: string;
  socketId: string | null;
  connected: boolean;
  joinedAt: string;
}

export interface IAnswer {
  playerId: string;
  questionId: string;
  roundNumber: number;
  questionNumber: number;
  text: string;
  wager: WagerValue;
  isCorrect: boolean | null;
  submittedAt: string;
  teamName?: string;
}

export interface IRound {
  roundNumber: number;
  questions: IQuestion[];
  status: 'pending' | 'active' | 'completed';
}

export interface IGame {
  id: string;
  code: string;
  hostSocketId: string | null;
  status: 'lobby' | 'active' | 'paused' | 'finished';
  currentRound: number;
  currentQuestion: number;
  questionRevealed: boolean;
  wagerOptions: number[];
  rounds: IRound[];
  players: IPlayer[];
  answers: IAnswer[];
  createdAt: string;
  qrCode?: string;
}

export interface IScoreboard {
  teamName: string;
  playerId: string;
  totalScore: number;
  roundScores: number[];
}
