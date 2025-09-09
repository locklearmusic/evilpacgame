import Phaser from "phaser";
import { SceneKeys, GhostIDs } from "../core/const";
import { Maze, configForLevel } from "../gameplay/maze/Maze";
import { GhostsMeta } from "../config/ghosts";
import GhostController from "../gameplay/ghosts/GhostController";
import Blinky from "../gameplay/ghosts/Blinky";
import Pinky from "../gameplay/ghosts/Pinky";
import Inky from "../gameplay/ghosts/Inky";
import Clyde from "../gameplay/ghosts/Clyde";
import EvilPacAI from "../gameplay/evilpac/EvilPacAI";
import { loadRunState, loadOptions, saveOptions, saveRunState, newRun } from "../core/save";
import { TILE_SIZE, RADII } from "../gameplay/grid/const";
import { SPEEDS } from "../gameplay/grid/const";

export class GameScene extends Phaser.Scene {
  private maze!: Maze;
  private tileSize = TILE_SIZE;
  private ghost!: GhostController;
  private abilityKey?: Phaser.Input.Keyboard.Key;
  private selectedGhost: string = "";
  private evil!: EvilPacAI;
  private powerTargets = new Set<string>();
  private hudText?: Phaser.GameObjects.Text;
  private ended = false;
  private evilMode: "aggressive" | "frightened" | "berserk" = "aggressive";
  private berserkUntil = 0;
  private debugText?: Phaser.GameObjects.Text;
  private debugEnabled = false;
  private tickCount = 0;
  private warpArrowTexts: Phaser.GameObjects.Text[] = [];
  private warpDirState: { left: "left"|"right"|"up"|"down"; right: "left"|"right"|"up"|"down"; top: "left"|"right"|"up"|"down"; bottom: "left"|"right"|"up"|"down" } | null = null;
  private warpHintText?: Phaser.GameObjects.Text;
  private levelSpeedMult = 1;
  private berserkLoop?: Phaser.Time.TimerEvent;
  private lastMode: "aggressive" | "frightened" | "berserk" = "aggressive";
  private palette!: {
    panelBg: number;
    fieldBg: number;
    wall: number;
    accent: number;
    pellet: number;
    power: number;
  };

  constructor() {
    super(SceneKeys.Game);
  }

