// button.js

class VirtualButton {
  constructor(scene, x, y, width, height, color = 0xcccccc, alpha = 0.5) {
    this.scene = scene;
    this.isDown = false;

    this.button = scene.add.rectangle(x, y, width, height, color, alpha);
    this.button.setScrollFactor(0);
    this.button.setDepth(10);
    this.button.setInteractive();

    this.button.on('pointerdown', () => {
      this.isDown = true;
    });

    this.button.on('pointerup', () => {
      this.isDown = false;
    });

    this.button.on('pointerout', () => {
      this.isDown = false;
    });
  }

  setVisible(visible) {
    this.button.visible = visible;
  }
}
