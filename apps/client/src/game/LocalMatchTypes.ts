import type { Board, Position } from "@pikachu/game-engine";

export type PlayerId = "P1" | "P2";
export type GameMode = "LOCAL_1V1";
export type AttackType = "FREEZE" | "SHUFFLE" | "BLOCK" | "ADD_TILES";
export type LocalMatchStatus = "LOBBY" | "COUNTDOWN" | "PLAYING" | "PAUSED" | "FINISHED";
export type Winner = PlayerId | "DRAW" | null;

export interface StatusEffect {
  id: string;
  type: "FREEZE" | "BLOCK";
  startedAt: number;
  duration: number;
  sourcePlayerId: PlayerId;
  blockedPositions?: Position[];
}

export interface LocalPlayer {
  id: PlayerId;
  name: string;
  board: Board;
  score: number;
  combo: number;
  bestCombo: number;
  attackMeter: number;
  statusEffects: StatusEffect[];
  cooldownRemainingMs: number;
  inputEnabled: boolean;
  connected: boolean;
  remainingTiles: number;
}

export interface LocalMatchState {
  mode: GameMode;
  status: LocalMatchStatus;
  players: Record<PlayerId, LocalPlayer>;
  timeRemaining: number;
  timeRemainingMs: number;
  countdownLabel: string;
  winner: Winner;
  debugEnabled: boolean;
  fps: number;
}

export interface PlayerTheme {
  primary: number;
  secondary: number;
  accent: number;
}

export const PLAYER_THEMES: Record<PlayerId, PlayerTheme> = {
  P1: { primary: 0x238f80, secondary: 0x155c54, accent: 0xe8b943 },
  P2: { primary: 0xe76f51, secondary: 0x9c3e36, accent: 0xf2bf62 },
};

export const OPPONENT: Record<PlayerId, PlayerId> = { P1: "P2", P2: "P1" };