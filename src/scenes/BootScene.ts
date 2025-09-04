import Phaser from "phaser";
import { SceneKeys } from "../config/sceneKeys";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload() {
    // Preload core assets here as they are added to the project.
  }

  create() {
    this.scene.start(SceneKeys.Title);
  }
}

export default BootScene;


