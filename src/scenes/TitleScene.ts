import Phaser from "phaser";
import { SceneKeys } from "../config/sceneKeys";
import { Strings } from "../config/strings";

export class TitleScene extends Phaser.Scene {
  private startKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SceneKeys.Title);
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height * 0.35, Strings.TitleText, {
      font: "48px Arial",
      color: "#00ff99",
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, height * 0.55, Strings.StartPrompt, {
      font: "24px Arial",
      color: "#00ff99",
    }).setOrigin(0.5, 0.5);

    this.startKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.startKey?.on("down", () => this.scene.start(SceneKeys.Tutorial));

    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.start(SceneKeys.Tutorial);
    });
  }
}

export default TitleScene;


