import Phaser from "phaser";
import { SceneKeys } from "./core/const";
import { initializeEvents } from "./core/events";
import BootScene from "./scenes/BootScene";
import TitleScene from "./scenes/TitleScene";
import SelectGhostScene from "./scenes/SelectGhostScene";
import GameScene from "./scenes/GameScene";
import CutsceneScene from "./scenes/CutsceneScene";
import TutorialScene from "./scenes/TutorialScene";
import ResultsScene from "./scenes/ResultsScene";
import PauseScene from "./scenes/PauseScene";

// Initialize the event system
initializeEvents(new Phaser.Events.EventEmitter());

new Phaser.Game({
  type: Phaser.AUTO,
  width: 1024,
  height: 640,
  backgroundColor: "#111111",
  parent: "game-root",
  scene: [BootScene, TitleScene, SelectGhostScene, GameScene, CutsceneScene, TutorialScene, ResultsScene, PauseScene],
  physics: { default: "arcade", arcade: { debug: false } },
  scale: { mode: Phaser.Scale.RESIZE },
  render: { antialias: true, pixelArt: false, roundPixels: true },
  callbacks: {
    postBoot: (game) => {
      game.scene.start(SceneKeys.Boot);
    },
  },
});
