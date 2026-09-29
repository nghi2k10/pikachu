import { getTileAt, type Position } from "@pikachu/game-engine";
import type { LocalMatchEngine, LocalMatchResult } from "./LocalMatchEngine.js";
import { ATTACK_KEY_TYPES, DEFAULT_PLAYER_CONTROLS, type PlayerControls } from "./PlayerControls.js";
import type { AttackType, PlayerId } from "./LocalMatchTypes.js";

export interface DuelInputHooks {
  onCursorChanged?: (playerId: PlayerId, position: Position) => void;
  onSelectionChanged?: (playerId: PlayerId, position: Position | null) => void;
  onMatchAttempt?: (playerId: PlayerId, result: LocalMatchResult) => void;
  onAttackAttempt?: (playerId: PlayerId, attackType: AttackType) => void;
  onPauseChanged?: (paused: boolean) => void;
}

export class DuelInputManager {
  private readonly cursor: Record<PlayerId, Position>;
  private readonly selected: Record<PlayerId, Position | null> = { P1: null, P2: null };
  private hooks: DuelInputHooks;
  private readonly controls: Record<PlayerId, PlayerControls>;
  private paused = false;

  constructor(
    private readonly match: LocalMatchEngine,
    hooks: DuelInputHooks = {},
    controls: Record<PlayerId, PlayerControls> = DEFAULT_PLAYER_CONTROLS,
    private readonly target: Window | null = typeof window === "undefined" ? null : window,
  ) {
    this.hooks = hooks;
    this.controls = controls;
    this.cursor = { P1: firstLiveTile(match, "P1"), P2: firstLiveTile(match, "P2") };
    this.target?.addEventListener("keydown", this.onKeyDown);
    this.target?.addEventListener("keyup", this.onKeyUp);
  }

  setHooks(hooks: DuelInputHooks): void {
    this.hooks = hooks;
  }

  getCursor(playerId: PlayerId): Position {
    return { ...this.cursor[playerId] };
  }

  getSelection(playerId: PlayerId): Position | null {
    const selection = this.selected[playerId];
    return selection ? { ...selection } : null;
  }

  handleKeyCode(code: string, repeat = false): boolean {
    if (code === "F2" && !repeat) {
      this.match.toggleDebug();
      return true;
    }
    if (code === "KeyP" && !repeat) {
      this.togglePause();
      return true;
    }
    if (code === "Enter" && this.match.getState().status === "LOBBY") {
      this.match.start();
      return true;
    }
    if (import.meta.env.DEV && !repeat && (code === "F3" || code === "F4")) {
      this.match.debugFillAttackMeter(code === "F3" ? "P1" : "P2");
      return true;
    }

    for (const playerId of PLAYER_IDS) {
      const controls = this.controls[playerId];
      const delta = getMovement(code, controls);
      if (delta) {
        if (this.match.getState().status !== "PAUSED") this.moveCursor(playerId, delta.row, delta.col);
        return true;
      }
      if (controls.select.includes(code)) {
        if (!repeat) this.selectAtCursor(playerId);
        return true;
      }
      const attackIndex = ATTACK_CONTROL_KEYS.findIndex(key => controls[key].includes(code));
      if (attackIndex >= 0) {
        if (!repeat && this.match.getState().status === "PLAYING") {
          const attackType = ATTACK_KEY_TYPES[attackIndex];
          this.hooks.onAttackAttempt?.(playerId, attackType);
          this.match.useAttack(playerId, attackType);
        }
        return true;
      }
    }
    return false;
  }

  selectAtCursor(playerId: PlayerId): LocalMatchResult | null {
    return this.selectTile(playerId, this.cursor[playerId]);
  }

