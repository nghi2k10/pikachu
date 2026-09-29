import { Container, Point } from "pixi.js";
import type { Board, Position } from "@pikachu/game-engine";
import { AnimationManager } from "./AnimationManager.js";
import { calculateBoardLayout, type BoardLayout } from "./BoardLayout.js";
import type { TileTextureProvider } from "./AssetManager.js";
import { TileRenderer } from "./TileRenderer.js";

export class BoardRenderer {
  private readonly tiles = new Map<string, TileRenderer>();
  private readonly cellTileIds = new Map<string, string>();
  private layout: BoardLayout;

  constructor(
    private readonly container: Container,
    private board: Board,
    private readonly textures: TileTextureProvider,
    private readonly animations: AnimationManager,
  ) {
    this.layout = calculateBoardLayout(1, 1, board.config.rows, board.config.cols);
  }

  render(): void {
    this.update(this.board);
  }

  update(board: Board): void {
    this.board = board;
    this.cellTileIds.clear();
    const visibleIds = new Set<string>();
    for (const row of board.tiles) {
      for (const tile of row) {
        if (!tile?.alive) continue;
        visibleIds.add(tile.id);
        this.cellTileIds.set(cellKey(tile.row, tile.col), tile.id);
        let renderer = this.tiles.get(tile.id);
        if (!renderer) {
          renderer = new TileRenderer(tile, this.textures, this.animations);
          this.tiles.set(tile.id, renderer);
          this.container.addChild(renderer.container);
        } else {
          renderer.updateTile(tile);
        }
        const position = this.getTilePosition(tile.row, tile.col);
        renderer.setBounds(position.x, position.y, this.layout.tileWidth, this.layout.tileHeight);
        renderer.setBaseScale(Math.min(1, this.layout.tileWidth / 62));
      }
    }

    for (const [id, renderer] of this.tiles) {
      if (visibleIds.has(id) || renderer.exiting) continue;
      this.removeRenderer(id, renderer);
    }
  }

  resize(width: number, height: number): void {
    this.layout = calculateBoardLayout(width, height, this.board.config.rows, this.board.config.cols);
    this.update(this.board);
  }

  getTilePosition(row: number, col: number): Point {
    const x = this.layout.x + col * (this.layout.tileWidth + this.layout.gap) + this.layout.tileWidth / 2;
    const y = this.layout.y + row * (this.layout.tileHeight + this.layout.gap) + this.layout.tileHeight / 2;
    return new Point(x, y);
  }

  hitTest(x: number, y: number): Position | null {
    const col = Math.floor((x - this.layout.x) / (this.layout.tileWidth + this.layout.gap));
    const row = Math.floor((y - this.layout.y) / (this.layout.tileHeight + this.layout.gap));
    if (row < 0 || row >= this.board.config.rows || col < 0 || col >= this.board.config.cols) return null;
    const cellX = this.layout.x + col * (this.layout.tileWidth + this.layout.gap);
    const cellY = this.layout.y + row * (this.layout.tileHeight + this.layout.gap);
    if (x > cellX + this.layout.tileWidth || y > cellY + this.layout.tileHeight) return null;
    return this.board.tiles[row][col]?.alive ? { row, col } : null;
  }

  get tileWidth(): number {
    return this.layout.tileWidth;
  }

  get tileHeight(): number {
    return this.layout.tileHeight;
  }

  getLayout(): BoardLayout {
    return this.layout;
  }

  shakeTile(position: Position): void {
    const tile = this.board.tiles[position.row]?.[position.col];
    if (tile) this.tiles.get(tile.id)?.shake();
  }

  playShuffleEffect(): void {
    const startX = this.container.x;
    this.animations.animate(240, progress => {
      this.container.x = startX + Math.sin(progress * Math.PI * 10) * 4 * (1 - progress);
    }, () => {
      this.container.x = startX;
    });
  }

  setSelected(position: Position | null): void {
    for (const renderer of this.tiles.values()) renderer.setSelected(false);
    if (!position) return;
    const tile = this.board.tiles[position.row]?.[position.col];
    if (tile) this.tiles.get(tile.id)?.setSelected(true);
  }

  animateMatch(positions: Position[], complete: () => void): void {
    let remaining = 0;
    for (const position of positions) {
      const id = this.cellTileIds.get(cellKey(position.row, position.col));
      const renderer = id ? this.tiles.get(id) : undefined;
      if (!renderer) continue;
      remaining += 1;
      renderer.exiting = true;
      const startScale = renderer.container.scale.x;
      this.animations.animate(230, progress => {
        const eased = progress * progress;
        renderer.container.scale.set(startScale * (1 - eased * 0.72));
        renderer.container.alpha = 1 - progress;
      }, () => {
        this.removeRenderer(id!, renderer);
        remaining -= 1;
        if (remaining === 0) complete();
      });
    }
    if (remaining === 0) complete();
  }

  destroy(): void {
    for (const renderer of this.tiles.values()) renderer.destroy();
    this.tiles.clear();
    this.cellTileIds.clear();
    this.container.removeChildren();
  }

  private removeRenderer(id: string, renderer: TileRenderer): void {
    renderer.container.removeFromParent();
    renderer.destroy();
    this.tiles.delete(id);
  }
}

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}