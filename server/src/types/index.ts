export type WagerValue = number;

export interface IQuestion {
  id: string;
  gameId: string;
  roundNumber: number;
  questionNumber: number;
  category: string;
  text: string;
  answer: string;
  createdAt: Date;
}

export interface IPlayer {
  id: string;
  gameId: string;
  teamName: string;
  socketId: string | null;
  connected: boolean;
  joinedAt: Date;
}

export interface IAnswer {
  playerId: string;
  questionId: string;
  roundNumber: number;
  questionNumber: number;
  text: string;
  wager: WagerValue;
  isCorrect: boolean | null;
  submittedAt: Date;
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
  createdAt: Date;
}

export interface IScoreboard {
  teamName: string;
  playerId: string;
  totalScore: number;
  roundScores: number[];
}

// Socket event types
export interface ServerToClientEvents {
  'game:state': (game: IGame) => void;
  'game:started': () => void;
  'game:finished': (scoreboard: IScoreboard[]) => void;
  'round:started': (roundNumber: number) => void;
  'round:completed': (roundNumber: number) => void;
  'question:revealed': (question: { id: string; text: string; roundNumber: number; questionNumber: number }) => void;
  'question:closed': () => void;
  'answer:received': (data: { playerId: string; teamName: string }) => void;
  'answer:scored': (data: { playerId: string; questionId: string; isCorrect: boolean }) => void;
  'scores:updated': (scoreboard: IScoreboard[]) => void;
  'player:joined': (player: IPlayer) => void;
  'player:left': (playerId: string) => void;
  'game:killed': () => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'game:create': (templateId: string | undefined, callback: (game: IGame) => void) => void;
  'game:join': (data: { gameCode: string; teamName: string }, callback: (result: { success: boolean; game?: IGame; player?: IPlayer; error?: string }) => void) => void;
  'game:rejoin': (data: { gameId: string; playerId: string }, callback: (result: { success: boolean; game?: IGame; player?: IPlayer; error?: string }) => void) => void;
  'game:start': (gameId: string) => void;
  'game:getState': (gameId: string, callback: (game: IGame | null) => void) => void;
  'host:join': (gameId: string) => void;
  'round:start': (data: { gameId: string; roundNumber: number }) => void;
  'question:reveal': (data: { gameId: string; roundNumber: number; questionNumber: number }) => void;
  'question:close': (data: { gameId: string }) => void;
  'question:add': (data: { gameId: string; roundNumber: number; questionNumber: number; category: string; text: string; answer: string }, callback: (question: IQuestion) => void) => void;
  'question:update': (data: { gameId: string; questionId: string; category: string; text: string; answer: string }, callback: (question: IQuestion) => void) => void;
  'answer:submit': (data: { gameId: string; playerId: string; questionId: string; text: string; wager: WagerValue; roundNumber: number; questionNumber: number }, callback: (result: { success: boolean; error?: string }) => void) => void;
  'answer:score': (data: { gameId: string; playerId: string; questionId: string; isCorrect: boolean }, callback: (result: { success: boolean }) => void) => void;
  'round:complete': (data: { gameId: string; roundNumber: number }) => void;
  'game:finish': (gameId: string) => void;
  'game:abandon': (gameId: string) => void;
}
