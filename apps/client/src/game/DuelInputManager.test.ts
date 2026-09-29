import { describe, expect, it, vi } from "vitest";
import { LocalMatchEngine } from "./LocalMatchEngine.js";
import { DuelInputManager } from "./DuelInputManager.js";
import type { LocalMatchConfig } from "./LocalMatchEngine.js";

const config: LocalMatchConfig = {
  boardConfig: { rows: 2, cols: 2, tileTypes: 2 },
  durationSeconds: 30,
  countdownDurationMs: 3500,
  finishGracePeriodMs: 1500,
  attackMeter: { normalMatchGain: 10, comboMatchGain: 15 },
  seed: 42,
};

function playingMatch(): LocalMatchEngine {
  const match = new LocalMatchEngine(config);
  match.start();
  match.update(3500);
  return match;
}

describe("DuelInputManager", () => {
  it("routes arrow keys to P1 and WASD to P2 with independent cursors", () => {
    const input = new DuelInputManager(playingMatch(), {}, undefined, null);
    expect(input.getCursor("P1")).toEqual({ row: 0, col: 0 });
    expect(input.getCursor("P2")).toEqual({ row: 0, col: 0 });
    input.handleKeyCode("ArrowRight");
    input.handleKeyCode("KeyD");
    expect(input.getCursor("P1")).toEqual({ row: 0, col: 1 });
    expect(input.getCursor("P2")).toEqual({ row: 0, col: 1 });
    input.handleKeyCode("ArrowLeft");
    expect(input.getCursor("P1")).toEqual({ row: 0, col: 0 });
    expect(input.getCursor("P2")).toEqual({ row: 0, col: 1 });
    input.handleKeyCode("ArrowLeft");
    expect(input.getCursor("P1")).toEqual({ row: 0, col: 0 });
  });

  it("keeps each player's selection independent", () => {
    const match = playingMatch();
    const input = new DuelInputManager(match, {}, undefined, null);
    input.handleKeyCode("Enter");
    input.handleKeyCode("Space");
    expect(input.getSelection("P1")).toEqual({ row: 0, col: 0 });
    expect(input.getSelection("P2")).toEqual({ row: 0, col: 0 });
    input.handleKeyCode("ArrowRight");
    input.handleKeyCode("Enter");
    expect(input.getSelection("P1")).toBeNull();
    expect(input.getSelection("P2")).toEqual({ row: 0, col: 0 });
    expect(match.getPlayer("P1").score).toBe(100);
    expect(match.getPlayer("P2").score).toBe(0);
  });

  it("dispatches player-specific attack keys and pause toggle", () => {
    const match = playingMatch();
    const onAttack = vi.fn();
    const input = new DuelInputManager(match, { onAttackAttempt: onAttack }, undefined, null);
    match.getPlayer("P1").attackMeter = 100;
    input.handleKeyCode("Digit1");
    expect(onAttack).toHaveBeenCalledWith("P1", "FREEZE");
    expect(match.getPlayer("P2").statusEffects[0]?.type).toBe("FREEZE");
    input.handleKeyCode("KeyP");
    expect(match.getState().status).toBe("PAUSED");
    const pausedCursor = input.getCursor("P1");
    input.handleKeyCode("ArrowRight");
    expect(input.getCursor("P1")).toEqual(pausedCursor);
    input.handleKeyCode("KeyP");
    expect(match.getState().status).toBe("PLAYING");
  });

  it("fills only the requested development meter from F3/F4", () => {
    const match = playingMatch();
    match.getPlayer("P1").attackMeter = 20;
    match.getPlayer("P2").attackMeter = 35;
    const input = new DuelInputManager(match, {}, undefined, null);
    input.handleKeyCode("F3");
    expect(match.getPlayer("P1").attackMeter).toBe(100);
    expect(match.getPlayer("P2").attackMeter).toBe(35);
    input.handleKeyCode("F4");
    expect(match.getPlayer("P2").attackMeter).toBe(100);
  });
});