import { Container, Point } from "pixi.js";
import type { Board, Position } from "@pikachu/game-engine";
import { AnimationManager } from "./AnimationManager.js";
import type { TileTextureProvider } from "./AssetManager.js";
import { BoardRenderer } from "./BoardRenderer.js";
import { BoardStatusRenderer } from "./BoardStatusRenderer.js";
import { CursorRenderer } from "./CursorRenderer.js";
import { EffectsRenderer } from "./EffectsRenderer.js";
import { PathRenderer } from "./PathRenderer.js";
import { SelectionRenderer } from "./SelectionRenderer.js";
import type { LocalPlayer, PlayerTheme } from "./LocalMatchTypes.js";

export class PlayerGameView {
  readonly boardRenderer: BoardRenderer;
  readonly animations = new AnimationManager();
  readonly pathRenderer: PathRenderer;
  readonly effectsRenderer: EffectsRenderer;
  readonly selectionRenderer: SelectionRenderer;
  readonly cursorRenderer: CursorRenderer;
  readonly statusRenderer: BoardStatusRenderer;

  constructor(
    readonly playerId: LocalPlayer["id"],
    private readonly container: Container,
    board: Board,
    textures: TileTextureProvider,
    readonly theme: PlayerTheme,
  ) {
    const boardLayer = new Container();
    const pathLayer = new Container();
    const effectsLayer = new Container();
    const selectionLayer = new Container();
    const cursorLayer = new Container();
    const statusLayer = new Container();
    this.container.addChild(boardLayer, pathLayer, effectsLayer, selectionLayer, cursorLayer, statusLayer);
    this.boardRenderer = new BoardRenderer(boardLayer, board, textures, this.animations);
    this.pathRenderer = new PathRenderer(pathLayer);
    this.effectsRenderer = new EffectsRenderer(effectsLayer);
    this.selectionRenderer = new SelectionRenderer(selectionLayer);
    this.cursorRenderer = new CursorRenderer(cursorLayer, theme);
    this.statusRenderer = new BoardStatusRenderer(statusLayer, theme);
    this.boardRenderer.render();
  }

  resize(width: number, height: number, player: LocalPlayer): void {
    this.boardRenderer.resize(width, height);
    this.statusRenderer.update(player, this.boardRenderer);
  }

  update(deltaMs: number): void {
    this.pathRenderer.update(deltaMs);
    this.effectsRenderer.update(deltaMs);
    this.selectionRenderer.update(deltaMs);
    this.cursorRenderer.update(deltaMs);
    this.animations.update(deltaMs);
  }

  updatePlayer(player: LocalPlayer): void {
    this.boardRenderer.update(player.board);
    this.statusRenderer.update(player, this.boardRenderer);
  }

  updateStatus(player: LocalPlayer): void {
    this.statusRenderer.update(player, this.boardRenderer);
  }

  setCursor(position: Position | null): void {
    if (!position) {
      this.cursorRenderer.hide();
      return;
    }
    this.cursorRenderer.setPosition(
      this.boardRenderer.getTilePosition(position.row, position.col),
      this.boardRenderer.tileWidth,
      this.boardRenderer.tileHeight,
    );
  }

  setSelection(position: Position | null): void {
    this.boardRenderer.setSelected(position);
    if (!position) {
      this.selectionRenderer.clear();
      return;
    }
    this.selectionRenderer.show(
      this.boardRenderer.getTilePosition(position.row, position.col),
      this.boardRenderer.tileWidth,
      this.boardRenderer.tileHeight,
    );
  }

  playMatch(from: Position, to: Position, result: { path: { points: Position[] }; scoreAwarded: number; combo: number }): void {
    const screenPoints = result.path.points.map(position => this.boardRenderer.getTilePosition(position.row, position.col));
    const midpoint = new Point(
      (screenPoints[0].x + screenPoints[screenPoints.length - 1].x) / 2,
      (screenPoints[0].y + screenPoints[screenPoints.length - 1].y) / 2,
    );
    this.boardRenderer.animateMatch([from, to], () => undefined);
    this.pathRenderer.drawPath(result.path.points, position => this.boardRenderer.getTilePosition(position.row, position.col));
    this.effectsRenderer.playMatchEffect([screenPoints[0], screenPoints[screenPoints.length - 1]]);
    this.effectsRenderer.playScorePopup(midpoint, result.scoreAwarded);
    this.effectsRenderer.playComboEffect(result.combo, midpoint);
  }

  playInvalid(position: Position): void {
    this.effectsRenderer.playInvalidEffect(this.boardRenderer.getTilePosition(position.row, position.col));
    this.boardRenderer.shakeTile(position);
  }

  playShuffleEffect(): void {
    this.boardRenderer.playShuffleEffect();
  }

  destroy(): void {
    this.boardRenderer.destroy();
    this.effectsRenderer.destroy();
    this.cursorRenderer.destroy();
    this.statusRenderer.destroy();
    this.animations.clear();
    this.container.removeChildren();
  }
}