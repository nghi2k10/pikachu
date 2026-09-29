import { getTileAt, type Board } from "./Board.js";
import { findPath } from "./PathFinder.js";
import type { Position } from "./Tile.js";
import type { RandomSource } from "./BoardGenerator.js";

export function hasAvailableMoves(board: Board): boolean {
  const positions: Position[] = [];
  for (let row = 0; row < board.config.rows; row += 1) {
    for (let col = 0; col < board.config.cols; col += 1) {
      if (getTileAt(board, { row, col })) positions.push({ row, col });
    }
  }

  for (let first = 0; first < positions.length; first += 1) {
    for (let second = first + 1; second < positions.length; second += 1) {
      const path = findPath(board, positions[first], positions[second]);
      if (path.valid) return true;
    }
  }
  return false;
}

export function shuffleBoard(board: Board, random: RandomSource = Math.random, maxAttempts = 20): Board {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 0) throw new RangeError("maxAttempts must be a non-negative integer");
  const positions = getAlivePositions(board);
  if (positions.length < 2) return cloneBoard(board);

  const types = positions.map(position => getTileAt(board, position)!.type);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const shuffledTypes = [...types];
    shuffle(shuffledTypes, random);
    const candidate = withTypes(board, positions, shuffledTypes);
    if (hasAvailableMoves(candidate)) return candidate;
  }

  return forceAdjacentPair(board, positions, types);
}

function forceAdjacentPair(board: Board, positions: Position[], types: number[]): Board {
  const pairTypeIndex = types.findIndex((type, index) => types.indexOf(type) !== index);
  if (pairTypeIndex < 0) return withTypes(board, positions, types);
  const firstTypeIndex = types.indexOf(types[pairTypeIndex]);
  const adjacent = findAdjacentPositions(board, positions);
  if (!adjacent) return withTypes(board, positions, types);

  const firstDestination = positions.findIndex(position => samePosition(position, adjacent[0]));
  const secondDestination = positions.findIndex(position => samePosition(position, adjacent[1]));
  const adjustedTypes = types.filter((_, index) => index !== firstTypeIndex && index !== pairTypeIndex);
  adjustedTypes.splice(Math.min(firstDestination, secondDestination), 0, types[firstTypeIndex]);
  adjustedTypes.splice(Math.max(firstDestination, secondDestination), 0, types[firstTypeIndex]);
  return withTypes(board, positions, adjustedTypes);
}

function findAdjacentPositions(board: Board, positions: Position[]): [Position, Position] | null {
  for (let first = 0; first < positions.length; first += 1) {
    for (let second = first + 1; second < positions.length; second += 1) {
      const distance = Math.abs(positions[first].row - positions[second].row)
        + Math.abs(positions[first].col - positions[second].col);
      if (distance === 1 && getTileAt(board, positions[first]) && getTileAt(board, positions[second])) {
        return [positions[first], positions[second]];
      }
    }
  }
  return null;
}

function getAlivePositions(board: Board): Position[] {
  const positions: Position[] = [];
  for (let row = 0; row < board.config.rows; row += 1) {
    for (let col = 0; col < board.config.cols; col += 1) {
      if (getTileAt(board, { row, col })) positions.push({ row, col });
    }
  }
  return positions;
}

function withTypes(board: Board, positions: Position[], types: number[]): Board {
  const tiles = board.tiles.map(row => row.map(tile => tile ? { ...tile } : null));
  positions.forEach((position, index) => {
    tiles[position.row][position.col]!.type = types[index];
  });
  return { config: { ...board.config }, tiles };
}

function cloneBoard(board: Board): Board {
  return withTypes(board, [], []);
}

function shuffle<T>(values: T[], random: RandomSource): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("Random source must return a value in [0, 1)");
    }
    const swapIndex = Math.floor(value * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

function samePosition(first: Position, second: Position): boolean {
  return first.row === second.row && first.col === second.col;
}