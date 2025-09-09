import Phaser from "phaser";
import { type GridPos } from "../maze/nav";
import type { Maze } from "../maze/Maze";
import { GridMover, DIRS, isOpposite } from "../grid/GridMover";
import { SPEEDS } from "../grid/const";

export type EvilMode = "aggressive" | "frightened" | "berserk";

export interface EvilPacOpts {
  start: GridPos;
  tileSize: number;
  powerTargets?: Set<string>;
  getGhostPos?: () => GridPos;
  getMode?: () => EvilMode;
  onConsume?: (ev: { type: "pellet" | "power"; pos: GridPos }) => void;
  offsetX?: number;
  offsetY?: number;
}

export class EvilPacAI {
  private scene: Phaser.Scene;
  private maze: Maze;
  private tileSize: number;
  private gfx: Phaser.GameObjects.Graphics;
  private mover: GridMover;
  private speedMult = 1;
  private baseMult = 1;
  private stamina = 0;
  private powerTargets?: Set<string>;
  private getGhostPos?: () => GridPos;
  private getMode?: () => EvilMode;
  private onConsume?: (ev: { type: "pellet" | "power"; pos: GridPos }) => void;
  private offsetX = 0;
  private offsetY = 0;
  private lastTileKey = "";
  private lastTileTime = 0;

  constructor(scene: Phaser.Scene, maze: Maze, opts: EvilPacOpts) {
    this.scene = scene;
    this.maze = maze;
    this.tileSize = opts.tileSize;
    this.mover = new GridMover(maze, opts.start);
    this.mover.setSpeed(SPEEDS.pac);
    this.powerTargets = opts.powerTargets;
    this.getGhostPos = opts.getGhostPos;
    this.getMode = opts.getMode;
    this.onConsume = opts.onConsume;
    this.offsetX = opts.offsetX ?? 0;
    this.offsetY = opts.offsetY ?? 0;
    const px = this.toPxX(this.mover.pos.x);
    const py = this.toPxY(this.mover.pos.y);
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(4);
    this.mover.onEnterTile = (tx, ty) => this.onEnterTile(tx, ty);
    // Seed an initial direction so movement begins immediately
    const t = { x: Math.floor(this.mover.pos.x), y: Math.floor(this.mover.pos.y) };
    const order = [DIRS.right, DIRS.left, DIRS.up, DIRS.down];
    for (const d of order) {
      const n = { x: t.x + d.x, y: t.y + d.y };
      if (this.maze.isPassable(n)) { this.mover.setDesired(d); this.mover.setDir(d); break; }
    }
    // Initialize stall tracker
    this.lastTileKey = `${Math.floor(this.mover.pos.x)},${Math.floor(this.mover.pos.y)}`;
    this.lastTileTime = scene.time.now;
  }

  update(time: number, deltaMs: number = 16) {
    this.chooseDirection();
    // Apply speed multiplier for temporary effects
    const prev = this.mover.speedTilesPerSec;
    this.mover.setSpeed(SPEEDS.pac * this.baseMult * this.speedMult);
    this.mover.update(deltaMs);
    this.mover.setSpeed(prev);
    // Stall watchdog: use scene clock consistently
    const now = this.scene.time.now;
    const tk = `${Math.floor(this.mover.pos.x)},${Math.floor(this.mover.pos.y)}`;
    if (tk !== this.lastTileKey) {
      this.lastTileKey = tk;
      this.lastTileTime = now;
    } else if (now - this.lastTileTime > 800) {
      this.forceAnyDirection();
      this.lastTileTime = now;
    }
    this.syncSprite();
  }

  getPosition(): GridPos {
    return { x: Math.floor(this.mover.pos.x), y: Math.floor(this.mover.pos.y) };
  }

  getStamina(): number {
    return this.stamina;
  }

