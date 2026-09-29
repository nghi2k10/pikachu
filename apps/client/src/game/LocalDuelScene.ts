import { Application, Container, Graphics, Point } from "pixi.js";
import { type PlayerId, PLAYER_THEMES, type AttackType } from "./LocalMatchTypes.js";
import { LocalMatchEngine } from "./LocalMatchEngine.js";
import { AnimationManager } from "./AnimationManager.js";
import { AssetManager } from "./AssetManager.js";
import { AudioManager } from "./AudioManager.js";
import { InputManager } from "./InputManager.js";
import { DuelInputManager } from "./DuelInputManager.js";
import { PlayerGameView } from "./PlayerGameView.js";

export class LocalDuelScene {
  private readonly app = new Application();
  private readonly assets = new AssetManager();
  private readonly audio = new AudioManager();
  private readonly background = new Graphics();
  private readonly attackLayer = new Container();
  private readonly p1Root = new Container();
  private readonly p2Root = new Container();
  private readonly attackAnimations = new AnimationManager();
  private p1View!: PlayerGameView;
  private p2View!: PlayerGameView;
  private input!: DuelInputManager;
  private mouseInput!: InputManager;
  private resizeObserver: ResizeObserver | null = null;
  private unsubscribe: (() => void) | null = null;
  private tickerCallback: ((ticker: { deltaMS: number }) => void) | null = null;
  private fpsElapsed = 0;
  private fpsFrames = 0;
  private attackEffects: { graphic: Graphics; elapsed: number; duration: number }[] = [];
  private destroyed = false;

  constructor(private readonly host: HTMLElement, private readonly match: LocalMatchEngine) {}

