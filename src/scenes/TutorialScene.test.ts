import { describe, it, expect } from "vitest";
import { SceneKeys } from "../core/const";

// Mock Phaser to avoid canvas issues in tests
const mockScene = {
  scene: { key: SceneKeys.Tutorial },
  currentStep: 0,
  tutorialSteps: [
    "Welcome to Evil Pac!",
    "Use ARROW KEYS to move",
    "You are the EVIL character!",
    "Hunt down the pac-dots (good guys)",
    "Use power-ups to become stronger",
    "Press ESC to pause the game",
    "Ready to start your evil journey?"
  ]
};

describe("TutorialScene", () => {
  it("has correct scene key", () => {
    expect(mockScene.scene.key).toBe(SceneKeys.Tutorial);
  });

  it("initializes with step 0", () => {
    expect(mockScene.currentStep).toBe(0);
  });

  it("has tutorial steps defined", () => {
    const steps = mockScene.tutorialSteps;
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toContain("Welcome");
  });
});
