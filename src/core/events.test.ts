import { describe, it, expect } from "vitest";
import { GameEvents } from "./events";

describe("event constants", () => {
  it("has required event keys", () => {
    expect(GameEvents.PlayerDied).toBe("player:died");
    expect(GameEvents.PowerupPicked).toBe("powerup:picked");
    expect(GameEvents.LevelComplete).toBe("level:complete");
  });
});
