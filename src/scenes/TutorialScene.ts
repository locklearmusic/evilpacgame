import Phaser from "phaser";
import { SceneKeys } from "../core/const";
import { Strings } from "../config/strings";

export class TutorialScene extends Phaser.Scene {
  private continueKey?: Phaser.Input.Keyboard.Key;
  private currentStep = 0;
  private tutorialSteps: string[] = [];
  private instructionText?: Phaser.GameObjects.Text;
  private stepIndicator?: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.Tutorial);
  }

  create() {
    const { width, height } = this.scale;
    const uiScale = Phaser.Math.Clamp(width / 1100, 0.7, 1.0);

    // Define tutorial steps
    this.tutorialSteps = [
      "Welcome to Evil Pac!",
      "Use ARROW KEYS to move",
      "You are the EVIL character!",
      "Hunt down the pac-dots (good guys)",
      "Use power-ups to become stronger",
      "Press ESC to pause the game",
      "Ready to start your evil journey?"
    ];

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // Title
    this.add.text(width / 2, height * 0.2, Strings.TutorialTitle, {
      font: `${Math.round(36 * uiScale)}px Arial`,
      color: "#00ff99",
    }).setOrigin(0.5, 0.5);

    // Instruction text
    this.instructionText = this.add.text(width / 2, height * 0.5, this.tutorialSteps[0], {
      font: `${Math.round(24 * uiScale)}px Arial`,
      color: "#ffffff",
      align: "center",
      wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5, 0.5);

    // Step indicator
    this.stepIndicator = this.add.text(width / 2, height * 0.7, `Step ${this.currentStep + 1} of ${this.tutorialSteps.length}`, {
      font: `${Math.round(18 * uiScale)}px Arial`,
      color: "#888888",
    }).setOrigin(0.5, 0.5);

    // Continue prompt
    this.add.text(width / 2, height * 0.85, Strings.ContinuePrompt, {
      font: `${Math.round(20 * uiScale)}px Arial`,
      color: "#00ff99",
    }).setOrigin(0.5, 0.5);

    // Skip prompt (ESC)
    this.add.text(width / 2, height * 0.9, Strings.SkipPrompt, {
      font: `${Math.round(16 * uiScale)}px Arial`,
      color: "#888888",
    }).setOrigin(0.5, 0.5);

    // Input handling
    this.continueKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.continueKey?.on("down", () => this.nextStep());

    // Also allow clicking/tapping to continue
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.nextStep());

    // ESC to skip tutorial
    const skipKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    skipKey?.on("down", () => this.skipTutorial());
  }

  private nextStep() {
    this.currentStep++;
    
    if (this.currentStep >= this.tutorialSteps.length) {
      this.completeTutorial();
      return;
    }

    // Update instruction text
    this.instructionText?.setText(this.tutorialSteps[this.currentStep]);
    
    // Update step indicator
    this.stepIndicator?.setText(`Step ${this.currentStep + 1} of ${this.tutorialSteps.length}`);
  }

  private completeTutorial() {
    // For now, just show completion message
    // In the future, this would transition to the game scene
    this.instructionText?.setText(Strings.TutorialComplete);
    this.stepIndicator?.setText(Strings.ContinuePrompt);
    
    this.continueKey?.off("down");
    this.continueKey?.on("down", () => {
      this.scene.start(SceneKeys.SelectGhost);
    });
  }

  private skipTutorial() {
    this.scene.start(SceneKeys.SelectGhost);
  }
}

export default TutorialScene;
