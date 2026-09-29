import { createBoard, type Board, type BoardConfig, validateBoardConfig } from "./Board.js";

export type RandomSource = () => number;

export function generateBoard(
  config: BoardConfig,
  random: RandomSource = Math.random,
): Board {
  validateBoardConfig(config);
  if ((config.rows * config.cols) % 2 !== 0) {
    throw new RangeError("Generated board capacity must be even so every tile has a pair");
  }
  const types: number[] = [];
  for (let index = 0; index < (config.rows * config.cols) / 2; index += 1) {
    const type = index % config.tileTypes;
    types.push(type, type);
  }

  for (let index = types.length - 1; index > 0; index -= 1) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("Random source must return a value in [0, 1)");
    }
    const swapIndex = Math.floor(value * (index + 1));
    [types[index], types[swapIndex]] = [types[swapIndex], types[index]];
  }

  return createBoard(config, types);
}