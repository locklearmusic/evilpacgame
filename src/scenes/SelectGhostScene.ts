import Phaser from "phaser";
import { SceneKeys, GhostIDs } from "../core/const";
import { loadOptions } from "../core/save";
import type { GhostID } from "../core/const";
import { loadRunState, newRun, saveRunState } from "../core/save";
import { GhostsMeta } from "../config/ghosts";

const ORDER: GhostID[] = [GhostIDs.Blinky, GhostIDs.Pinky, GhostIDs.Inky, GhostIDs.Clyde];

export class SelectGhostScene extends Phaser.Scene {
  private index = 0;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private optionDots: Phaser.GameObjects.Container[] = [];
  private hintText?: Phaser.GameObjects.Text;
  private transitioning = false;
  private started = false;

  constructor() {
    super(SceneKeys.SelectGhost);
  }

  create() {
    const { width, height } = this.scale;
    const uiScaleGlobal = Phaser.Math.Clamp(width / 1100, 0.7, 1.0);

    // Background: arcade cabinet PNG if available, otherwise dark backdrop
    const bgKey = this.textures.exists("arcade") ? "arcade" : "";
    if (bgKey) {
      const bg = this.add.image(width / 2, height / 2, bgKey).setOrigin(0.5).setDepth(0);
      const sx = width / bg.width;
      const sy = height / bg.height;
      const s = Math.max(sx, sy);
      bg.setScale(s);
      // Dim for text legibility (lighter so background is visible)
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35).setDepth(1);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setDepth(1);
      // Helpful console notice once if assets are missing
      // eslint-disable-next-line no-console
      console.info("SelectGhostScene: place background PNG at public/assets/arcade-bg.png");
    }

    const screen = this.getArcadeScreenRect(width, height);
    // Optional themed frame inside arcade screen based on upcoming level
    try {
      const nextLevel = (loadRunState()?.levelNumber ?? 1);
      const pal = this.previewPalette(nextLevel);
      const deco = this.add.graphics().setDepth(1.5);
      deco.lineStyle(2, pal.accent, 0.6).strokeRoundedRect(screen.x, screen.y, screen.width, screen.height, 10);
      deco.fillStyle(pal.fieldBg, 0.08).fillRoundedRect(screen.x, screen.y, screen.width, screen.height, 10);
    } catch {}
    const uiScale = Phaser.Math.Clamp(screen.width / 650, 0.7, 1.05) * uiScaleGlobal;
    this.add
      .text(screen.x + screen.width / 2, screen.y + screen.height * 0.06, "Select Your Ghost", {
        font: `${Math.round(22 * uiScale)}px Arial`,
        color: "#00ff99",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(2);

    // Only show names here (ability hints will be shown in-game)
    const ghostLabels: Record<GhostID, string> = {
      [GhostIDs.Blinky]: `1) ${GhostsMeta[GhostIDs.Blinky].name}`,
      [GhostIDs.Pinky]: `2) ${GhostsMeta[GhostIDs.Pinky].name}`,
      [GhostIDs.Inky]: `3) ${GhostsMeta[GhostIDs.Inky].name}`,
      [GhostIDs.Clyde]: `4) ${GhostsMeta[GhostIDs.Clyde].name}`,
    } as const;

    const ghostColors: Record<GhostID, number> = {
      [GhostIDs.Blinky]: 0xff4d4d, // red
      [GhostIDs.Pinky]: 0xff77ff,  // pink
      [GhostIDs.Inky]: 0x3fd5ff,   // cyan
      [GhostIDs.Clyde]: 0xffa94d,  // orange
    } as const;

    const textX = Math.floor(screen.x + screen.width * 0.33);
    const dotX = Math.floor(screen.x + screen.width * 0.20);
    const wrapW = Math.floor(screen.width * 0.58);
    // Move selection list up ~30 px compared to previous placement
    let curY = Math.max(0, Math.floor(screen.y + screen.height * 0.20) - 30);
    ORDER.forEach((id, i) => {
      // Create wrapped label block; origin top-left to measure height
      const t = this.add
        .text(textX, curY, ghostLabels[id], {
          font: `${Math.round(18 * uiScale)}px Arial`,
          color: "#cccccc",
          wordWrap: { width: wrapW, useAdvancedWrap: true },
        } as any)
        .setOrigin(0, 0)
        .setDepth(2)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.POINTER_DOWN, () => this.confirmSelection(id))
        .on(Phaser.Input.Events.POINTER_OVER, () => this.setSelection(i, "hover"));
      this.optionTexts.push(t);

      // Ghost icon resembling gameplay character
      const bounds = t.getBounds();
      const iconY = bounds.y + Math.min(bounds.height * 0.35, 12 * uiScale);
      const icon = this.drawGhostIcon(dotX, iconY, ghostColors[id], Math.max(14, Math.floor(18 * uiScale)));
      icon.setDepth(2);
      icon.setInteractive(new Phaser.Geom.Rectangle(-14, -14, 28, 28), Phaser.Geom.Rectangle.Contains)
        .on(Phaser.Input.Events.POINTER_DOWN, () => this.confirmSelection(id))
        .on(Phaser.Input.Events.POINTER_OVER, () => this.setSelection(i, "hover"));
      this.optionDots.push(icon);

      // Advance Y by measured height + spacing
      const spacing = Math.max(12, Math.floor(16 * uiScale));
      curY = bounds.y + bounds.height + spacing;
    });

    this.hintText = this.add
      .text(screen.x + screen.width / 2, Math.min(screen.y + screen.height * 0.95, height - 18), "Arrows • Enter to confirm • Q ability in-game", {
        font: `${Math.round(14 * uiScale)}px Arial`,
        color: "#888888",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(2);

    this.input.keyboard?.on("keydown", (evt: KeyboardEvent) => this.handleKey(evt));
    this.updateHighlight();

    // Selection music loop (synthesized) — stop on exit
    this.startSelectionMusic();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopSelectionMusic());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.stopSelectionMusic());

    // Gamepad support: D-pad/left stick navigate, A/Start confirm
    const attachPad = (pad: Phaser.Input.Gamepad.Gamepad) => {
      let lastMoveTs = 0;
      const moveRepeatMs = 180;
      pad.on("down", (button: any) => {
        const idx = button.index;
        if (idx === 12) this.setSelection((this.index + ORDER.length - 1) % ORDER.length, "keyboard"); // dpad up
        if (idx === 13) this.setSelection((this.index + 1) % ORDER.length, "keyboard"); // dpad down
        if (idx === 0 || idx === 9) this.confirmSelection(ORDER[this.index]); // A or Start
        if (idx === 1) this.confirmSelection(ORDER[this.index]); // B also confirm for leniency
      });
      // Left stick polling for navigation with debounce
      this.time.addEvent({ delay: 60, loop: true, callback: () => {
        if (!pad.connected) return;
        const now = this.time.now;
        const axY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
        if (axY < -0.5 && now - lastMoveTs > moveRepeatMs) {
          this.setSelection((this.index + ORDER.length - 1) % ORDER.length, "keyboard");
          lastMoveTs = now;
        } else if (axY > 0.5 && now - lastMoveTs > moveRepeatMs) {
          this.setSelection((this.index + 1) % ORDER.length, "keyboard");
          lastMoveTs = now;
        }
      }});
    };
    this.input.gamepad?.once("connected", (pad) => attachPad(pad));
    for (const pad of this.input.gamepad?.pads || []) { if (pad) attachPad(pad); }
  }

