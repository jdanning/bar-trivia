import React, { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useSocket } from '../../hooks/useSocket';

export default function GameControls() {
  const { game } = useGameContext();
  const { emit } = useSocket();

  // Stopwatch: resets each time a question is revealed
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (game?.questionRevealed) {
      setElapsed(0);
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      setElapsed(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [game?.questionRevealed, game?.currentQuestion]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!game) return null;

  const currentRound = game.rounds.find(r => r.roundNumber === game.currentRound);

  const roundAnswers = game.answers.filter(a => a.roundNumber === game.currentRound);
  const unscoredCount = roundAnswers.filter(a => a.isCorrect === null).length;
  const roundScored = unscoredCount === 0;

  // Determine how far the host has progressed through the current round's questions.
  // A question is "done" once it has been revealed AND its answers have been closed.
  const totalQuestions = currentRound?.questions.length ?? 0;
  const allQuestionsDone =
    totalQuestions > 0 && game.currentQuestion >= totalQuestions && !game.questionRevealed;
  const nextQuestionNum = game.questionRevealed ? null : game.currentQuestion + 1;

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
    // Complete the current round first so players see the leaderboard,
    // then immediately advance to the next round.
    emit('round:complete', { gameId: game.id, roundNumber: game.currentRound });
    emit('round:start', { gameId: game.id, roundNumber });
  };

  const handleFinishGame = () => {
    emit('round:complete', { gameId: game.id, roundNumber: game.currentRound });
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
              .map((q) => {
                const isActive = game.questionRevealed && game.currentQuestion === q.questionNumber;
                const isDone =
                  (game.currentQuestion > 0 && q.questionNumber < game.currentQuestion) ||
                  (q.questionNumber === game.currentQuestion && !game.questionRevealed && game.currentQuestion > 0);
                const isNext = !game.questionRevealed && q.questionNumber === nextQuestionNum;
                const isEnabled = isActive || isNext;

                return (
                  <div key={q.id} className="question-control">
                    <button
                      className={`btn ${isActive ? 'btn-active' : isDone ? 'btn-done' : 'btn-secondary'}`}
                      onClick={() => handleRevealQuestion(currentRound.roundNumber, q.questionNumber)}
                      disabled={!isEnabled}
                    >
                      {isDone ? `✓ Q${q.questionNumber}` : `Show Q${q.questionNumber}`}
                    </button>
                    {isActive && (
                      <div className="revealed-info">
                        <p className="stopwatch"><strong>Time on this Question:</strong> {formatTime(elapsed)}</p>
                        <p className="question-text"><strong>Q:</strong> {q.text}</p>
                        <p className="answer-text"><strong>A:</strong> {q.answer}</p>
                        <button className="btn btn-warning" onClick={handleCloseQuestion}>
                          Close Answers
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {currentRound.questions.length === 0 && (
            <p className="muted">No questions added for this round. Go to the Questions tab first.</p>
          )}
        </div>
      )}

      <div className="navigation-controls">
        {game.currentRound < 6 && (
          <>
            <button
              className="btn btn-primary"
              onClick={() => handleStartRound(game.currentRound + 1)}
              disabled={!allQuestionsDone || !roundScored}
            >
              Start Round {game.currentRound + 1}
            </button>
            {allQuestionsDone && !roundScored && (
              <p className="muted">
                {unscoredCount} answer{unscoredCount !== 1 ? 's' : ''} still need scoring — go to the <strong>Scores</strong> tab first.
              </p>
            )}
          </>
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
