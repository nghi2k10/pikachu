import {
  GameEngine,
  generateBoard,
  hasAvailableMoves,
  shuffleBoard,
  type BoardConfig,
  type MatchAttemptResult,
  type Position,
} from "@pikachu/game-engine";
import { AttackSystem, DEFAULT_ATTACK_CONFIG, type AttackConfig, type AttackResult } from "./AttackSystem.js";
import type { AttackType, LocalMatchState, LocalPlayer, PlayerId, Winner } from "./LocalMatchTypes.js";
import { OPPONENT } from "./LocalMatchTypes.js";
import { countTiles } from "../state/GameState.js";

export interface LocalMatchConfig {
  boardConfig: BoardConfig;
  durationSeconds: number;
  countdownDurationMs: number;
  finishGracePeriodMs: number;
  attackMeter: AttackMeterConfig;
  attack?: Partial<AttackConfig>;
  seed?: number;
}

export interface AttackMeterConfig {
  normalMatchGain: number;
  comboMatchGain: number;
}

export type LocalMatchResult =
  | { accepted: true; path: Extract<MatchAttemptResult, { accepted: true }>["path"]; scoreAwarded: number; score: number; combo: number; attackMeter: number }
  | { accepted: false; reason: "GAME_NOT_RUNNING" | "PLAYER_FROZEN" | "BLOCKED_TILE" | "INVALID_MATCH" };

export interface LocalMatchHooks {
  onMatch?: (playerId: PlayerId, from: Position, to: Position, result: Extract<LocalMatchResult, { accepted: true }>) => void;
  onInvalidMatch?: (playerId: PlayerId, from: Position, to: Position) => void;
  onBoardChanged?: (playerId: PlayerId) => void;
  onBoardShuffled?: (playerId: PlayerId) => void;
  onAttack?: (result: Extract<AttackResult, { accepted: true }>) => void;
  onGameEnd?: (winner: Winner) => void;
}

export const DEFAULT_LOCAL_MATCH_CONFIG: LocalMatchConfig = {
  boardConfig: { rows: 8, cols: 16, tileTypes: 36 },
  durationSeconds: 120,
  countdownDurationMs: 3500,
  finishGracePeriodMs: 1500,
  attackMeter: { normalMatchGain: 10, comboMatchGain: 15 },
};

export class LocalMatchEngine {
  private readonly engines: Record<PlayerId, GameEngine>;
  private readonly attackSystem: AttackSystem;
  private readonly listeners = new Set<() => void>();
  private hooks: LocalMatchHooks = {};
  private players: Record<PlayerId, LocalPlayer>;
  private snapshot: LocalMatchState;
  private statusBeforePause: "COUNTDOWN" | "PLAYING" = "PLAYING";
  private elapsedMs = 0;
  private countdownElapsedMs = 0;
  private lastTimePublish = -1;
  private clearedAt: Partial<Record<PlayerId, number>> = {};
  private winner: Winner = null;
  private readonly lastMatchAt: Partial<Record<PlayerId, number>> = {};

  constructor(private readonly config: LocalMatchConfig = DEFAULT_LOCAL_MATCH_CONFIG) {
    this.attackSystem = new AttackSystem(
      { ...DEFAULT_ATTACK_CONFIG, ...config.attack },
      undefined,
      createRandom(config.seed ?? randomSeed()),
    );
    const boards = createDistinctBoards(config.boardConfig, config.seed ?? randomSeed());
    this.engines = { P1: new GameEngine(boards.P1), P2: new GameEngine(boards.P2) };
    this.players = {
      P1: createPlayer("P1", boards.P1),
      P2: createPlayer("P2", boards.P2),
    };
    this.snapshot = {
      mode: "LOCAL_1V1",
      status: "LOBBY",
      players: this.players,
      timeRemaining: config.durationSeconds,
      timeRemainingMs: config.durationSeconds * 1000,
      countdownLabel: "",
      winner: null,
      debugEnabled: false,
      fps: 0,
    };
  }

  setHooks(hooks: LocalMatchHooks): void {
    this.hooks = hooks;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): LocalMatchState => this.snapshot;

  getPlayer(playerId: PlayerId): LocalPlayer {
    return this.snapshot.players[playerId];
  }

  canInteract(playerId: PlayerId, position?: Position): boolean {
    return this.snapshot.status === "PLAYING"
      && this.attackSystem.canInteract(this.players[playerId], this.elapsedMs, position);
  }

  setFps(fps: number): void {
    if (this.snapshot.debugEnabled) this.publish({ fps });
  }

  debugFillAttackMeter(playerId: PlayerId): void {
    if (!import.meta.env.DEV) return;
    this.players[playerId].attackMeter = 100;
    this.publish({ players: this.refreshPlayers() });
  }

