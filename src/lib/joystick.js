// joystick.js

class VirtualJoystick {
  constructor(scene, x, y, radius) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.force = 0;
    this.angle = 0;
    this.isPressed = false;

    this.base = scene.add.circle(x, y, radius, 0x888888, 0.5);
    this.thumb = scene.add.circle(x, y, radius * 0.5, 0xcccccc, 0.8);

    this.base.setScrollFactor(0);
    this.thumb.setScrollFactor(0);
    this.base.setDepth(10);
    this.thumb.setDepth(11);

    this.base.setInteractive();
    this.thumb.setInteractive();

    this.setupEvents();
  }

  setupEvents() {
    this.scene.input.on('pointerdown', (pointer) => {
      const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.x, this.y);
      if (distance <= this.radius) {
        this.isPressed = true;
        this.pointerId = pointer.id;
      }
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (this.isPressed && pointer.id === this.pointerId) {
        const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.x, this.y);
        const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.x, pointer.y);

        if (distance <= this.radius) {
          this.thumb.x = pointer.x;
          this.thumb.y = pointer.y;
          this.force = distance / this.radius;
        } else {
          this.thumb.x = this.x + Math.cos(angle) * this.radius;
          this.thumb.y = this.y + Math.sin(angle) * this.radius;
          this.force = 1;
        }

        this.angle = angle;
      }
    });

    this.scene.input.on('pointerup', (pointer) => {
      if (this.isPressed && pointer.id === this.pointerId) {
        this.isPressed = false;
        this.force = 0;
        this.thumb.x = this.x;
        this.thumb.y = this.y;
      }
    });
  }

  createCursorKeys() {
    return {
      left: { isDown: this.isPressed && Math.cos(this.angle) < -0.5 },
      right: { isDown: this.isPressed && Math.cos(this.angle) > 0.5 },
      up: { isDown: this.isPressed && Math.sin(this.angle) < -0.5 },
      down: { isDown: this.isPressed && Math.sin(this.angle) > 0.5 }
    };
  }

  setVisible(visible) {
    this.base.visible = visible;
    this.thumb.visible = visible;
  }
}
