import type { AttackType, PlayerId } from "./LocalMatchTypes.js";

export interface PlayerControls {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  select: string[];
  attack1: string[];
  attack2: string[];
  attack3: string[];
  attack4: string[];
}

export const DEFAULT_PLAYER_CONTROLS: Record<PlayerId, PlayerControls> = {
  P1: {
    up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"],
    select: ["Enter", "Numpad0"], attack1: ["Digit1"], attack2: ["Digit2"], attack3: ["Digit3"], attack4: ["Digit4"],
  },
  P2: {
    up: ["KeyW"], down: ["KeyS"], left: ["KeyA"], right: ["KeyD"],
    select: ["Space"], attack1: ["Digit7"], attack2: ["Digit8"], attack3: ["Digit9"], attack4: ["Digit0"],
  },
};

export const ATTACK_KEY_TYPES: readonly AttackType[] = ["FREEZE", "SHUFFLE", "BLOCK", "ADD_TILES"];