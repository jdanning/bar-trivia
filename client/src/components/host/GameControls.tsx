import React from 'react';
import { useGameContext } from '../../context/GameContext';
import { useSocket } from '../../hooks/useSocket';

export default function GameControls() {
  const { game } = useGameContext();
  const { emit } = useSocket();

  if (!game) return null;

  const currentRound = game.rounds.find(r => r.roundNumber === game.currentRound);

  const handleStartGame = () => {
    emit('game:start', game.id);
  };

  const handleRevealQuestion = (roundNumber: number, questionNumber: number) => {
    emit('question:reveal', { gameId: game.id, roundNumber, questionNumber });
  };

  const handleCloseQuestion = () => {
    emit('question:close', { gameId: game.id });
  };

  const handleStartRound = (roundNumber: number) => {
    emit('round:start', { gameId: game.id, roundNumber });
  };

  const handleCompleteRound = (roundNumber: number) => {
    emit('round:complete', { gameId: game.id, roundNumber });
  };

  const handleFinishGame = () => {
    emit('game:finish', game.id);
  };

  if (game.status === 'lobby') {
    return (
      <div className="game-controls">
        <button
          className="btn btn-primary btn-large"
          onClick={handleStartGame}
          disabled={game.players.length === 0}
        >
          Start Game
        </button>
        {game.players.length === 0 && (
          <p className="muted">Need at least 1 team to start</p>
        )}
      </div>
    );
  }

  if (game.status === 'finished') {
    return (
      <div className="game-controls">
        <h2>Game Over!</h2>
        <p>Final scores are displayed on the Scores tab.</p>
      </div>
    );
  }

  return (
    <div className="game-controls">
      <h2>Round {game.currentRound} of 6</h2>

      {currentRound && (
        <div className="round-controls">
          <div className="question-buttons">
            {currentRound.questions
              .sort((a, b) => a.questionNumber - b.questionNumber)
              .map((q) => (
                <div key={q.id} className="question-control">
                  <button
                    className={`btn ${game.currentQuestion === q.questionNumber && game.questionRevealed ? 'btn-active' : 'btn-secondary'}`}
                    onClick={() => handleRevealQuestion(currentRound.roundNumber, q.questionNumber)}
                  >
                    Show Q{q.questionNumber}
                  </button>
                  {game.currentQuestion === q.questionNumber && game.questionRevealed && (
                    <div className="revealed-info">
                      <p className="question-text"><strong>Q:</strong> {q.text}</p>
                      <p className="answer-text"><strong>A:</strong> {q.answer}</p>
                      <button className="btn btn-warning" onClick={handleCloseQuestion}>
                        Close Answers
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {currentRound.questions.length === 0 && (
            <p className="muted">No questions added for this round. Go to the Questions tab first.</p>
          )}

          <div className="round-actions">
            <button className="btn btn-secondary" onClick={() => handleCompleteRound(currentRound.roundNumber)}>
              Complete Round {currentRound.roundNumber}
            </button>
          </div>
        </div>
      )}

      <div className="navigation-controls">
        {game.currentRound < 6 && (
          <button
            className="btn btn-primary"
            onClick={() => handleStartRound(game.currentRound + 1)}
          >
            Start Round {game.currentRound + 1}
          </button>
        )}
        <button className="btn btn-danger" onClick={handleFinishGame}>
          End Game
        </button>
      </div>

      <div className="players-status">
        <h3>Connected Teams</h3>
        <ul>
          {game.players.map(p => (
            <li key={p.id} className={p.connected ? 'connected' : 'disconnected'}>
              {p.teamName} {p.connected ? '✓' : '✗'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
