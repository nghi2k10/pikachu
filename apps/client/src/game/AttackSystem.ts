import { getTileAt, hasAvailableMoves, shuffleBoard, type Position } from "@pikachu/game-engine";
import type { AttackType, LocalPlayer, PlayerId, StatusEffect } from "./LocalMatchTypes.js";
import { OPPONENT } from "./LocalMatchTypes.js";
import { StatusEffectSystem } from "./StatusEffectSystem.js";

export interface AttackConfig {
  meterRequired: number;
  cooldownMs: number;
  freezeDurationMs: number;
  blockDurationMs: number;
  blockedTileCount: number;
  addTileCount: number;
  maximumBoardTiles: number;
}

export const DEFAULT_ATTACK_CONFIG: AttackConfig = {
  meterRequired: 100,
  cooldownMs: 3000,
  freezeDurationMs: 2000,
  blockDurationMs: 3000,
  blockedTileCount: 4,
  addTileCount: 4,
  maximumBoardTiles: 128,
};

export type AttackResult =
  | { accepted: true; type: AttackType; attackerId: PlayerId; targetId: PlayerId; affectedTiles: number }
  | { accepted: false; reason: "INVALID_ATTACK" | "ATTACK_NOT_READY" | "ATTACK_COOLDOWN" | "PLAYER_FROZEN" | "INVALID_TARGET" };

export class AttackSystem {
  private nextEffectId = 1;
  private readonly effects: StatusEffectSystem;

  constructor(
    private readonly config: AttackConfig = DEFAULT_ATTACK_CONFIG,
    effects = new StatusEffectSystem(),
    private readonly random: () => number = Math.random,
  ) {
    this.effects = effects;
  }

  canAttack(player: LocalPlayer, nowMs: number): boolean {
    return player.inputEnabled
      && player.attackMeter >= this.config.meterRequired
      && player.cooldownRemainingMs <= 0
      && this.effects.canInteract(player, nowMs);
  }

  useAttack(
    attacker: LocalPlayer,
    target: LocalPlayer,
    type: AttackType,
    nowMs: number,
  ): AttackResult {
    if (!isAttackType(type)) return { accepted: false, reason: "INVALID_ATTACK" };
    if (OPPONENT[attacker.id] !== target.id) return { accepted: false, reason: "INVALID_TARGET" };
    if (this.effects.hasEffect(attacker, "FREEZE")) return { accepted: false, reason: "PLAYER_FROZEN" };
    if (attacker.cooldownRemainingMs > 0) return { accepted: false, reason: "ATTACK_COOLDOWN" };
    if (attacker.attackMeter < this.config.meterRequired || !attacker.inputEnabled) {
      return { accepted: false, reason: "ATTACK_NOT_READY" };
    }

    let affectedTiles = 0;
    if (type === "FREEZE") {
      this.effects.addEffect(target, this.effects.createEffect(
        this.createId(), "FREEZE", nowMs, this.config.freezeDurationMs, attacker.id,
      ));
    } else if (type === "SHUFFLE") {
      target.board.tiles = shuffleBoard(target.board, this.random).tiles;
      affectedTiles = countTiles(target);
    } else if (type === "BLOCK") {
      const blockedPositions = choosePositions(target, this.config.blockedTileCount, this.random);
      if (blockedPositions.length > 0) {
        this.effects.addEffect(target, this.effects.createEffect(
          this.createId(), "BLOCK", nowMs, this.config.blockDurationMs, attacker.id, blockedPositions,
        ));
      }
      affectedTiles = blockedPositions.length;
    } else {
      affectedTiles = this.addTiles(target, this.config.addTileCount);
    }

    target.remainingTiles = countTiles(target);
    attacker.attackMeter = 0;
    attacker.cooldownRemainingMs = this.config.cooldownMs;
    return { accepted: true, type, attackerId: attacker.id, targetId: target.id, affectedTiles };
  }

  update(players: LocalPlayer[], deltaMs: number, nowMs: number): boolean {
    let changed = false;
    for (const player of players) {
      const previousCooldownBucket = Math.ceil(player.cooldownRemainingMs / 100);
      const nextCooldown = Math.max(0, player.cooldownRemainingMs - deltaMs);
      player.cooldownRemainingMs = nextCooldown;
      if (Math.ceil(nextCooldown / 100) !== previousCooldownBucket) changed = true;
      if (this.effects.expireEffects(player, nowMs)) changed = true;
    }
    return changed;
  }

  canInteract(player: LocalPlayer, nowMs: number, position?: Position): boolean {
    return this.effects.canInteract(player, nowMs, position);
  }

  hasEffect(player: LocalPlayer, type: StatusEffect["type"]): boolean {
    return this.effects.hasEffect(player, type);
  }

  getRemainingDuration(player: LocalPlayer, type: StatusEffect["type"], nowMs: number): number {
    return this.effects.getRemainingDuration(player, type, nowMs);
  }

  private addTiles(player: LocalPlayer, requested: number): number {
    const empty: Position[] = [];
    for (let row = 0; row < player.board.config.rows; row += 1) {
      for (let col = 0; col < player.board.config.cols; col += 1) {
        if (!getTileAt(player.board, { row, col })) empty.push({ row, col });
      }
    }
    const capacity = Math.max(0, this.config.maximumBoardTiles - countTiles(player));
    const tileCount = Math.min(requested, empty.length, capacity);
    const evenTileCount = tileCount - tileCount % 2;
    for (let index = 0; index < evenTileCount; index += 2) {
      const type = randomIndex(this.random, player.board.config.tileTypes);
      for (let offset = 0; offset < 2; offset += 1) {
        const position = empty[index + offset];
        player.board.tiles[position.row][position.col] = {
          id: `added-${player.id}-${this.nextEffectId++}`,
          type,
          row: position.row,
          col: position.col,
          alive: true,
        };
      }
    }
    if (evenTileCount > 0 && !hasAvailableMoves(player.board)) {
      player.board.tiles = shuffleBoard(player.board, this.random).tiles;
    }
    return evenTileCount;
  }

  private createId(): string {
    return `status-${this.nextEffectId++}`;
  }
}

function choosePositions(player: LocalPlayer, count: number, random: () => number): Position[] {
  const positions: Position[] = [];
  for (let row = 0; row < player.board.config.rows; row += 1) {
    for (let col = 0; col < player.board.config.cols; col += 1) {
      const position = { row, col };
      if (getTileAt(player.board, position)) positions.push(position);
    }
  }
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(random, index + 1);
    [positions[index], positions[swapIndex]] = [positions[swapIndex], positions[index]];
  }
  return positions.slice(0, Math.min(count, positions.length));
}

function randomIndex(random: () => number, length: number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError("Random source must return a value in [0, 1)");
  return Math.floor(value * length);
}

function countTiles(player: LocalPlayer): number {
  return player.board.tiles.reduce((total, row) => total + row.filter(tile => tile?.alive).length, 0);
}

function isAttackType(type: string): type is AttackType {
  return type === "FREEZE" || type === "SHUFFLE" || type === "BLOCK" || type === "ADD_TILES";
}