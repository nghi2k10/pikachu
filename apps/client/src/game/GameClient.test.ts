import { describe, expect, it, vi } from "vitest";
import { createBoard, GameEngine } from "@pikachu/game-engine";
import { GameClient } from "./GameClient.js";
import { GameState } from "../state/GameState.js";

function createClient(types: number[], rows = 2, cols = 2, duration = 120) {
  const board = createBoard({ rows, cols, tileTypes: 4 }, types);
  const state = new GameState(board, duration);
  return { client: new GameClient(new GameEngine(board), state, duration), state };
}

describe("GameClient", () => {
  it("runs countdown, allows selection and scores a valid match", () => {
    const { client, state } = createClient([0, 0, 1, 1]);
    const onMatch = vi.fn();
    client.setHooks({ onMatch });
    client.start();
    client.update(3500);
    expect(state.getSnapshot().status).toBe("PLAYING");
    client.selectTile({ row: 0, col: 0 });
    client.selectTile({ row: 0, col: 1 });
    expect(state.getSnapshot().score).toBe(100);
    expect(state.getSnapshot().remainingTiles).toBe(2);
    expect(state.getSnapshot().combo).toBe(1);
    expect(onMatch).toHaveBeenCalledOnce();
  });

  it("advances 3, 2, 1, GO across ticker frames", () => {
    const { client, state } = createClient([0, 0, 1, 1]);
    client.start();
    client.update(1000);
    expect(state.getSnapshot().countdownLabel).toBe("2");
    client.update(1000);
    expect(state.getSnapshot().countdownLabel).toBe("1");
    client.update(1000);
    expect(state.getSnapshot().countdownLabel).toBe("GO!");
    client.update(500);
    expect(state.getSnapshot().status).toBe("PLAYING");
  });

  it("keeps tiles and score unchanged after an invalid match", () => {
    const { client, state } = createClient([0, 1, 2, 3]);
    const onInvalidMatch = vi.fn();
    client.setHooks({ onInvalidMatch });
    client.start();
    client.update(3500);
    client.selectTile({ row: 0, col: 0 });
    client.selectTile({ row: 0, col: 1 });
    expect(state.getSnapshot().score).toBe(0);
    expect(state.getSnapshot().remainingTiles).toBe(4);
    expect(onInvalidMatch).toHaveBeenCalledOnce();
  });

  it("finishes when the local timer reaches zero", () => {
    const { client, state } = createClient([0, 0, 1, 1], 2, 2, 1);
    client.start();
    client.update(3500);
    client.update(1000);
    expect(state.getSnapshot().status).toBe("FINISHED");
    expect(state.getSnapshot().timeRemaining).toBe(0);
  });

  it("finishes immediately when the board is cleared", () => {
    const { client, state } = createClient([0, 0], 1, 2);
    client.start();
    client.update(3500);
    client.selectTile({ row: 0, col: 0 });
    client.selectTile({ row: 0, col: 1 });
    expect(state.getSnapshot().status).toBe("FINISHED");
  });
});