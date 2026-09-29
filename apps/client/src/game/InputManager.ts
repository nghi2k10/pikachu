import type { Position } from "@pikachu/game-engine";

export interface InputManagerOptions {
  onTileTap: (position: Position) => void;
  onHover?: (position: Position | null) => void;
  hitTest: (x: number, y: number) => Position | null;
  logicalSize: () => { width: number; height: number };
}

export class InputManager {
  private pointerId: number | null = null;
  private downAt: { x: number; y: number } | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly options: InputManagerOptions) {
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.style.touchAction = "none";
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    this.pointerId = event.pointerId;
    this.downAt = this.toLogicalPoint(event);
    this.canvas.setPointerCapture?.(event.pointerId);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || !this.downAt) return;
    const point = this.toLogicalPoint(event);
    const distance = Math.hypot(point.x - this.downAt.x, point.y - this.downAt.y);
    if (distance < 18) {
      const position = this.options.hitTest(point.x, point.y);
      if (position) this.options.onTileTap(position);
    }
    this.pointerId = null;
    this.downAt = null;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const point = this.toLogicalPoint(event);
    this.options.onHover?.(this.options.hitTest(point.x, point.y));
  };

  private readonly onPointerCancel = (): void => {
    this.pointerId = null;
    this.downAt = null;
  };

  private readonly onPointerLeave = (): void => {
    this.options.onHover?.(null);
  };

  private toLogicalPoint(event: PointerEvent): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect();
    const logical = this.options.logicalSize();
    return {
      x: (event.clientX - bounds.left) * logical.width / Math.max(1, bounds.width),
      y: (event.clientY - bounds.top) * logical.height / Math.max(1, bounds.height),
    };
  }
}