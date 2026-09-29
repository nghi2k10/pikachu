import { RotateCcw } from "lucide-react";
import type { LocalMatchState } from "../game/LocalMatchTypes.js";

interface DuelResultProps {
  state: LocalMatchState;
  onRematch: () => void;
}

export function DuelResult({ state, onRematch }: DuelResultProps) {
  const winner = state.winner;
  const headline = winner === "DRAW" ? "Dead even." : winner ? `${state.players[winner].name} wins.` : "Round complete.";
  return (
    <div className="duel-modal-scrim result-scrim">
      <section className="duel-modal duel-result-panel" role="dialog" aria-modal="true" aria-labelledby="duel-result-title">
        <p className="eyebrow">LOCAL DUEL · FINAL</p><h2 id="duel-result-title">{headline}</h2>
        <div className="result-players">
          {(["P1", "P2"] as const).map(playerId => {
            const player = state.players[playerId];
            return <div key={playerId} className={`result-player ${playerId === "P2" ? "player-two" : "player-one"}`}><span>{player.name}</span><strong>{player.score.toLocaleString("en-US")}</strong><small>BEST COMBO x{player.bestCombo} · {player.remainingTiles} LEFT</small></div>;
          })}
        </div>
        <button className="button button-primary result-button" onClick={onRematch}><RotateCcw size={15} /> Run it back</button>
      </section>
    </div>
  );
}