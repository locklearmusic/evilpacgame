import Phaser from "phaser";
import { type GridPos } from "../maze/nav";
import type { Maze } from "../maze/Maze";
import { GridMover, DIRS } from "../grid/GridMover";
import { SPEEDS } from "../grid/const";

export interface GhostOpts {
  color: number;
  start: GridPos;
  tileSize: number;
  offsetX?: number;
  offsetY?: number;
}

export class GhostController {
  private scene: Phaser.Scene;
  private maze: Maze;
  private tileSize: number;
  private container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Graphics;
  private eyeL!: Phaser.GameObjects.Ellipse;
  private eyeR!: Phaser.GameObjects.Ellipse;
  private pupilL!: Phaser.GameObjects.Arc;
  private pupilR!: Phaser.GameObjects.Arc;
  private blinkTimer?: Phaser.Time.TimerEvent;
  private color: number;
  private keys: { up?: Phaser.Input.Keyboard.Key; down?: Phaser.Input.Keyboard.Key; left?: Phaser.Input.Keyboard.Key; right?: Phaser.Input.Keyboard.Key } = {};
  private mover: GridMover;
  private offsetX = 0;
  private offsetY = 0;

  constructor(scene: Phaser.Scene, maze: Maze, opts: GhostOpts) {
    this.scene = scene;
    this.maze = maze;
    this.tileSize = opts.tileSize;
    this.offsetX = opts.offsetX ?? 0;
    this.offsetY = opts.offsetY ?? 0;
    this.mover = new GridMover(maze, opts.start);
    this.mover.noReverse = true;
    this.mover.setSpeed(SPEEDS.ghost);
    const px = this.gridToPxX(this.mover.pos.x);
    const py = this.gridToPxY(this.mover.pos.y);
    this.container = scene.add.container(px, py).setDepth(5);
    this.body = scene.add.graphics();
    this.container.add(this.body);
    this.color = opts.color;
    this.drawGhostBody(this.color);
    // Eyes
    const eyeOffsetX = Math.floor(this.tileSize * 0.18);
    const eyeOffsetY = -Math.floor(this.tileSize * 0.05);
    const eyeW = Math.max(6, Math.floor(this.tileSize * 0.16));
    const eyeH = Math.max(8, Math.floor(this.tileSize * 0.22));
    this.eyeL = scene.add.ellipse(-eyeOffsetX, eyeOffsetY, eyeW, eyeH, 0xffffff).setDepth(6);
    this.eyeR = scene.add.ellipse(+eyeOffsetX, eyeOffsetY, eyeW, eyeH, 0xffffff).setDepth(6);
    this.pupilL = scene.add.circle(-eyeOffsetX, eyeOffsetY + 2, Math.max(2, Math.floor(this.tileSize * 0.06)), 0x000000).setDepth(7);
    this.pupilR = scene.add.circle(+eyeOffsetX, eyeOffsetY + 2, Math.max(2, Math.floor(this.tileSize * 0.06)), 0x000000).setDepth(7);
    this.container.add([this.eyeL, this.eyeR, this.pupilL, this.pupilR]);
    // Blink
    this.startBlinking();

    const kb = scene.input.keyboard;
    this.keys.up = kb?.addKey(Phaser.Input.Keyboard.KeyCodes.UP)!;
    this.keys.down = kb?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)!;
    this.keys.left = kb?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)!;
    this.keys.right = kb?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)!;
  }

  update(time: number, deltaMs: number = 16) {
    // read input as desired direction; mover handles buffering and legality
    const d = this.readInputDir();
    this.mover.setDesired(d);
    this.mover.update(deltaMs);
    this.syncSprite();
  }

  get position(): GridPos {
    return { x: Math.floor(this.mover.pos.x), y: Math.floor(this.mover.pos.y) };
  }

  private readInputDir(): { x: number; y: number } | null {
    const { up, down, left, right } = this.keys;
    if (left?.isDown) return DIRS.left;
    if (right?.isDown) return DIRS.right;
    if (up?.isDown) return DIRS.up;
    if (down?.isDown) return DIRS.down;
    // Gamepad: prefer D-pad, then left stick axes
    const pads = this.scene.input.gamepad?.pads || [];
    const pad = pads.find((p) => !!p);
    if (pad) {
      // D-pad booleans if available
      // @ts-ignore
      if (pad.left) return DIRS.left;
      // @ts-ignore
      if (pad.right) return DIRS.right;
      // @ts-ignore
      if (pad.up) return DIRS.up;
      // @ts-ignore
      if (pad.down) return DIRS.down;
      const axX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      const axY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      const th = 0.5;
      if (Math.abs(axX) > Math.abs(axY)) {
        if (axX <= -th) return DIRS.left;
        if (axX >= th) return DIRS.right;
      } else {
        if (axY <= -th) return DIRS.up;
        if (axY >= th) return DIRS.down;
      }
    }
    return null;
  }

  private syncSprite() {
    this.container.x = this.gridToPxX(this.mover.pos.x);
    this.container.y = this.gridToPxY(this.mover.pos.y);
  }

  setColor(color: number) {
    this.color = color;
    this.drawGhostBody(this.color);
  }

  setSpeed(tilesPerSec: number) {
    this.mover.setSpeed(tilesPerSec);
  }

  private gridToPxX(xTiles: number) {
    return this.offsetX + Math.floor(xTiles * this.tileSize);
  }
  private gridToPxY(yTiles: number) {
    return this.offsetY + Math.floor(yTiles * this.tileSize);
  }

  private drawGhostBody(color: number) {
    const g = this.body;
    g.clear();
    g.fillStyle(color, 1);
    const r = Math.floor(this.tileSize * 0.35);
    const w = r * 2;
    const h = Math.floor(this.tileSize * 0.9);
    const scallop = Math.max(3, Math.floor(r * 0.6));
    // Top semicircle
    g.beginPath();
    g.arc(0, -h * 0.25, r, Math.PI, 0, false);
    // Sides down
    g.lineTo(r, h * 0.25);
    // Bottom scallops (3 bumps)
    const bumps = 3;
    for (let i = bumps; i >= 0; i--) {
      const x = -r + (i * w) / bumps;
      g.arc(x, h * 0.25, scallop, 0, Math.PI, true);
    }
    g.lineTo(-r, -h * 0.25);
    g.closePath();
    g.fillPath();
  }

  private startBlinking() {
    const doBlink = () => {
      // Close eyes briefly
      this.pupilL.setVisible(false);
      this.pupilR.setVisible(false);
      this.scene.time.delayedCall(140, () => {
        this.pupilL.setVisible(true);
        this.pupilR.setVisible(true);
      });
    };
    // Randomize cadence a bit
    const schedule = () => {
      const delay = 1600 + Math.random() * 1400;
      this.blinkTimer = this.scene.time.delayedCall(delay, () => {
        doBlink();
        schedule();
      });
    };
    schedule();
  }
}

export default GhostController;
