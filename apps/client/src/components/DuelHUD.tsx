import { ShieldAlert, Snowflake, Swords, TimerReset } from "lucide-react";
import type { LocalMatchState, PlayerId } from "../game/LocalMatchTypes.js";
import { TimerDisplay } from "./TimerDisplay.js";

interface DuelHUDProps {
  state: LocalMatchState;
  onAttack: (playerId: PlayerId, attackIndex: number) => void;
}

const ATTACKS = [
  { name: "Freeze", type: "FREEZE", icon: Snowflake },
  { name: "Shuffle", type: "SHUFFLE", icon: Swords },
  { name: "Block", type: "BLOCK", icon: ShieldAlert },
  { name: "Add tiles", type: "ADD_TILES", icon: TimerReset },
] as const;
const ATTACK_KEYS: Record<PlayerId, string[]> = { P1: ["1", "2", "3", "4"], P2: ["7", "8", "9", "0"] };

export function DuelHUD({ state, onAttack }: DuelHUDProps) {
  return (
    <section className="duel-hud" aria-label="Player scores and attacks">
      <PlayerScorePanel state={state} playerId="P1" onAttack={onAttack} />
      <div className="shared-clock"><span className="clock-label">SHARED CLOCK</span><TimerDisplay seconds={state.timeRemaining} /><span className="clock-remaining">{state.players.P1.remainingTiles + state.players.P2.remainingTiles} TILES</span></div>
      <PlayerScorePanel state={state} playerId="P2" onAttack={onAttack} />
    </section>
  );
}

function PlayerScorePanel({ state, playerId, onAttack }: DuelHUDProps & { playerId: PlayerId }) {
  const player = state.players[playerId];
  const ready = player.attackMeter >= 100 && player.cooldownRemainingMs <= 0 && player.inputEnabled;
  const isP2 = playerId === "P2";
  return (
    <article className={`player-score-panel ${isP2 ? "player-two" : "player-one"}`}>
      <div className="player-score-top">
        <div className="player-ident"><span className="player-chip">{isP2 ? "02" : "01"}</span><div><b>{player.name}</b><small>{isP2 ? "WASD + SPACE" : "MOUSE + ARROWS"}</small></div></div>
        <div className="player-points"><span>SCORE</span><strong>{player.score.toLocaleString("en-US")}</strong></div>
        <div className="player-combo"><span>COMBO</span><strong className={player.combo > 1 ? "combo-active" : ""}>x{player.combo}</strong></div>
      </div>
      <div className="player-attack-row">
        <div className="player-meter"><div className="player-meter-label"><span>{player.cooldownRemainingMs > 0 ? `COOLDOWN ${(player.cooldownRemainingMs / 1000).toFixed(1)}s` : ready ? "ATTACK READY" : "ATTACK METER"}</span><strong>{player.attackMeter}%</strong></div>
          <div className="player-meter-track" role="progressbar" aria-label={`${player.name} attack meter`} aria-valuenow={player.attackMeter} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${player.attackMeter}%` }} /></div>
        </div>
        <div className="player-attack-buttons">
          {ATTACKS.map((attack, index) => {
            const Icon = attack.icon;
            return <button key={attack.type} className="duel-attack-button" disabled={!ready} title={`${attack.name} (${ATTACK_KEYS[playerId][index]})`} aria-label={`${player.name} ${attack.name}`} onClick={() => onAttack(playerId, index)}><Icon size={13} /><kbd>{ATTACK_KEYS[playerId][index]}</kbd></button>;
          })}
        </div>
      </div>
      <div className="player-statuses" aria-live="polite">
        {player.statusEffects.map(effect => <span key={effect.id} className={`status-pill status-${effect.type.toLowerCase()}`}>{effect.type === "FREEZE" ? "❄ FROZEN" : `▨ BLOCKED ${effect.blockedPositions?.length ?? 0}`}</span>)}
      </div>
    </article>
  );
}