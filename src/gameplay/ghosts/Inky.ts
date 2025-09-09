import Phaser from "phaser";
import type { Maze } from "../maze/Maze";
import { type GridPos } from "../maze/nav";
import GhostController from "./GhostController";
import type { GhostOpts } from "./GhostController";
import { SPEEDS } from "../grid/const";
import { InkyDefaults, type InkyConfig } from "../../config/ghosts";

export interface InkyOpts extends GhostOpts {
  getEvilPos: () => GridPos;
  getBlinkyPos?: () => GridPos;
  config?: Partial<InkyConfig>;
}

export class Inky extends GhostController {
  private getEvilPos: () => GridPos;
  private getBlinkyPos?: () => GridPos;
  private cfg: InkyConfig;
  private vulnUntil = 0;
  private cdUntil = 0;

  constructor(scene: Phaser.Scene, maze: Maze, opts: InkyOpts) {
    super(scene, maze, opts);
    this.getEvilPos = opts.getEvilPos;
    this.getBlinkyPos = opts.getBlinkyPos;
    this.cfg = { ...InkyDefaults, ...(opts.config || {}) } as InkyConfig;
    this.setSpeed(SPEEDS.ghost * 0.97);
  }

  update(time: number, deltaMs: number = 16) {
    // Apply vulnerability slow if active
    if (time < this.vulnUntil) this.setSpeed(SPEEDS.ghost * 0.8);
    else this.setSpeed(SPEEDS.ghost * 0.97);
    super.update(time, deltaMs);
  }

  tryGlitchStep(now: number): boolean {
    if (now < this.cdUntil) return false;
    const ev = this.getEvilPos();
    const bl = this.getBlinkyPos ? this.getBlinkyPos() : { x: 9, y: 7 };
    const bias = this.cfg.teleport.bias;
    const target = { x: Math.round(bl.x * (1 - bias) + ev.x * bias), y: Math.round(bl.y * (1 - bias) + ev.y * bias) };
    const range = this.cfg.teleport.range;
    const me = this.position;
    const dir = { x: Math.sign(target.x - me.x), y: Math.sign(target.y - me.y) };
    let tx = me.x, ty = me.y;
    for (let i = 0; i < range; i++) {
      const nx = tx + dir.x;
      const ny = ty + dir.y;
      if (!this.mazeIsPassable({ x: nx, y: ny })) break;
      tx = nx; ty = ny;
    }
    // Teleport if moved at least one tile
    if (tx === me.x && ty === me.y) return false;
    this.forceSetPosition(tx, ty);
    this.vulnUntil = now + this.cfg.teleport.vulnSec;
    this.cdUntil = this.vulnUntil + this.cfg.teleport.cooldown;
    return true;
  }

  private forceSetPosition(x: number, y: number) {
    // @ts-ignore
    const mover = (this as any).mover;
    mover.pos = { x: x + 0.5, y: y + 0.5 };
  }

  private mazeIsPassable(p: GridPos): boolean {
    // @ts-ignore
    const mz = (this as any).maze as Maze;
    return mz.isPassable(p);
  }
}

export default Inky;
