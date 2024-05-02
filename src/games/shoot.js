import * as braincadeSDK from "../braincadeSDK";
import VFXLibrary from "../vfxLibrary";

let cursors;

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        braincadeSDK.addEventListenersPhaser.bind(this)();

        this.load.image('player', 'assets/player.png');
    }

    create() {
        this.vfx = new VFXLibrary(this);

        this.player = this.physics.add.sprite(400, 300, 'player').setScale(0.1);
        this.player.setCollideWorldBounds(true);

        cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        if (cursors.left.isDown || cursors.right.isDown || cursors.up.isDown || cursors.down.isDown) {
            if (cursors.left.isDown) {
                this.player.setVelocityX(-160);
            } else if (cursors.right.isDown) {
                this.player.setVelocityX(160);
            } else {
                this.player.setVelocityX(0);
            }

            if (cursors.up.isDown) {
                this.player.setVelocityY(-160);
            } else if (cursors.down.isDown) {
                this.player.setVelocityY(160);
            } else {
                this.player.setVelocityY(0);
            }
        } else {
            this.player.setVelocity(0);
        }

        this.cameras.main.startFollow(this.player);
    }
}

// Configuration object
const config = {
    type: Phaser.AUTO,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    orientation: true,
    parent: "game-container",
};

export default config;