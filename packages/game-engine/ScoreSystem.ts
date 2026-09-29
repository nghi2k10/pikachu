export interface ScoreConfig {
  basePoints: number;
  comboMultipliers: readonly number[];
  speedMultiplier: number;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  basePoints: 100,
  comboMultipliers: [1, 1.2, 1.5, 2, 2.5],
  speedMultiplier: 1,
};

export function calculateScore(combo: number, config: ScoreConfig = DEFAULT_SCORE_CONFIG): number {
  if (!Number.isSafeInteger(combo) || combo < 1) throw new RangeError("Combo must be a positive integer");
  if (!Number.isFinite(config.basePoints) || config.basePoints < 0) throw new RangeError("Base points must be non-negative");
  if (!Number.isFinite(config.speedMultiplier) || config.speedMultiplier < 0) {
    throw new RangeError("Speed multiplier must be non-negative");
  }
  if (config.comboMultipliers.length === 0 || config.comboMultipliers.some(value => !Number.isFinite(value) || value < 0)) {
    throw new RangeError("Combo multipliers must contain non-negative values");
  }

  const multiplier = config.comboMultipliers[Math.min(combo - 1, config.comboMultipliers.length - 1)];
  return Math.round(config.basePoints * multiplier * config.speedMultiplier);
}