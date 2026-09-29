import { Container, Texture } from "pixi.js";
import { describe, expect, it } from "vitest";
import { createBoard } from "@pikachu/game-engine";
import { AnimationManager } from "./AnimationManager.js";
import { BoardRenderer } from "./BoardRenderer.js";

describe("BoardRenderer", () => {
  it("maps grid cells to centered screen points and resizes", () => {
    const board = createBoard({ rows: 2, cols: 4, tileTypes: 2 }, [0, 0, 1, 1, 0, 0, 1, 1]);
    const renderer = new BoardRenderer(new Container(), board, { getTexture: () => Texture.WHITE }, new AnimationManager());
    renderer.resize(840, 420);
    const first = renderer.getTilePosition(0, 0);
    const last = renderer.getTilePosition(1, 3);
    expect(first.x).toBeLessThan(last.x);
    expect(first.y).toBeLessThan(last.y);
    expect(renderer.hitTest(first.x, first.y)).toEqual({ row: 0, col: 0 });
    renderer.resize(420, 320);
    const resized = renderer.getTilePosition(0, 0);
    expect(resized.x).not.toBe(first.x);
    renderer.destroy();
  });
});