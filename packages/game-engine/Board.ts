import type { Position, Tile } from "./Tile.js";

export interface BoardConfig {
  rows: number;
  cols: number;
  tileTypes: number;
}

export interface Board {
  config: BoardConfig;
  tiles: (Tile | null)[][];
}

export function isInsideBoard(board: Board, position: Position): boolean {
  return Number.isInteger(position.row)
    && Number.isInteger(position.col)
    && position.row >= 0
    && position.row < board.config.rows
    && position.col >= 0
    && position.col < board.config.cols;
}

export function getTileAt(board: Board, position: Position): Tile | null {
  if (!isInsideBoard(board, position)) return null;
  const tile = board.tiles[position.row][position.col];
  return tile?.alive ? tile : null;
}

export function createBoard(config: BoardConfig, types: readonly (number | null)[]): Board {
  validateBoardConfig(config);
  if (types.length !== config.rows * config.cols) {
    throw new RangeError("Tile type count must equal board capacity");
  }

  const tiles: (Tile | null)[][] = [];
  for (let row = 0; row < config.rows; row += 1) {
    const tileRow: (Tile | null)[] = [];
    for (let col = 0; col < config.cols; col += 1) {
      const index = row * config.cols + col;
      const type = types[index];
      if (type === null) {
        tileRow.push(null);
        continue;
      }
      if (!Number.isSafeInteger(type) || type < 0 || type >= config.tileTypes) {
        throw new RangeError(`Invalid tile type at index ${index}`);
      }
      tileRow.push({ id: `tile-${index}`, type, row, col, alive: true });
    }
    tiles.push(tileRow);
  }

  return { config: { ...config }, tiles };
}

export function validateBoardConfig(config: BoardConfig): void {
  if (!Number.isSafeInteger(config.rows) || config.rows <= 0) {
    throw new RangeError("Board rows must be a positive integer");
  }
  if (!Number.isSafeInteger(config.cols) || config.cols <= 0) {
    throw new RangeError("Board columns must be a positive integer");
  }
  if (!Number.isSafeInteger(config.tileTypes) || config.tileTypes <= 0) {
    throw new RangeError("Tile type count must be a positive integer");
  }
}