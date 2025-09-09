import { TURN_WINDOW } from "./const";
import type { Maze } from "../maze/Maze";

export type Vec2 = { x: number; y: number };
export type Dir = Vec2; // unit axis-aligned vectors only

export const DIRS = {
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
} as const;

export function isOpposite(a: Dir, b: Dir): boolean {
  return a.x === -b.x && a.y === -b.y;
}

export class GridMover {
  // position in tiles (float)
  pos: Vec2;
  dir: Dir = { x: 0, y: 0 };
  desired: Dir | null = null;
  speedTilesPerSec = 6.0;
  noReverse = false;
  onEnterTile?: (tx: number, ty: number) => void;
  // debug
  lastInfo: string = "";

  constructor(private maze: Maze, start: Vec2) {
    this.pos = { x: start.x + 0.5, y: start.y + 0.5 }; // center of tile
  }

  setDesired(d: Dir | null) {
    this.desired = d;
  }

  setDir(d: Dir) {
    this.dir = d;
  }

  setSpeed(tps: number) {
    this.speedTilesPerSec = tps;
  }

  update(deltaMs: number) {
    const dt = Math.max(0, deltaMs) / 1000;
    const before = { x: this.pos.x, y: this.pos.y };
    this.lastInfo = `dt=${dt.toFixed(3)} dir=(${this.dir.x},${this.dir.y}) spd=${this.speedTilesPerSec.toFixed(2)}`;
    // Attempt buffered turn if within turn window and legal
    if (this.desired) this.tryApplyDesired();

    // Move along current dir
    const step = this.speedTilesPerSec * dt;
    this.lastInfo += ` step=${step.toFixed(4)}`;
    const nextPos = { x: this.pos.x + this.dir.x * step, y: this.pos.y + this.dir.y * step };

    // Detect tile change and handle walls by clamping and zeroing dir
    const nextTile = { x: Math.floor(nextPos.x), y: Math.floor(nextPos.y) };
    const currTile = { x: Math.floor(this.pos.x), y: Math.floor(this.pos.y) };
    if (this.dir.x !== 0 || this.dir.y !== 0) {
      // Project one step forward to tile center to ensure no corner cut
      const forwardTile = { x: Math.floor(this.pos.x + this.dir.x * 0.51), y: Math.floor(this.pos.y + this.dir.y * 0.51) };
      if (!this.maze.isPassable(forwardTile)) {
        // Snap to center of current tile and stop
        this.pos = { x: currTile.x + 0.5, y: currTile.y + 0.5 };
        this.dir = { x: 0, y: 0 };
        this.lastInfo += ` | blocked at ${currTile.x},${currTile.y}`;
        return;
      }
    }
    this.pos = nextPos;
    this.lastInfo += ` | moved to (${this.pos.x.toFixed(4)},${this.pos.y.toFixed(4)}) from (${before.x.toFixed(4)},${before.y.toFixed(4)})`;

    // Snap at intersections to avoid drift
    const centerX = currTile.x + 0.5;
    const centerY = currTile.y + 0.5;
    if (this.dir.x !== 0 && Math.sign(this.dir.x) === Math.sign(this.pos.x - centerX) && Math.abs(this.pos.x - centerX) < 0.02) this.pos.x = centerX;
    if (this.dir.y !== 0 && Math.sign(this.dir.y) === Math.sign(this.pos.y - centerY) && Math.abs(this.pos.y - centerY) < 0.02) this.pos.y = centerY;

    // Fire onEnterTile when tile index changes; handle warps
    let newTile = { x: Math.floor(this.pos.x), y: Math.floor(this.pos.y) };
    if (newTile.x !== currTile.x || newTile.y !== currTile.y) {
      // Check for warp at entry tile first
      // @ts-ignore access maze method
      const warp = (this.maze as any).warpAt?.(newTile);
      if (warp) {
        // Teleport to opposite opening, preserving direction
        this.pos = { x: warp.x + 0.5, y: warp.y + 0.5 };
        newTile = { x: warp.x, y: warp.y };
      }
      this.onEnterTile?.(newTile.x, newTile.y);
    }
  }

  private tryApplyDesired() {
    if (!this.desired) return;
    const t = { x: Math.floor(this.pos.x), y: Math.floor(this.pos.y) };
    const center = { x: t.x + 0.5, y: t.y + 0.5 };
    const dx = this.pos.x - center.x;
    const dy = this.pos.y - center.y;
    const withinWindow = Math.abs(dx) <= TURN_WINDOW && Math.abs(dy) <= TURN_WINDOW;
    const stopped = this.dir.x === 0 && this.dir.y === 0;
    // If continuing in the same direction, do not snap/retarget; just keep moving
    const sameDir = this.dir.x === this.desired.x && this.dir.y === this.desired.y;
    if (sameDir && !stopped) return;
    // Allow immediate application if stopped, even if slightly off-center
    if (!withinWindow && !stopped) return;
    // Can't reverse mid-corridor if rule set
    if (this.noReverse && this.dir && isOpposite(this.dir, this.desired)) return;
    const next = { x: t.x + this.desired.x, y: t.y + this.desired.y };
    if (!this.maze.isPassable(next)) return;
    // Snap to tile center only when actually turning or starting from rest
    if (withinWindow) {
      this.pos = center;
    }
    this.dir = this.desired;
  }
}
