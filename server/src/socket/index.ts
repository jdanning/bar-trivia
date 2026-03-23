import { Server, Socket } from 'socket.io';
import { gameStore } from '../models/GameStore';
import { generateQRCode } from '../services/qrService';
import { config } from '../config';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: AppSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ---- GAME MANAGEMENT ----

    socket.on('game:create', async (templateId, callback) => {
      const game = gameStore.createGame(templateId || undefined);
      const qrCode = await generateQRCode(game.code);
      socket.join(`game:${game.id}`);
      socket.join(`host:${game.id}`);
      gameStore.updateGame(game.id, { hostSocketId: socket.id });
      callback({ ...game, qrCode } as any);
    });

    socket.on('host:join', (gameId) => {
      const game = gameStore.getGame(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      socket.join(`game:${game.id}`);
      socket.join(`host:${game.id}`);
      gameStore.updateGame(game.id, { hostSocketId: socket.id });
    });

    socket.on('game:getState', (gameId, callback) => {
      const game = gameStore.getGame(gameId);
      callback(game);
    });

    socket.on('game:join', (data, callback) => {
      const game = gameStore.getGameByCode(data.gameCode);
      if (!game) {
        callback({ success: false, error: 'Game not found. Check your code.' });
        return;
      }
      if (game.status === 'finished') {
        callback({ success: false, error: 'This game has already ended.' });
        return;
      }

      const player = gameStore.addPlayer(game.id, data.teamName, socket.id);
      if (!player) {
        callback({ success: false, error: 'Team name already taken and currently connected.' });
        return;
      }

      socket.join(`game:${game.id}`);
      socket.join(`player:${player.id}`);

      // Notify host
      io.to(`host:${game.id}`).emit('player:joined', player);

      const updatedGame = gameStore.getGame(game.id)!;
      callback({ success: true, game: updatedGame, player });
    });

    socket.on('game:rejoin', (data, callback) => {
      const game = gameStore.getGame(data.gameId);
      if (!game) {
        callback({ success: false, error: 'Game not found.' });
        return;
      }

      const player = gameStore.rejoinPlayer(game.id, data.playerId, socket.id);
      if (!player) {
        callback({ success: false, error: 'Could not rejoin. Player not found.' });
        return;
      }

      socket.join(`game:${game.id}`);
      socket.join(`player:${player.id}`);

      io.to(`host:${game.id}`).emit('player:joined', player);

      const updatedGame = gameStore.getGame(game.id)!;
      callback({ success: true, game: updatedGame, player });
    });

    socket.on('game:start', (gameId) => {
      const game = gameStore.getGame(gameId);
      if (!game || game.hostSocketId !== socket.id) return;

      gameStore.updateGame(gameId, { status: 'active', currentRound: 1, wagerOptions: config.getWagersForRound(1) });
      const round = game.rounds.find((r) => r.roundNumber === 1);
      if (round) round.status = 'active';

      io.to(`game:${gameId}`).emit('game:started');
      io.to(`game:${gameId}`).emit('round:started', 1);
      emitGameState(io, gameId);
    });

    socket.on('game:finish', (gameId) => {
      const game = gameStore.getGame(gameId);
      if (!game || game.hostSocketId !== socket.id) return;

      gameStore.updateGame(gameId, { status: 'finished' });
      const scoreboard = gameStore.getScoreboard(gameId);
      io.to(`game:${gameId}`).emit('game:finished', scoreboard);
      emitGameState(io, gameId);
    });

    // ---- QUESTIONS ----

    socket.on('question:add', (data, callback) => {
      const question = gameStore.addQuestion(
        data.gameId, data.roundNumber, data.questionNumber, data.category, data.text, data.answer
      );
      if (question) {
        callback(question);
        emitGameState(io, data.gameId);
      }
    });

    socket.on('question:update', (data, callback) => {
      const question = gameStore.updateQuestion(data.gameId, data.questionId, data.category, data.text, data.answer);
      if (question) {
        callback(question);
        emitGameState(io, data.gameId);
      }
    });

    socket.on('question:reveal', (data) => {
      const game = gameStore.getGame(data.gameId);
      if (!game || game.hostSocketId !== socket.id) return;

      const round = game.rounds.find((r) => r.roundNumber === data.roundNumber);
      if (!round) return;
      const question = round.questions.find((q) => q.questionNumber === data.questionNumber);
      if (!question) return;

      gameStore.updateGame(data.gameId, {
        currentRound: data.roundNumber,
        currentQuestion: data.questionNumber,
        questionRevealed: true,
        wagerOptions: config.getWagersForRound(data.roundNumber),
      });

      io.to(`game:${data.gameId}`).emit('question:revealed', {
        id: question.id,
        text: question.text,
        roundNumber: question.roundNumber,
        questionNumber: question.questionNumber,
      });
      emitGameState(io, data.gameId);
    });

    socket.on('question:close', (data) => {
      const game = gameStore.getGame(data.gameId);
      if (!game || game.hostSocketId !== socket.id) return;

      gameStore.updateGame(data.gameId, { questionRevealed: false });
      io.to(`game:${data.gameId}`).emit('question:closed');
      emitGameState(io, data.gameId);
    });

    // ---- ROUNDS ----

    socket.on('round:start', (data) => {
      const game = gameStore.getGame(data.gameId);
      if (!game || game.hostSocketId !== socket.id) return;

      const round = game.rounds.find((r) => r.roundNumber === data.roundNumber);
      if (round) round.status = 'active';

      gameStore.updateGame(data.gameId, {
        currentRound: data.roundNumber,
        currentQuestion: 0,
        questionRevealed: false,
        wagerOptions: config.getWagersForRound(data.roundNumber),
      });

      io.to(`game:${data.gameId}`).emit('round:started', data.roundNumber);
      emitGameState(io, data.gameId);
    });

    socket.on('round:complete', (data) => {
      const game = gameStore.getGame(data.gameId);
      if (!game || game.hostSocketId !== socket.id) return;

      const round = game.rounds.find((r) => r.roundNumber === data.roundNumber);
      if (round) round.status = 'completed';

      gameStore.updateGame(data.gameId, { questionRevealed: false });

      io.to(`game:${data.gameId}`).emit('round:completed', data.roundNumber);

      const scoreboard = gameStore.getScoreboard(data.gameId);
      io.to(`game:${data.gameId}`).emit('scores:updated', scoreboard);
      emitGameState(io, data.gameId);
    });

    // ---- ANSWERS ----

    socket.on('answer:submit', (data, callback) => {
      const result = gameStore.submitAnswer(
        data.gameId, data.playerId, data.questionId,
        data.text, data.wager, data.roundNumber, data.questionNumber
      );
      callback(result);

      if (result.success) {
        const player = gameStore.getPlayer(data.gameId, data.playerId);
        if (player) {
          io.to(`host:${data.gameId}`).emit('answer:received', {
            playerId: data.playerId,
            teamName: player.teamName,
          });
        }
        emitGameState(io, data.gameId);
      }
    });

    socket.on('answer:score', (data, callback) => {
      const success = gameStore.scoreAnswer(data.gameId, data.playerId, data.questionId, data.isCorrect);
      callback({ success });

      if (success) {
        io.to(`game:${data.gameId}`).emit('answer:scored', {
          playerId: data.playerId,
          questionId: data.questionId,
          isCorrect: data.isCorrect,
        });

        const scoreboard = gameStore.getScoreboard(data.gameId);
        io.to(`game:${data.gameId}`).emit('scores:updated', scoreboard);
        emitGameState(io, data.gameId);
      }
    });

    // ---- DISCONNECT ----

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const result = gameStore.getPlayerBySocket(socket.id);
      if (result) {
        // Don't remove the player — just mark the socket as stale.
        // The player remains part of the game and can rejoin at any time
        // while the game is still running. Only notify the host so the
        // dashboard can show a "disconnected" indicator if desired.
        gameStore.updatePlayerSocket(result.game.id, result.player.id, null, false);
        emitGameState(io, result.game.id);
      }
    });
  });
}

function emitGameState(io: Server<ClientToServerEvents, ServerToClientEvents>, gameId: string) {
  const game = gameStore.getGame(gameId);
  if (game) {
    io.to(`game:${gameId}`).emit('game:state', game);
  }
}
