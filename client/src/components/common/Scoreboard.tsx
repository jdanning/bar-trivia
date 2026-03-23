import React from 'react';
import { useGameContext } from '../../context/GameContext';

interface ScoreboardProps {
  highlightPlayerId?: string;
}

export default function Scoreboard({ highlightPlayerId }: ScoreboardProps) {
  const { scoreboard } = useGameContext();

  if (scoreboard.length === 0) {
    return <p className="muted">No scores yet.</p>;
  }

  return (
    <div className="scoreboard">
      <h2>🏆 Scoreboard</h2>
      <table className="scoreboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            {scoreboard[0]?.roundScores.map((_, i) => (
              <th key={i}>R{i + 1}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {scoreboard.map((entry, idx) => (
            <tr
              key={entry.playerId}
              className={`${idx === 0 ? 'first-place' : ''} ${entry.playerId === highlightPlayerId ? 'highlight' : ''}`}
            >
              <td>{idx + 1}</td>
              <td>{entry.teamName}</td>
              {entry.roundScores.map((score, i) => (
                <td key={i}>{score}</td>
              ))}
              <td className="total-score"><strong>{entry.totalScore}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
