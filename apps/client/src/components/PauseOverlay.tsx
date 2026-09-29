import { Play, RotateCcw } from "lucide-react";

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
}

export function PauseOverlay({ onResume, onRestart }: PauseOverlayProps) {
  return (
    <div className="duel-modal-scrim">
      <section className="duel-modal pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <p className="eyebrow">TAKE A BREATHER</p><h2 id="pause-title">Match paused</h2>
        <div className="pause-actions"><button className="button button-primary" onClick={onResume}><Play size={15} /> Resume</button><button className="button button-secondary" onClick={onRestart}><RotateCcw size={15} /> Restart</button></div>
        <span className="pause-key">PRESS P TO RESUME</span>
      </section>
    </div>
  );
}