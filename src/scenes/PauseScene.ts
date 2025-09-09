import Phaser from "phaser";
import { SceneKeys } from "../core/const";
import { loadOptions, saveOptions } from "../core/save";

export default class PauseScene extends Phaser.Scene {
  private vol = 0.8;
  private captions = false;
  private volText?: Phaser.GameObjects.Text;
  private capText?: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.Pause);
  }

  create() {
    const { width, height } = this.scale;
    const opts = loadOptions();
    this.vol = typeof opts.soundVolume === "number" ? opts.soundVolume : 0.8;
    this.captions = !!opts.captionsEnabled;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    this.add.text(width / 2, height * 0.28, "Paused", { font: "32px Arial", color: "#cceedd" }).setOrigin(0.5);

    this.volText = this.add
      .text(width / 2, height * 0.45, this.volLabel(), { font: "20px Arial", color: "#88ffaa" })
      .setOrigin(0.5);
    this.capText = this.add
      .text(width / 2, height * 0.54, this.capLabel(), { font: "20px Arial", color: "#88ffaa" })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.74, "ESC to resume  •  Left/Right adjust volume  •  C toggle captions", {
        font: "16px Arial",
        color: "#cceedd",
      })
      .setOrigin(0.5);

    // Keyboard controls
    const esc = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    esc?.once("down", () => this.resumeGame());
    const left = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const right = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    left?.on("down", () => this.adjustVol(-0.05));
    right?.on("down", () => this.adjustVol(+0.05));
    const c = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    c?.on("down", () => this.toggleCaptions());

    // Gamepad controls
    this.input.gamepad?.once("connected", (pad: Phaser.Input.Gamepad.Gamepad) => {
      pad.on("down", (button: any) => {
        const idx = button.index;
        if (idx === 1 || idx === 9) this.resumeGame(); // B or Start
        if (idx === 14) this.adjustVol(-0.05); // dpad left
        if (idx === 15) this.adjustVol(+0.05); // dpad right
        if (idx === 2) this.toggleCaptions(); // X
      });
    });
    for (const pad of this.input.gamepad?.pads || []) {
      if (!pad) continue;
      pad.on("down", (button: any) => {
        const idx = button.index;
        if (idx === 1 || idx === 9) this.resumeGame();
        if (idx === 14) this.adjustVol(-0.05);
        if (idx === 15) this.adjustVol(+0.05);
        if (idx === 2) this.toggleCaptions();
      });
    }
  }

  private volLabel() {
    const pct = Math.round(this.vol * 100);
    return `Sound Volume: ${pct}%`;
  }
  private capLabel() {
    return `Captions: ${this.captions ? "On" : "Off"}`;
    }

  private adjustVol(delta: number) {
    this.vol = Math.max(0, Math.min(1, this.vol + delta));
    this.volText?.setText(this.volLabel());
    const opts = loadOptions();
    saveOptions({ ...opts, soundVolume: this.vol });
  }

  private toggleCaptions() {
    this.captions = !this.captions;
    this.capText?.setText(this.capLabel());
    const opts = loadOptions();
    saveOptions({ ...opts, captionsEnabled: this.captions });
  }

  private resumeGame() {
    this.scene.stop(SceneKeys.Pause);
    this.scene.resume(SceneKeys.Game);
  }
}

