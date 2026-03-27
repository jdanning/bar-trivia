import { IGame, IQuestion, IPlayer, IAnswer, IRound, WagerValue } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const GAMES_DIR = path.join(DATA_DIR, 'games');
const TEMPLATES_DIR = path.join(DATA_DIR, 'templates');

for (const dir of [DATA_DIR, GAMES_DIR, TEMPLATES_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export interface ITemplate {
  id: string;
  name: string;
  rounds: { roundNumber: number; questions: { questionNumber: number; category: string; text: string; answer: string }[] }[];
  createdAt: string;
}

class GameStore {
  private games: Map<string, IGame> = new Map();

  constructor() {
    this.loadAllGames();
    this.seedDefaultTemplate();
    this.seedBlankTemplate();
  }

  // ---- PERSISTENCE ----

  private persist(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;
    try {
      fs.writeFileSync(path.join(GAMES_DIR, `${gameId}.json`), JSON.stringify(game, null, 2));
    } catch (err) {
      console.error(`Failed to persist game ${gameId}:`, err);
    }
  }

  private loadAllGames(): void {
    try {
      const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(GAMES_DIR, file), 'utf-8');
          const game: IGame = JSON.parse(raw);
          for (const player of game.players) {
            player.socketId = null;
            player.connected = false;
          }
          game.hostSocketId = null;
          this.games.set(game.id, game);
        } catch (err) {
          console.error(`Failed to load game file ${file}:`, err);
        }
      }
      console.log(`Loaded ${this.games.size} game(s) from disk`);
    } catch (err) {
      console.error('Failed to read games directory:', err);
    }
  }

  private deleteGameFile(gameId: string): void {
    try {
      const filePath = path.join(GAMES_DIR, `${gameId}.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Failed to delete game file ${gameId}:`, err);
    }
  }

  // ---- TEMPLATES ----

  private seedDefaultTemplate(): void {
    const defaultPath = path.join(TEMPLATES_DIR, 'default.json');
    if (fs.existsSync(defaultPath)) return;

    const template: ITemplate = {
      id: 'default',
      name: 'Sample Questions',
      rounds: [
        { roundNumber: 1, questions: [
          { questionNumber: 1, category: 'Geography', text: 'What is the capital of France?', answer: 'Paris' },
          { questionNumber: 2, category: 'Geography', text: 'How many continents are there?', answer: '7' },
          { questionNumber: 3, category: 'History', text: 'What year did the Titanic sink?', answer: '1912' },
        ]},
        { roundNumber: 2, questions: [
          { questionNumber: 1, category: 'Science', text: 'What planet is known as the Red Planet?', answer: 'Mars' },
          { questionNumber: 2, category: 'Art', text: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci' },
          { questionNumber: 3, category: 'Science', text: 'What is the chemical symbol for gold?', answer: 'Au' },
        ]},
        { roundNumber: 3, questions: [
          { questionNumber: 1, category: 'Geography', text: 'What is the largest ocean on Earth?', answer: 'Pacific' },
          { questionNumber: 2, category: 'Music', text: 'How many strings does a standard guitar have?', answer: '6' },
          { questionNumber: 3, category: 'Science', text: 'What gas do plants absorb from the atmosphere?', answer: 'Carbon dioxide' },
        ]},
        { roundNumber: 4, questions: [
          { questionNumber: 1, category: 'History', text: 'In what year did World War II end?', answer: '1945' },
          { questionNumber: 2, category: 'Math', text: 'What is the smallest prime number?', answer: '2' },
          { questionNumber: 3, category: 'Science', text: 'Which element has the atomic number 1?', answer: 'Hydrogen' },
        ]},
        { roundNumber: 5, questions: [
          { questionNumber: 1, category: 'Geography', text: 'What is the longest river in the world?', answer: 'Nile' },
          { questionNumber: 2, category: 'Literature', text: 'Who wrote Romeo and Juliet?', answer: 'Shakespeare' },
          { questionNumber: 3, category: 'Science', text: 'How many bones are in the adult human body?', answer: '206' },
        ]},
        { roundNumber: 6, questions: [
          { questionNumber: 1, category: 'Geography', text: 'What country has the most people?', answer: 'India' },
          { questionNumber: 2, category: 'Science', text: 'What is the speed of light in km/s (approx)?', answer: '300000' },
          { questionNumber: 3, category: 'Science', text: 'What is the hardest natural substance?', answer: 'Diamond' },
        ]},
      ],
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(defaultPath, JSON.stringify(template, null, 2));
  }

  private seedBlankTemplate(): void {
    const blankPath = path.join(TEMPLATES_DIR, 'blank.json');
    if (fs.existsSync(blankPath)) return;

    const blankQuestion = (n: number) => ({ questionNumber: n, category: '', text: '', answer: '' });
    const template: ITemplate = {
      id: 'blank',
      name: 'Blank',
      rounds: [1, 2, 3, 4, 5, 6].map(r => ({
        roundNumber: r,
        questions: [1, 2, 3].map(blankQuestion),
      })),
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(blankPath, JSON.stringify(template, null, 2));
  }

  listTemplates(): ITemplate[] {
    try {
      const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
      return files.map(f => {
        const raw = fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf-8');
        return JSON.parse(raw) as ITemplate;
      });
    } catch { return []; }
  }

  getTemplate(id: string): ITemplate | null {
    try {
      const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch { return null; }
  }

  saveTemplate(name: string, gameId: string): ITemplate | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const id = uuidv4();
    const template: ITemplate = {
      id,
      name,
      rounds: game.rounds.map(r => ({
        roundNumber: r.roundNumber,
        questions: r.questions.map(q => ({
          questionNumber: q.questionNumber,
          category: q.category || '',
          text: q.text,
          answer: q.answer,
        })),
      })),
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(TEMPLATES_DIR, `${id}.json`), JSON.stringify(template, null, 2));
    return template;
  }

  deleteTemplate(id: string): boolean {
    if (id === 'default') return false;
    try {
      const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
      if (!fs.existsSync(filePath)) return false;
      fs.unlinkSync(filePath);
      return true;
    } catch { return false; }
  }

  // ---- GAME CODE ----

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ---- GAME MANAGEMENT ----

  createGame(templateId?: string): IGame {
    const id = uuidv4();
    let code = this.generateCode();
    while (this.getGameByCode(code)) {
      code = this.generateCode();
    }

    const rounds: IRound[] = [];
    const template = this.getTemplate(templateId || 'default');

    for (let i = 1; i <= config.totalRounds; i++) {
      const templateRound = template?.rounds.find(r => r.roundNumber === i);
      const questions: IQuestion[] = (templateRound?.questions || []).map((q) => ({
        id: uuidv4(),
        gameId: id,
        roundNumber: i,
        questionNumber: q.questionNumber,
        category: q.category || '',
        text: q.text,
        answer: q.answer,
        createdAt: new Date(),
      }));

      rounds.push({
        roundNumber: i,
        questions,
        status: 'pending',
      });
    }

    const game: IGame = {
      id,
      code,
      hostSocketId: null,
      status: 'lobby',
      currentRound: 0,
      currentQuestion: 0,
      questionRevealed: false,
      wagerOptions: config.getWagersForRound(1),
      rounds,
      players: [],
      answers: [],
      createdAt: new Date(),
    };

    this.games.set(id, game);
    this.persist(id);
    return game;
  }

  getGame(id: string): IGame | null {
    return this.games.get(id) || null;
  }

  getGameByCode(code: string): IGame | null {
    for (const game of this.games.values()) {
      if (game.code === code.toUpperCase()) return game;
    }
    return null;
  }

  getGameByHost(socketId: string): IGame | null {
    for (const game of this.games.values()) {
      if (game.hostSocketId === socketId && game.status !== 'finished') return game;
    }
    return null;
  }

  updateGame(id: string, updates: Partial<IGame>): IGame | null {
    const game = this.games.get(id);
    if (!game) return null;
    Object.assign(game, updates);
    this.persist(id);
    return game;
  }

  addPlayer(gameId: string, teamName: string, socketId: string): IPlayer | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const existing = game.players.find(
      (p) => p.teamName.toLowerCase() === teamName.toLowerCase()
    );
    if (existing) {
      if (!existing.connected) {
        existing.socketId = socketId;
        existing.connected = true;
        this.persist(gameId);
        return existing;
      }
      return null;
    }

    const player: IPlayer = {
      id: uuidv4(),
      gameId,
      teamName,
      socketId,
      connected: true,
      joinedAt: new Date(),
    };

    game.players.push(player);
    this.persist(gameId);
    return player;
  }

  rejoinPlayer(gameId: string, playerId: string, socketId: string): IPlayer | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return null;

    player.socketId = socketId;
    player.connected = true;
    this.persist(gameId);
    return player;
  }

  getPlayer(gameId: string, playerId: string): IPlayer | null {
    const game = this.games.get(gameId);
    if (!game) return null;
    return game.players.find((p) => p.id === playerId) || null;
  }

  getPlayerBySocket(socketId: string): { game: IGame; player: IPlayer } | null {
    for (const game of this.games.values()) {
      const player = game.players.find((p) => p.socketId === socketId);
      if (player) return { game, player };
    }
    return null;
  }

  updatePlayerSocket(gameId: string, playerId: string, socketId: string | null, connected: boolean): void {
    const game = this.games.get(gameId);
    if (!game) return;
    const player = game.players.find((p) => p.id === playerId);
    if (player) {
      player.socketId = socketId;
      player.connected = connected;
    }
  }

  addQuestion(gameId: string, roundNumber: number, questionNumber: number, category: string, text: string, answer: string): IQuestion | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const round = game.rounds.find((r) => r.roundNumber === roundNumber);
    if (!round) return null;

    const existingIdx = round.questions.findIndex((q) => q.questionNumber === questionNumber);

    const question: IQuestion = {
      id: uuidv4(),
      gameId,
      roundNumber,
      questionNumber,
      category,
      text,
      answer,
      createdAt: new Date(),
    };

    if (existingIdx >= 0) {
      round.questions[existingIdx] = question;
    } else {
      round.questions.push(question);
    }

    this.persist(gameId);
    return question;
  }

  updateQuestion(gameId: string, questionId: string, category: string, text: string, answer: string): IQuestion | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    for (const round of game.rounds) {
      const q = round.questions.find((q) => q.id === questionId);
      if (q) {
        q.category = category;
        q.text = text;
        q.answer = answer;
        this.persist(gameId);
        return q;
      }
    }
    return null;
  }

  getQuestion(gameId: string, questionId: string): IQuestion | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    for (const round of game.rounds) {
      const q = round.questions.find((q) => q.id === questionId);
      if (q) return q;
    }
    return null;
  }

  submitAnswer(gameId: string, playerId: string, questionId: string, text: string, wager: number, roundNumber: number, questionNumber: number): { success: boolean; error?: string } {
    const game = this.games.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };

    if (game.status !== 'active') {
      return { success: false, error: 'Game is not active' };
    }

    // Allow answers for any previously revealed question in the current round
    if (roundNumber !== game.currentRound) {
      return { success: false, error: 'Cannot answer questions from a different round' };
    }

    const currentRound = game.rounds.find(r => r.roundNumber === game.currentRound);
    if (!currentRound || currentRound.status !== 'active') {
      return { success: false, error: 'This round is not active' };
    }

    if (questionNumber > game.currentQuestion) {
      return { success: false, error: 'This question has not been revealed yet' };
    }

    const validWagers = config.getWagersForRound(roundNumber);
    if (!validWagers.includes(wager)) {
      return { success: false, error: 'Invalid wager amount' };
    }

    const existingAnswer = game.answers.find(
      (a) => a.playerId === playerId && a.questionId === questionId
    );
    if (existingAnswer) {
      return { success: false, error: 'Already answered this question' };
    }

    const roundAnswers = game.answers.filter(
      (a) => a.playerId === playerId && a.roundNumber === roundNumber
    );
    const usedWager = roundAnswers.find((a) => a.wager === wager);
    if (usedWager) {
      return { success: false, error: `You already used the ${wager}-point wager this round` };
    }

    const answer: IAnswer = {
      playerId,
      questionId,
      roundNumber,
      questionNumber,
      text,
      wager: wager as WagerValue,
      isCorrect: null,
      submittedAt: new Date(),
    };

    game.answers.push(answer);
    this.persist(gameId);
    return { success: true };
  }

  scoreAnswer(gameId: string, playerId: string, questionId: string, isCorrect: boolean): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    const answer = game.answers.find(
      (a) => a.playerId === playerId && a.questionId === questionId
    );
    if (!answer) return false;

    answer.isCorrect = isCorrect;
    this.persist(gameId);
    return true;
  }

  getAnswersForQuestion(gameId: string, questionId: string): (IAnswer & { teamName: string })[] {
    const game = this.games.get(gameId);
    if (!game) return [];

    return game.answers
      .filter((a) => a.questionId === questionId)
      .map((a) => {
        const player = game.players.find((p) => p.id === a.playerId);
        return { ...a, teamName: player?.teamName || 'Unknown' };
      });
  }

  getScoreboard(gameId: string): Array<{ teamName: string; playerId: string; totalScore: number; roundScores: number[] }> {
    const game = this.games.get(gameId);
    if (!game) return [];

    return game.players.map((player) => {
      const playerAnswers = game.answers.filter((a) => a.playerId === player.id);
      const roundScores: number[] = [];

      for (let r = 1; r <= config.totalRounds; r++) {
        const roundAnswers = playerAnswers.filter((a) => a.roundNumber === r);
        const roundScore = roundAnswers.reduce((sum, a) => {
          if (a.isCorrect === true) return sum + a.wager;
          if (a.isCorrect === false) return sum;
          return sum;
        }, 0);
        roundScores.push(roundScore);
      }

      return {
        teamName: player.teamName,
        playerId: player.id,
        totalScore: roundScores.reduce((sum, s) => sum + s, 0),
        roundScores,
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  }

  getUsedWagers(gameId: string, playerId: string, roundNumber: number): number[] {
    const game = this.games.get(gameId);
    if (!game) return [];

    return game.answers
      .filter((a) => a.playerId === playerId && a.roundNumber === roundNumber)
      .map((a) => a.wager);
  }

  deleteGame(id: string): void {
    this.games.delete(id);
    this.deleteGameFile(id);
  }
}

export const gameStore = new GameStore();
