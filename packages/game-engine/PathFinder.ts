import { getTileAt, type Board } from "./Board.js";
import type { Position } from "./Tile.js";

export interface PathResult {
  valid: true;
  points: Position[];
  turns: number;
}

export interface InvalidPathResult {
  valid: false;
}

export type FindPathResult = PathResult | InvalidPathResult;

interface SearchState extends Position {
  direction: number;
  turns: number;
  previous: number;
}

const DIRECTIONS: readonly Position[] = [
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
];

export function findPath(board: Board, from: Position, to: Position): FindPathResult {
  const start = getTileAt(board, from);
  const target = getTileAt(board, to);
  if (!start || !target || (from.row === to.row && from.col === to.col) || start.type !== target.type) {
    return { valid: false };
  }

  const states: SearchState[] = [];
  const queue: number[] = [];
  const visited = new Set<string>();
  const minRow = -1;
  const maxRow = board.config.rows;
  const minCol = -1;
  const maxCol = board.config.cols;

  const enqueue = (row: number, col: number, direction: number, turns: number, previous: number): void => {
    const key = `${row},${col},${direction},${turns}`;
    if (visited.has(key)) return;
    visited.add(key);
    states.push({ row, col, direction, turns, previous });
    queue.push(states.length - 1);
  };

  for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
    const next = step(from, direction);
    if (!isTraversable(board, next, from, to, minRow, maxRow, minCol, maxCol)) continue;
    if (samePosition(next, to)) return { valid: true, points: [{ ...from }, { ...to }], turns: 0 };
    enqueue(next.row, next.col, direction, 0, -1);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const stateIndex = queue[head];
    const state = states[stateIndex];
    for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
      const turns = state.turns + (state.direction === direction ? 0 : 1);
      if (turns > 2) continue;

      const next = step(state, direction);
      if (!isTraversable(board, next, from, to, minRow, maxRow, minCol, maxCol)) continue;
      if (samePosition(next, to)) {
        const points = [{ ...from }, ...reconstructPath(states, stateIndex), { ...to }];
        return { valid: true, points, turns };
      }
      enqueue(next.row, next.col, direction, turns, stateIndex);
    }
  }

  return { valid: false };
}

function isTraversable(
  board: Board,
  position: Position,
  from: Position,
  to: Position,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number,
): boolean {
  if (position.row < minRow || position.row > maxRow || position.col < minCol || position.col > maxCol) return false;
  if (samePosition(position, from) || samePosition(position, to)) return true;
  if (position.row < 0 || position.row >= board.config.rows || position.col < 0 || position.col >= board.config.cols) return true;
  return getTileAt(board, position) === null;
}

function step(position: Position, direction: number): Position {
  const offset = DIRECTIONS[direction];
  return { row: position.row + offset.row, col: position.col + offset.col };
}

function samePosition(first: Position, second: Position): boolean {
  return first.row === second.row && first.col === second.col;
}

function reconstructPath(states: readonly SearchState[], stateIndex: number): Position[] {
  const points: Position[] = [];
  let current = stateIndex;
  while (current >= 0) {
    const state = states[current];
    points.push({ row: state.row, col: state.col });
    current = state.previous;
  }
  points.reverse();
  return points;
}