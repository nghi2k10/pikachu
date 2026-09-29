import { Container, Graphics, Text, type Point } from "pixi.js";

interface Particle {
  graphic: Graphics;
  velocityX: number;
  velocityY: number;
  age: number;
  lifetime: number;
}

interface Popup {
  text: Text;
  age: number;
  lifetime: number;
  startY: number;
}

export class ParticlePool {
  private readonly available: Graphics[] = [];

  constructor(private readonly container: Container) {}

  acquire(): Graphics {
    const graphic = this.available.pop() ?? new Graphics();
    graphic.clear();
    graphic.visible = true;
    this.container.addChild(graphic);
    return graphic;
  }

  release(graphic: Graphics): void {
    graphic.clear();
    graphic.visible = false;
    graphic.removeFromParent();
    this.available.push(graphic);
  }

  get pooledCount(): number {
    return this.available.length;
  }
}

export class EffectPool extends ParticlePool {}

export class ScorePopupPool {
  private readonly available: Text[] = [];

  constructor(private readonly container: Container) {}

  acquire(): Text {
    const text = this.available.pop() ?? new Text({
      text: "",
      style: { fontFamily: "Trebuchet MS, sans-serif", fontSize: 28, fontWeight: "900", fill: "#fff4cb", stroke: { color: "#244e45", width: 5 } },
    });
    text.visible = true;
    text.anchor.set(0.5);
    this.container.addChild(text);
    return text;
  }

  release(text: Text): void {
    text.visible = false;
    text.removeFromParent();
    this.available.push(text);
  }

  get pooledCount(): number {
    return this.available.length;
  }
}

export class EffectsRenderer {
  private readonly particles: Particle[] = [];
  private readonly popups: Popup[] = [];
  private readonly particlePool: ParticlePool;
  private readonly effectPool: EffectPool;
  private readonly popupPool: ScorePopupPool;

  constructor(private readonly container: Container) {
    this.particlePool = new ParticlePool(container);
    this.effectPool = new EffectPool(container);
    this.popupPool = new ScorePopupPool(container);
  }

  playMatchEffect(points: Point[]): void {
    for (const point of points) {
      const ring = this.effectPool.acquire();
      ring.position.copyFrom(point);
      ring.circle(0, 0, 18).stroke({ color: 0xffd16a, width: 4, alpha: 0.95 });
      this.particles.push({ graphic: ring, velocityX: 0, velocityY: 0, age: 0, lifetime: 240 });
      for (let index = 0; index < 5; index += 1) {
        const angle = (Math.PI * 2 * index) / 5;
        const graphic = this.particlePool.acquire();
        graphic.circle(0, 0, 3 + (index % 2)).fill({ color: index % 2 ? 0xff8056 : 0xffe27a });
        graphic.position.copyFrom(point);
        this.particles.push({
          graphic,
          velocityX: Math.cos(angle) * (2.1 + index % 2),
          velocityY: Math.sin(angle) * (2.1 + index % 2),
          age: 0,
          lifetime: 330,
        });
      }
    }
  }

  playInvalidEffect(position: Point): void {
    const ring = this.effectPool.acquire();
    ring.position.copyFrom(position);
    ring.circle(0, 0, 22).stroke({ color: 0xe75b4a, width: 4, alpha: 0.95 });
    this.particles.push({ graphic: ring, velocityX: 0, velocityY: 0, age: 0, lifetime: 220 });
  }

  playScorePopup(position: Point, amount: number): void {
    const text = this.popupPool.acquire();
    text.text = `+${amount}`;
    text.position.copyFrom(position);
    this.popups.push({ text, age: 0, lifetime: 630, startY: position.y });
  }

  playComboEffect(combo: number, position: Point): void {
    if (combo < 2) return;
    const text = this.popupPool.acquire();
    text.text = `COMBO x${combo}`;
    text.style = { ...text.style, fontSize: 23, fill: "#ffe18a" };
    text.position.set(position.x, position.y - 38);
    this.popups.push({ text, age: 0, lifetime: 500, startY: position.y - 38 });
  }

  update(deltaMs: number): void {
    const deltaFrames = deltaMs / (1000 / 60);
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.age += deltaMs;
      const progress = Math.min(1, particle.age / particle.lifetime);
      if (particle.velocityX === 0 && particle.velocityY === 0) {
        particle.graphic.scale.set(1 + progress * 1.6);
      } else {
        particle.graphic.x += particle.velocityX * deltaFrames;
        particle.graphic.y += particle.velocityY * deltaFrames;
      }
      particle.graphic.alpha = 1 - progress;
      if (progress >= 1) {
        this.particles.splice(index, 1);
        if (particle.velocityX === 0 && particle.velocityY === 0) this.effectPool.release(particle.graphic);
        else this.particlePool.release(particle.graphic);
      }
    }

    for (let index = this.popups.length - 1; index >= 0; index -= 1) {
      const popup = this.popups[index];
      popup.age += deltaMs;
      const progress = Math.min(1, popup.age / popup.lifetime);
      popup.text.y = popup.startY - 50 * progress;
      popup.text.alpha = Math.min(1, progress * 5) * (1 - progress);
      popup.text.scale.set(0.8 + Math.min(1, progress * 5) * 0.22);
      if (progress >= 1) {
        this.popups.splice(index, 1);
        this.popupPool.release(popup.text);
      }
    }
  }

  destroy(): void {
    this.particles.forEach(particle => particle.graphic.destroy());
    this.popups.forEach(popup => popup.text.destroy());
    this.particles.length = 0;
    this.popups.length = 0;
    this.container.removeChildren();
  }

  get activeEffectCount(): number {
    return this.particles.length + this.popups.length;
  }

  get poolCounts(): { particles: number; effects: number; scorePopups: number } {
    return {
      particles: this.particlePool.pooledCount,
      effects: this.effectPool.pooledCount,
      scorePopups: this.popupPool.pooledCount,
    };
  }
}