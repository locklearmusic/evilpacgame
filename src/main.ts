import Phaser from "phaser";

class Demo extends Phaser.Scene {
  preload() {
    // put assets in /public/ and load them here
    // this.load.image("logo", "/logo.png");
  }

  create() {
    this.add.text(20, 20, "Hello Lock • Phaser 3", {
      font: "24px Arial",
      color: "#00ff99",
    });

    this.add.rectangle(200, 120, 120, 120, 0x00ff99);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111111",
  parent: "app",
  scene: [Demo],
  physics: { default: "arcade", arcade: { debug: false } },
});
