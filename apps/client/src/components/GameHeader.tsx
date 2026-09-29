import { CircleHelp, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { GameStatus } from "../state/GameState.js";

interface GameHeaderProps {
  status: GameStatus;
  soundOn: boolean;
  onStart: () => void;
  onNewBoard: () => void;
  onToggleSound: () => void;
}

export function GameHeader({ status, soundOn, onStart, onNewBoard, onToggleSound }: GameHeaderProps) {
  return (
    <header className="game-header">
      <a className="brand" href="#game" aria-label="Onet Arcade home">
        <span className="brand-mark" aria-hidden="true">O</span>
        <span className="brand-name">ONET<span>ARCADE</span></span>
      </a>
      <div className="header-center">
        <span className="mode-dot" />
        <span>SOLO PRACTICE</span>
        <span className="header-divider" />
        <span className="round-status">{status === "PLAYING" ? "IN PLAY" : status}</span>
      </div>
      <nav className="header-actions" aria-label="Game controls">
        {status === "READY" && <button className="button button-primary" onClick={onStart}><span>Start game</span><span className="button-key">ENTER</span></button>}
        <button className="icon-button" onClick={onNewBoard} title="New board" aria-label="New board"><RotateCcw size={17} /></button>
        <button className="icon-button" onClick={onToggleSound} title={soundOn ? "Mute sound" : "Enable sound"} aria-label={soundOn ? "Mute sound" : "Enable sound"}>
          {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <button className="icon-button help-button" title="Debug panel (F2)" aria-label="Debug panel shortcut"><CircleHelp size={17} /></button>
      </nav>
    </header>
  );
}