  // Debug helpers
  getDir(): { x: number; y: number } {
    return { x: this.mover.dir.x, y: this.mover.dir.y };
  }
  getSpeedTPS(): number {
    return SPEEDS.pac * this.baseMult * this.speedMult;
  }
  getPosF(): { x: number; y: number } {
    return { x: this.mover.pos.x, y: this.mover.pos.y };
  }
  getMoverInfo(): string {
    // @ts-ignore
    return (this.mover as any).lastInfo || "";
  }
  getRawSpeed(): number {
    // @ts-ignore
    return (this.mover as any).speedTilesPerSec;
  }
  getDesired(): { x: number; y: number } | null {
    // @ts-ignore
    return (this.mover as any).desired || null;
  }

  private onEnterTile(tx: number, ty: number) {
    if (this.maze.consumePellet({ x: tx, y: ty })) {
      this.stamina += 1;
      this.onConsume?.({ type: "pellet", pos: { x: tx, y: ty } });
    }
    if (this.powerTargets) {
      const k = `${tx},${ty}`;
      if (this.powerTargets.delete(k)) {
        this.onConsume?.({ type: "power", pos: { x: tx, y: ty } });
      }
    }
    this.lastTileKey = `${tx},${ty}`;
    this.lastTileTime = this.scene.time.now;
  }

  private chooseDirection() {
    const t = { x: Math.floor(this.mover.pos.x), y: Math.floor(this.mover.pos.y) };
    const dir = { x: this.mover.dir.x, y: this.mover.dir.y };
    const stopped = dir.x === 0 && dir.y === 0;

    // If moving and the tile ahead is open, keep going straight; do not change direction.
    if (!stopped) {
      const ahead = { x: t.x + dir.x, y: t.y + dir.y };
      if (this.maze.isPassable(ahead)) {
        // Clear any buffered turn by reinforcing current direction
        this.mover.setDesired(dir);
        return;
      }
      // Otherwise we're about to contact a wall; choose a new direction now.
    }

    const mode = this.getMode?.() || "aggressive";
    let nextDir: { x: number; y: number } | null = null;
    const start = { ...t };
    if (mode !== "frightened") {
      const path = this.maze.pathToNearestPellet(start);
      if (path && path.length >= 2) {
        const nx = path[1];
        nextDir = { x: nx.x - start.x, y: nx.y - start.y };
      }
    } else if (this.getGhostPos) {
      const g = this.getGhostPos();
      let bestPath: GridPos[] | null = null;
      let bestScore = -Infinity;
      for (const pos of this.maze.pelletPositions()) {
        const p = this.maze.findPath(start, pos);
        if (!p || p.length < 2) continue;
        const dx = pos.x - g.x;
        const dy = pos.y - g.y;
        const score = Math.abs(dx) + Math.abs(dy);
        if (score > bestScore) { bestScore = score; bestPath = p; }
      }
      if (bestPath && bestPath.length >= 2) {
        const nx = bestPath[1];
        nextDir = { x: nx.x - start.x, y: nx.y - start.y };
      }
    }

    if (nextDir) {
      const n = { x: t.x + nextDir.x, y: t.y + nextDir.y };
      if (this.maze.isPassable(n)) { this.mover.setDesired(nextDir); return; }
    }
    // Fallback: prefer non-reverse legal turns
    const candidates = [DIRS.left, DIRS.right, DIRS.up, DIRS.down];
    const isReverse = (a: {x:number;y:number}, b: {x:number;y:number}) => a.x === -b.x && a.y === -b.y;
    for (const d of candidates) {
      if (!stopped && isReverse(d, dir)) continue;
      const n = { x: t.x + d.x, y: t.y + d.y };
      if (this.maze.isPassable(n)) { this.mover.setDesired(d); return; }
    }
  }

  private forceAnyDirection() {
    const t = { x: Math.floor(this.mover.pos.x), y: Math.floor(this.mover.pos.y) };
    const dirs = [DIRS.up, DIRS.left, DIRS.down, DIRS.right];
    for (const d of dirs) {
      const n = { x: t.x + d.x, y: t.y + d.y };
      if (this.maze.isPassable(n)) { this.mover.setDesired(d); this.mover.setDir(d); break; }
    }
  }

