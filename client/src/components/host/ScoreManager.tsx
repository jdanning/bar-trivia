import React, { useEffect, useState } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useSocket } from '../../hooks/useSocket';
import { api } from '../../services/api';
import { IAnswer } from '../../types';

export default function ScoreManager() {
  const { game } = useGameContext();
  const { emit } = useSocket();
  const [answers, setAnswers] = useState<(IAnswer & { teamName: string })[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (game && selectedQuestion) {
      api.getAnswers(game.id, selectedQuestion).then(setAnswers).catch(() => {});
    }
  }, [game?.id, selectedQuestion, game?.answers.length]);

  if (!game) return null;

  const handleScore = (playerId: string, questionId: string, isCorrect: boolean) => {
    emit('answer:score', { gameId: game.id, playerId, questionId, isCorrect }, () => {
      // Refresh answers
      if (selectedQuestion) {
        api.getAnswers(game.id, selectedQuestion).then(setAnswers).catch(() => {});
      }
    });
  };

  const allQuestions = game.rounds.flatMap(r =>
    r.questions.map(q => ({
      ...q,
      roundLabel: `R${r.roundNumber} Q${q.questionNumber}`,
    }))
  );

  return (
    <div className="score-manager">
      <h2>Score Answers</h2>

      <div className="question-selector">
        <label>Select Question:</label>
        <select
          value={selectedQuestion || ''}
          onChange={(e) => setSelectedQuestion(e.target.value || null)}
        >
          <option value="">-- Select --</option>
          {allQuestions.map(q => (
            <option key={q.id} value={q.id}>
              {q.roundLabel}: {q.text.substring(0, 50)}
            </option>
          ))}
        </select>
      </div>

      {selectedQuestion && (
        <div className="answers-list">
          {(() => {
            const question = allQuestions.find(q => q.id === selectedQuestion);
            return question ? (
              <div className="question-info">
                <p><strong>Question:</strong> {question.text}</p>
                <p><strong>Correct Answer:</strong> {question.answer}</p>
              </div>
            ) : null;
          })()}

          {answers.length === 0 ? (
            <p className="muted">No answers submitted yet.</p>
          ) : (
            <table className="answers-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Answer</th>
                  <th>Wager</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {answers.map((a) => (
                  <tr key={`${a.playerId}-${a.questionId}`} className={
                    a.isCorrect === true ? 'correct' : a.isCorrect === false ? 'incorrect' : ''
                  }>
                    <td>{a.teamName}</td>
                    <td>{a.text}</td>
                    <td>{a.wager} pts</td>
                    <td>
                      {a.isCorrect === null ? (
                        <div className="score-buttons">
                          <button className="btn btn-correct" onClick={() => handleScore(a.playerId, a.questionId, true)}>
                            ✓ Correct
                          </button>
                          <button className="btn btn-incorrect" onClick={() => handleScore(a.playerId, a.questionId, false)}>
                            ✗ Wrong
                          </button>
                        </div>
                      ) : (
                        <span>{a.isCorrect ? `+${a.wager}` : '0'} pts</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
