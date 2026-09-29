import type { Board } from "./Board.js";
import { findPath, type FindPathResult } from "./PathFinder.js";
import type { Position } from "./Tile.js";

export function validateMatch(board: Board, from: Position, to: Position): FindPathResult {
  return findPath(board, from, to);
}