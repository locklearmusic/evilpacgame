import { describe, it, expect } from "vitest";
import { SceneKeys, GhostIDs, UIKeys } from "./const";

describe("core const", () => {
  it("has required scene keys", () => {
    expect(SceneKeys.Boot).toBe("BootScene");
    expect(SceneKeys.Title).toBe("TitleScene");
    expect(SceneKeys.Tutorial).toBe("TutorialScene");
  });
  it("has ghost ids and ui keys", () => {
    expect(GhostIDs.Blinky).toBe("blinky");
    expect(UIKeys.HUD).toBe("HUD");
  });
});






