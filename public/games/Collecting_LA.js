let assetsLoader = {
    "background": "background",
    "player": "player",
    "enemy": "enemy",
    "collectible": "collectible",
    "avoidable": "avoidable"
};

let soundsLoader = {
    "background": "background",
    'collect': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/blast.mp3',
    'destroy': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_2.mp3',
    "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3"
};

// Custom UI Elements
const title = `Space Drive`
const description = `A thrilling tap-to-destroy game where quick reflexes are \n key to defeating waves of unique enemies`
const instructions =
    `Instructions:
1. Use arrow keys OR joystick to move.
2. Use Spacebar/button to shoot.`;

// Game Orientation
const orientation = "landscape";
var isMobile = false;
const orientationSizes = {
    "landscape": {
        "width": 1280,
        "height": 720,
    },
    "portrait": {
        "width": 720,
        "height": 1280,
    }
}

// Touuch Screen Controls
const joystickEnabled = true;
const buttonEnabled = true;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

// BUTTON DOCMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

/*
------------------- GLOBAL CODE STARTS HERE -------------------
*/

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.isGameOver = false; this.dropDelay = 5000;
    }

    preload() {

        addEventListenersPhaser.bind(this)();

        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }
        this.load.image('heart', 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png');

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);

        displayProgressLoader.call(this);
    }

    create() {

        isMobile = !this.sys.game.device.os.desktop;

        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.vfx = new VFXLibrary(this);

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(3).setLoop(true).play();

        this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);

        // Use the larger scale factor to ensure the image covers the whole canvas
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.input.addPointer(3);
        const joyStickRadius = 50;

        if (joystickEnabled) {
            this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: joyStickRadius * 2,
                y: this.height - (joyStickRadius * 2),
                radius: 50,
                base: this.add.circle(0, 0, 80, 0x888888, 0.5),
                thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5),
                // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
                // forceMin: 16,
            });
            this.joystickKeys = this.joyStick.createCursorKeys();
        }

        if (buttonEnabled) {
            this.buttonA = this.add.rectangle(this.width - 80, this.height - 100, 80, 80, 0xcccccc, 0.5)
            this.buttonA.button = this.plugins.get('rexbuttonplugin').add(this.buttonA, {
                mode: 1,
                clickInterval: 100,
            });

            this.buttonA.button.on('down', () => this.fireBullet(), this);
        }

        this.scoreText = this.add.bitmapText(this.width / 2 - 40, 25, 'pixelfont', this.score, 100).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(10);

        const centerX = this.game.config.width / 2;
        const centerY = this.game.config.height / 2;

        this.player = this.physics.add.image(centerX, this.game.config.height, 'player').setScale(0.15);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(this.player.body.width / 1.1, this.player.body.height)
        this.vfx.scaleGameObject(this.player, 1.1);

        // Keyboard Controls
        this.cursors = this.input.keyboard.createCursorKeys();

        this.toggleControlsVisibility(isMobile);

        //------------------------------------------------
        //------------------------------------------------
        //------------------------------------------------
        //------------------------------------------------

        this.lives = 3;
        this.hearts = [];
        for (let i = 0; i < this.lives; i++) {
            let x = 40 + (i * 35);
            this.hearts[i] = this.add.image(x, 35, "heart").setScale(0.025).setDepth(11);
        }

        this.hens = this.physics.add.staticGroup({
            key: 'enemy',
            repeat: 5,
            setXY: { x: 100, y: 50, stepX: 200 }
        });
        this.hens.children.iterate((hen) => {
            hen.setScale(0.1);
            // this.vfx.scaleGameObject(hen);
            // hen.setVisible(false);
        });
        // Eggs setup
        this.eggs = this.physics.add.group();
        this.avoidables = this.physics.add.group();

        this.vfx.addCircleTexture('red', 0xFF0000, 1, 10);
        this.vfx.addCircleTexture('orange', 0xFFA500, 1, 10);
        this.vfx.addCircleTexture('yellow', 0xFFFF00, 1, 10);

        this.physics.add.collider(this.player, this.eggs, (bullet, enemy) => {
            this.sounds.collect.play();
            this.vfx.createEmitter('red', enemy.x, enemy.y, 1, 0, 500).explode(20);
            this.vfx.createEmitter('yellow', enemy.x, enemy.y, 1, 0, 500).explode(20);
            this.vfx.createEmitter('orange', enemy.x, enemy.y, 1, 0, 500).explode(20);
            // bullet.destroy();
            enemy.destroy();
            this.collectEgg(); this.updateScore(10);
        });
        this.physics.add.collider(this.player, this.avoidables, this.hitAvoidable, null, this);


        // Input setup
        this.cursors = this.input.keyboard.createCursorKeys();

        // Egg drop timer
        this.startEggDrop();
    }

    toggleControlsVisibility(visibility) {
        this.joyStick.base.visible = visibility;
        this.joyStick.thumb.visible = visibility;
        this.buttonA.visible = visibility;
    }

    update() {
        if (this.cursors.left.isDown || this.joystickKeys.left.isDown) {
            this.player.setVelocityX(-350);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown || this.joystickKeys.right.isDown) {
            this.player.flipX = false;
            this.player.setVelocityX(350);
        } else {
            this.player.setVelocityX(0);
        }

        this.eggs.children.iterate((egg) => {
            if (egg && egg.y > this.sys.game.config.height) {
                this.sounds.destroy.setVolume(0.5).setLoop(false).play()
                this.missEgg(egg);
            }
        });
    }
    startEggDrop() {
        if (!this.isGameOver) {
            this.time.addEvent({
                delay: Phaser.Math.Between(1000, this.dropDelay),
                callback: () => {
                    this.dropEgg();
                    this.startEggDrop();
                },
                callbackScope: this
            });
        }
    }

    dropEgg() {
        if (!this.isGameOver) {
            const hen = Phaser.Utils.Array.GetRandom(this.hens.getChildren());
            if (hen) {
                if (Math.random() < 0.7) {
                    const egg = this.eggs.create(hen.x, hen.y, 'collectible');
                    egg.setScale(0.07);
                    this.vfx.scaleGameObject(egg);

                } else {
                    const avoidable = this.avoidables.create(hen.x, hen.y, 'avoidable');
                    avoidable.setScale(0.07);
                    this.vfx.scaleGameObject(avoidable);

                }
            }
        }
    }

    collectEgg() {
        if (this.score % 50 == 0) {
            console.log("delay: " + this.dropDelay);
            this.dropDelay = Math.max(1000, this.dropDelay - 500); // Ensure the delay doesn't go below 1 second
        }

    }

    missEgg(egg) {
        egg.destroy();
        this.lives--;
        this.hearts[this.lives].destroy();
        console.log(`Lives: ${this.lives}`);
        this.vfx.shakeCamera(400, .009);

        if (this.lives <= 0) {
            this.isGameOver = true;
            this.resetGame();
            this.eggs.children.iterate((egg) => {
                egg.destroy();
            });
        }
    }

    hitAvoidable(player, avoidable) {
        avoidable.destroy();
        this.lives--;
        this.hearts[this.lives].destroy();
        console.log(`Lives: ${this.lives}`);
        this.vfx.shakeCamera(400, .009);
        this.sounds.destroy.setVolume(0.5).setLoop(false).play()


        if (this.lives <= 0) {
            this.isGameOver = true;
            this.resetGame();
        }
    }
    resetGame() {
        this.isGameOver = true;
        this.vfx.shakeCamera();

        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 250, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15)
            .setDepth(10)
            .setTint(0xff0000);
        this.time.delayedCall(500, () => {
            this.sounds.lose.setVolume(0.5).setLoop(false).play()
            gameOverText.setVisible(true);
            this.tweens.add({
                targets: gameOverText,
                y: '+=200',
                angle: 0,
                scale: { from: 0.5, to: 2 },
                alpha: { from: 0, to: 1 },
                ease: 'Elastic.easeOut',
                duration: 1500,
                onComplete: () => {
                    this.time.delayedCall(1000, this.gameOver, [], this);
                }
            });
        });
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    // increaseScore(points) {
    //     gameScore += points;
    //     this.updateScoreText();
    // }

    // updateScoreText() {
    //     this.children.getChildren()[0].setText(`Score: ${this.score}`);
    // }

    updateScoreText() {

        this.scoreText.setText(`${this.score}`);
    }



    gameOver() {
        initiateGameOver.bind(this)({
            "score": this.score
        });
    }

    pauseGame() {
        handlePauseGame.bind(this)();
    }
}

function displayProgressLoader() {
    let width = 320;
    let height = 50;
    let x = (this.game.config.width / 2) - 160;
    let y = (this.game.config.height / 2) - 50;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(x, y, width, height);

    const loadingText = this.make.text({
        x: this.game.config.width / 2,
        y: this.game.config.height / 2 + 20,
        text: 'Loading...',
        style: {
            font: '20px monospace',
            fill: '#ffffff'
        }
    }).setOrigin(0.5, 0.5);
    loadingText.setOrigin(0.5, 0.5);

    const progressBar = this.add.graphics();
    this.load.on('progress', (value) => {
        progressBar.clear();
        progressBar.fillStyle(0x364afe, 1);
        progressBar.fillRect(x, y, width * value, height);
    });
    this.load.on('fileprogress', function (file) {

    });
    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
    });
}

/*
------------------- GLOBAL CODE ENDS HERE -------------------
*/


// Configuration object
const config = {
    type: Phaser.AUTO,
    width: orientationSizes[orientation].width,
    height: orientationSizes[orientation].height,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 200 },
            debug: false,
        },
    },
    orientation: true,
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
};