  create() {
    // Reset per-run flags/state when (re)starting a level
    this.ended = false;
    this.evilMode = "aggressive";
    this.berserkUntil = 0;
    this.powerTargets = new Set<string>();
    this.selectedGhost = "";

    const levelNum = (loadRunState()?.levelNumber ?? 1);
    this.maze = new Maze(configForLevel(levelNum));
    this.palette = this.computePalette(levelNum);
    this.levelSpeedMult = this.computeLevelSpeed(levelNum);

    // Resize camera to fit maze area centrally
    const w = this.maze.width * this.tileSize;
    const h = this.maze.height * this.tileSize;
    const { width, height } = this.scale;
    const offx = Math.floor((width - w) / 2);
    const offy = Math.floor((height - h) / 2);

    // Draw background panel
    this.add
      .rectangle(width / 2, height / 2, w + 36, h + 36, this.palette.panelBg, 1)
      .setStrokeStyle(3, this.palette.accent, 0.5);

    // Draw tiles
    const g = this.add.graphics();
    g.fillStyle(this.palette.fieldBg, 1);
    g.fillRect(offx, offy, w, h);

    // Walls
    g.fillStyle(this.palette.wall, 1);
    for (let y = 0; y < this.maze.height; y++) {
      for (let x = 0; x < this.maze.width; x++) {
        if (this.maze.isPassable({ x, y })) continue;
        g.fillRect(offx + x * this.tileSize, offy + y * this.tileSize, this.tileSize, this.tileSize);
      }
    }
    // Decorative neon border that intensifies by level
    const neonAlpha = 0.25 + (levelNum - 1) * 0.04;
    g.lineStyle(2 + Math.min(4, Math.floor(levelNum / 3)), this.palette.accent, Math.min(0.9, neonAlpha));
    g.strokeRect(offx - 1, offy - 1, w + 2, h + 2);

    // Theme decoration overlay (subtle stripes/dots), intensity with level
    this.drawThemeDecor(g, offx, offy, w, h, levelNum);

    // Pellets - drawn as small dots, positions updated by EvilPac consumption
    const pelletLayer = this.add.layer();
    const drawPellets = () => {
      pelletLayer.removeAll(true);
      for (let y = 0; y < this.maze.height; y++) {
        for (let x = 0; x < this.maze.width; x++) {
          const k = `${x},${y}`;
          // Using hasPellet via try; ignore walls and borders
          if (this.maze.isPassable({ x, y }) && this.maze.hasPellet({ x, y })) {
            const cx = offx + Math.floor((x + 0.5) * this.tileSize);
            const cy = offy + Math.floor((y + 0.5) * this.tileSize);
            const c = this.add.circle(cx, cy, 3, this.palette.pellet);
            // Faster, more dramatic fade based on time and position seed
            const t = this.time.now / 1000 * 3.2 + (x * 13 + y * 7) * 0.11;
            const alpha = 0.55 + 0.4 * Math.abs(Math.sin(t));
            c.setAlpha(alpha);
            pelletLayer.add(c);
          }
          // Draw power pellets slightly bigger & distinctly tinted
          if (this.powerTargets.has(k)) {
            const cx = offx + Math.floor((x + 0.5) * this.tileSize);
            const cy = offy + Math.floor((y + 0.5) * this.tileSize);
            const p = this.add.circle(cx, cy, 7, this.palette.power);
            // Faster pulsing glow
            const t2 = this.time.now / 1000 * 2.6 + (x * 19 + y * 5) * 0.08;
            const alpha2 = 0.6 + 0.35 * Math.abs(Math.sin(t2));
            p.setAlpha(alpha2);
            pelletLayer.add(p);
          }
        }
      }
    };
    drawPellets();

    // Define four power pellet target cells if passable
    // Place four power pellets near the corners; adapt to nearest passable tile if blocked
    const corners = [
      { x: 2, y: 2 },
      { x: 2, y: this.maze.height - 3 },
      { x: this.maze.width - 3, y: 2 },
      { x: this.maze.width - 3, y: this.maze.height - 3 },
    ];
    const nearestPassable = (sx: number, sy: number) => {
      if (this.maze.isPassable({ x: sx, y: sy })) return { x: sx, y: sy };
      const maxR = 6;
      for (let r = 1; r <= maxR; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const x = sx + dx, y = sy + dy;
            if (x <= 0 || y <= 0 || x >= this.maze.width - 1 || y >= this.maze.height - 1) continue;
            if (this.maze.isPassable({ x, y })) return { x, y };
          }
        }
      }
      return null;
    };
    corners.forEach((p) => {
      const np = nearestPassable(p.x, p.y);
      if (np) this.powerTargets.add(`${np.x},${np.y}`);
    });

    // Spawn EvilPac (AI)
    const evilStart = { x: this.maze.width - 3, y: this.maze.height - 3 };
    this.evil = new EvilPacAI(this, this.maze, {
      start: evilStart,
      tileSize: this.tileSize,
      powerTargets: this.powerTargets,
      getGhostPos: () => this.ghost.position,
      getMode: () => this.evilMode,
      onConsume: (ev) => this.onEvilConsume(ev.type),
      offsetX: offx,
      offsetY: offy,
    });
    this.evil.setBaseSpeed(this.levelSpeedMult);

    // Spawn one ghost based on selection (front of ghostsAlive)
    const run = loadRunState();
    const chosen = run?.ghostsAlive?.[0] ?? GhostIDs.Blinky;
    this.selectedGhost = chosen;
    const ghostColor: Record<string, number> = {
      blinky: 0xff4d4d,
      pinky: 0xff77ff,
      inky: 0x3fd5ff,
      clyde: 0xffa94d,
    };
    const ghostStart = { x: 2, y: 2 };
    const baseOpts = { start: ghostStart, tileSize: this.tileSize, offsetX: offx, offsetY: offy };
    if (chosen === GhostIDs.Blinky) {
      this.ghost = new Blinky(this, this.maze, { ...baseOpts, color: ghostColor[chosen], getEvilPos: () => this.evil.getPosition() });
    } else if (chosen === GhostIDs.Pinky) {
      this.ghost = new Pinky(this, this.maze, { ...baseOpts, color: ghostColor[chosen], getEvilPos: () => this.evil.getPosition() });
    } else if (chosen === GhostIDs.Inky) {
      this.ghost = new Inky(this, this.maze, { ...baseOpts, color: ghostColor[chosen], getEvilPos: () => this.evil.getPosition() });
    } else if (chosen === GhostIDs.Clyde) {
      this.ghost = new Clyde(this, this.maze, { ...baseOpts, color: ghostColor[chosen] });
    } else {
      this.ghost = new GhostController(this, this.maze, { ...baseOpts, color: ghostColor[chosen] });
    }

    // Periodically refresh pellets layer after AI steps
    // Refresh pellets more frequently for smoother fade
    this.time.addEvent({ delay: 50, loop: true, callback: drawPellets });

    // HUD
    this.hudText = this.add.text(16, 16, "", { font: "16px Arial", color: "#cceedd" }).setDepth(20);
    this.updateHud();

    // Play a short level intro melody
    this.playLevelIntro();

    // Mute toggle (M)
    const mKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    mKey?.on("down", () => this.toggleMute());

    // Pause/Options (ESC)
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey?.on("down", () => {
      this.scene.pause(SceneKeys.Game);
      this.scene.launch(SceneKeys.Pause);
    });

    // Debug toggle (D)
    const dKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    dKey?.on("down", () => {
      this.debugEnabled = !this.debugEnabled;
      if (this.debugEnabled) {
        this.debugText = this.add.text(16, 40, "", { font: "14px monospace", color: "#88ffaa" }).setDepth(20);
      } else {
        this.debugText?.destroy();
        this.debugText = undefined;
      }
    });

    // Ability key (Q) for Pinky/Inky/Clyde
    this.abilityKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.abilityKey?.on("down", () => this.onAbility());

    // Warp arrows from level 4+
    if (levelNum >= 4) {
      this.initWarpArrows(levelNum);
      if (levelNum >= 8) this.showWarpHint();
    }

    // Debug hack: level skip with +/- keys
    const minusKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS);
    minusKey?.on("down", () => this.adjustLevel(-1));
    const equalsKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.EQUALS); // '+' with shift
    equalsKey?.on("down", () => this.adjustLevel(+1));
    const npSub = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_SUBTRACT);
    npSub?.on("down", () => this.adjustLevel(-1));
    const npAdd = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ADD);
    npAdd?.on("down", () => this.adjustLevel(+1));

    // Fallback key listener to handle various keyboard layouts and browsers
    this.input.keyboard?.on("keydown", (ev: KeyboardEvent) => {
      const code = ev.code;
      const key = ev.key;
      if (code === "Minus" || key === "-" || key === "_") this.adjustLevel(-1);
      if (code === "Equal" || key === "+" || key === "=") this.adjustLevel(+1);
      if (code === "NumpadSubtract") this.adjustLevel(-1);
      if (code === "NumpadAdd") this.adjustLevel(+1);
    });
  }

  update(time: number, delta: number): void {
    try {
      if (this.ended) return;
      this.tickCount++;
      const d = delta || 16;
      this.ghost.update(time, d);
      this.evil.update(time, d);
      // Drain stamina and update mode state
      this.evil.tickDrain(d);
      this.updateMode(time);
      this.applyGhostEffects(time);
      this.updateHud();
      // Debug overlay
      if (this.debugEnabled && this.debugText) {
        const ep = this.evil.getPosition();
        const pf = this.evil.getPosF();
        const dir = this.evil.getDir();
        const spd = this.evil.getSpeedTPS().toFixed(2);
        const info = this.evil.getMoverInfo();
        const rs = this.evil.getRawSpeed().toFixed(3);
        const des = this.evil.getDesired();
        const dstr = des ? `(${des.x},${des.y})` : `null`;
        this.debugText.setText(
          `tick=${this.tickCount} Evil x=${ep.x} y=${ep.y} pos=(${pf.x.toFixed(2)},${pf.y.toFixed(2)}) dir=(${dir.x},${dir.y}) desired=${dstr} tps=${spd} raw=${rs} mode=${this.evilMode}\n${info}`
        );
      }
      // Level progression
      if (this.maze.pelletCount() === 0) {
        this.onLevelComplete();
        return;
      }
    // Collision check: circle distance in tiles
    const gp = this.ghost.position;
    const ep = this.evil.getPosition();
    const dx = gp.x + 0.5 - (ep.x + 0.5);
    const dy = gp.y + 0.5 - (ep.y + 0.5);
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.5) {
      // Ghost can kill EvilPac unless EvilPac is in berserk (power pellet) mode
      if (this.evilMode === "berserk") this.onCaptureEvilWin();
      else this.onCaptureGhostWin();
    }
    } catch (err: any) {
      this.debugEnabled = true;
      if (!this.debugText) this.debugText = this.add.text(16, 40, "", { font: "14px monospace", color: "#ff8888" }).setDepth(20);
      this.debugText.setText(`ERROR in update: ${err?.message || err}`);
      console.error(err);
    }
  }

  private onAbility() {
    const now = this.time.now;
    if (this.selectedGhost === GhostIDs.Pinky) {
      const p = this.ghost as unknown as Pinky;
      if (p.tryUseTrap(now)) this.playSfx(720, 0.12, 0.08);
    } else if (this.selectedGhost === GhostIDs.Inky) {
      const i = this.ghost as unknown as Inky;
      if (i.tryGlitchStep(now)) this.playSfx(840, 0.08, 0.08);
    } else if (this.selectedGhost === GhostIDs.Clyde) {
      const c = this.ghost as unknown as Clyde;
      const decoys = c.tryScatterBait(now);
      if (decoys && decoys.length) {
        // Add to power targets to influence EvilPac pathing
        decoys.forEach((d) => this.powerTargets.add(`${d.x},${d.y}`));
        this.playSfx(560, 0.1, 0.08);
        // Schedule removal at lifeSec expiry handled by Clyde; keep a simple refresh loop cleaning when pellets consumed
      }
    }
  }

  private applyGhostEffects(now: number) {
    // Pinky trap slow
    if (this.selectedGhost === GhostIDs.Pinky) {
      const p = this.ghost as unknown as Pinky;
      const trap = p.getActiveTrap();
      if (trap) {
        const ep = this.evil.getPosition();
        const dx = ep.x + 0.5 - (trap.center.x + 0.5);
        const dy = ep.y + 0.5 - (trap.center.y + 0.5);
        const dist = Math.hypot(dx, dy);
        if (dist <= trap.radius) {
          this.evil.setSpeedMult(p.getTrapSlowMult());
        } else {
          this.evil.setSpeedMult(1);
        }
      } else {
        this.evil.setSpeedMult(1);
      }
    } else {
      this.evil.setSpeedMult(1);
    }
  }

  private updateHud() {
    const pellets = this.maze.pelletCount();
    const stamina = this.evil.getStamina();
    const level = (loadRunState()?.levelNumber ?? 1);
    const vol = loadOptions().soundVolume;
    const sound = vol > 0 ? "On" : "Off";
    if (this.hudText) {
      this.hudText.setText(`Level: ${level}   Pellets: ${pellets}   Evil Stamina: ${stamina}   Sound: ${sound} (M to toggle)`);
    }
    // Mirror to sidebar DOM HUD if present
    const byId = (id: string) => document.getElementById(id);
    const setText = (id: string, text: string) => { const el = byId(id); if (el) el.textContent = text; };
    setText("hud-level", String(level));
    setText("hud-pellets", String(pellets));
    setText("hud-stamina", String(Math.round(stamina)));
    setText("hud-sound", sound);
    // Ghost order dots
    const ghostsEl = byId("hud-ghosts");
    if (ghostsEl) {
      const run = loadRunState();
      if (run?.ghostsAlive) {
        const colors: Record<string, string> = { blinky: "#ff4d4d", pinky: "#ff77ff", inky: "#3fd5ff", clyde: "#ffa94d" };
        ghostsEl.innerHTML = run.ghostsAlive.map(g => `<span class="ghost-dot" style="background:${colors[g]||'#ccc'}"></span>`).join("");
      }
    }
  }

  private toggleMute() {
    const opts = loadOptions();
    const newVol = opts.soundVolume > 0 ? 0 : 0.8;
    saveOptions({ ...opts, soundVolume: newVol });
    this.updateHud();
  }

  private onCaptureGhostWin() {
    if (this.ended) return;
    this.ended = true;
    // Victory SFX (ascending)
    this.playMelody([523, 659, 784], 110, 0.08);
    const level = (loadRunState()?.levelNumber ?? 1);
    const pellets = this.maze.pelletCount();
    this.time.delayedCall(260, () => {
      this.scene.start(SceneKeys.Results, { outcome: "ghost_win", level, pelletsRemaining: pellets });
    });
  }

  private onCaptureEvilWin() {
    if (this.ended) return;
    this.ended = true;
    // Defeat SFX (descending)
    this.playMelody([784, 659, 523], 110, 0.08);
    const level = (loadRunState()?.levelNumber ?? 1);
    const pellets = this.maze.pelletCount();
    this.time.delayedCall(260, () => {
      this.scene.start(SceneKeys.Results, { outcome: "evil_win", level, pelletsRemaining: pellets });
    });
  }

  private updateMode(now: number) {
    const before = this.evilMode;
    // Berserk timeout
    if (this.evilMode === "berserk" && now > this.berserkUntil) {
      this.evilMode = this.evil.getStamina() <= 3 ? "frightened" : "aggressive";
    }
    // Aggressive/frightened based on stamina thresholds
    if (this.evilMode !== "berserk") {
      if (this.evil.getStamina() <= 3) this.evilMode = "frightened";
      else if (this.evil.getStamina() >= 5) this.evilMode = "aggressive";
    }
    // Visuals: ghost blue when EvilPac is on offense (berserk),
    // with a warning blink in the last second; otherwise use original colors.
    const ghostBlue = 0x4d7aff;
    const run = loadRunState();
    const chosen = run?.ghostsAlive?.[0] ?? GhostIDs.Blinky;
    const baseColors: Record<string, number> = { blinky: 0xff4d4d, pinky: 0xff77ff, inky: 0x3fd5ff, clyde: 0xffa94d };
    if (this.evilMode === "berserk") {
      // Blink between blue and the base color during the last second of berserk
      const nearExpiry = now >= this.berserkUntil - 1000;
      const blink = nearExpiry && (Math.floor(now / 150) % 2 === 0);
      const color = blink ? baseColors[chosen] : ghostBlue;
      this.ghost.setColor(color);
      this.ghost.setSpeed(SPEEDS.frightenedGhost * this.levelSpeedMult);
    } else {
      this.ghost.setColor(baseColors[chosen]);
      this.ghost.setSpeed(SPEEDS.ghost * this.levelSpeedMult);
    }
    // Evil Pac color: yellow when not on offense (berserk), red when berserk
    const evilColor = this.evilMode === "berserk" ? 0xff5555 : 0xffff00;
    this.evil.setColor(evilColor);

    // Handle berserk music start/stop on mode transitions
    if (before !== this.evilMode) {
      if (this.evilMode === "berserk") this.startBerserkMusic();
      else this.stopBerserkMusic();
      this.lastMode = this.evilMode;
    }
  }

  private computeLevelSpeed(level: number): number {
    const lvl = Math.max(1, Math.min(12, Math.floor(level)));
    const t = (lvl - 1) / 11; // 0..1
    // Non-linear curve: gentle early, accelerated late
    // Blend between a mild ease-in (pow 1.4) and a sharp late spike (pow 3) with t as the blend factor
    const gentle = Math.pow(t, 1.4);
    const sharp = Math.pow(t, 3);
    const curved = gentle * (1 - t) + sharp * t;
    const min = 0.45; // slightly slower in early levels
    const max = 1.8;  // much faster by level 12
    return min + curved * (max - min);
  }

  // Generate a color palette for the given level that becomes more saturated/bright and rotates hue over time
  private computePalette(level: number) {
    const lvl = Math.max(1, Math.min(12, Math.floor(level)));
    const t = (lvl - 1) / 11; // 0..1
    const hue = (lvl * 28) % 360; // rotate hues across levels
    const sBase = 35 + Math.floor(40 * t); // saturation grows
    const lBase = 10 + Math.floor(8 * (1 - t)); // a bit darker base
    const field = this.hsl(hue, sBase, 14 + Math.floor(8 * t));
    const wall = this.hsl(hue, 55 + Math.floor(25 * t), 28 + Math.floor(10 * t));
    const accent = this.hsl((hue + 35) % 360, 80 + Math.floor(20 * t), 55);
    const pellet = this.hsl((hue + 180) % 360, 70 + Math.floor(20 * t), 66);
    // Rotate power hue through triad/tetrad for stronger variety
    const offsets = [60, 180, 300, 90];
    const power = this.hsl((hue + offsets[lvl % offsets.length]) % 360, 90, 60);
    const panel = this.hsl(hue, 30, lBase);
    return { panelBg: panel, fieldBg: field, wall, accent, pellet, power };
  }

  private hsl(h: number, s: number, l: number): number {
    // Convert HSL to 0xRRGGBB
    const S = s / 100, L = l / 100;
    const C = (1 - Math.abs(2 * L - 1)) * S;
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = L - C / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = C; g = X; b = 0; }
    else if (h < 120) { r = X; g = C; b = 0; }
    else if (h < 180) { r = 0; g = C; b = X; }
    else if (h < 240) { r = 0; g = X; b = C; }
    else if (h < 300) { r = X; g = 0; b = C; }
    else { r = C; g = 0; b = X; }
    const R = Math.round((r + m) * 255);
    const G = Math.round((g + m) * 255);
    const B = Math.round((b + m) * 255);
    return (R << 16) | (G << 8) | B;
  }

  private drawThemeDecor(g: Phaser.GameObjects.Graphics, offx: number, offy: number, w: number, h: number, level: number) {
    const intensity = Math.min(1, 0.2 + level * 0.06);
    // Diagonal stripes
    const step = Math.max(24, 56 - level * 3);
    g.lineStyle(1, this.palette.accent, 0.08 + 0.25 * intensity);
    for (let x = -h; x < w + h; x += step) {
      g.beginPath();
      g.moveTo(offx + x, offy);
      g.lineTo(offx + x + h, offy + h);
      g.strokePath();
    }
    // Soft dots grid
    g.fillStyle(this.palette.accent, 0.05 + 0.2 * intensity);
    const dstep = Math.max(32, 72 - level * 4);
    for (let yy = dstep / 2; yy < h; yy += dstep) {
      for (let xx = dstep / 2; xx < w; xx += dstep) {
        g.fillCircle(offx + xx, offy + yy, 2);
      }
    }
  }

  private onEvilConsume(type: "pellet" | "power") {
    if (type === "power") {
      this.evilMode = "berserk";
      const lvl = (loadRunState()?.levelNumber ?? 1);
      this.berserkUntil = this.time.now + this.computeBerserkDuration(lvl);
      // SFX cue for power pellet
      this.playSfx(300, 0.18, 0.1);
      // Start berserk music loop
      this.startBerserkMusic();
      return;
    }
    if (type === "pellet") {
      // Regular pellet eat SFX at half volume
      this.playSfx(520, 0.06, 0.05);
    }
  }

  // Approximate classic power pellet durations (ms), decreasing as levels rise
  private computeBerserkDuration(level: number): number {
    const lvl = Math.max(1, Math.min(12, Math.floor(level)));
    // Table (L1..L12): 6s,6s,5s,5s,4s,4s,3s,3s,2s,2s,1.5s,1.2s
    const table = [0, 6000, 6000, 5000, 5000, 4000, 4000, 3000, 3000, 2000, 2000, 1500, 1200];
    return table[lvl] || 2000;
  }

  private onLevelComplete() {
    if (this.ended) return;
    this.ended = true;
    const level = (loadRunState()?.levelNumber ?? 1);
    this.scene.start(SceneKeys.Results, { outcome: "level_complete", level });
  }

  // Lightweight oscillator SFX (reuses options volume)
  private playSfx(freq = 660, durationSec = 0.1, volMul = 0.06) {
    try {
      const vol = loadOptions().soundVolume;
      if (!vol) return;
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = (this.sound as any)?.context || new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.value = volMul * vol;
      osc.connect(gain);
      gain.connect(ctx.destination);
      if ((ctx.state as any) === "suspended" && (ctx as any).resume) {
        (ctx as any).resume();
      }
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + durationSec);
    } catch {}
  }

  // Play a quick series of tones
  private playMelody(freqs: number[], stepMs = 140, volMul = 0.06) {
    freqs.forEach((f, i) => {
      this.time.delayedCall(i * stepMs, () => this.playSfx(f, 0.09, volMul));
    });
  }

  private playLevelIntro() {
    // Stop any lingering berserk loop
    this.stopBerserkMusic();
    // Simple cheerful arpeggio
    const intro = [392, 523, 659, 784];
    this.playMelody(intro, 130, 0.05);
  }

  private startBerserkMusic() {
    this.stopBerserkMusic();
    let i = 0;
    const pattern = [880, 988, 1046, 988]; // simple high-energy loop
    this.berserkLoop = this.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        // Slightly quicker pattern near expiry
        const nearExpiry = this.time.now >= this.berserkUntil - 1000;
        if (nearExpiry && this.berserkLoop) this.berserkLoop.delay = 160;
        const f = pattern[i % pattern.length];
        i++;
        this.playSfx(f, 0.08, 0.04);
      },
    });
  }

  private stopBerserkMusic() {
    if (this.berserkLoop) {
      this.berserkLoop.remove(false);
      this.berserkLoop = undefined;
    }
  }

  private initWarpArrows(levelNum: number) {
    const wp = this.maze.getWarpPoints();
    // Initial directions: pair to opposite warp
    this.warpDirState = {
      left: "right",
      right: "left",
      top: "down",
      bottom: "up",
    };
    this.maze.setWarpArrows(this.warpDirState);
    // Draw arrows
    const toPx = (t: { x: number; y: number }) => ({ x: this.toPxX(t.x + 0.5), y: this.toPxY(t.y + 0.5) });
    const addArrow = (tileKey: string, dir: string) => {
      const [tx, ty] = tileKey.split(",").map(Number);
      const pos = toPx({ x: tx, y: ty });
      const glyph = dir === "left" ? "\u2190" : dir === "right" ? "\u2192" : dir === "up" ? "\u2191" : "\u2193";
      const txt = this.add.text(pos.x, pos.y, glyph, { font: "24px Arial", color: "#ffdd66" }).setOrigin(0.5).setDepth(30);
      this.warpArrowTexts.push(txt);
      return txt;
    };
    this.warpArrowTexts.forEach(t => t.destroy());
    this.warpArrowTexts = [];
    addArrow(wp.left, this.warpDirState.left);
    addArrow(wp.right, this.warpDirState.right);
    addArrow(wp.top, this.warpDirState.top);
    addArrow(wp.bottom, this.warpDirState.bottom);

    // From level 8, allow toggling rotation clockwise via key (W)
    if (levelNum >= 8) {
      const rotate = () => {
        if (!this.warpDirState) return;
        const next = (d: string) => (d === "up" ? "right" : d === "right" ? "down" : d === "down" ? "left" : "up") as any;
        this.warpDirState = {
          left: next(this.warpDirState.left),
          right: next(this.warpDirState.right),
          top: next(this.warpDirState.top),
          bottom: next(this.warpDirState.bottom),
        };
        this.maze.setWarpArrows(this.warpDirState);
        // Update glyphs
        const glyph = (d: string) => (d === "left" ? "\u2190" : d === "right" ? "\u2192" : d === "up" ? "\u2191" : "\u2193");
        const [l, r, t, b] = this.warpArrowTexts;
        if (l) l.setText(glyph(this.warpDirState.left));
        if (r) r.setText(glyph(this.warpDirState.right));
        if (t) t.setText(glyph(this.warpDirState.top));
        if (b) b.setText(glyph(this.warpDirState.bottom));
        // Brief animation to draw attention
        this.animateWarpArrows();
      };
      const wKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      wKey?.on("down", rotate);
    }
  }

  private toPxX(xTiles: number) {
    // re-use offsets for consistent conversion
    const w = this.maze.width * this.tileSize;
    const { width } = this.scale;
    const offx = Math.floor((width - w) / 2);
    return offx + Math.floor(xTiles * this.tileSize);
  }
  private toPxY(yTiles: number) {
    const h = this.maze.height * this.tileSize;
    const { height } = this.scale;
    const offy = Math.floor((height - h) / 2);
    return offy + Math.floor(yTiles * this.tileSize);
  }

  private showWarpHint() {
    const { width, height } = this.scale;
    // Place near bottom center above border
    const txt = this.add.text(width / 2, height - 24, "W: Rotate warp arrows", {
      font: "16px Arial",
      color: "#ffdd66",
    }).setOrigin(0.5).setDepth(40);
    this.warpHintText = txt;
    // Fade out after a few seconds
    this.tweens.add({ targets: txt, alpha: 0, delay: 2200, duration: 800, onComplete: () => txt.destroy() });
  }

  private animateWarpArrows() {
    const targets = this.warpArrowTexts.filter(Boolean);
    if (!targets.length) return;
    // Pop effect: quick scale up and back, slight alpha pulse
    targets.forEach((t) => {
      t.setScale(1);
      t.setAlpha(1);
    });
    this.tweens.add({ targets, scaleX: 1.3, scaleY: 1.3, duration: 100, yoyo: true, ease: 'Quad.Out' });
    this.tweens.add({ targets, alpha: 0.7, duration: 100, yoyo: true, ease: 'Quad.Out' });
  }

  // Hacky level adjustor for testing: +/- to move between levels 1..12
  private adjustLevel(delta: number) {
    const run = loadRunState() || newRun();
    const current = run.levelNumber ?? 1;
    const next = Math.max(1, Math.min(12, current + delta));
    if (next === current) return;
    run.levelNumber = next;
    saveRunState(run);
    // Restart game at new level immediately
    this.scene.stop(SceneKeys.Game);
    this.scene.start(SceneKeys.Game);
  }

  private advanceLevelOrCutscene() {
    const run = loadRunState();
    const currentLevel = run?.levelNumber ?? 1;
    const nextLevel = Math.min(currentLevel + 1, 12);
    const milestones = new Set([3, 6, 9, 12]);
    if (run) {
      run.levelNumber = nextLevel;
      saveRunState(run);
    }
    if (milestones.has(nextLevel - 1)) {
      this.scene.start(SceneKeys.Cutscene, { level: nextLevel - 1 });
      return;
    }
    if (nextLevel > 12) {
      this.scene.start(SceneKeys.Title);
      return;
    }
    this.scene.stop(SceneKeys.Game);
    this.scene.start(SceneKeys.Game);
  }
}

export default GameScene;
