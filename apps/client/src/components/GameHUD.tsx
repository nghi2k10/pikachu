import { ComboDisplay } from "./ComboDisplay.js";
import { ScoreDisplay } from "./ScoreDisplay.js";
import { TimerDisplay } from "./TimerDisplay.js";

interface GameHUDProps {
  score: number;
  combo: number;
  seconds: number;
  remainingTiles: number;
  attackMeter: number;
}

const ATTACKS = ["Freeze", "Shuffle", "Block", "Add"];

export function GameHUD({ score, combo, seconds, remainingTiles, attackMeter }: GameHUDProps) {
  return (
    <section className="game-hud" aria-label="Game status">
      <div className="hud-stats">
        <ScoreDisplay score={score} />
        <ComboDisplay combo={combo} />
        <div className="stat-block stat-tiles">
          <span className="stat-label">Tiles left</span>
          <strong className="stat-value">{remainingTiles}</strong>
        </div>
        <TimerDisplay seconds={seconds} />
      </div>
      <div className="hud-lower">
        <div className="attack-meter">
          <div className="meter-heading"><span>Attack charge</span><strong>{attackMeter}%</strong></div>
          <div className="meter-track" role="progressbar" aria-label="Attack charge" aria-valuenow={attackMeter} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${attackMeter}%` }} />
          </div>
        </div>
        <div className="attack-actions" aria-label="PvP attacks unavailable in solo practice">
          {ATTACKS.map(attack => <button key={attack} className="attack-button" disabled title="PvP attacks arrive in a later phase">{attack}</button>)}
        </div>
      </div>
    </section>
  );
}