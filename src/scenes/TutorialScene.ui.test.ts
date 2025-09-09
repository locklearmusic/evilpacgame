import { describe, it, expect } from "vitest";
import TutorialScene from "./TutorialScene";
import { SceneKeys } from "../core/const";
import { Strings } from "../config/strings";

describe("TutorialScene UI", () => {
  it("renders SkipPrompt text", () => {
    const scene: any = new (TutorialScene as any)();
    expect(scene.scene && scene.scene.key).toBe(SceneKeys.Tutorial);

    // Stub scale and display list
    scene.scale = { width: 800, height: 600 };

    const texts: string[] = [];
    const fakeTextObj = {
      setOrigin() { return this; },
      setText() { return this; },
      setFont() { return this; },
      setColor() { return this; },
    } as any;

    scene.add = {
      rectangle: () => ({}),
      text: (_x: number, _y: number, t: string) => {
        texts.push(t);
        return fakeTextObj;
      },
    };

    // Stub input handlers used in create()
    scene.input = {
      keyboard: {
        addKey: () => ({ on: () => {}, off: () => {} }),
      },
      once: () => {},
      on: () => {},
    };

    scene.create();
    expect(texts).toContain(Strings.SkipPrompt);
  });
});

