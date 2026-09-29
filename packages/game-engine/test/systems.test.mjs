import assert from "node:assert/strict";
import test from "node:test";
import { createBoard } from "../dist/Board.js";
import { generateBoard } from "../dist/BoardGenerator.js";
import { ComboSystem } from "../dist/ComboSystem.js";
import { GameEngine } from "../dist/GameEngine.js";
import { calculateScore, DEFAULT_SCORE_CONFIG } from "../dist/ScoreSystem.js";

test("board generator creates unique positioned tiles in matching pairs", () => {
  const board = generateBoard({ rows: 2, cols: 4, tileTypes: 3 }, () => 0);
  const tiles = board.tiles.flat();
  assert.equal(tiles.length, 8);
  assert.equal(new Set(tiles.map(tile => tile.id)).size, 8);
  for (const type of new Set(tiles.map(tile => tile.type))) {
    assert.equal(tiles.filter(tile => tile.type === type).length % 2, 0);
  }
});

test("score uses configurable combo multipliers and caps at the final tier", () => {
  assert.equal(calculateScore(1), 100);
  assert.equal(calculateScore(2), 120);
  assert.equal(calculateScore(5), 250);
  assert.equal(calculateScore(9), 250);
  assert.equal(calculateScore(2, { ...DEFAULT_SCORE_CONFIG, speedMultiplier: 1.5 }), 180);
});

test("combo increments within its window and expires afterward", () => {
  const combo = new ComboSystem();
  assert.equal(combo.recordMatch(100), 1);
  assert.equal(combo.recordMatch(2100), 2);
  assert.equal(combo.getCount(4101), 0);
  assert.equal(combo.recordMatch(4101), 1);
});

test("engine validates matches, removes matched tiles, and owns score/combo", () => {
  const board = createBoard({ rows: 2, cols: 2, tileTypes: 2 }, [0, 0, 1, 1]);
  const engine = new GameEngine(board);
  const first = engine.attemptMatch({ row: 0, col: 0 }, { row: 0, col: 1 }, 0);
  assert.equal(first.accepted, true);
  if (!first.accepted) return;
  assert.equal(first.scoreAwarded, 100);
  assert.equal(first.totalScore, 100);
  assert.equal(engine.board.tiles[0][0], null);
  assert.deepEqual(engine.attemptMatch({ row: 0, col: 0 }, { row: 1, col: 1 }, 100), {
    accepted: false,
    reason: "INVALID_MATCH",
  });
});