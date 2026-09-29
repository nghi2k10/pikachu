import { describe, expect, it } from "vitest";
import { createBoard, hasAvailableMoves } from "@pikachu/game-engine";
import { AttackSystem, DEFAULT_ATTACK_CONFIG } from "./AttackSystem.js";
import type { LocalPlayer, PlayerId } from "./LocalMatchTypes.js";

function player(id: PlayerId, boardTypes = [0, 0, 1, 1]): LocalPlayer {
  const tileTypes = Math.max(4, ...boardTypes) + 1;
  const board = createBoard({ rows: 2, cols: boardTypes.length / 2, tileTypes }, boardTypes);
  return {
    id,
    name: id,
    board,
    score: 0,
    combo: 0,
    bestCombo: 0,
    attackMeter: 100,
    statusEffects: [],
    cooldownRemainingMs: 0,
    inputEnabled: true,
    connected: true,
    remainingTiles: boardTypes.length,
  };
}

describe("AttackSystem", () => {
  it("applies FREEZE only to the opponent and expires it independently", () => {
    const attacks = new AttackSystem(DEFAULT_ATTACK_CONFIG, undefined, () => 0);
    const attacker = player("P1");
    const target = player("P2");
    const result = attacks.useAttack(attacker, target, "FREEZE", 0);
    expect(result.accepted).toBe(true);
    expect(attacks.canInteract(target, 0)).toBe(false);
    expect(attacks.canInteract(attacker, 0)).toBe(true);
    expect(attacks.getRemainingDuration(target, "FREEZE", 500)).toBe(1500);
    attacks.update([attacker, target], 2000, 2000);
    expect(attacks.hasEffect(target, "FREEZE")).toBe(false);
    expect(target.statusEffects).toHaveLength(0);
    expect(attacker.cooldownRemainingMs).toBe(1000);
  });

  it("blocks a limited set of target cells and lets the effect expire", () => {
    const attacks = new AttackSystem(DEFAULT_ATTACK_CONFIG, undefined, () => 0);
    const attacker = player("P1");
    const target = player("P2");
    attacks.useAttack(attacker, target, "BLOCK", 0);
    const blocked = target.statusEffects[0].blockedPositions ?? [];
    expect(blocked).toHaveLength(4);
    expect(attacks.canInteract(target, 1, blocked[0])).toBe(false);
    attacks.update([target], 3000, 3000);
    expect(attacks.canInteract(target, 3000, blocked[0])).toBe(true);
  });

  it("keeps BLOCK active after an overlapping FREEZE expires", () => {
    const attacks = new AttackSystem(DEFAULT_ATTACK_CONFIG, undefined, () => 0);
    const attacker = player("P1");
    const target = player("P2");
    attacks.useAttack(attacker, target, "FREEZE", 0);
    attacker.cooldownRemainingMs = 0;
    attacker.attackMeter = 100;
    attacks.useAttack(attacker, target, "BLOCK", 0);
    const blocked = target.statusEffects.find(effect => effect.type === "BLOCK")!.blockedPositions![0];
    attacks.update([target], 2000, 2000);
    expect(attacks.hasEffect(target, "FREEZE")).toBe(false);
    expect(attacks.hasEffect(target, "BLOCK")).toBe(true);
    expect(attacks.canInteract(target, 2000, blocked)).toBe(false);
    expect(attacks.canInteract(target, 2000)).toBe(true);
  });

  it("shuffles only target board tiles and leaves a valid move", () => {
    const attacks = new AttackSystem(DEFAULT_ATTACK_CONFIG, undefined, () => 0.37);
    const attacker = player("P1");
    const target = player("P2");
    const attackerBefore = attacker.board.tiles.flat().map(tile => tile?.type);
    const targetBefore = target.board.tiles.flat().map(tile => tile?.type);
    const result = attacks.useAttack(attacker, target, "SHUFFLE", 0);
    expect(result.accepted).toBe(true);
    expect(attacker.board.tiles.flat().map(tile => tile?.type)).toEqual(attackerBefore);
    expect(target.board.tiles.flat().map(tile => tile?.type).sort()).toEqual(targetBefore.sort());
    expect(hasAvailableMoves(target.board)).toBe(true);
  });

  it("adds matching pairs without exceeding board capacity", () => {
    const attacks = new AttackSystem({ ...DEFAULT_ATTACK_CONFIG, maximumBoardTiles: 16 }, undefined, () => 0.2);
    const attacker = player("P1");
    const target = player("P2", Array.from({ length: 16 }, (_, index) => Math.floor(index / 2)));
    for (const position of [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }]) {
      target.board.tiles[position.row][position.col] = null;
    }
    target.remainingTiles = 12;
    const result = attacks.useAttack(attacker, target, "ADD_TILES", 0);
    expect(result).toMatchObject({ accepted: true, affectedTiles: 4 });
    expect(target.remainingTiles).toBe(16);
    const liveTypes = target.board.tiles.flat().filter(tile => tile?.alive).map(tile => tile!.type);
    expect(liveTypes).toHaveLength(16);
    for (const type of new Set(liveTypes)) expect(liveTypes.filter(value => value === type).length % 2).toBe(0);
  });

  it("enforces meter, freeze, and cooldown and rejects invalid target/types", () => {
    const attacks = new AttackSystem(DEFAULT_ATTACK_CONFIG, undefined, () => 0);
    const attacker = player("P1");
    const target = player("P2");
    attacker.attackMeter = 99;
    expect(attacks.useAttack(attacker, target, "FREEZE", 0)).toMatchObject({ accepted: false, reason: "ATTACK_NOT_READY" });
    attacker.attackMeter = 100;
    expect(attacks.useAttack(attacker, player("P1"), "FREEZE", 0)).toMatchObject({ accepted: false, reason: "INVALID_TARGET" });
    expect(attacks.useAttack(attacker, target, "INVALID" as never, 0)).toMatchObject({ accepted: false, reason: "INVALID_ATTACK" });
    expect(attacks.useAttack(attacker, target, "FREEZE", 0).accepted).toBe(true);
    expect(attacker.attackMeter).toBe(0);
    expect(attacks.useAttack(attacker, target, "BLOCK", 0)).toMatchObject({ accepted: false, reason: "ATTACK_COOLDOWN" });
    attacker.cooldownRemainingMs = 0;
    attacker.attackMeter = 100;
    attacks.useAttack(target, attacker, "FREEZE", 0);
    expect(attacks.useAttack(target, attacker, "FREEZE", 1)).toMatchObject({ accepted: false, reason: "PLAYER_FROZEN" });
  });
});