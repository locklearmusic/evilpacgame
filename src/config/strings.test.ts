import { describe, it, expect } from "vitest";
import { Strings } from "./strings";

describe("Strings config", () => {
  it("exposes non-empty title and prompt", () => {
    expect(Strings.TitleText.length).toBeGreaterThan(0);
    expect(Strings.StartPrompt.length).toBeGreaterThan(0);
  });

  it("has tutorial strings", () => {
    expect(Strings.TutorialTitle).toBe("Tutorial");
    expect(Strings.TutorialComplete).toBe("Tutorial Complete!");
    expect(Strings.ContinuePrompt).toBe("Press ENTER to continue");
  });
});