  selectTile(playerId: PlayerId, position: Position): LocalMatchResult | null {
    if (this.match.getState().status !== "PLAYING") return null;
    const player = this.match.getPlayer(playerId);
    if (!player.inputEnabled || !this.match.canInteract(playerId, position)) return null;
    this.cursor[playerId] = { ...position };
    this.hooks.onCursorChanged?.(playerId, this.cursor[playerId]);

    const previous = this.selected[playerId];
    if (!previous) {
      this.selected[playerId] = { ...position };
      this.hooks.onSelectionChanged?.(playerId, this.selected[playerId]);
      return null;
    }
    if (samePosition(previous, position)) {
      this.selected[playerId] = null;
      this.hooks.onSelectionChanged?.(playerId, null);
      return null;
    }

    const result = this.match.handleMatch(playerId, previous, position);
    this.selected[playerId] = null;
    this.hooks.onSelectionChanged?.(playerId, null);
    this.hooks.onMatchAttempt?.(playerId, result);
    if (!this.match.getPlayer(playerId).board.tiles[this.cursor[playerId].row]?.[this.cursor[playerId].col]) {
      this.cursor[playerId] = firstLiveTile(this.match, playerId);
      this.hooks.onCursorChanged?.(playerId, this.cursor[playerId]);
    }
    return result;
  }

  clearSelection(playerId: PlayerId): void {
    if (!this.selected[playerId]) return;
    this.selected[playerId] = null;
    this.hooks.onSelectionChanged?.(playerId, null);
  }

  syncState(): void {
    for (const playerId of PLAYER_IDS) {
      const player = this.match.getPlayer(playerId);
      if (!player.inputEnabled) this.clearSelection(playerId);
      const current = player.board.tiles[this.cursor[playerId].row]?.[this.cursor[playerId].col];
      if (!current?.alive) {
        this.cursor[playerId] = firstLiveTile(this.match, playerId);
        this.hooks.onCursorChanged?.(playerId, this.cursor[playerId]);
      }
    }
  }

  destroy(): void {
    this.target?.removeEventListener("keydown", this.onKeyDown);
    this.target?.removeEventListener("keyup", this.onKeyUp);
  }

  private moveCursor(playerId: PlayerId, rowDelta: number, colDelta: number): void {
    if (!this.match.getPlayer(playerId).inputEnabled) return;
    const board = this.match.getPlayer(playerId).board;
    let row = this.cursor[playerId].row;
    let col = this.cursor[playerId].col;
    for (let attempt = 0; attempt < Math.max(board.config.rows, board.config.cols); attempt += 1) {
      row = Math.max(0, Math.min(board.config.rows - 1, row + rowDelta));
      col = Math.max(0, Math.min(board.config.cols - 1, col + colDelta));
      const position = { row, col };
      if (getTileAt(board, position) && this.match.canInteract(playerId, position)) {
        this.cursor[playerId] = { row, col };
        this.hooks.onCursorChanged?.(playerId, this.cursor[playerId]);
        return;
      }
      if ((rowDelta < 0 && row === 0) || (rowDelta > 0 && row === board.config.rows - 1)
        || (colDelta < 0 && col === 0) || (colDelta > 0 && col === board.config.cols - 1)) return;
    }
  }

  private togglePause(): void {
    if (this.match.getState().status === "PLAYING" || this.match.getState().status === "COUNTDOWN") {
      this.match.pause();
      this.paused = true;
    } else if (this.match.getState().status === "PAUSED") {
      this.match.resume();
      this.paused = false;
    } else return;
    this.syncState();
    this.hooks.onPauseChanged?.(this.paused);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.handleKeyCode(event.code, event.repeat)) event.preventDefault();
  };

  private readonly onKeyUp = (_event: KeyboardEvent): void => {};
}

const PLAYER_IDS: PlayerId[] = ["P1", "P2"];
const ATTACK_CONTROL_KEYS = ["attack1", "attack2", "attack3", "attack4"] as const;

function getMovement(code: string, controls: PlayerControls): Position | null {
  if (controls.up.includes(code)) return { row: -1, col: 0 };
  if (controls.down.includes(code)) return { row: 1, col: 0 };
  if (controls.left.includes(code)) return { row: 0, col: -1 };
  if (controls.right.includes(code)) return { row: 0, col: 1 };
  return null;
}

function firstLiveTile(match: LocalMatchEngine, playerId: PlayerId): Position {
  const board = match.getPlayer(playerId).board;
  for (let row = 0; row < board.config.rows; row += 1) {
    for (let col = 0; col < board.config.cols; col += 1) {
      if (board.tiles[row][col]?.alive) return { row, col };
    }
  }
  return { row: 0, col: 0 };
}

function samePosition(first: Position, second: Position): boolean {
  return first.row === second.row && first.col === second.col;
}