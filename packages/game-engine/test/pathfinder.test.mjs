import assert from "node:assert/strict";
import test from "node:test";
import { createBoard } from "../dist/Board.js";
import { findPath } from "../dist/PathFinder.js";
import { hasAvailableMoves, shuffleBoard } from "../dist/ShuffleSystem.js";

const config = { rows: 3, cols: 3, tileTypes: 3 };
const position = (row, col) => ({ row, col });

test("finds a straight matching path", () => {
  const board = createBoard(config, [0, 0, 1, 2, 1, 2, 0, 1, 2]);
  const result = findPath(board, position(0, 0), position(0, 1));
  assert.equal(result.valid, true);
  assert.equal(result.turns, 0);
  assert.deepEqual(result.points, [position(0, 0), position(0, 1)]);
});

test("finds a one-turn path around a blocked direct line", () => {
  const board = createBoard(config, [0, 1, 2, null, 0, 2, 1, 2, 1]);
  const result = findPath(board, position(0, 0), position(1, 1));
  assert.equal(result.valid, true);
  assert.equal(result.turns, 1);
});

test("finds a two-turn path", () => {
  const board = createBoard(config, [0, null, 2, 1, null, 2, 2, null, 0]);
  const result = findPath(board, position(0, 0), position(2, 2));
  assert.equal(result.valid, true);
  assert.equal(result.turns, 2);
});

test("rejects a path that requires three turns", () => {
  const config = { rows: 5, cols: 5, tileTypes: 2 };
  const types = Array(25).fill(1);
  for (const [row, col] of [[1, 1], [1, 2], [1, 3], [2, 3], [2, 2], [3, 2]]) types[row * 5 + col] = 0;
  const board = createBoard(config, types);
  assert.deepEqual(findPath(board, position(1, 1), position(3, 2)), { valid: false });
});

test("rejects paths blocked by occupied tiles", () => {
  const board = createBoard(config, [0, 1, 1, 1, 1, 1, 1, 1, 0]);
  assert.deepEqual(findPath(board, position(0, 0), position(2, 2)), { valid: false });
});

test("rejects different types and selecting the same tile", () => {
  const board = createBoard(config, [0, 1, 2, 1, 2, 0, 2, 0, 1]);
  assert.deepEqual(findPath(board, position(0, 0), position(0, 1)), { valid: false });
  assert.deepEqual(findPath(board, position(0, 0), position(0, 0)), { valid: false });
});

test("supports paths through the empty outer border", () => {
  const board = createBoard(config, [1, 2, 1, 2, 2, 2, 2, 2, 2]);
  const result = findPath(board, position(0, 0), position(0, 2));
  assert.equal(result.valid, true);
  assert.equal(result.turns, 2);
  assert.ok(result.points.some(point => point.row === -1 || point.col === -1));
});

test("detects deadlocks and shuffle preserves live tile pairs", () => {
  const board = createBoard(config, [0, 1, 2, 1, 2, 0, 2, 0, 1]);
  assert.equal(hasAvailableMoves(board), false);
  const shuffled = shuffleBoard(board, () => 0.5, 0);
  assert.equal(hasAvailableMoves(shuffled), true);
  assert.deepEqual(
    shuffled.tiles.flat().map(tile => tile.type).sort(),
    board.tiles.flat().map(tile => tile.type).sort(),
  );
});