  private handleKey(evt: KeyboardEvent) {
    switch (evt.code) {
      case "ArrowUp":
        this.setSelection((this.index + ORDER.length - 1) % ORDER.length, "keyboard");
        break;
      case "ArrowDown":
        this.setSelection((this.index + 1) % ORDER.length, "keyboard");
        break;
      case "Enter":
      case "NumpadEnter":
        this.confirmSelection(ORDER[this.index]);
        break;
      case "Digit1":
      case "Numpad1":
        this.confirmSelection(ORDER[0]);
        break;
      case "Digit2":
      case "Numpad2":
        this.confirmSelection(ORDER[1]);
        break;
      case "Digit3":
      case "Numpad3":
        this.confirmSelection(ORDER[2]);
        break;
      case "Digit4":
      case "Numpad4":
        this.confirmSelection(ORDER[3]);
        break;
    }
  }

  private setSelection(i: number, cause: "hover" | "keyboard") {
    if (i === this.index) return;
    this.index = i;
    this.updateHighlight();
    // soft tick on navigation
    this.playTick(520, 0.05);
  }

  private updateHighlight() {
    this.optionTexts.forEach((t, i) => {
      const selected = i === this.index;
      const normalSize = Math.round(24 * Phaser.Math.Clamp(this.scale.width / 1100, 0.7, 1.0));
      const selectedSize = normalSize + 2;
      try {
        t.setStyle({
          color: selected ? "#00ff99" : "#cccccc",
          fontStyle: selected ? "bold" : "",
          fontSize: `${selected ? selectedSize : normalSize}px`,
          fontFamily: "Arial",
        } as any);
      } catch {}
      const base = t.text.replace(/^▶\s+/, "");
      t.setText(selected ? "\u25B6 " + base : base); // triangle prefix when selected
      const d = this.optionDots[i];
      d.setScale(selected ? 1.15 : 1.0);
    });
  }

  private drawGhostIcon(x: number, y: number, color: number, size: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    c.add(g);
    // Body
    g.fillStyle(color, 1);
    const r = Math.floor(size * 0.45);
    const h = Math.floor(size * 0.9);
    g.beginPath();
    g.arc(0, -h * 0.25, r, Math.PI, 0, false);
    g.lineTo(r, h * 0.25);
    const scallop = Math.max(3, Math.floor(r * 0.6));
    const bumps = 3;
    for (let i = bumps; i >= 0; i--) {
      const px = -r + (i * (r * 2)) / bumps;
      g.arc(px, h * 0.25, scallop, 0, Math.PI, true);
    }
    g.lineTo(-r, -h * 0.25);
    g.closePath();
    g.fillPath();
    // Eyes
    const eyeW = Math.max(4, Math.floor(size * 0.18));
    const eyeH = Math.max(6, Math.floor(size * 0.24));
    const offX = Math.max(5, Math.floor(size * 0.22));
    const eyeY = -Math.floor(size * 0.05);
    const eL = this.add.ellipse(-offX, eyeY, eyeW, eyeH, 0xffffff);
    const eR = this.add.ellipse(+offX, eyeY, eyeW, eyeH, 0xffffff);
    const pL = this.add.circle(-offX, eyeY + 1, Math.max(2, Math.floor(size * 0.08)), 0x000000);
    const pR = this.add.circle(+offX, eyeY + 1, Math.max(2, Math.floor(size * 0.08)), 0x000000);
    c.add([eL, eR, pL, pR]);
    return c;
  }

