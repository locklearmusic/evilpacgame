import Phaser from "phaser";
import { SceneKeys } from "../core/const";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload() {
    // Preload provided PNG assets in public/assets
    this.load.image("logo", "/assets/evil-pac-logo.png");
    this.load.image("arcade", "/assets/arcade-bg.png");
  }

  create() {
    this.scene.start(SceneKeys.Title);
  }
}

export default BootScene;
