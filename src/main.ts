import Phaser from "phaser";
import { SceneKeys } from "./config/sceneKeys";
import BootScene from "./scenes/BootScene";
import TitleScene from "./scenes/TitleScene";
import TutorialScene from "./scenes/TutorialScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111111",
  parent: "app",
  scene: [BootScene, TitleScene, TutorialScene],
  physics: { default: "arcade", arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: {
    postBoot: (game) => {
      game.scene.start(SceneKeys.Boot);
    },
  },
});
