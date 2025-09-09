import Phaser from "phaser";
import type { Maze } from "../maze/Maze";
import { type GridPos } from "../maze/nav";
import GhostController from "./GhostController";
import type { GhostOpts } from "./GhostController";
import { SPEEDS } from "../grid/const";
import { ClydeDefaults, type ClydeConfig } from "../../config/ghosts";

export interface ClydeOpts extends GhostOpts {
  config?: Partial<ClydeConfig>;
}

type Decoy = { pos: GridPos; until: number };

export class Clyde extends GhostController {
  private cfg: ClydeConfig;
  private decoys: Decoy[] = [];
  private cdUntil = 0;

  constructor(scene: Phaser.Scene, maze: Maze, opts: ClydeOpts) {
    super(scene, maze, opts);
    this.cfg = { ...ClydeDefaults, ...(opts.config || {}) } as ClydeConfig;
    this.setSpeed(SPEEDS.ghost * 0.95);
  }

  update(time: number, deltaMs: number = 16) {
    // Wander noise could perturb desired direction at junctions (simple noop placeholder here)
    // Clean expired decoys
    this.decoys = this.decoys.filter(d => time < d.until);
    super.update(time, deltaMs);
  }

  tryScatterBait(now: number): GridPos[] | null {
    if (now < this.cdUntil) return null;
    const count = this.cfg.decoys.count;
    const spread = this.cfg.decoys.spreadDeg * Math.PI / 180;
    const me = this.position;
    const created: GridPos[] = [];
    for (let i = 0; i < count; i++) {
      const ang = -spread/2 + (spread * i) / Math.max(1, count - 1);
      const dx = Math.round(Math.cos(ang));
      const dy = Math.round(Math.sin(ang));
      const pos = { x: me.x + dx, y: me.y + dy };
      if (this.mazeIsPassable(pos)) {
        this.decoys.push({ pos, until: now + this.cfg.decoys.lifeSec });
        created.push(pos);
      }
    }
    this.cdUntil = now + this.cfg.decoys.cooldown;
    return created.length ? created : null;
  }

  getDecoys(): GridPos[] { return this.decoys.map(d => d.pos); }

  private mazeIsPassable(p: GridPos): boolean {
    // @ts-ignore
    const mz = (this as any).maze as Maze;
    return mz.isPassable(p);
  }
}

export default Clyde;
