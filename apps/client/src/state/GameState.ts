import type { Board, Position } from "@pikachu/game-engine";

export type GameStatus = "READY" | "COUNTDOWN" | "PLAYING" | "PAUSED" | "FINISHED";

export interface ClientGameState {
  status: GameStatus;
  score: number;
  combo: number;
  attackMeter: number;
  remainingTiles: number;
  timeRemaining: number;
  countdownLabel: string;
  countdownElapsedMs: number;
  selectedTile: Position | null;
  boardRows: number;
  boardCols: number;
  fps: number;
  pathPointCount: number;
  debugEnabled: boolean;
}

export class GameState {
  private snapshot: ClientGameState;
  private readonly listeners = new Set<() => void>();

  constructor(board: Board, durationSeconds: number) {
    this.snapshot = {
      status: "READY",
      score: 0,
      combo: 0,
      attackMeter: 0,
      remainingTiles: countTiles(board),
      timeRemaining: durationSeconds,
      countdownLabel: "",
      countdownElapsedMs: 0,
      selectedTile: null,
      boardRows: board.config.rows,
      boardCols: board.config.cols,
      fps: 0,
      pathPointCount: 0,
      debugEnabled: false,
    };
  }

  getSnapshot = (): ClientGameState => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update(patch: Partial<ClientGameState>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
}

export function countTiles(board: Board): number {
  let remaining = 0;
  for (const row of board.tiles) {
    for (const tile of row) if (tile?.alive) remaining += 1;
  }
  return remaining;
}