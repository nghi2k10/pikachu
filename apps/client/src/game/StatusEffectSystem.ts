import type { PlayerId, LocalPlayer, StatusEffect } from "./LocalMatchTypes.js";
import type { Position } from "@pikachu/game-engine";

export class StatusEffectSystem {
  addEffect(player: LocalPlayer, effect: StatusEffect): void {
    player.statusEffects = [...player.statusEffects.filter(existing => existing.id !== effect.id), effect];
  }

  removeEffect(player: LocalPlayer, effectId: string): void {
    player.statusEffects = player.statusEffects.filter(effect => effect.id !== effectId);
  }

  expireEffects(player: LocalPlayer, nowMs: number): boolean {
    const remaining = player.statusEffects.filter(effect => nowMs - effect.startedAt < effect.duration);
    const changed = remaining.length !== player.statusEffects.length;
    player.statusEffects = remaining;
    return changed;
  }

  hasEffect(player: LocalPlayer, type: StatusEffect["type"]): boolean {
    return player.statusEffects.some(effect => effect.type === type);
  }

  getRemainingDuration(player: LocalPlayer, type: StatusEffect["type"], nowMs: number): number {
    return player.statusEffects
      .filter(effect => effect.type === type)
      .reduce((remaining, effect) => Math.max(remaining, effect.duration - (nowMs - effect.startedAt)), 0);
  }

  canInteract(player: LocalPlayer, nowMs: number, position?: Position): boolean {
    if (this.getRemainingDuration(player, "FREEZE", nowMs) > 0) return false;
    if (!position) return true;
    return !player.statusEffects.some(effect => effect.type === "BLOCK"
      && nowMs - effect.startedAt < effect.duration
      && effect.blockedPositions?.some(blocked => samePosition(blocked, position)));
  }

  createEffect(
    id: string,
    type: StatusEffect["type"],
    startedAt: number,
    duration: number,
    sourcePlayerId: PlayerId,
    blockedPositions?: Position[],
  ): StatusEffect {
    return { id, type, startedAt, duration, sourcePlayerId, blockedPositions };
  }
}

function samePosition(first: Position, second: Position): boolean {
  return first.row === second.row && first.col === second.col;
}