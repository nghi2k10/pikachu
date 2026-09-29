import { Container, Point } from "pixi.js";
import { describe, expect, it } from "vitest";
import { EffectsRenderer } from "./EffectsRenderer.js";

describe("EffectsRenderer", () => {
  it("returns match particles and rings to their pools after the effect", () => {
    const container = new Container();
    const effects = new EffectsRenderer(container);
    effects.playMatchEffect([new Point(10, 10), new Point(70, 10)]);
    expect(effects.activeEffectCount).toBe(12);
    effects.update(400);
    expect(effects.activeEffectCount).toBe(0);
    expect(effects.poolCounts).toEqual({ particles: 10, effects: 2, scorePopups: 0 });
    effects.playMatchEffect([new Point(10, 10), new Point(70, 10)]);
    expect(effects.activeEffectCount).toBe(12);
    effects.destroy();
  });
});