  async initialize(): Promise<void> {
    const boardConfig = this.match.getPlayer("P1").board.config;
    await this.assets.loadGameAssets(boardConfig.tileTypes);
    if (this.destroyed) return;
    await this.app.init({
      resizeTo: this.host,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: true,
      background: "#e8eddf",
      preference: "webgl",
    });
    if (this.destroyed) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }

    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.background, this.p1Root, this.p2Root, this.attackLayer);
    this.background.eventMode = "none";
    this.attackLayer.eventMode = "none";
    this.p1View = new PlayerGameView("P1", this.p1Root, this.match.getPlayer("P1").board, this.assets, PLAYER_THEMES.P1);
    this.p2View = new PlayerGameView("P2", this.p2Root, this.match.getPlayer("P2").board, this.assets, PLAYER_THEMES.P2);
    this.resize(this.host.clientWidth, this.host.clientHeight);

    this.input = new DuelInputManager(this.match, {
      onCursorChanged: (playerId, position) => this.viewFor(playerId).setCursor(position),
      onSelectionChanged: (playerId, position) => {
        this.viewFor(playerId).setSelection(position);
        if (position) this.audio.playForPlayer(playerId, "select");
      },
    });
    this.p1View.setCursor(this.input.getCursor("P1"));
    this.p2View.setCursor(this.input.getCursor("P2"));

    this.mouseInput = new InputManager(this.app.canvas, {
      onTileTap: position => {
        this.audio.playForPlayer("P1", "select");
        this.input.selectTile("P1", position);
      },
      hitTest: (x, y) => x < this.app.screen.width / 2 ? this.p1View.boardRenderer.hitTest(x, y) : null,
      logicalSize: () => ({ width: this.app.screen.width, height: this.app.screen.height }),
    });

    this.match.setHooks({
      onMatch: (playerId, from, to, result) => {
        this.viewFor(playerId).playMatch(from, to, result);
        this.audio.playForPlayer(playerId, "match");
        if (result.combo > 1) this.audio.playForPlayer(playerId, "combo");
      },
      onInvalidMatch: (playerId, _from, to) => this.viewFor(playerId).playInvalid(to),
      onBoardChanged: playerId => this.viewFor(playerId).updatePlayer(this.match.getPlayer(playerId)),
      onBoardShuffled: playerId => {
        this.viewFor(playerId).playShuffleEffect();
        this.audio.playForPlayer(playerId, "shuffle");
      },
      onAttack: result => {
        this.playAttack(result.attackerId, result.targetId, result.type);
        this.viewFor(result.targetId).updatePlayer(this.match.getPlayer(result.targetId));
        if (result.type !== "SHUFFLE") this.audio.playForPlayer(result.attackerId, result.type.toLowerCase());
      },
      onGameEnd: () => this.audio.play("end"),
    });

    this.unsubscribe = this.match.subscribe(() => {
      this.p1View.updateStatus(this.match.getPlayer("P1"));
      this.p2View.updateStatus(this.match.getPlayer("P2"));
      this.input.syncState();
    });
    this.tickerCallback = ticker => this.update(ticker.deltaMS);
    this.app.ticker.add(this.tickerCallback);
    this.app.start();
    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) this.resize(entry.contentRect.width, entry.contentRect.height);
    });
    this.resizeObserver.observe(this.host);
  }

  resize(width: number, height: number): void {
    if (!this.p1View || width <= 0 || height <= 0) return;
    this.app.renderer?.resize(width, height);
    const panelWidth = width / 2;
    this.p1Root.position.set(0, 0);
    this.p2Root.position.set(panelWidth, 0);
    this.p1View.resize(panelWidth - 18, height, this.match.getPlayer("P1"));
    this.p2View.resize(panelWidth - 18, height, this.match.getPlayer("P2"));
    this.drawBackground(height, panelWidth);
  }

  toggleSound(): boolean {
    if (this.audio.isMuted) this.audio.unmute();
    else this.audio.mute();
    return !this.audio.isMuted;
  }

  playStartSound(): void {
    this.audio.play("start");
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    if (this.tickerCallback) this.app.ticker.remove(this.tickerCallback);
    this.unsubscribe?.();
    this.input?.destroy();
    this.mouseInput?.destroy();
    this.p1View?.destroy();
    this.p2View?.destroy();
    this.attackEffects.forEach(effect => effect.graphic.destroy());
    this.attackEffects.length = 0;
    this.attackAnimations.clear();
    this.audio.destroy();
    this.assets.destroy();
    if (this.app.renderer) this.app.destroy({ removeView: true }, { children: true });
  }

  private update(deltaMs: number): void {
    this.match.update(deltaMs);
    if (this.match.getState().status !== "PAUSED") {
      this.p1View.update(deltaMs);
      this.p2View.update(deltaMs);
      this.attackAnimations.update(deltaMs);
      this.updateAttackEffects(deltaMs);
    }
    this.fpsElapsed += deltaMs;
    this.fpsFrames += 1;
    if (this.fpsElapsed >= 500) {
      this.match.setFps(Math.round(this.fpsFrames * 1000 / this.fpsElapsed));
      this.fpsElapsed = 0;
      this.fpsFrames = 0;
    }
  }

  private playAttack(attacker: PlayerId, target: PlayerId, type: AttackType): void {
    const start = panelCenter(this.app.screen.width, this.app.screen.height, attacker);
    const end = panelCenter(this.app.screen.width, this.app.screen.height, target);
    const graphic = new Graphics();
    const color = type === "FREEZE" ? 0x73d7e2 : PLAYER_THEMES[attacker].accent;
    graphic.circle(0, 0, 7).fill({ color });
    graphic.position.copyFrom(start);
    this.attackLayer.addChild(graphic);
    this.attackEffects.push({ graphic, elapsed: 0, duration: 460 });
    this.attackAnimations.animate(460, progress => {
      const eased = 1 - (1 - progress) ** 3;
      graphic.position.set(start.x + (end.x - start.x) * eased, start.y + (end.y - start.y) * eased);
      graphic.alpha = 1 - progress * 0.35;
      graphic.scale.set(1 + Math.sin(progress * Math.PI) * 0.85);
    }, () => graphic.removeFromParent());
  }

  private updateAttackEffects(deltaMs: number): void {
    for (let index = this.attackEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.attackEffects[index];
      effect.elapsed += deltaMs;
      if (effect.elapsed >= effect.duration) {
        effect.graphic.destroy();
        this.attackEffects.splice(index, 1);
      }
    }
  }

  private drawBackground(height: number, panelWidth: number): void {
    this.background.clear();
    this.background.rect(0, 0, panelWidth, height).fill({ color: 0xe8eddf });
    this.background.rect(panelWidth, 0, panelWidth, height).fill({ color: 0xf0e9db });
    this.background.rect(panelWidth - 1, 0, 2, height).fill({ color: 0xa7b7a8, alpha: 0.72 });
    for (const [playerId, view] of [["P1", this.p1View], ["P2", this.p2View]] as const) {
      const offsetX = playerId === "P2" ? panelWidth : 0;
      const layout = view.boardRenderer.getLayout();
      this.background.roundRect(offsetX + layout.x - 10, layout.y - 10, layout.width + 20, layout.height + 20, 18)
        .fill({ color: playerId === "P1" ? 0xdce9df : 0xe9ddcf })
        .stroke({ color: PLAYER_THEMES[playerId].primary, width: 2, alpha: 0.48 });
    }
  }

  private viewFor(playerId: PlayerId): PlayerGameView {
    return playerId === "P1" ? this.p1View : this.p2View;
  }
}

function panelCenter(width: number, height: number, playerId: PlayerId): Point {
  return new Point(playerId === "P1" ? width * 0.42 : width * 0.58, height * 0.5);
}