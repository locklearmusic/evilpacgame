import { describe, it, expect, beforeEach } from "vitest";
import { saveOptions, loadOptions, newRun, saveRunState, loadRunState, clearAllData } from "./save";
import { GhostIDs } from "./const";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe("save system", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("player options", () => {
    it("saves and loads options", () => {
      const options = { soundVolume: 0.5, musicVolume: 0.3, captionsEnabled: true };
      saveOptions(options);
      const loaded = loadOptions();
      expect(loaded).toEqual(options);
    });

    it("returns defaults when no saved data", () => {
      const loaded = loadOptions();
      expect(loaded.soundVolume).toBe(0.8);
      expect(loaded.musicVolume).toBe(0.6);
      expect(loaded.captionsEnabled).toBe(false);
    });

    it("handles corrupted data gracefully", () => {
      localStorageMock.setItem("evilpac_player_options", "invalid json");
      const loaded = loadOptions();
      expect(loaded.soundVolume).toBe(0.8); // default
    });
  });

  describe("run state", () => {
    it("creates new run with fresh state", () => {
      const runState = newRun();
      expect(runState.runId).toMatch(/^run_\d+_/);
      expect(runState.ghostsAlive).toEqual(Object.values(GhostIDs));
      expect(runState.levelNumber).toBe(1);
      expect(Object.keys(runState.cutsceneIndexByGhost)).toHaveLength(4);
    });

    it("saves and loads run state", () => {
      const runState = newRun();
      saveRunState(runState);
      const loaded = loadRunState();
      expect(loaded).toEqual(runState);
    });

    it("returns null when no saved run", () => {
      const loaded = loadRunState();
      expect(loaded).toBeNull();
    });

    it("handles corrupted run data gracefully", () => {
      localStorageMock.setItem("evilpac_run_state", "invalid json");
      const loaded = loadRunState();
      expect(loaded).toBeNull();
    });
  });

  it("clears all data", () => {
    saveOptions({ soundVolume: 0.5, musicVolume: 0.3, captionsEnabled: true });
    newRun();
    clearAllData();
    expect(loadOptions().soundVolume).toBe(0.8); // back to default
    expect(loadRunState()).toBeNull();
  });
});






