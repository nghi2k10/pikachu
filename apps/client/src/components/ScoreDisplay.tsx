interface ScoreDisplayProps {
  score: number;
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  return (
    <div className="stat-block stat-score">
      <span className="stat-label">Score</span>
      <strong className="stat-value">{score.toLocaleString("en-US")}</strong>
    </div>
  );
}