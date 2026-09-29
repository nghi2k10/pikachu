import { Texture } from "pixi.js";

export interface TileTextureProvider {
  getTexture(tileType: number): Texture;
}

const TILE_COLORS = [
  "#e76f51", "#2a9d8f", "#e9b949", "#5487b2", "#d65a8a", "#76a85b",
  "#d28b4a", "#7565a8", "#37a4ae", "#b55248", "#91a33e", "#547b68",
];

export class AssetManager implements TileTextureProvider {
  private readonly tileTextures = new Map<number, Texture>();
  private loaded = false;

  async loadGameAssets(tileTypeCount: number): Promise<void> {
    if (this.loaded) return;
    for (let type = 0; type < tileTypeCount; type += 1) {
      try {
        this.tileTextures.set(type, Texture.from(createTileCanvas(type)));
      } catch {
        this.tileTextures.set(type, Texture.WHITE);
      }
    }
    this.loaded = true;
  }

  getTexture(tileType: number): Texture {
    return this.tileTextures.get(tileType) ?? Texture.WHITE;
  }

  getSound(_name: string): AudioBuffer | undefined {
    return undefined;
  }

  destroy(): void {
    this.tileTextures.forEach(texture => {
      if (texture !== Texture.WHITE) texture.destroy(true);
    });
    this.tileTextures.clear();
    this.loaded = false;
  }
}

function createTileCanvas(type: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");

  const color = TILE_COLORS[type % TILE_COLORS.length];
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(21, 43, 38, 0.14)";
  context.beginPath();
  context.roundRect(8, 10, 112, 110, 24);
  context.fill();
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(7, 5, 112, 110, 22);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.58)";
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.22)";
  context.beginPath();
  context.ellipse(39, 27, 21, 9, -0.48, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fffaf0";
  context.font = "800 43px 'Trebuchet MS', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(type + 1).padStart(2, "0"), 63, 66);
  return canvas;
}