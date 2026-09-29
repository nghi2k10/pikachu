import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LocalDuelScene } from "../game/LocalDuelScene.js";
import { DEFAULT_LOCAL_MATCH_CONFIG, LocalMatchEngine } from "../game/LocalMatchEngine.js";
import type { AttackType, PlayerId } from "../game/LocalMatchTypes.js";
import { DuelHeader } from "../components/DuelHeader.js";
import { DuelHUD } from "../components/DuelHUD.js";
import { DuelResult } from "../components/DuelResult.js";
import { PauseOverlay } from "../components/PauseOverlay.js";

const ATTACK_TYPES: AttackType[] = ["FREEZE", "SHUFFLE", "BLOCK", "ADD_TILES"];

function createMatch(): LocalMatchEngine {
  return new LocalMatchEngine({ ...DEFAULT_LOCAL_MATCH_CONFIG, seed: Math.floor(Math.random() * 0xffffffff) });
}

export function App() {
  const [match, setMatch] = useState(createMatch);
  const [sceneReady, setSceneReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [narrowViewport, setNarrowViewport] = useState(() => window.innerWidth < 760);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LocalDuelScene | null>(null);
  const rematchRef = useRef(false);
  const state = useSyncExternalStore(match.subscribe, match.getState, match.getState);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const scene = new LocalDuelScene(host, match);
    setSceneReady(false);
    setSceneError(null);
    void scene.initialize().then(() => {
      if (cancelled) return;
      sceneRef.current = scene;
      setSceneReady(true);
      if (rematchRef.current) {
        rematchRef.current = false;
        scene.playStartSound();
        match.start();
      }
    }).catch(error => {
      if (cancelled) return;
      setSceneError(error instanceof Error ? error.message : "The local duel renderer could not start.");
    });
    return () => {
      cancelled = true;
      sceneRef.current = null;
      scene.destroy();
    };
  }, [match]);

  useEffect(() => {
    const onResize = () => setNarrowViewport(window.innerWidth < 760);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function startMatch(): void {
    if (!sceneReady || state.status !== "LOBBY") return;
    sceneRef.current?.playStartSound();
    match.start();
  }

  function newMatch(rematch = false): void {
    rematchRef.current = rematch;
    setSceneReady(false);
    setMatch(createMatch());
  }

  function useAttack(playerId: PlayerId, attackIndex: number): void {
    const attackType = ATTACK_TYPES[attackIndex];
    if (attackType) match.useAttack(playerId, attackType);
  }

  function toggleSound(): void {
    const enabled = sceneRef.current?.toggleSound() ?? !soundOn;
    setSoundOn(enabled);
  }

  function pauseOrResume(): void {
    if (state.status === "PAUSED") match.resume();
    else match.pause();
  }

  return (
    <main className="arcade-app duel-app" id="duel">
      <DuelHeader status={state.status} soundOn={soundOn} onStart={startMatch} onNewMatch={() => newMatch(false)} onToggleSound={toggleSound} onPause={pauseOrResume} />
      <DuelHUD state={state} onAttack={useAttack} />
      <section className="duel-playfield" aria-label="Local 1v1 split board">
        <div className="duel-board-captions" aria-hidden="true"><span>01 <b>PLAYER ONE</b></span><span>02 <b>PLAYER TWO</b></span></div>
        <div className="duel-pixi-host" ref={hostRef} />
        {narrowViewport && <div className="viewport-warning" role="status">A wider screen gives both players more room.</div>}
        {state.status === "LOBBY" && <div className="duel-lobby-overlay"><span className="overlay-kicker">TWO BOARDS · ONE SCREEN</span><h1>Ready to<br /><em>duel?</em></h1><button className="button button-primary" onClick={startMatch} disabled={!sceneReady}>Start local 1v1 <span className="button-key">ENTER</span></button></div>}
        {state.status === "COUNTDOWN" && <div className="duel-countdown" aria-live="assertive"><span key={state.countdownLabel}>{state.countdownLabel}</span></div>}
        {!sceneReady && !sceneError && <div className="duel-loading">Preparing both boards…</div>}
        {sceneError && <div className="duel-error" role="alert"><strong>Renderer unavailable</strong><span>{sceneError}</span><button className="button button-primary" onClick={() => newMatch(false)}>Try again</button></div>}
        {state.status === "PAUSED" && <PauseOverlay onResume={pauseOrResume} onRestart={() => newMatch(true)} />}
        {state.status === "FINISHED" && <DuelResult state={state} onRematch={() => newMatch(true)} />}
        {state.debugEnabled && <DuelDebug state={state} />}
      </section>
      <footer className="duel-footer"><span><i className="footer-live-dot" /> LOCAL SESSION</span><span>P1 MOUSE / ARROWS + ENTER</span><span>P2 WASD + SPACE</span><span>ATTACKS 1-4 / 7-0</span></footer>
    </main>
  );
}

function DuelDebug({ state }: { state: ReturnType<LocalMatchEngine["getState"]> }) {
  return (
    <aside className="duel-debug" aria-label="Match debug information">
      <strong>FPS {state.fps}</strong><span>TIME {state.timeRemaining}s · {state.status}</span>
      {(["P1", "P2"] as const).map(playerId => {
        const player = state.players[playerId];
        return <span key={playerId}>{playerId} SCORE {player.score} · COMBO {player.combo} · ATTACK {player.attackMeter}% · LEFT {player.remainingTiles} · STATUS {player.statusEffects.map(effect => effect.type).join(",") || "-"}</span>;
      })}
    </aside>
  );
}