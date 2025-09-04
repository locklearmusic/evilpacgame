import { describe, it, expect } from "vitest";
import { SceneKeys } from "./sceneKeys";

describe("SceneKeys", () => {
  it("contains required keys", () => {
    expect(SceneKeys.Boot).toBe("BootScene");
    expect(SceneKeys.Title).toBe("TitleScene");
    expect(SceneKeys.Tutorial).toBe("TutorialScene");
  });
});