  private getArcadeScreenRect(viewW: number, viewH: number) {
    // Tuned area of the arcade display for the provided art
    // Adjust these constants to nudge fit if needed
    const x = Math.floor(viewW * 0.305);
    const y = Math.floor(viewH * 0.245); // move up ~ (0.01 * viewH) ≈ 10-12px on 1080p; we also subtract 30px above
    const w = Math.floor(viewW * 0.385);
    const h = Math.floor(viewH * 0.335);
    return { x, y, width: w, height: h };
  }

  // Small palette preview mirroring GameScene scheme for the upcoming level
  private previewPalette(level: number) {
    const lvl = Math.max(1, Math.min(12, Math.floor(level)));
    const t = (lvl - 1) / 11;
    const hue = (lvl * 28) % 360;
    const hsl = (h: number, s: number, l: number) => {
      const S = s / 100, L = l / 100;
      const C = (1 - Math.abs(2 * L - 1)) * S;
      const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = L - C / 2;
      let r=0,g=0,b=0; if (h<60){r=C;g=X;} else if(h<120){r=X;g=C;} else if(h<180){g=C;b=X;} else if(h<240){g=X;b=C;} else if(h<300){r=X;b=C;} else {r=C;b=X;}
      const R=Math.round((r+m)*255),G=Math.round((g+m)*255),B=Math.round((b+m)*255);
      return (R<<16)|(G<<8)|B;
    };
    const fieldBg = hsl(hue, 35 + Math.floor(40*t), 14 + Math.floor(8*t));
    const accent = hsl((hue+35)%360, 80 + Math.floor(20*t), 55);
    return { fieldBg, accent } as any;
  }
  private confirmSelection(id: GhostID) {
    if (this.transitioning) return;
    this.transitioning = true;
    // Always start a fresh run on (re)start so level resets to 1
    const run = newRun();
    // Move selected ghost to the front of ghostsAlive order (unique)
    const rest = run.ghostsAlive.filter((g) => g !== id);
    run.ghostsAlive = [id, ...rest];
    saveRunState(run);

    // Blink and beep, then continue
    const idx = ORDER.indexOf(id);
    if (idx >= 0) {
      const t = this.optionTexts[idx];
      const d = this.optionDots[idx];
      this.playBeep(880, 0.12);
      this.tweens.add({
        targets: [t, d],
        alpha: 0.2,
        yoyo: true,
        repeat: 2,
        duration: 150,
        ease: 'Sine.InOut',
        onComplete: () => this.startGameOnce(),
      });
      // Fallback in case tween is interrupted
      this.time.delayedCall(400, () => this.startGameOnce());
    } else {
      this.startGameOnce();
    }
  }

  private startGameOnce() {
    if (this.started) return;
    this.started = true;
    this.scene.start(SceneKeys.Game);
  }

  private playBeep(freq = 660, durationSec = 0.1) {
    try {
      const vol = loadOptions().soundVolume;
      if (!vol) return;
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      // Use Phaser's audio context if available, else create a lightweight one
      const ctx: AudioContext = (this.sound as any)?.context || new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.value = 0.04 * vol;
      osc.connect(gain);
      gain.connect(ctx.destination);
      if ((ctx.state as any) === "suspended" && (ctx as any).resume) {
        (ctx as any).resume();
      }
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // no-op if audio unavailable
    }
  }

  private playTick(freq = 440, durationSec = 0.04) {
    try {
      const vol = loadOptions().soundVolume;
      if (!vol) return;
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = (this.sound as any)?.context || new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.value = 0.02 * vol;
      osc.connect(gain);
      gain.connect(ctx.destination);
      if ((ctx.state as any) === "suspended" && (ctx as any).resume) {
        (ctx as any).resume();
      }
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // ignore
    }
  }

  // Simple selection music arpeggio using oscillator SFX
  private musicTimer?: Phaser.Time.TimerEvent;
  private startSelectionMusic() {
    this.stopSelectionMusic();
    let i = 0;
    const pattern = [392, 440, 523, 659, 523, 440];
    this.musicTimer = this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        const f = pattern[i % pattern.length];
        i++;
        this.playTick(f, 0.085);
      },
    });
  }
  private stopSelectionMusic() {
    if (this.musicTimer) {
      this.musicTimer.remove(false);
      this.musicTimer = undefined;
    }
  }
}

export default SelectGhostScene;
