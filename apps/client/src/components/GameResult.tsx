import { RotateCcw, Trophy } from "lucide-react";

interface GameResultProps {
  score: number;
  combo: number;
  onPlayAgain: () => void;
}

export function GameResult({ score, combo, onPlayAgain }: GameResultProps) {
  return (
    <div className="result-scrim">
      <section className="result-panel" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <div className="result-trophy"><Trophy size={27} strokeWidth={1.8} /></div>
        <p className="eyebrow">ROUND COMPLETE</p>
        <h2 id="result-title">Nice connecting.</h2>
        <div className="result-score-label">FINAL SCORE</div>
        <strong className="result-score">{score.toLocaleString("en-US")}</strong>
        <div className="result-combo">Best combo <b>x{combo}</b></div>
        <button className="button button-primary result-button" onClick={onPlayAgain}><RotateCcw size={16} /> Play again</button>
      </section>
    </div>
  );
}