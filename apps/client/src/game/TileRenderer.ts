import { Container, Sprite } from "pixi.js";
import type { Tile } from "@pikachu/game-engine";
import type { AnimationManager, AnimationId } from "./AnimationManager.js";
import type { TileTextureProvider } from "./AssetManager.js";

export class TileRenderer {
  readonly container = new Container();
  private readonly sprite: Sprite;
  private selected = false;
  private baseScale = 1;
  private x = 0;
  private selectionAnimation: AnimationId | null = null;
  private tileType: number;
  exiting = false;

  constructor(
    tile: Tile,
    private readonly textures: TileTextureProvider,
    private readonly animations: AnimationManager,
  ) {
    this.tileType = tile.type;
    this.sprite = new Sprite(textures.getTexture(tile.type));
    this.sprite.anchor.set(0.5);
    this.container.addChild(this.sprite);
  }

  updateTile(tile: Tile): void {
    if (tile.type === this.tileType) return;
    this.tileType = tile.type;
    this.sprite.texture = this.textures.getTexture(tile.type);
    this.animations.animate(190, progress => {
      this.container.scale.set(this.baseScale * (1 - Math.sin(progress * Math.PI) * 0.18));
      this.container.alpha = 0.72 + Math.sin(progress * Math.PI) * 0.28;
    }, () => {
      this.container.scale.set(this.baseScale * (this.selected ? 1.07 : 1));
      this.container.alpha = 1;
    });
  }

  setBounds(x: number, y: number, width: number, height: number): void {
    this.x = x;
    this.container.position.set(x, y);
    this.sprite.width = width;
    this.sprite.height = height;
  }

  shake(): void {
    this.animations.animate(170, progress => {
      this.container.x = this.x + Math.sin(progress * Math.PI * 8) * 5 * (1 - progress);
    }, () => {
      this.container.x = this.x;
    });
  }

  setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    if (this.selectionAnimation !== null) this.animations.cancel(this.selectionAnimation);
    const from = this.container.scale.x;
    const to = selected ? this.baseScale * 1.07 : this.baseScale;
    this.selectionAnimation = this.animations.animate(125, progress => {
      const eased = 1 - (1 - progress) ** 3;
      this.container.scale.set(from + (to - from) * eased);
    }, () => {
      this.selectionAnimation = null;
    });
  }

  setBaseScale(scale: number): void {
    if (Math.abs(this.baseScale - scale) < 0.001) return;
    this.baseScale = scale;
    this.container.scale.set(scale * (this.selected ? 1.07 : 1));
  }

  destroy(): void {
    if (this.selectionAnimation !== null) this.animations.cancel(this.selectionAnimation);
    this.container.destroy({ children: true });
  }
}