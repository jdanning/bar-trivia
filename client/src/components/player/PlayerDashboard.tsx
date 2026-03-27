import React, { useState, useEffect, useMemo } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useSocket } from '../../hooks/useSocket';
import { WagerValue } from '../../types';
import Scoreboard from '../common/Scoreboard';

export default function PlayerDashboard() {
  const { game, player, currentRevealedQuestion, scoreboard, showLeaderboard } = useGameContext();
  const { emit } = useSocket();

  // All revealed questions in the current round (questionNumber <= currentQuestion)
  const revealedQuestions = useMemo(() => {
    if (!game || game.currentRound === 0 || game.currentQuestion === 0) return [];
    const round = game.rounds.find(r => r.roundNumber === game.currentRound);
    if (!round) return [];
    return round.questions
      .filter(q => q.questionNumber <= game.currentQuestion)
      .sort((a, b) => a.questionNumber - b.questionNumber);
  }, [game]);

  const [answerText, setAnswerText] = useState('');
  const [selectedWager, setSelectedWager] = useState<WagerValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [usedWagers, setUsedWagers] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'play' | 'scores'>('play');
  const [viewingIndex, setViewingIndex] = useState(0);

  // Clamp index to valid range
  const safeIndex = Math.max(0, Math.min(viewingIndex, revealedQuestions.length - 1));
  const viewingQuestion = revealedQuestions.length > 0 ? revealedQuestions[safeIndex] : null;

  // Whether the player has submitted an answer for the viewed question
  const submitted = !!(
    game && player && viewingQuestion &&
    game.answers.some(
      a => a.playerId === player.id && a.questionId === viewingQuestion.id
    )
  );

  // Auto-navigate to newest question when one is revealed
  useEffect(() => {
    if (revealedQuestions.length > 0) {
      setViewingIndex(revealedQuestions.length - 1);
    }
  }, [revealedQuestions.length]);

  // Switch to play tab when host reveals a new question
  useEffect(() => {
    if (currentRevealedQuestion) {
      setActiveTab('play');
    }
  }, [currentRevealedQuestion?.id]);

  // Reset form when viewing a different question
  useEffect(() => {
    setAnswerText('');
    setSelectedWager(null);
    setSubmitting(false);
    setError('');
  }, [viewingQuestion?.id]);

  // Auto-switch to scores when round completes
  useEffect(() => {
    if (showLeaderboard) setActiveTab('scores');
  }, [showLeaderboard]);

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
    if (!viewingQuestion) return;

    setError('');
    setSubmitting(true);

    emit('answer:submit', {
      gameId: game.id,
      playerId: player.id,
      questionId: viewingQuestion.id,
      text: answerText.trim(),
      wager: selectedWager,
      roundNumber: viewingQuestion.roundNumber,
      questionNumber: viewingQuestion.questionNumber,
    }, (result: { success: boolean; error?: string }) => {
      setSubmitting(false);
      if (!result.success) {
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

      <div className="tab-bar">
        <button className={`tab ${activeTab === 'play' ? 'active' : ''}`} onClick={() => setActiveTab('play')}>
          Play
        </button>
        <button className={`tab ${activeTab === 'scores' ? 'active' : ''}`} onClick={() => setActiveTab('scores')}>
          Scores
        </button>
      </div>

      {activeTab === 'scores' ? (
        <Scoreboard highlightPlayerId={player.id} />
      ) : showLeaderboard ? (
        <div className="round-leaderboard">
          <h3>Round {game.currentRound} Complete!</h3>
          <p className="muted">Waiting for the next round to begin...</p>
          <Scoreboard highlightPlayerId={player.id} />
        </div>
      ) : revealedQuestions.length === 0 ? (
        <div className="waiting-question">
          <div className="waiting-message">
            <p>Waiting for the host to reveal the next question...</p>
            <div className="pulse-dot"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Question navigation tabs */}
          {revealedQuestions.length > 1 && (
            <div className="question-nav">
              {revealedQuestions.map((q, idx) => {
                const isAnswered = game.answers.some(
                  a => a.playerId === player.id && a.questionId === q.id
                );
                return (
                  <button
                    key={q.id}
                    className={`question-nav-btn ${idx === safeIndex ? 'active' : ''} ${isAnswered ? 'answered' : ''}`}
                    onClick={() => setViewingIndex(idx)}
                  >
                    Q{q.questionNumber}
                    {isAnswered && ' ✓'}
                  </button>
                );
              })}
            </div>
          )}

          {viewingQuestion && submitted ? (
            (() => {
              const myAnswer = game.answers.find(
                a => a.playerId === player.id && a.questionId === viewingQuestion.id
              );
              return (
                <div className="submitted-message">
                  <h3>✓ Answer Submitted!</h3>
                  <p>Your answer: <strong>{myAnswer?.text}</strong></p>
                  <p>Wager: <strong>{myAnswer?.wager} points</strong></p>
                </div>
              );
            })()
          ) : viewingQuestion ? (
            <div className="answer-section" key={viewingQuestion.id}>
              <div className="question-display">
                <h3>Question {viewingQuestion.questionNumber}</h3>
                <p className="question-text-display">{viewingQuestion.text}</p>
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
                  maxLength={200}
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
                disabled={!answerText.trim() || !selectedWager || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          ) : null}

          {/* Prev/Next navigation arrows */}
          {revealedQuestions.length > 1 && (
            <div className="question-nav-arrows">
              <button
                className="btn btn-secondary"
                disabled={safeIndex === 0}
                onClick={() => setViewingIndex(safeIndex - 1)}
              >
                ← Prev
              </button>
              <span className="question-nav-counter">
                {safeIndex + 1} / {revealedQuestions.length}
              </span>
              <button
                className="btn btn-secondary"
                disabled={safeIndex === revealedQuestions.length - 1}
                onClick={() => setViewingIndex(safeIndex + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
