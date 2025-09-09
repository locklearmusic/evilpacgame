import Phaser from "phaser";
import { SceneKeys } from "../core/const";
import { loadRunState, saveRunState } from "../core/save";

type Outcome = "ghost_win" | "evil_win" | "level_complete";

export interface ResultsData {
  outcome: Outcome;
  level: number;
  pelletsRemaining?: number;
}

export default class ResultsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Results);
  }

  create(data: ResultsData) {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    const title =
      data.outcome === "ghost_win"
        ? "Caught Evil Pac!"
        : data.outcome === "evil_win"
        ? "Evil Pac got you!"
        : "Level Complete";

    this.add.text(width / 2, height * 0.35, title, { font: "32px Arial", color: "#cceedd" }).setOrigin(0.5);

    const info: string[] = [];
    info.push(`Level: ${data.level}`);
    if (typeof data.pelletsRemaining === "number") info.push(`Pellets left: ${data.pelletsRemaining}`);
    this.add.text(width / 2, height * 0.48, info.join("  •  "), { font: "18px Arial", color: "#88ffaa" }).setOrigin(0.5);

    const hint = this.add
      .text(width / 2, height * 0.7, "Press Enter to continue", { font: "18px Arial", color: "#cceedd" })
      .setOrigin(0.5);

    const proceed = () => this.onContinue(data);
    const enter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enter?.once("down", proceed);

    // Gamepad A / Start
    this.input.gamepad?.once("connected", (pad: Phaser.Input.Gamepad.Gamepad) => {
      pad.once("down", proceed);
    });
    // If already connected
    for (const pad of this.input.gamepad?.pads || []) {
      if (pad) pad.once("down", proceed);
    }

    // Auto-continue after a short delay
    this.time.delayedCall(2000, proceed);
  }

  private onContinue(data: ResultsData) {
    if (data.outcome === "level_complete" || data.outcome === "ghost_win") {
      // Advance level and possibly go to cutscene
      const run = loadRunState();
      const completedLevel = data.level;
      const nextLevel = Math.min((run?.levelNumber ?? completedLevel) + 1, 12);
      const milestones = new Set([3, 6, 9, 12]);
      if (run) {
        run.levelNumber = nextLevel;
        saveRunState(run);
      }
      if (milestones.has(completedLevel)) {
        this.scene.start(SceneKeys.Cutscene, { level: completedLevel });
        return;
      }
      if (completedLevel >= 12) {
        this.scene.start(SceneKeys.Title);
        return;
      }
      this.scene.start(SceneKeys.Game);
      return;
    }

    if (data.outcome === "evil_win") {
      // Remove current ghost and continue if any remain; else return to Title
      const run = loadRunState();
      const current = run?.ghostsAlive?.[0];
      if (run && current) {
        run.ghostsAlive = run.ghostsAlive.filter((g) => g !== current);
        saveRunState(run);
      }
      const remaining = run?.ghostsAlive?.length ?? 0;
      if (remaining > 0) this.scene.start(SceneKeys.Game);
      else this.scene.start(SceneKeys.Title);
      return;
    }
  }
}

