import Phaser from "phaser";
import { SceneKeys } from "../core/const";
import { Strings } from "../config/strings";

export class TitleScene extends Phaser.Scene {
  private startKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SceneKeys.Title);
  }

  create() {
    const { width, height } = this.scale;

    // If a graphic logo was supplied (preloaded in Boot), show it; otherwise fall back to styled text
    const texKey = this.textures.exists("logo") ? "logo" : "";
    if (texKey) {
      const img = this.add.image(width / 2, height * 0.32, texKey).setOrigin(0.5);
      // Scale to fit within 70% of screen width
      const maxW = width * 0.7;
      const s = Math.min(1, maxW / img.width);
      img.setScale(s);
    } else {
      // Neon-styled title fallback
      this.addNeonTitle(width / 2, height * 0.35, (Strings.TitleText || "EVIL PAC").toUpperCase());
      // eslint-disable-next-line no-console
      console.info("TitleScene: place logo PNG at public/assets/evil-pac-logo.png");
    }

    this.add.text(width / 2, height * 0.55, Strings.StartPrompt, {
      font: "24px Arial",
      color: "#ff6666",
    }).setOrigin(0.5, 0.5);

    // Quick access to Tutorial
    this.add.text(width / 2, height * 0.62, "Press T for Tutorial", {
      font: "16px Arial",
      color: "#aa7777",
    }).setOrigin(0.5, 0.5);

    this.startKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.startKey?.on("down", () => this.scene.start(SceneKeys.Tutorial));

    // T to jump straight to Tutorial
    const tutorialKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    tutorialKey?.on("down", () => this.scene.start(SceneKeys.Tutorial));

    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.start(SceneKeys.Tutorial);
    });

    // Gamepad: A/Start to continue
    this.input.gamepad?.once("connected", (pad: Phaser.Input.Gamepad.Gamepad) => {
      pad.on("down", () => this.scene.start(SceneKeys.Tutorial));
    });
    for (const pad of this.input.gamepad?.pads || []) {
      if (pad) pad.on("down", () => this.scene.start(SceneKeys.Tutorial));
    }
  }

  private addNeonTitle(x: number, y: number, text: string) {
    // Back glow layer (additive)
    const glow = this.add.text(x, y, text, {
      font: "bold 88px Arial",
      color: "#ff2d2d",
    })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setBlendMode(Phaser.BlendModes.ADD);
    glow.setShadow(0, 0, "#ff2d2d", 24, true, true);

    // Core outlined letters with dark inner fill
    const core = this.add.text(x, y, text, {
      font: "bold 84px Arial",
      color: "#2a2a2a",
      stroke: "#ff3d3d",
      strokeThickness: 8,
    }).setOrigin(0.5);
    core.setShadow(0, 0, "#ff1f1f", 8, true, true);

    // Subtle inner highlight layer to simulate inner glow
    const inner = this.add.text(x, y, text, {
      font: "bold 84px Arial",
      color: "#3a3a3a",
    })
      .setOrigin(0.5)
      .setAlpha(0.6);

    // Slight parallax offset for depth
    inner.y += 1;

    // Flicker animation for neon effect
    this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => {
        const on = Math.random() > 0.2;
        const alpha = on ? 0.85 : 0.5;
        this.tweens.add({ targets: glow, alpha, duration: 180, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
      },
    });
  }
}

export default TitleScene;
