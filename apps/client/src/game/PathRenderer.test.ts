import { Container, Point } from "pixi.js";
import { describe, expect, it } from "vitest";
import { PathRenderer } from "./PathRenderer.js";

describe("PathRenderer", () => {
  it("draws a path and clears it after its pulse lifetime", () => {
    const renderer = new PathRenderer(new Container());
    const points = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }];
    renderer.drawPath(points, position => new Point(position.col * 40, position.row * 40));
    expect(renderer.active).toBe(true);
    renderer.update(301);
    expect(renderer.active).toBe(false);
  });
});