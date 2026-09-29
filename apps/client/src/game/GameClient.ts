import {
  GameEngine,
  getTileAt,
  hasAvailableMoves,
  shuffleBoard,
  type Board,
  type MatchAttemptResult,
  type Position,
} from "@pikachu/game-engine";
import { countTiles, GameState } from "../state/GameState.js";

export interface GameClientHooks {
  onTileSelected?: (position: Position | null) => void;
  onMatch?: (from: Position, to: Position, result: Extract<MatchAttemptResult, { accepted: true }>) => void;
  onInvalidMatch?: (from: Position, to: Position) => void;
  onBoardChanged?: (board: Board) => void;
  onBoardShuffled?: () => void;
  onGameEnd?: () => void;
}

const DEFAULT_GAME_DURATION_SECONDS = 120;
const COUNTDOWN_DURATION_MS = 3500;
const COMBO_WINDOW_MS = 2000;

export class GameClient {
  private hooks: GameClientHooks = {};
  private selected: Position | null = null;
  private countdownElapsed = 0;
  private playElapsed = 0;
  private lastMatchAt: number | null = null;
  private ended = false;

  constructor(
    readonly engine: GameEngine,
    readonly state: GameState,
    private readonly durationSeconds = DEFAULT_GAME_DURATION_SECONDS,
  ) {}

  setHooks(hooks: GameClientHooks): void {
    this.hooks = hooks;
  }

  start(): void {
    if (this.state.getSnapshot().status !== "READY") return;
    if (countTiles(this.engine.board) > 0 && !hasAvailableMoves(this.engine.board)) {
      this.engine.board.tiles = shuffleBoard(this.engine.board).tiles;
      this.hooks.onBoardChanged?.(this.engine.board);
      this.hooks.onBoardShuffled?.();
    }
    this.countdownElapsed = 0;
    this.state.update({ status: "COUNTDOWN", countdownLabel: "3", countdownElapsedMs: 0 });
  }

  selectTile(position: Position): void {
    if (this.state.getSnapshot().status !== "PLAYING" || !getTileAt(this.engine.board, position)) return;
    if (this.selected && samePosition(this.selected, position)) {
      this.clearSelection();
      return;
    }
    if (!this.selected) {
      this.selected = { ...position };
      this.hooks.onTileSelected?.(this.selected);
      this.state.update({ selectedTile: this.selected });
      return;
    }

    const from = this.selected;
    const to = { ...position };
    this.hooks.onTileSelected?.(to);
    this.tryMatch(from, to);
  }

  tryMatch(from: Position, to: Position): MatchAttemptResult | null {
    if (this.state.getSnapshot().status !== "PLAYING") return null;
    const result = this.engine.attemptMatch(from, to, this.playElapsed);
    if (!result.accepted) {
      this.hooks.onInvalidMatch?.(from, to);
      this.clearSelection();
      return result;
    }

    this.lastMatchAt = this.playElapsed;
    this.hooks.onMatch?.(from, to, result);
    const remainingTiles = countTiles(this.engine.board);
    let shuffled = false;
    if (remainingTiles > 0 && !hasAvailableMoves(this.engine.board)) {
      const shuffledBoard = shuffleBoard(this.engine.board);
      this.engine.board.tiles = shuffledBoard.tiles;
      shuffled = true;
    }

    this.clearSelection();
    this.state.update({ score: result.totalScore, combo: result.combo, remainingTiles, pathPointCount: result.path.points.length });
    this.hooks.onBoardChanged?.(this.engine.board);
    if (shuffled) this.hooks.onBoardShuffled?.();
    if (remainingTiles === 0) this.finish();
    return result;
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const status = this.state.getSnapshot().status;
    if (status === "COUNTDOWN") {
      this.countdownElapsed += deltaMs;
      if (this.countdownElapsed >= COUNTDOWN_DURATION_MS) {
        const overflow = this.countdownElapsed - COUNTDOWN_DURATION_MS;
        this.state.update({ status: "PLAYING", countdownLabel: "" });
        this.update(overflow);
        return;
      }
      const countdownLabel = this.countdownElapsed < 1000
        ? "3"
        : this.countdownElapsed < 2000
          ? "2"
          : this.countdownElapsed < 3000
            ? "1"
            : "GO!";
      if (countdownLabel !== this.state.getSnapshot().countdownLabel) this.state.update({ countdownLabel });
      if (this.state.getSnapshot().debugEnabled) {
        this.state.update({ countdownElapsedMs: Math.floor(this.countdownElapsed) });
      }
      return;
    }

    if (status !== "PLAYING") return;
    this.playElapsed += deltaMs;
    const timeRemaining = Math.max(0, Math.ceil((this.durationSeconds * 1000 - this.playElapsed) / 1000));
    const combo = this.lastMatchAt !== null && this.playElapsed - this.lastMatchAt > COMBO_WINDOW_MS
      ? 0
      : this.engine.currentCombo;
    if (timeRemaining !== this.state.getSnapshot().timeRemaining || combo !== this.state.getSnapshot().combo) {
      this.state.update({ timeRemaining, combo });
    }
    if (timeRemaining === 0) this.finish();
  }

  toggleDebug(): void {
    this.state.update({ debugEnabled: !this.state.getSnapshot().debugEnabled });
  }

  private clearSelection(): void {
    this.selected = null;
    this.hooks.onTileSelected?.(null);
    this.state.update({ selectedTile: null });
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    this.state.update({ status: "FINISHED", countdownLabel: "" });
    this.hooks.onGameEnd?.();
  }
}

function samePosition(first: Position, second: Position): boolean {
  return first.row === second.row && first.col === second.col;
}