import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useSocket } from '../../hooks/useSocket';
import { WagerValue } from '../../types';
import Scoreboard from '../common/Scoreboard';

export default function PlayerDashboard() {
  const { game, player, currentRevealedQuestion, questionClosed, scoreboard } = useGameContext();
  const { emit } = useSocket();

  const [answerText, setAnswerText] = useState('');
  const [selectedWager, setSelectedWager] = useState<WagerValue | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [usedWagers, setUsedWagers] = useState<number[]>([]);

  // Reset submission state when new question is revealed
  useEffect(() => {
    if (currentRevealedQuestion) {
      setAnswerText('');
      setSelectedWager(null);
      setSubmitted(false);
      setError('');
    }
  }, [currentRevealedQuestion?.id]);

  // Track used wagers for current round
  useEffect(() => {
    if (game && player) {
      const roundAnswers = game.answers.filter(
        a => a.playerId === player.id && a.roundNumber === game.currentRound
      );
      setUsedWagers(roundAnswers.map(a => a.wager));
    }
  }, [game?.answers.length, game?.currentRound, player?.id]);

  if (!game || !player) return null;

  const allWagers = game.wagerOptions || [1, 2, 3];
  const availableWagers = allWagers.filter(
    w => !usedWagers.includes(w)
  );

  const handleSubmit = () => {
    if (!answerText.trim()) {
      setError('Please enter an answer.');
      return;
    }
    if (!selectedWager) {
      setError('Please select a point wager.');
      return;
    }
    if (!currentRevealedQuestion) return;

    setError('');

    emit('answer:submit', {
      gameId: game.id,
      playerId: player.id,
      questionId: currentRevealedQuestion.id,
      text: answerText.trim(),
      wager: selectedWager,
      roundNumber: currentRevealedQuestion.roundNumber,
      questionNumber: currentRevealedQuestion.questionNumber,
    }, (result: { success: boolean; error?: string }) => {
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || 'Failed to submit answer.');
      }
    });
  };

  // Waiting in lobby
  if (game.status === 'lobby') {
    return (
      <div className="player-dashboard">
        <h1>🍺 Bar Trivia</h1>
        <h2>Welcome, {player.teamName}!</h2>
        <div className="waiting-message">
          <p>You're in! Waiting for the host to start the game...</p>
          <div className="pulse-dot"></div>
        </div>
        <div className="players-list">
          <h3>Teams Joined</h3>
          <ul>
            {game.players.map(p => (
              <li key={p.id} className={p.id === player.id ? 'current-team' : ''}>
                {p.teamName} {p.id === player.id ? '(You)' : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Game finished
  if (game.status === 'finished') {
    return (
      <div className="player-dashboard">
        <h1>🏆 Game Over!</h1>
        <Scoreboard highlightPlayerId={player.id} />
      </div>
    );
  }

  // Active game
  return (
    <div className="player-dashboard">
      <div className="player-header">
        <h2>{player.teamName}</h2>
        <span className="round-indicator">Round {game.currentRound} of 6</span>
      </div>

      {!currentRevealedQuestion || questionClosed ? (
        <div className="waiting-question">
          {questionClosed && submitted ? (
            <div className="submitted-message">
              <h3>✓ Answer Submitted!</h3>
              <p>Waiting for the next question...</p>
            </div>
          ) : (
            <div className="waiting-message">
              <p>Waiting for the host to reveal the next question...</p>
              <div className="pulse-dot"></div>
            </div>
          )}
        </div>
      ) : submitted ? (
        <div className="submitted-message">
          <h3>✓ Answer Submitted!</h3>
          <p>Your answer: <strong>{answerText}</strong></p>
          <p>Wager: <strong>{selectedWager} points</strong></p>
          <p>Waiting for the host to close answers...</p>
        </div>
      ) : (
        <div className="answer-section">
          <div className="question-display">
            <h3>Question {currentRevealedQuestion.questionNumber}</h3>
            <p className="question-text-display">{currentRevealedQuestion.text}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Your Answer:</label>
            <input
              type="text"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer..."
              className="answer-input"
              autoFocus
            />
          </div>

          <div className="wager-section">
            <label>Point Wager:</label>
            <div className="wager-buttons">
              {allWagers.map((w) => {
                const isUsed = usedWagers.includes(w);
                const isSelected = selectedWager === w;
                return (
                  <button
                    key={w}
                    className={`wager-btn ${isSelected ? 'selected' : ''} ${isUsed ? 'used' : ''}`}
                    onClick={() => !isUsed && setSelectedWager(w)}
                    disabled={isUsed}
                  >
                    {w} pts
                    {isUsed && <span className="used-label">Used</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="btn btn-primary btn-large"
            onClick={handleSubmit}
            disabled={!answerText.trim() || !selectedWager}
          >
            Submit Answer
          </button>
        </div>
      )}
    </div>
  );
}
