import { describe, expect, it, vi } from "vitest";
import { AnimationManager } from "./AnimationManager.js";

describe("AnimationManager", () => {
  it("starts, advances, completes, and removes an animation", () => {
    const manager = new AnimationManager();
    const update = vi.fn();
    const complete = vi.fn();
    manager.animate(200, update, complete);
    expect(update).toHaveBeenLastCalledWith(0);
    expect(manager.activeCount).toBe(1);
    manager.update(100);
    expect(update).toHaveBeenLastCalledWith(0.5);
    manager.update(100);
    expect(update).toHaveBeenLastCalledWith(1);
    expect(complete).toHaveBeenCalledOnce();
    expect(manager.activeCount).toBe(0);
  });
});