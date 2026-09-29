import type { Board } from "./Board.js";
import { ComboSystem, DEFAULT_COMBO_CONFIG, type ComboConfig } from "./ComboSystem.js";
import { validateMatch } from "./MatchValidator.js";
import type { FindPathResult } from "./PathFinder.js";
import { calculateScore, DEFAULT_SCORE_CONFIG, type ScoreConfig } from "./ScoreSystem.js";
import type { Position } from "./Tile.js";

export interface GameEngineConfig {
  score?: ScoreConfig;
  combo?: ComboConfig;
}

export type MatchAttemptResult =
  | { accepted: true; path: Extract<FindPathResult, { valid: true }>; scoreAwarded: number; combo: number; totalScore: number }
  | { accepted: false; reason: "INVALID_MATCH" };

export class GameEngine {
  readonly board: Board;
  private readonly scoreConfig: ScoreConfig;
  private readonly comboSystem: ComboSystem;
  private score = 0;

  constructor(board: Board, config: GameEngineConfig = {}) {
    this.board = board;
    this.scoreConfig = config.score ?? DEFAULT_SCORE_CONFIG;
    this.comboSystem = new ComboSystem(config.combo ?? DEFAULT_COMBO_CONFIG);
  }

  get totalScore(): number {
    return this.score;
  }

  get currentCombo(): number {
    return this.comboSystem.getCount();
  }

  attemptMatch(from: Position, to: Position, nowMs: number): MatchAttemptResult {
    const path = validateMatch(this.board, from, to);
    if (!path.valid) return { accepted: false, reason: "INVALID_MATCH" };

    const combo = this.comboSystem.recordMatch(nowMs);
    const scoreAwarded = calculateScore(combo, this.scoreConfig);
    this.board.tiles[from.row][from.col]!.alive = false;
    this.board.tiles[to.row][to.col]!.alive = false;
    this.board.tiles[from.row][from.col] = null;
    this.board.tiles[to.row][to.col] = null;
    this.score += scoreAwarded;

    return { accepted: true, path, scoreAwarded, combo, totalScore: this.score };
  }
}