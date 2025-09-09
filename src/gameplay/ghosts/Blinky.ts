import Phaser from "phaser";
import type { Maze } from "../maze/Maze";
import { type GridPos } from "../maze/nav";
import GhostController from "./GhostController";
import type { GhostOpts } from "./GhostController";
import { SPEEDS } from "../grid/const";
import { BlinkyDefaults, type BlinkyConfig } from "../../config/ghosts";

export interface BlinkyOpts extends GhostOpts {
  getEvilPos: () => GridPos;
  config?: Partial<BlinkyConfig>;
}

export class Blinky extends GhostController {
  private getEvilPos: () => GridPos;
  private cfg: BlinkyConfig;
  private losRamp = 0; // 0..1
  private baseSpeed = SPEEDS.ghost;
  private lockOnReady = false;
  private lockOnUntil = 0;
  private lockOnCooldownUntil = 0;

  constructor(scene: Phaser.Scene, maze: Maze, opts: BlinkyOpts) {
    super(scene, maze, opts);
    this.getEvilPos = opts.getEvilPos;
    // Merge config
    this.cfg = { ...BlinkyDefaults, ...(opts.config || {}) } as BlinkyConfig;
  }

  update(time: number, deltaMs: number = 16) {
    // LOS check in same row/col without walls between
    const me = this.position;
    const ev = this.getEvilPos();
    const los = this.hasLineOfSight(me, ev);
    const dt = Math.max(0, deltaMs) / 1000;
    // Ramp up/down
    const rampSpeed = 1 / Math.max(0.001, this.cfg.losRampSec);
    this.losRamp += los ? rampSpeed * dt : -rampSpeed * dt;
    this.losRamp = Math.min(1, Math.max(0, this.losRamp));

    // Lock-on readiness and activation
    if (los && this.losRamp >= 1 && time >= this.lockOnCooldownUntil && !this.isLockOnActive(time)) {
      this.lockOnReady = true;
      // Auto-activate when ready
      this.lockOnUntil = time + this.cfg.lockOnBurst.duration;
      this.lockOnCooldownUntil = this.lockOnUntil + this.cfg.lockOnBurst.cooldown;
      this.lockOnReady = false;
    }

    const activeBurst = this.isLockOnActive(time) ? this.cfg.lockOnBurst.speedMult : 1;
    const speed = this.baseSpeed * (1 + 0.4 * this.losRamp) * activeBurst;
    this.setSpeed(speed);

    // Call base update for movement and rendering
    super.update(time, deltaMs);
  }

  private isLockOnActive(now: number) {
    return now < this.lockOnUntil;
  }

  private hasLineOfSight(a: GridPos, b: GridPos): boolean {
    // Same row or column LOS across passable tiles only
    if (a.x === b.x) {
      const x = a.x;
      const [y0, y1] = a.y < b.y ? [a.y, b.y] : [b.y, a.y];
      for (let y = y0 + 1; y < y1; y++) {
        if (!this.mazeIsPassable({ x, y })) return false;
      }
      return true;
    }
    if (a.y === b.y) {
      const y = a.y;
      const [x0, x1] = a.x < b.x ? [a.x, b.x] : [b.x, a.x];
      for (let x = x0 + 1; x < x1; x++) {
        if (!this.mazeIsPassable({ x, y })) return false;
      }
      return true;
    }
    return false;
  }

  // Lightweight proxy; GhostController doesn’t expose maze directly
  private mazeIsPassable(p: GridPos): boolean {
    // @ts-ignore access private via any cast; minimal coupling
    const mz = (this as any).maze as Maze;
    return mz.isPassable(p);
  }
}

export default Blinky;
