import { Container, Graphics, Text } from "pixi.js";
import type { LocalPlayer, PlayerTheme } from "./LocalMatchTypes.js";
import type { BoardRenderer } from "./BoardRenderer.js";

export class BoardStatusRenderer {
  private readonly graphic = new Graphics();
  private readonly label = new Text({
    text: "FROZEN",
    style: { fontFamily: "Trebuchet MS, sans-serif", fontSize: 28, fontWeight: "900", fill: "#eaf8f3", stroke: { color: "#155c54", width: 5 } },
  });

  constructor(private readonly container: Container, private readonly theme: PlayerTheme) {
    this.container.addChild(this.graphic, this.label);
    this.label.anchor.set(0.5);
    this.label.visible = false;
    this.graphic.eventMode = "none";
  }

  update(player: LocalPlayer, renderer: BoardRenderer): void {
    const layout = renderer.getLayout();
    const hasFreeze = player.statusEffects.some(effect => effect.type === "FREEZE");
    this.graphic.clear();
    this.label.visible = hasFreeze;
    if (hasFreeze) {
      this.graphic.roundRect(layout.x, layout.y, layout.width, layout.height, 13)
        .fill({ color: this.theme.secondary, alpha: 0.75 })
        .stroke({ color: this.theme.accent, width: 3, alpha: 0.9 });
      this.label.position.set(layout.x + layout.width / 2, layout.y + layout.height / 2);
    }

    for (const effect of player.statusEffects) {
      if (effect.type !== "BLOCK") continue;
      for (const position of effect.blockedPositions ?? []) {
        const center = renderer.getTilePosition(position.row, position.col);
        const x = center.x - renderer.tileWidth / 2;
        const y = center.y - renderer.tileHeight / 2;
        this.graphic.roundRect(x, y, renderer.tileWidth, renderer.tileHeight, 9)
          .fill({ color: 0x263c38, alpha: 0.72 })
          .stroke({ color: this.theme.accent, width: 2, alpha: 0.95 });
        this.graphic.moveTo(x + 7, y + 7).lineTo(x + renderer.tileWidth - 7, y + renderer.tileHeight - 7)
          .moveTo(x + renderer.tileWidth - 7, y + 7).lineTo(x + 7, y + renderer.tileHeight - 7)
          .stroke({ color: 0xfff3d0, width: 2, alpha: 0.9 });
      }
    }
  }

  destroy(): void {
    this.graphic.destroy();
    this.label.destroy();
  }
}