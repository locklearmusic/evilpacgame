import Phaser from "phaser";
import type { Maze } from "../maze/Maze";
import { type GridPos } from "../maze/nav";
import GhostController from "./GhostController";
import type { GhostOpts } from "./GhostController";
import { SPEEDS } from "../grid/const";
import { PinkyDefaults, type PinkyConfig } from "../../config/ghosts";

export interface PinkyOpts extends GhostOpts {
  getEvilPos: () => GridPos;
  config?: Partial<PinkyConfig>;
}

type Trap = { center: GridPos; radius: number; until: number } | null;

export class Pinky extends GhostController {
  private getEvilPos: () => GridPos;
  private cfg: PinkyConfig;
  private prevEvil?: GridPos;
  private ambush: GridPos | null = null;
  private trap: Trap = null;
  private trapCooldownUntil = 0;

  constructor(scene: Phaser.Scene, maze: Maze, opts: PinkyOpts) {
    super(scene, maze, opts);
    this.getEvilPos = opts.getEvilPos;
    this.cfg = { ...PinkyDefaults, ...(opts.config || {}) } as PinkyConfig;
    this.setSpeed(SPEEDS.ghost * 0.98);
  }

  update(time: number, deltaMs: number = 16) {
    // Track ambush tile based on estimated heading
    const ev = this.getEvilPos();
    if (!this.prevEvil) this.prevEvil = { ...ev };
    const dx = Math.sign(ev.x - this.prevEvil.x);
    const dy = Math.sign(ev.y - this.prevEvil.y);
    let ax = ev.x, ay = ev.y;
    const steps = Math.max(1, this.cfg.ambushAheadTiles);
    for (let i = 0; i < steps; i++) {
      const nx = ax + dx;
      const ny = ay + dy;
      if (!this.mazeIsPassable({ x: nx, y: ny })) break;
      ax = nx; ay = ny;
    }
    this.ambush = { x: ax, y: ay };
    this.prevEvil = { ...ev };

    // Clear expired trap
    if (this.trap && time >= this.trap.until) this.trap = null;

    super.update(time, deltaMs);
  }

  tryUseTrap(now: number): boolean {
    if (now < this.trapCooldownUntil) return false;
    const at = this.ambush || this.getEvilPos();
    // Ensure placement on walkable tile
    if (!this.mazeIsPassable(at)) return false;
    const t: Trap = { center: { ...at }, radius: this.cfg.trap.radius, until: now + this.cfg.trap.duration };
    this.trap = t;
    this.trapCooldownUntil = t.until + this.cfg.trap.cooldown;
    return true;
  }

  getAmbushTile(): GridPos | null { return this.ambush; }
  getActiveTrap(): Trap { return this.trap; }
  getTrapSlowMult(): number { return this.cfg.trap.slowMult; }

  private mazeIsPassable(p: GridPos): boolean {
    // @ts-ignore
    const mz = (this as any).maze as Maze;
    return mz.isPassable(p);
  }
}

export default Pinky;
