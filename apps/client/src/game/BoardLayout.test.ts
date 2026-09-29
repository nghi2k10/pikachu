import { describe, expect, it } from "vitest";
import { calculateBoardLayout } from "./BoardLayout.js";

describe("calculateBoardLayout", () => {
  it("centers the complete board in a desktop viewport", () => {
    const layout = calculateBoardLayout(1440, 650, 8, 16);
    expect(layout.x).toBeGreaterThanOrEqual(0);
    expect(layout.y).toBeGreaterThanOrEqual(0);
    expect(layout.x + layout.width).toBeLessThanOrEqual(1440);
    expect(layout.y + layout.height).toBeLessThanOrEqual(650);
  });

  it("recalculates cell dimensions on narrow viewports", () => {
    const layout = calculateBoardLayout(760, 620, 8, 16);
    expect(layout.tileWidth).toBeLessThan(48);
    expect(layout.cols).toBe(16);
  });

  it("rejects invalid dimensions", () => {
    expect(() => calculateBoardLayout(0, 500, 8, 16)).toThrow(RangeError);
  });
});