  start(): void {
    if (this.snapshot.status !== "LOBBY") return;
    for (const playerId of PLAYER_IDS) {
      const player = this.players[playerId];
      if (player.remainingTiles > 0 && !hasAvailableMoves(player.board)) {
        player.board.tiles = shuffleBoard(player.board).tiles;
        this.hooks.onBoardChanged?.(playerId);
        this.hooks.onBoardShuffled?.(playerId);
      }
    }
    this.countdownElapsedMs = 0;
    this.publish({ status: "COUNTDOWN", countdownLabel: "3" });
  }

  pause(): void {
    if (this.snapshot.status !== "PLAYING" && this.snapshot.status !== "COUNTDOWN") return;
    this.statusBeforePause = this.snapshot.status;
    this.publish({ status: "PAUSED" });
  }

  resume(): void {
    if (this.snapshot.status !== "PAUSED") return;
    this.publish({ status: this.statusBeforePause });
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || this.snapshot.status === "PAUSED" || this.snapshot.status === "FINISHED" || this.snapshot.status === "LOBBY") return;

    if (this.snapshot.status === "COUNTDOWN") {
      this.countdownElapsedMs += deltaMs;
      if (this.countdownElapsedMs >= this.config.countdownDurationMs) {
        const overflow = this.countdownElapsedMs - this.config.countdownDurationMs;
        this.publish({ status: "PLAYING", countdownLabel: "" });
        this.update(overflow);
        return;
      }
      const countdownLabel = this.countdownElapsedMs < 1000 ? "3"
        : this.countdownElapsedMs < 2000 ? "2"
          : this.countdownElapsedMs < 3000 ? "1" : "GO!";
      if (countdownLabel !== this.snapshot.countdownLabel) this.publish({ countdownLabel });
      return;
    }

    this.elapsedMs += deltaMs;
    const effectChanged = this.attackSystem.update(Object.values(this.players), deltaMs, this.elapsedMs);
    const timeRemainingMs = Math.max(0, this.config.durationSeconds * 1000 - this.elapsedMs);
    const timeRemaining = Math.ceil(timeRemainingMs / 1000);
    let comboChanged = false;
    for (const playerId of PLAYER_IDS) {
      const matchedAt = this.lastMatchAt[playerId];
      if (matchedAt !== undefined && this.players[playerId].combo > 0 && this.elapsedMs - matchedAt > 2000) {
        this.players[playerId].combo = 0;
        comboChanged = true;
      }
    }
    if (effectChanged || comboChanged || timeRemaining !== this.snapshot.timeRemaining || this.lastTimePublish < 0) {
      this.lastTimePublish = timeRemaining;
      this.publish({ players: this.refreshPlayers(), timeRemaining, timeRemainingMs });
    }

    if (timeRemainingMs <= 0) {
      this.finishByScore();
      return;
    }

