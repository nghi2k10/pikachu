import { Application, Container, Graphics, Point } from "pixi.js";
import type { Board, Position } from "@pikachu/game-engine";
import { GameClient } from "./GameClient.js";
import { AnimationManager } from "./AnimationManager.js";
import { AssetManager } from "./AssetManager.js";
import { AudioManager } from "./AudioManager.js";
import { BoardRenderer } from "./BoardRenderer.js";
import { EffectsRenderer } from "./EffectsRenderer.js";
import { InputManager } from "./InputManager.js";
import { PathRenderer } from "./PathRenderer.js";
import { SelectionRenderer } from "./SelectionRenderer.js";

export class GameScene {
  private readonly app = new Application();
  private readonly animations = new AnimationManager();
  private readonly assets = new AssetManager();
  private readonly audio = new AudioManager();
  private readonly background = new Graphics();
  private readonly boardLayer = new Container();
  private readonly pathLayer = new Container();
  private readonly effectLayer = new Container();
  private readonly selectionLayer = new Container();
  private boardRenderer!: BoardRenderer;
  private pathRenderer!: PathRenderer;
  private effectsRenderer!: EffectsRenderer;
  private selectionRenderer!: SelectionRenderer;
  private inputManager!: InputManager;
  private resizeObserver: ResizeObserver | null = null;
  private fpsElapsed = 0;
  private fpsFrames = 0;
  private tickerCallback: ((ticker: { deltaMS: number }) => void) | null = null;
  private destroyed = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly board: Board,
    private readonly client: GameClient,
  ) {}

  async initialize(): Promise<void> {
    await this.assets.loadGameAssets(this.board.config.tileTypes);
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
    this.app.stage.addChild(this.background, this.boardLayer, this.pathLayer, this.effectLayer, this.selectionLayer);
    this.background.eventMode = "none";
    this.boardRenderer = new BoardRenderer(this.boardLayer, this.board, this.assets, this.animations);
    this.pathRenderer = new PathRenderer(this.pathLayer);
    this.effectsRenderer = new EffectsRenderer(this.effectLayer);
    this.selectionRenderer = new SelectionRenderer(this.selectionLayer);
    this.resize(this.host.clientWidth, this.host.clientHeight);

    this.inputManager = new InputManager(this.app.canvas, {
      onTileTap: position => {
        this.audio.play("select");
        this.client.selectTile(position);
      },
      hitTest: (x, y) => this.boardRenderer.hitTest(x, y),
      logicalSize: () => ({ width: this.app.screen.width, height: this.app.screen.height }),
    });

    this.client.setHooks({
      onTileSelected: position => this.showSelection(position),
      onMatch: (from, to, result) => this.playMatch(from, to, result),
      onInvalidMatch: (_from, to) => {
        this.audio.play("invalid");
        this.effectsRenderer.playInvalidEffect(this.boardRenderer.getTilePosition(to.row, to.col));
        this.boardRenderer.shakeTile(to);
      },
      onBoardChanged: board => this.boardRenderer.update(board),
      onBoardShuffled: () => this.audio.play("shuffle"),
      onGameEnd: () => this.audio.play("end"),
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
    if (!this.boardRenderer || width <= 0 || height <= 0) return;
    this.boardRenderer.resize(width, height);
    this.app.renderer?.resize(width, height);
    this.drawBackdrop(width, height);
  }

  playStartSound(): void {
    this.audio.play("start");
  }

  toggleSound(): boolean {
    if (this.audio.isMuted) this.audio.unmute();
    else this.audio.mute();
    return !this.audio.isMuted;
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    if (this.tickerCallback) this.app.ticker.remove(this.tickerCallback);
    this.inputManager?.destroy();
    this.boardRenderer?.destroy();
    this.effectsRenderer?.destroy();
    this.animations.clear();
    this.audio.destroy();
    this.assets.destroy();
    if (this.app.renderer) this.app.destroy({ removeView: true }, { children: true });
  }

  private update(deltaMs: number): void {
    this.client.update(deltaMs);
    this.animations.update(deltaMs);
    this.pathRenderer.update(deltaMs);
    this.selectionRenderer.update(deltaMs);
    this.effectsRenderer.update(deltaMs);
    this.fpsElapsed += deltaMs;
    this.fpsFrames += 1;
    if (this.fpsElapsed >= 500) {
      this.client.state.update({ fps: Math.round(this.fpsFrames * 1000 / this.fpsElapsed) });
      this.fpsElapsed = 0;
      this.fpsFrames = 0;
    }
  }

  private showSelection(position: Position | null): void {
    this.boardRenderer.setSelected(position);
    if (!position) {
      this.selectionRenderer.clear();
      return;
    }
    const center = this.boardRenderer.getTilePosition(position.row, position.col);
    this.selectionRenderer.show(center, this.boardRenderer.tileWidth, this.boardRenderer.tileHeight);
  }

  private playMatch(from: Position, to: Position, result: { path: { points: Position[] }; scoreAwarded: number; combo: number }): void {
    const positions = [from, to];
    const screenPoints = result.path.points.map(position => this.boardRenderer.getTilePosition(position.row, position.col));
    const midpoint = new Point(
      (screenPoints[0].x + screenPoints[screenPoints.length - 1].x) / 2,
      (screenPoints[0].y + screenPoints[screenPoints.length - 1].y) / 2,
    );
    this.boardRenderer.animateMatch(positions, () => undefined);
    this.pathRenderer.drawPath(result.path.points, position => this.boardRenderer.getTilePosition(position.row, position.col));
    this.effectsRenderer.playMatchEffect([screenPoints[0], screenPoints[screenPoints.length - 1]]);
    this.effectsRenderer.playScorePopup(midpoint, result.scoreAwarded);
    this.effectsRenderer.playComboEffect(result.combo, midpoint);
    this.audio.play("match");
    if (result.combo > 1) this.audio.play("combo");
  }

  private drawBackdrop(width: number, height: number): void {
    this.background.clear();
    this.background.rect(0, 0, width, height).fill({ color: 0xe8eddf });
    const layout = this.boardRenderer.getLayout();
    this.background.roundRect(layout.x - 14, layout.y - 14, layout.width + 28, layout.height + 28, 25)
      .fill({ color: 0xdce5d6 })
      .stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
    this.background.roundRect(layout.x - 7, layout.y - 7, layout.width + 14, layout.height + 14, 19)
      .stroke({ color: 0x9bb4a3, width: 1, alpha: 0.45 });
  }
}