import { describe, expect, it } from "vitest";
import { findPath } from "@pikachu/game-engine";
import { LocalMatchEngine, type LocalMatchConfig } from "./LocalMatchEngine.js";
import type { Board, Position } from "@pikachu/game-engine";

const compactConfig: LocalMatchConfig = {
  boardConfig: { rows: 2, cols: 2, tileTypes: 2 },
  durationSeconds: 120,
  countdownDurationMs: 3500,
  finishGracePeriodMs: 1500,
  attackMeter: { normalMatchGain: 10, comboMatchGain: 15 },
  seed: 7321,
};

function findMove(board: Board): [Position, Position] {
  const positions: Position[] = [];
  for (let row = 0; row < board.config.rows; row += 1) {
    for (let col = 0; col < board.config.cols; col += 1) {
      if (board.tiles[row][col]?.alive) positions.push({ row, col });
    }
  }
  for (let first = 0; first < positions.length; first += 1) {
    for (let second = first + 1; second < positions.length; second += 1) {
      if (findPath(board, positions[first], positions[second]).valid) return [positions[first], positions[second]];
    }
  }
  throw new Error("Expected a board with an available match");
}

function beginMatch(config = compactConfig): LocalMatchEngine {
  const match = new LocalMatchEngine(config);
  match.start();
  match.update(config.countdownDurationMs);
  return match;
}

describe("LocalMatchEngine", () => {
  it("creates independent boards and separate player state", () => {
    const match = new LocalMatchEngine(compactConfig);
    const state = match.getState();
    expect(state.mode).toBe("LOCAL_1V1");
    expect(state.players.P1.board).not.toBe(state.players.P2.board);
    expect(state.players.P1.board.tiles).not.toBe(state.players.P2.board.tiles);
    expect(state.players.P1.score).toBe(0);
    expect(state.players.P2.score).toBe(0);
    expect(state.players.P1.inputEnabled).toBe(false);
    expect(state.players.P1.board.tiles.flat().map(tile => tile?.type))
      .not.toEqual(state.players.P2.board.tiles.flat().map(tile => tile?.type));
  });

  it("rejects interaction with a frozen player and a blocked tile", () => {
    const match = beginMatch();
    match.getPlayer("P1").attackMeter = 100;
    expect(match.useAttack("P1", "FREEZE").accepted).toBe(true);
    expect(match.handleMatch("P2", ...findMove(match.getPlayer("P2").board))).toMatchObject({ accepted: false, reason: "PLAYER_FROZEN" });
    const blockedMatch = beginMatch();
    blockedMatch.getPlayer("P1").attackMeter = 100;
    expect(blockedMatch.useAttack("P1", "BLOCK").accepted).toBe(true);
    const blocked = blockedMatch.getPlayer("P2").statusEffects[0].blockedPositions![0];
    expect(blockedMatch.handleMatch("P2", blocked, { row: 1 - blocked.row, col: blocked.col })).toMatchObject({ accepted: false, reason: "BLOCKED_TILE" });
  });

  it("processes P1 and P2 matches in the same tick without state interference", () => {
    const match = beginMatch();
    const p1Move = findMove(match.getPlayer("P1").board);
    const p2Move = findMove(match.getPlayer("P2").board);
    const p1Result = match.handleMatch("P1", ...p1Move);
    const p2Result = match.handleMatch("P2", ...p2Move);

    expect(p1Result.accepted).toBe(true);
    expect(p2Result.accepted).toBe(true);
    expect(match.getPlayer("P1").score).toBe(100);
    expect(match.getPlayer("P2").score).toBe(100);
    expect(match.getPlayer("P1").combo).toBe(1);
    expect(match.getPlayer("P2").combo).toBe(1);
    expect(match.getPlayer("P1").attackMeter).toBe(10);
    expect(match.getPlayer("P2").attackMeter).toBe(10);
    expect(match.getPlayer("P1").remainingTiles).toBe(2);
    expect(match.getPlayer("P2").remainingTiles).toBe(2);
  });

  it("keeps pause from advancing the shared timer and restores play", () => {
    const match = beginMatch();
    match.pause();
    match.update(5000);
    expect(match.getState().status).toBe("PAUSED");
    expect(match.getState().timeRemaining).toBe(120);
    match.resume();
    match.update(1000);
    expect(match.getState().status).toBe("PLAYING");
    expect(match.getState().timeRemaining).toBe(119);
  });

  it("gives the opponent the finish grace period before awarding a clear win", () => {
    const match = beginMatch({ ...compactConfig, boardConfig: { rows: 1, cols: 2, tileTypes: 1 } });
    const [from, to] = findMove(match.getPlayer("P1").board);
    expect(match.handleMatch("P1", from, to).accepted).toBe(true);
    match.update(1499);
    expect(match.getState().status).toBe("PLAYING");
    match.update(1);
    expect(match.getState().status).toBe("FINISHED");
    expect(match.getState().winner).toBe("P1");
  });

  it("resolves an equal score and equal remaining board as a draw at time end", () => {
    const match = beginMatch({ ...compactConfig, durationSeconds: 1 });
    match.update(1000);
    expect(match.getState().status).toBe("FINISHED");
    expect(match.getState().winner).toBe("DRAW");
  });

  it("tracks combo and score independently for each player", () => {
    const match = beginMatch();
    const p1 = match.getPlayer("P1");
    const [p1a, p1b] = findMove(p1.board);
    match.handleMatch("P1", p1a, p1b);
    const p2 = match.getPlayer("P2");
    const [p2a, p2b] = findMove(p2.board);
    match.handleMatch("P2", p2a, p2b);
    expect(match.getPlayer("P1").combo).toBe(1);
    expect(match.getPlayer("P2").combo).toBe(1);
    match.update(2001);
    expect(match.getPlayer("P1").combo).toBe(0);
    expect(match.getPlayer("P2").combo).toBe(0);
    expect(match.getPlayer("P1").score).toBe(100);
    expect(match.getPlayer("P2").score).toBe(100);
  });
});