  private syncSprite() {
    const x = this.toPxX(this.mover.pos.x);
    const y = this.toPxY(this.mover.pos.y);
    const dir = this.getDir();
    const ang = Math.atan2(dir.y, dir.x);
    const t = (this.scene.time.now % 600) / 600; // 0..1
    const mouth = 0.25 + 0.20 * Math.abs(Math.sin(t * Math.PI * 2)); // radians aperture
    const mode = this.getMode?.() || "aggressive";
    const baseR = mode === "berserk" ? 0.64 : 0.52;
    const r = Math.floor(this.tileSize * baseR);
    // Draw chomping pie in facing direction
    const g = this.gfx;
    g.clear();
    g.fillStyle(this.currentColor, 1);
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, r, ang - mouth, ang + mouth, false);
    g.lineTo(x, y);
    g.closePath();
    g.fillPath();

    if (mode === "berserk") {
      // Add mean-looking details: brows and fangs
      g.lineStyle(3, 0x220000, 1);
      const eyeR = r * 0.45;
      const off = Math.PI / 9;
      const bx1 = x + Math.cos(ang + off) * eyeR;
      const by1 = y + Math.sin(ang + off) * eyeR;
      const bx2 = x + Math.cos(ang - off) * eyeR;
      const by2 = y + Math.sin(ang - off) * eyeR;
      // Two short slanted brow lines
      g.beginPath();
      g.moveTo(bx1 - 6 * Math.cos(ang + off + Math.PI / 2), by1 - 6 * Math.sin(ang + off + Math.PI / 2));
      g.lineTo(bx1 + 6 * Math.cos(ang + off + Math.PI / 2), by1 + 6 * Math.sin(ang + off + Math.PI / 2));
      g.strokePath();
      g.beginPath();
      g.moveTo(bx2 - 6 * Math.cos(ang - off - Math.PI / 2), by2 - 6 * Math.sin(ang - off - Math.PI / 2));
      g.lineTo(bx2 + 6 * Math.cos(ang - off - Math.PI / 2), by2 + 6 * Math.sin(ang - off - Math.PI / 2));
      g.strokePath();

      // Fangs at mouth edges
      const fangLen = Math.max(6, Math.floor(this.tileSize * 0.18));
      const tipR = r + 2;
      const angles = [ang + mouth, ang - mouth];
      g.fillStyle(0xffffff, 1);
      for (const a of angles) {
        const edgeX = x + Math.cos(a) * r;
        const edgeY = y + Math.sin(a) * r;
        const tipX = x + Math.cos(a) * (tipR + fangLen * 0.4);
        const tipY = y + Math.sin(a) * (tipR + fangLen * 0.4);
        const nx = Math.cos(a + Math.PI / 2) * (fangLen * 0.25);
        const ny = Math.sin(a + Math.PI / 2) * (fangLen * 0.25);
        g.beginPath();
        g.moveTo(edgeX - nx, edgeY - ny);
        g.lineTo(edgeX + nx, edgeY + ny);
        g.lineTo(tipX, tipY);
        g.closePath();
        g.fillPath();
      }
    }
  }

  tickDrain(deltaMs: number) {
    // Small passive drain over time
    this.stamina = Math.max(0, this.stamina - deltaMs * 0.0035);
  }

  setColor(color: number) {
    this.currentColor = color;
  }

  setSpeedMult(mult: number) {
    this.speedMult = Math.max(0.2, mult);
  }

  setBaseSpeed(mult: number) {
    this.baseMult = Math.max(0.2, mult);
  }

  private toPxX(xTiles: number) {
    return this.offsetX + Math.floor(xTiles * this.tileSize);
  }
  private toPxY(yTiles: number) {
    return this.offsetY + Math.floor(yTiles * this.tileSize);
  }

  private currentColor: number = 0xeeee55;
}

export default EvilPacAI;
