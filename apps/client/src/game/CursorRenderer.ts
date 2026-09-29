import { Container, Graphics, Point } from "pixi.js";
import type { PlayerTheme } from "./LocalMatchTypes.js";

export class CursorRenderer {
  private readonly graphic = new Graphics();
  private center = new Point();
  private width = 0;
  private height = 0;
  private phase = 0;
  private visible = false;

  constructor(private readonly container: Container, private readonly theme: PlayerTheme) {
    this.container.addChild(this.graphic);
    this.graphic.eventMode = "none";
  }

  setPosition(center: Point, width: number, height: number): void {
    this.center = center.clone();
    this.width = width;
    this.height = height;
    this.visible = true;
    this.draw();
  }

  hide(): void {
    this.visible = false;
    this.graphic.clear();
  }

  update(deltaMs: number): void {
    if (!this.visible) return;
    this.phase += deltaMs;
    this.draw();
  }

  destroy(): void {
    this.graphic.destroy();
  }

  private draw(): void {
    if (!this.visible) return;
    const pulse = 0.72 + (Math.sin(this.phase / 145) + 1) * 0.13;
    const halfWidth = this.width / 2 + 5;
    const halfHeight = this.height / 2 + 5;
    this.graphic.clear();
    this.graphic.roundRect(this.center.x - halfWidth, this.center.y - halfHeight, halfWidth * 2, halfHeight * 2, 14)
      .stroke({ color: this.theme.primary, width: 8, alpha: 0.15 + pulse * 0.18 });
    this.graphic.roundRect(this.center.x - halfWidth, this.center.y - halfHeight, halfWidth * 2, halfHeight * 2, 14)
      .stroke({ color: this.theme.primary, width: 3, alpha: pulse });
    this.graphic.moveTo(this.center.x - halfWidth + 8, this.center.y - halfHeight + 2)
      .lineTo(this.center.x - halfWidth + 23, this.center.y - halfHeight + 2)
      .stroke({ color: this.theme.accent, width: 3, alpha: 0.95 });
  }
}