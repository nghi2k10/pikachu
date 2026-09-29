import { Container, Texture } from "pixi.js";
import { describe, expect, it } from "vitest";
import { createBoard } from "@pikachu/game-engine";
import { PLAYER_THEMES } from "./LocalMatchTypes.js";
import { PlayerGameView } from "./PlayerGameView.js";

describe("PlayerGameView", () => {
  it("keeps board rendering and animation managers isolated per player", () => {
    const boardP1 = createBoard({ rows: 1, cols: 2, tileTypes: 1 }, [0, 0]);
    const boardP2 = createBoard({ rows: 1, cols: 2, tileTypes: 1 }, [0, 0]);
    const textureProvider = { getTexture: () => Texture.WHITE };
    const rootP1 = new Container();
    const rootP2 = new Container();
    const viewP1 = new PlayerGameView("P1", rootP1, boardP1, textureProvider, PLAYER_THEMES.P1);
    const viewP2 = new PlayerGameView("P2", rootP2, boardP2, textureProvider, PLAYER_THEMES.P2);
    expect(viewP1.boardRenderer).not.toBe(viewP2.boardRenderer);
    expect(viewP1.animations).not.toBe(viewP2.animations);
    expect(viewP1.boardRenderer.getLayout()).not.toBe(viewP2.boardRenderer.getLayout());
    viewP1.destroy();
    viewP2.destroy();
  });
});