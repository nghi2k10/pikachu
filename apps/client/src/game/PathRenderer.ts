import { Container, Graphics, type Point } from "pixi.js";
import type { Position } from "@pikachu/game-engine";

export class PathRenderer {
  private readonly graphic = new Graphics();
  private remainingMs = 0;

  constructor(private readonly container: Container) {
    this.container.addChild(this.graphic);
    this.graphic.eventMode = "none";
  }

  drawPath(points: Position[], getPoint: (position: Position) => Point): void {
    this.graphic.clear();
    if (points.length < 2) return;
    const screenPoints = points.map(getPoint);
    this.drawStroke(screenPoints, 14, 0x2c9e91, 0.3);
    this.drawStroke(screenPoints, 8, 0xfff3bc, 0.92);
    this.drawStroke(screenPoints, 3, 0xff7c55, 1);
    this.remainingMs = 300;
    this.graphic.alpha = 1;
  }

  clear(): void {
    this.graphic.clear();
    this.remainingMs = 0;
  }

  get active(): boolean {
    return this.remainingMs > 0;
  }

  update(deltaMs: number): void {
    if (this.remainingMs <= 0) return;
    this.remainingMs -= deltaMs;
    this.graphic.alpha = Math.max(0, this.remainingMs / 300);
    if (this.remainingMs <= 0) this.clear();
  }

  private drawStroke(points: Point[], width: number, color: number, alpha: number): void {
    this.graphic.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      this.graphic.lineTo(points[index].x, points[index].y);
    }
    this.graphic.stroke({ color, width, alpha, cap: "round", join: "round" });
  }
}