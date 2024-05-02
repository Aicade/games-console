const assetsLoader = {
    "background": "background",
    "avoidable": "avoidable",
    "player": "player",
    "projectile": "projectile",
    "collectible": "collectible",
}

const title = `Harpoon throw`
const description = `Tap to throw harpoon.`
const instructions =
    `Instructions:
  1. Collect object as much as you can!.`;


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

// Game Orientation
const orientation = "portrait";


// Touuch Screen Controls
const joystickEnabled = false;
const buttonEnabled = false;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

// BUTTON DOCMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.isPointerDown = false;
        this.isHarpoonCast = false;
        this.isHarpoonRetracting = false;
    }

    preload() {
        this.score = 0;
        addEventListenersPhaser.bind(this)();

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);
        for (const key in assetsLoader) {
            this.load.image(key, assets_list[assetsLoader[key]]);
        }

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.image("pillar", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Bricks/s2+Brick+01+Grey.png");
        this.load.audio('bgm', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-3.mp3']);
        this.load.audio('flap', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_3.mp3']);
        this.load.audio('collect', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3']);
        this.load.audio('lose', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3']);
        this.load.audio('damage', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_2.mp3']);

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);

    }

    create() {

        this.sound.add('bgm', { loop: true, volume: 1 }).play();

        this.vfx = new VFXLibrary(this);

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0).setDepth(-10);
        this.bg.setScrollFactor(0);
        this.bg.displayHeight = this.game.config.height;
        this.bg.displayWidth = this.game.config.width;


        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 40, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11)

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        const joyStickRadius = 50;

        if (joystickEnabled) {
            this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: joyStickRadius * 2,
                y: this.height - (joyStickRadius * 2),
                radius: 50,
                base: this.add.circle(0, 0, 80, 0x888888, 0.5),
                thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5),
                dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
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

            this.buttonA.button.on('down', (button, gameObject) => {
                console.log("buttonA clicked");
            });
        }

        this.score = 0;
        this.depth = 0;
        this.isHarpoonCast = false;

        // Create the boat
        this.boat = this.add.sprite(this.width / 2, 200, 'player').setScale(.2);
        this.boat.setInteractive();

        this.harpoon = this.physics.add.sprite(this.boat.x, this.boat.y, 'projectile').setScale(.05);
        this.harpoon.visible = false;


        // Handle pointer down event
        this.input.on('pointerdown', this.releaseHarpoon, this);

        // Handle pointer up event
        this.input.on('pointerup', this.retractHarpoon, this);

        // Handle pointer movement
        this.input.on('pointermove', this.moveBoat, this);


        this.enemiesLeft = this.physics.add.group();
        this.enemiesRight = this.physics.add.group();
        this.avoidable = this.physics.add.group();

        this.physics.add.overlap(this.harpoon, this.enemiesLeft, this.harpoonHitsEnemy, null, this);
        this.physics.add.overlap(this.harpoon, this.enemiesRight, this.harpoonHitsEnemy, null, this);
        this.physics.add.collider(this.harpoon, this.avoidable, this.harpoonHitsavoidable, null, this);



        this.time.addEvent({
            delay: 2000,
            callback: this.spawnEnemies,
            callbackScope: this,
            loop: true
        });
        this.timerEvent = this.time.addEvent({
            delay: 120000, // 120 seconds in milliseconds
            callback: () => this.gameOver(),
            callbackScope: this,
            loop: false
        });
        this.timerText = this.add.bitmapText(120, 20, 'pixelfont', 'Timer: ', 40).setOrigin(0.5, 0.5);

        // this.timerText = this.add.text(this.this.config.width - 70, 20, 'Timer: ', { fontSize: '20px', fill: globalPrimaryFontColor }).setOrigin(0.5);

    }

    spawnEnemies() {
        if (!this.isGameOver) {
            const side = Math.random() < 0.5 ? 'left' : 'right';
            const objectType = Math.random() < 0.33 ? 'avoidable' : Math.random() < 0.5 ? 'avoidable' : 'collectible';

            let object;
            if (side === 'left') {
                object = this.createLeftObject(0, objectType);
            } else {
                object = this.createRightObject(this.width, objectType);
            }

            // Additional setup if needed, like setting scale
            object.setScale(0.1);
        }
    }

    createLeftObject(x, type) {
        let object;
        if (type === 'avoidable') {
            object = this.avoidable.create(x, Phaser.Math.Between(300, this.height - 50), type);
            object.setVelocityX(Phaser.Math.Between(50, 100)).setFlipX(true);
            // object.setTint(0x000000); // Set tint for collectibles
        } else {
            object = this.enemiesLeft.create(x, Phaser.Math.Between(300, this.height - 50), type);
            object.setVelocityX(Phaser.Math.Between(50, 100)).setFlipX(true);
        }
        return object;
    }

    createRightObject(x, type) {
        let object;
        if (type === 'avoidable') {
            object = this.avoidable.create(x, Phaser.Math.Between(300, this.height - 50), type);
            object.setVelocityX(-Phaser.Math.Between(50, 100)).setFlipX(false);
            // object.setTint(0x000000); // Set tint for collectibles
        } else {
            object = this.enemiesRight.create(x, Phaser.Math.Between(300, this.height - 50), type);
            object.setVelocityX(-Phaser.Math.Between(50, 100)).setFlipX(false);
        }
        return object;
    }

    releaseHarpoon(pointer) {
        if (!this.isGameOver) {
            this.sound.add('flap', { loop: false, volume: 1 }).play();

            if (this.isHarpoonCast || this.isHarpoonRetracting) {
                return;
            }

            this.isHarpoonCast = true;
            this.harpoon.visible = true;
            this.harpoon.setPosition(this.boat.x, this.boat.y);
            this.isPointerDown = true;
            this.tweens.add({
                targets: this.harpoon,
                y: this.height, // Let it descend to the bottom
                duration: 3000, // Duration of descent
                ease: 'Power2'
            });
        }
    }

    retractHarpoon() {
        if (!this.isGameOver) {

            if (this.isHarpoonCast) {
                this.isHarpoonRetracting = true;
                this.tweens.add({
                    targets: this.harpoon,
                    y: this.boat.y, // Retract to the boat's position
                    duration: 1500, // Duration of ascent
                    ease: 'Power2',
                    onComplete: () => {
                        this.isHarpoonCast = false;
                        this.harpoon.visible = false;
                        this.isHarpoonRetracting = false; // Mark retraction complete
                    }
                });
            }
            this.isPointerDown = false;  // Pointer is no longer down
        }
    }

    moveBoat(pointer) {
        // if (this.isPointerDown) {
        if (!this.isGameOver) {

            this.boat.x = pointer.x;
            if (this.isHarpoonCast) {
                this.harpoon.x = pointer.x;
            }
        }
    }

    harpoonHitsEnemy(harpoon, enemy) {
        this.sound.add('damage', { loop: false, volume: .5 }).play();

        let pointsText = this.add.bitmapText(enemy.x, enemy.y - 75, 'pixelfont', '+10', 45)
            .setOrigin(0.5, 0.5);

        this.tweens.add({
            targets: pointsText,
            y: pointsText.y - 50,
            alpha: 0, // Fade out
            ease: 'Linear', // Animation ease
            duration: 1000,
            onComplete: function () {
                pointsText.destroy();
            }
        });
        let bubble = this.add.graphics({ x: -100, y: 0, add: false });

        // Define the bubble's properties
        const bubbleRadius = 50;
        const bubbleColor = 0x00bfff; // A nice bubble color

        // Draw the bubble
        bubble.fillStyle(bubbleColor, 0.5); // Semi-transparent
        bubble.fillCircle(bubbleRadius, bubbleRadius, bubbleRadius);
        bubble.generateTexture('bubbles', 100, 100);

        const emitter = this.add.particles(enemy.x, enemy.y, 'bubbles', {
            speed: { min: -100, max: 300 },
            scale: { start: .2, end: 0 },
            blendMode: 'MULTIPLY',
            lifespan: 750,
            tint: 0xfafafa
        });

        // emitter.setPosition(x, y);
        emitter.explode(70);
        enemy.destroy();
        this.score += 10;
        this.scoreText.setText(this.score);
    }

    harpoonHitsavoidable(harpoon, collectible) {
        this.isGameOver = true;
        this.physics.pause();
        collectible.destroy();
        const emitter = this.add.particles(collectible.x, collectible.y, 'bubbles', {
            speed: { min: -100, max: 300 },
            scale: { start: .2, end: 0 },
            blendMode: 'MULTIPLY',
            lifespan: 750,
            // tint: 0x93C54B
        });

        // emitter.setPosition(x, y);
        emitter.explode(75);
        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY_150, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15).setTint(0xFF0000);
        this.vfx.shakeCamera();

        this.time.delayedCall(500, () => {
            this.sound.add('lose', { loop: false, volume: 1 }).play();
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

    update() {

        // How to use joystick with keyboard

        // var joystickKeys = this.joyStick.createCursorKeys();
        // var keyboardKeys = this.input.keyboard.createCursorKeys();
        // if (joystickKeys.right.isDown || keyboardKeys.right.isDown) {
        //     console.log("right");
        // }

        // How to use button

        // if (this.buttonA.button.isDown) {
        //     console.log("button pressed");
        // }
        if (!this.isGameOver) {


            if (this.timerEvent) {

                var remainingTime = Math.floor((this.timerEvent.delay - this.timerEvent.getElapsed()) / 1000);
                this.timerText.setText('Timer: ' + remainingTime.toString());
                if (remainingTime <= 0) {
                    this.timerEvent = null;
                }
            }

            this.enemiesLeft.getChildren().forEach(enemy => {
                if (enemy.x > this.width) {
                    enemy.destroy();
                }
            });

            this.enemiesRight.getChildren().forEach(enemy => {
                if (enemy.x < 0) {
                    enemy.destroy();
                }
            });
        }

        // gameSceneUpdate(this);
    }


    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(this.score);
    }

    gameOver() {
        initiateGameOver.bind(this)(this.score, this.time.now * 0.001);
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
        // console.log(file.src);
    });
    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
    });
}

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
            gravity: { y: 0 },
            debug: false,
        },
    },
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: false
};