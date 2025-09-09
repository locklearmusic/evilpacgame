import { describe, it, expect } from "vitest";
import { Maze, defaultConfig } from "./Maze";

describe("Maze loader + navgraph", () => {
  it("creates default maze with pellets", () => {
    const m = new Maze();
    expect(m.pelletCount()).toBeGreaterThan(0);
  });

  it("finds a path across corridors", () => {
    const m = new Maze();
    const start = { x: 2, y: 2 };
    const end = { x: 16, y: 12 };
    const path = m.findPath(start, end);
    expect(path && path.length).toBeGreaterThan(0);
  });

  it("supports warps left<->right", () => {
    const cfg = defaultConfig();
    const m = new Maze(cfg);
    const out = m.warpAt({ x: 1, y: 7 });
    expect(out).toEqual({ x: cfg.width - 2, y: 7 });
  });

  it("can locate nearest pellet path", () => {
    const m = new Maze();
    const start = { x: 2, y: 2 };
    const p = m.pathToNearestPellet(start);
    expect(p && p.length).toBeGreaterThan(0);
  });
});

