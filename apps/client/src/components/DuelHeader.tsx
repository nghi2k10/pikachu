import { CircleHelp, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { LocalMatchStatus } from "../game/LocalMatchTypes.js";

interface DuelHeaderProps {
  status: LocalMatchStatus;
  soundOn: boolean;
  onStart: () => void;
  onNewMatch: () => void;
  onToggleSound: () => void;
  onPause: () => void;
}

export function DuelHeader({ status, soundOn, onStart, onNewMatch, onToggleSound, onPause }: DuelHeaderProps) {
  const statusLabel = status === "PLAYING" ? "LIVE DUEL" : status.replace("_", " ");
  return (
    <header className="duel-header">
      <a className="brand" href="#duel" aria-label="Onet Arcade local duel">
        <span className="brand-mark" aria-hidden="true">O</span>
        <span className="brand-name">ONET<span>LOCAL DUEL</span></span>
      </a>
      <div className="duel-live-status"><i className={status === "PLAYING" ? "is-live" : ""} />{statusLabel}<span className="local-tag">SAME DEVICE</span></div>
      <nav className="duel-header-actions" aria-label="Match controls">
        {status === "LOBBY" && <button className="button button-primary" onClick={onStart}>Start duel <span className="button-key">ENTER</span></button>}
        {(status === "PLAYING" || status === "COUNTDOWN") && <button className="icon-button" onClick={onPause} title="Pause match (P)" aria-label="Pause match"><Pause size={16} /></button>}
        <button className="icon-button" onClick={onNewMatch} title="New match" aria-label="New match"><RotateCcw size={16} /></button>
        <button className="icon-button" onClick={onToggleSound} title={soundOn ? "Mute sound" : "Enable sound"} aria-label={soundOn ? "Mute sound" : "Enable sound"}>
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <span className="keyboard-hint" title="Toggle diagnostics">F2</span>
        <CircleHelp className="duel-help" size={17} aria-hidden="true" />
      </nav>
    </header>
  );
}