export type AnimationId = number;

interface Animation {
  id: number;
  duration: number;
  elapsed: number;
  update: (progress: number) => void;
  complete?: () => void;
}

export class AnimationManager {
  private readonly animations: Animation[] = [];
  private nextId = 1;

  animate(durationMs: number, update: (progress: number) => void, complete?: () => void): AnimationId {
    const animation: Animation = {
      id: this.nextId++,
      duration: Math.max(1, durationMs),
      elapsed: 0,
      update,
      complete,
    };
    this.animations.push(animation);
    update(0);
    return animation.id;
  }

  cancel(id: AnimationId): void {
    const index = this.animations.findIndex(animation => animation.id === id);
    if (index >= 0) this.animations.splice(index, 1);
  }

  update(deltaMs: number): void {
    for (let index = this.animations.length - 1; index >= 0; index -= 1) {
      const animation = this.animations[index];
      animation.elapsed += deltaMs;
      const progress = Math.min(1, animation.elapsed / animation.duration);
      animation.update(progress);
      if (progress >= 1) {
        this.animations.splice(index, 1);
        animation.complete?.();
      }
    }
  }

  clear(): void {
    this.animations.length = 0;
  }

  get activeCount(): number {
    return this.animations.length;
  }
}