    const clearedPlayers = PLAYER_IDS.filter(playerId => this.players[playerId].remainingTiles === 0);
    if (clearedPlayers.length === 2) {
      this.finishByScore();
      return;
    }
    if (clearedPlayers.length === 1 && this.clearedAt[clearedPlayers[0]] !== undefined
      && this.elapsedMs - this.clearedAt[clearedPlayers[0]]! >= this.config.finishGracePeriodMs) {
      this.winner = clearedPlayers[0];
      this.finish();
    }
  }

  handleMatch(playerId: PlayerId, from: Position, to: Position): LocalMatchResult {
    if (this.snapshot.status !== "PLAYING") return { accepted: false, reason: "GAME_NOT_RUNNING" };
    const player = this.players[playerId];
    if (!this.attackSystem.canInteract(player, this.elapsedMs)) return { accepted: false, reason: "PLAYER_FROZEN" };
    if (!this.attackSystem.canInteract(player, this.elapsedMs, from) || !this.attackSystem.canInteract(player, this.elapsedMs, to)) {
      return { accepted: false, reason: "BLOCKED_TILE" };
    }

    const result = this.engines[playerId].attemptMatch(from, to, this.elapsedMs);
    if (!result.accepted) {
      this.hooks.onInvalidMatch?.(playerId, from, to);
      return { accepted: false, reason: "INVALID_MATCH" };
    }

    const meterGain = result.combo > 1
      ? this.config.attackMeter.comboMatchGain
      : this.config.attackMeter.normalMatchGain;
    player.score = result.totalScore;
    player.combo = result.combo;
    player.bestCombo = Math.max(player.bestCombo, result.combo);
    this.lastMatchAt[playerId] = this.elapsedMs;
    player.attackMeter = Math.min(100, player.attackMeter + meterGain);
    player.remainingTiles = countTiles(player.board);
    const matchResult: Extract<LocalMatchResult, { accepted: true }> = {
      accepted: true,
      path: result.path,
      scoreAwarded: result.scoreAwarded,
      score: result.totalScore,
      combo: result.combo,
      attackMeter: player.attackMeter,
    };

    if (player.remainingTiles === 0) this.clearedAt[playerId] = this.elapsedMs;
    let shuffled = false;
    if (player.remainingTiles > 0 && !hasAvailableMoves(player.board)) {
      player.board.tiles = shuffleBoard(player.board).tiles;
      shuffled = true;
    }
    this.hooks.onMatch?.(playerId, from, to, matchResult);
    this.hooks.onBoardChanged?.(playerId);
    this.publish({ players: this.refreshPlayers() });

    if (shuffled) this.hooks.onBoardShuffled?.(playerId);
    if (this.players.P1.remainingTiles === 0 && this.players.P2.remainingTiles === 0) this.finishByScore();
    return matchResult;
  }

  useAttack(playerId: PlayerId, attackType: AttackType): AttackResult {
    if (this.snapshot.status !== "PLAYING") return { accepted: false, reason: "ATTACK_NOT_READY" };
    const result = this.attackSystem.useAttack(
      this.players[playerId],
      this.players[OPPONENT[playerId]],
      attackType,
      this.elapsedMs,
    );
    if (!result.accepted) return result;
    this.players[playerId].attackMeter = 0;
    this.players[result.targetId].remainingTiles = countTiles(this.players[result.targetId].board);
    this.hooks.onAttack?.(result);
    this.hooks.onBoardChanged?.(result.targetId);
    if (attackType === "SHUFFLE") this.hooks.onBoardShuffled?.(result.targetId);
    this.publish({ players: this.refreshPlayers() });
    return result;
  }

  toggleDebug(): void {
    this.publish({ debugEnabled: !this.snapshot.debugEnabled });
  }

  private finishByScore(): void {
    const first = this.players.P1;
    const second = this.players.P2;
    if (first.score > second.score) this.winner = "P1";
    else if (second.score > first.score) this.winner = "P2";
    else if (first.remainingTiles < second.remainingTiles) this.winner = "P1";
    else if (second.remainingTiles < first.remainingTiles) this.winner = "P2";
    else this.winner = "DRAW";
    this.finish();
  }

  private finish(): void {
    if (this.snapshot.status === "FINISHED") return;
    this.publish({ status: "FINISHED", winner: this.winner, countdownLabel: "" });
    this.hooks.onGameEnd?.(this.winner);
  }

  private refreshPlayers(): Record<PlayerId, LocalPlayer> {
    this.players = {
      P1: { ...this.players.P1, statusEffects: [...this.players.P1.statusEffects] },
      P2: { ...this.players.P2, statusEffects: [...this.players.P2.statusEffects] },
    };
    for (const playerId of PLAYER_IDS) {
      this.players[playerId].inputEnabled = this.snapshot.status === "PLAYING"
        && !this.attackSystem.hasEffect(this.players[playerId], "FREEZE");
    }
    return this.players;
  }

  private publish(patch: Partial<LocalMatchState>): void {
    if (patch.status === "PLAYING") {
      this.players = {
        P1: { ...this.players.P1, inputEnabled: !this.attackSystem.hasEffect(this.players.P1, "FREEZE") },
        P2: { ...this.players.P2, inputEnabled: !this.attackSystem.hasEffect(this.players.P2, "FREEZE") },
      };
    } else if (patch.status) {
      this.players = { P1: { ...this.players.P1, inputEnabled: false }, P2: { ...this.players.P2, inputEnabled: false } };
    }
    const players = patch.players ?? this.players;
    this.snapshot = { ...this.snapshot, ...patch, players };
    this.listeners.forEach(listener => listener());
  }
}

const PLAYER_IDS: PlayerId[] = ["P1", "P2"];

function createPlayer(id: PlayerId, board: LocalPlayer["board"]): LocalPlayer {
  return {
    id,
    name: id === "P1" ? "PLAYER 1" : "PLAYER 2",
    board,
    score: 0,
    combo: 0,
    bestCombo: 0,
    attackMeter: 0,
    statusEffects: [],
    cooldownRemainingMs: 0,
    inputEnabled: false,
    connected: true,
    remainingTiles: countTiles(board),
  };
}

function createDistinctBoards(config: BoardConfig, seed: number): Record<PlayerId, LocalPlayer["board"]> {
  const first = generateBoard(config, createRandom(seed));
  const second = generateBoard(config, createRandom(seed ^ 0x9e3779b9));
  if (boardSignature(first) === boardSignature(second) && second.config.rows * second.config.cols > 1) {
    const tiles = second.tiles.flat().filter((tile): tile is NonNullable<typeof tile> => tile !== null);
    const firstTile = tiles.find(tile => tiles.some(other => other.type !== tile.type));
    const secondTile = firstTile && tiles.find(tile => tile.type !== firstTile.type);
    if (firstTile && secondTile) [firstTile.type, secondTile.type] = [secondTile.type, firstTile.type];
  }
  if (!hasAvailableMoves(first)) first.tiles = shuffleBoard(first, createRandom(seed + 17)).tiles;
  if (!hasAvailableMoves(second)) second.tiles = shuffleBoard(second, createRandom(seed + 31)).tiles;
  return { P1: first, P2: second };
}

function boardSignature(board: LocalPlayer["board"]): string {
  return board.tiles.flat().map(tile => tile?.type ?? "-").join(",");
}

function createRandom(seed: number): () => number {
  let value = seed >>> 0 || 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}