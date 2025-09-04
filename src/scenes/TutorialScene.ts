import Phaser from "phaser";
import { SceneKeys } from "../config/sceneKeys";
import { Strings } from "../config/strings";

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Tutorial);
  }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, Strings.TutorialLabel, {
      font: "24px Arial",
      color: "#00ff99",
    }).setOrigin(0.5, 0.5);
  }
}

export default TutorialScene;


