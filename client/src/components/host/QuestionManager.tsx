import React, { useState } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useSocket } from '../../hooks/useSocket';
import { api } from '../../services/api';

export default function QuestionManager() {
  const { game } = useGameContext();
  const { emit } = useSocket();
  const [editRound, setEditRound] = useState(1);
  const [editQuestion, setEditQuestion] = useState(1);
  const [questionText, setQuestionText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [categoryText, setCategoryText] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);

  if (!game) return null;

  const handleSaveQuestion = () => {
    if (!questionText.trim() || !answerText.trim()) return;

    emit('question:add', {
      gameId: game.id,
      roundNumber: editRound,
      questionNumber: editQuestion,
      category: categoryText.trim(),
      text: questionText.trim(),
      answer: answerText.trim(),
    }, () => {
      setQuestionText('');
      setAnswerText('');
      setCategoryText('');
      // Auto-advance to next question
      if (editQuestion < 3) {
        setEditQuestion(editQuestion + 1);
      } else if (editRound < 6) {
        setEditRound(editRound + 1);
        setEditQuestion(1);
      }
    });
  };

  const loadQuestion = (roundNum: number, qNum: number) => {
    setEditRound(roundNum);
    setEditQuestion(qNum);
    const round = game.rounds.find(r => r.roundNumber === roundNum);
    const q = round?.questions.find(q => q.questionNumber === qNum);
    if (q) {
      setQuestionText(q.text);
      setAnswerText(q.answer);
      setCategoryText(q.category || '');
    } else {
      setQuestionText('');
      setAnswerText('');
      setCategoryText('');
    }
  };

  return (
    <div className="question-manager">
      <h2>Question Bank</h2>

      <div className="question-grid">
        {game.rounds.map((round) => (
          <div key={round.roundNumber} className="round-column">
            <h3>Round {round.roundNumber}</h3>
            {[1, 2, 3].map((qNum) => {
              const q = round.questions.find(q => q.questionNumber === qNum);
              const isActive = editRound === round.roundNumber && editQuestion === qNum;
              return (
                <div
                  key={qNum}
                  className={`question-slot ${q ? 'filled' : 'empty'} ${isActive ? 'active' : ''}`}
                  onClick={() => loadQuestion(round.roundNumber, qNum)}
                >
                  <span className="q-label">Q{qNum}</span>
                  {q ? (
                    <span className="q-preview">{q.category ? `[${q.category}] ` : ''}{q.text.substring(0, 40)}...</span>
                  ) : (
                    <span className="q-empty">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="question-editor">
        <h3>Round {editRound} - Question {editQuestion}</h3>
        <div className="form-group">
          <label>Category:</label>
          <input
            type="text"
            value={categoryText}
            onChange={(e) => setCategoryText(e.target.value)}
            placeholder="e.g. Science, History, Sports..."
            maxLength={100}
          />
        </div>
        <div className="form-group">
          <label>Question:</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Enter the trivia question..."
            rows={3}
            maxLength={500}
          />
        </div>
        <div className="form-group">
          <label>Answer:</label>
          <input
            type="text"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Enter the correct answer..."
            maxLength={200}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSaveQuestion}>
          Save Question
        </button>
      </div>

      <div className="template-section" style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Save as Template</h3>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>Save the current question set so you can reuse it for future games.</p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            value={templateName}
            onChange={(e) => { setTemplateName(e.target.value); setTemplateSaved(false); }}
            placeholder="Template name..."
            style={{ flex: 1, padding: '0.5rem' }}
          />
          <button
            className="btn btn-primary"
            disabled={!templateName.trim()}
            onClick={() => {
              api.saveTemplate(templateName.trim(), game.id).then(() => {
                setTemplateSaved(true);
                setTemplateName('');
              }).catch(() => {});
            }}
          >
            Save Template
          </button>
        </div>
        {templateSaved && <p style={{ color: 'green', marginTop: '0.5rem' }}>Template saved!</p>}
      </div>
    </div>
  );
}
