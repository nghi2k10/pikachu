export interface ComboConfig {
  windowMs: number;
}

export const DEFAULT_COMBO_CONFIG: ComboConfig = { windowMs: 2000 };

export class ComboSystem {
  private count = 0;
  private lastMatchAt: number | null = null;

  constructor(private readonly config: ComboConfig = DEFAULT_COMBO_CONFIG) {
    if (!Number.isFinite(config.windowMs) || config.windowMs < 0) {
      throw new RangeError("Combo window must be non-negative");
    }
  }

  recordMatch(nowMs: number): number {
    validateTimestamp(nowMs);
    if (this.lastMatchAt !== null && nowMs >= this.lastMatchAt && nowMs - this.lastMatchAt <= this.config.windowMs) {
      this.count += 1;
    } else {
      this.count = 1;
    }
    this.lastMatchAt = nowMs;
    return this.count;
  }

  getCount(nowMs?: number): number {
    if (nowMs === undefined || this.lastMatchAt === null) return this.count;
    validateTimestamp(nowMs);
    return nowMs >= this.lastMatchAt && nowMs - this.lastMatchAt <= this.config.windowMs ? this.count : 0;
  }

  reset(): void {
    this.count = 0;
    this.lastMatchAt = null;
  }
}

function validateTimestamp(nowMs: number): void {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new RangeError("Timestamp must be a non-negative number");
}