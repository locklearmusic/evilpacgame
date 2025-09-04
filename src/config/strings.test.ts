import { describe, it, expect } from "vitest";
import { Strings } from "./strings";

describe("Strings config", () => {
  it("exposes non-empty title and prompt", () => {
    expect(Strings.TitleText.length).toBeGreaterThan(0);
    expect(Strings.StartPrompt.length).toBeGreaterThan(0);
  });
});


