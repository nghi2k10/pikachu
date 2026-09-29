import { Container, Graphics } from "pixi.js";
import type { Point } from "pixi.js";

export class SelectionRenderer {
  private readonly graphic = new Graphics();
  private phase = 0;
  private bounds: { x: number; y: number; width: number; height: number } | null = null;

  constructor(private readonly container: Container) {
    this.container.addChild(this.graphic);
    this.graphic.eventMode = "none";
  }

  show(center: Point, width: number, height: number): void {
    this.bounds = { x: center.x - width / 2 - 3, y: center.y - height / 2 - 3, width: width + 6, height: height + 6 };
    this.phase = 0;
    this.draw();
  }

  clear(): void {
    this.bounds = null;
    this.graphic.clear();
  }

  update(deltaMs: number): void {
    if (!this.bounds) return;
    this.phase += deltaMs;
    this.draw();
  }

  private draw(): void {
    if (!this.bounds) return;
    const pulse = 0.78 + Math.sin(this.phase / 115) * 0.16;
    const { x, y, width, height } = this.bounds;
    this.graphic.clear();
    this.graphic.roundRect(x, y, width, height, 15).stroke({ color: 0xfff4c6, width: 4, alpha: pulse });
    this.graphic.roundRect(x + 3, y + 3, width - 6, height - 6, 12).stroke({ color: 0x173e37, width: 1.5, alpha: 0.65 });
  }
}