import Phaser from "phaser";
import { SceneKeys, GhostIDs } from "../core/const";
import { loadRunState } from "../core/save";

type GhostKey = keyof typeof GhostIDs;

export default class CutsceneScene extends Phaser.Scene {
  private finished = false;
  constructor() {
    super(SceneKeys.Cutscene);
  }

  create(data: { level: number }) {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);

    const run = loadRunState();
    const ghost = (run?.ghostsAlive?.[0] ?? GhostIDs.Blinky) as string;
    const chapter = Math.max(1, Math.min(4, Math.floor((data.level) / 3)));

    const title = this.add
      .text(width / 2, height * 0.20, `Chapter ${chapter}`, { font: "26px Arial", color: "#cceedd" })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(width / 2, height * 0.28, ghost.toUpperCase(), { font: "36px Arial", color: "#00ff99" })
      .setOrigin(0.5);

    const lines = this.getStoryLines(ghost, chapter);
    const lineText = this.add.text(width / 2, height * 0.80, "", {
      font: "20px Arial",
      color: "#cceedd",
      align: "center",
      wordWrap: { width: width * 0.9 },
    }).setOrigin(0.5);

    // Ghost icon and simple animations per ghost
    const colorMap: Record<string, number> = {
      blinky: 0xff4d4d,
      pinky: 0xff77ff,
      inky: 0x3fd5ff,
      clyde: 0xffa94d,
    };
    const gColor = colorMap[ghost] ?? 0xffffff;
    const ghostIcon = this.add.circle(width * 0.5, height * 0.5, Math.floor(24 * 0.9), gColor).setDepth(5);

    // Helper to show line with smooth fade
    const showLine = (text: string, delayMs: number, holdMs = 1000) => {
      this.time.delayedCall(delayMs, () => {
        lineText.setAlpha(0);
        lineText.setText(text);
        this.tweens.add({ targets: lineText, alpha: 1, duration: 320, ease: 'Sine.Out' });
        // Keep visible; we allow overlap into next line which will reset text
      });
    };

    // Simple per-ghost motion scheduled alongside lines
    const motion = (kind: string, delayMs: number) => {
      this.time.delayedCall(delayMs, () => {
        if (ghost === GhostIDs.Blinky) {
          this.tweens.add({ targets: ghostIcon, x: width * 0.2, duration: 500, ease: 'Sine.InOut' });
          this.tweens.add({ targets: ghostIcon, x: width * 0.8, duration: 600, ease: 'Sine.InOut', delay: 500 });
          this.tweens.add({ targets: ghostIcon, x: width * 0.5, duration: 400, ease: 'Sine.InOut', delay: 1100 });
          this.tweens.add({ targets: ghostIcon, scale: 1.2, yoyo: true, duration: 220, ease: 'Quad.Out', delay: 1550 });
        } else if (ghost === GhostIDs.Pinky) {
          const ring = this.add.circle(ghostIcon.x, ghostIcon.y, 6, 0xffccee, 0.15).setDepth(4);
          this.tweens.add({ targets: ring, radius: 90, alpha: 0, duration: 900, onComplete: () => ring.destroy() });
        } else if (ghost === GhostIDs.Inky) {
          this.tweens.add({ targets: ghostIcon, alpha: 0, duration: 120, ease: 'Quad.In', onComplete: () => {
            ghostIcon.x = width * (0.3 + Math.random() * 0.4);
            ghostIcon.y = height * (0.4 + Math.random() * 0.2);
          }});
          this.tweens.add({ targets: ghostIcon, alpha: 1, duration: 120, ease: 'Quad.Out', delay: 140 });
        } else {
          const makeDecoy = () => {
            const dx = (Math.random() * 2 - 1) * 40;
            const dy = (Math.random() * 2 - 1) * 40;
            const d = this.add.circle(ghostIcon.x + dx, ghostIcon.y + dy, 4, 0xffe26b, 0.9).setDepth(4);
            this.tweens.add({ targets: d, alpha: 0, y: d.y - 6, duration: 600, ease: 'Sine.In', onComplete: () => d.destroy() });
          };
          makeDecoy(); makeDecoy(); makeDecoy();
        }
      });
    };

    // Schedule three steps (lines + motions)
    const stepGap = 1400; // slightly faster pacing to avoid long hangs
    showLine(lines[0] || "...", 0);
    motion(ghost, 0);
    showLine(lines[1] || "...", stepGap);
    motion(ghost, stepGap);
    showLine(lines[2] || "...", stepGap * 2);
    motion(ghost, stepGap * 2);

    // Skip / proceed
    const proceed = () => this.finish();
    const enter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enter?.once("down", proceed);
    // Also allow any key or pointer to proceed
    this.input.keyboard?.once("keydown", proceed);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, proceed);
    // Hard cutoff after the scheduled steps complete (failsafe)
    this.time.delayedCall(stepGap * 3 + 1800, proceed);
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    // Clean up any remaining tweens to avoid interference
    this.tweens.killAll();
    this.scene.start(SceneKeys.Game);
  }

  private getStoryLines(ghost: string, chapter: number): string[] {
    // Simple, thematic lines per ghost and chapter
    const base: Record<string, string[][]> = {
      blinky: [
        ["He senses fear in the maze.", "Line of sight sharpens his focus.", "The hunt begins."],
        ["Speed builds with every glimpse.", "He locks on — no escape.", "Only corners break the chase."],
        ["The rhythm of pursuit.", "Walls funnel the prey forward.", "Blink and you’re caught."],
        ["Final sprint.", "No decoys. No mercy.", "Finish the chase."],
      ],
      pinky: [
        ["She reads the path ahead.", "Ambush set four tiles forward.", "Patience is the trap."],
        ["Predict. Place. Spring.", "The net slows the beast.", "Corners are her canvas."],
        ["Hesitation costs seconds.", "She waits where the maze turns.", "Then closes in."],
        ["Every route foreseen.", "The net tightens one last time.", "Checkmate."],
      ],
      inky: [
        ["Glitches in reality.", "A step between here and there.", "Uncertain — and dangerous."],
        ["Between Blinky and the target.", "He folds space in short bursts.", "Vulnerable, but swift."],
        ["A shimmer, then a jump.", "Positions snapped into place.", "Control the bias."],
        ["One last leap.", "Timing is everything.", "Arrive before the prey."],
      ],
      clyde: [
        ["The trickster lures.", "Decoy pellets light the way.", "Confuse the hunger."],
        ["Scatter bait deployed.", "A stumble in the predator’s path.", "Momentum breaks."],
        ["Slow and certain.", "Noise hides intent.", "A laugh in the corridors."],
        ["The final misdirection.", "Follow the lights — to nowhere.", "He takes the win."],
      ],
    };
    const key = (ghost as string).toLowerCase();
    const idx = Math.max(1, Math.min(4, chapter)) - 1;
    return base[key]?.[idx] || ["A quiet moment.", "The maze hums.", "Onward."];
  }
}
