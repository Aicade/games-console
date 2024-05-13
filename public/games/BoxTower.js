const assetsLoader = { "background": "background", "player": "player" }

const soundsLoader = {
    "background": "background",
    'lose': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3',
    'collect': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_2.mp3',
}

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

const title = "Stack Blocks";
const description = "Stack as much as you can";
const instructions = "Tap to release";

// Game Orientation
const orientation = "portrait";

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.onceGameOverCall = false;
    }

    preload() {
        this.score = 0;
        addEventListenersPhaser.bind(this)();
       
        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }
        
        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.image("pillar", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Bricks/s2+Brick+01+Grey.png");

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);

    }

    create() {
        this.onceGameOverCall = false;

        this.vfx = new VFXLibrary(this);

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);

        // Use the larger scale factor to ensure the image covers the whole canvas
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale).setScrollFactor(0);


        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11).setScrollFactor(0);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3).setScrollFactor(0);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        
        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(3).setLoop(true).play();
        
        this.groundObj = this.add.image(this.width / 2, this.height, 'pillar');

        // this.groundObj = this.add.rectangle(this.width / 2, this.height, this.width, this.height * 0.5, 0x000000, 0.5);
        this.ground = this.matter.add.gameObject(this.groundObj);
        this.ground.setStatic(true);
        this.ground.setScale(4, 1.3);
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.addMovingObject();

        this.blocks = [];
        this.onGround = [];

        this.groundCollided = false;
        this.groundCollidedId = null;
        // console.log(this.movingBlock.y);

        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach((pair) => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;

                if (bodyA.id == this.ground.body.id || bodyB.id == this.ground.body.id) {
                    if (!this.groundCollided) {
                        // console.log("hit");
                        this.groundCollided = true;
                        this.groundCollidedId = (bodyA.id == this.ground.body.id)
                            ? bodyB.id
                            : bodyA.id;
                    }
                    else if (this.groundCollidedId != bodyA.id && this.groundCollidedId != bodyB.id && !this.onceGameOverCall) {
                        this.onceGameOverCall = true;
                        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameraYAxis, 'pixelfont', 'Game Over', 64)
                            .setOrigin(0.5)
                            .setVisible(false)
                            .setAngle(-15).setTint(0xFF0000);
                        this.vfx.shakeCamera();

                        this.time.delayedCall(500, () => {
                            this.sounds.lose.play();
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
                }
            });
        });

    }
    addMovingObject() {
        this.movingBlock = this.matter.add.image(100, 100, 'player', null, {
            isStatic: true
        }).setScale(0.15).setDepth(12);
        this.vfx.scaleGameObject(this.movingBlock, .9, 500);
        const scaleFactorX = 0.8 * 0.15;
        const scaleFactorY = 0.8 * 0.15;
        const newWidth = this.movingBlock.width * scaleFactorX;
        const newHeight = this.movingBlock.height * scaleFactorY;
        this.movingBlock.setBody({
            type: 'rectangle',
            width: newWidth,
            height: newHeight
        }, {
            isStatic: true
        });

        this.tweens.add({
            targets: this.movingBlock,
            x: 600,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // this.lightGreenCircle = this.add.circle(100, this.movingBlock.y+900, 10, 0x90EE90).setDepth(12);

        // Tween for moving the block
        // this.tweens.add({
        //     targets: [this.lightGreenCircle],
        //     x: 600,
        //     duration: 1000,
        //     yoyo: true,
        //     repeat: -1
        // });


    }

    handlePointerDown(pointer) {
        if (!this.onceGameOverCall) {
            const x = this.movingBlock.x;
            const y = this.movingBlock.y + this.movingBlock.displayHeight + 50;
            this.block = this.matter.add.image(x, y, 'player', null, {
                isStatic: false
            }).setScale(0.15);
            // this.block.setBounce(0);
            const scaleFactorX = 0.5 * 0.3;
            const scaleFactorY = 0.8 * 0.15;

            const newWidth = this.block.width * scaleFactorX;
            const newHeight = this.block.height * scaleFactorY;

            this.block.setBody({
                type: 'rectangle',
                width: newWidth,
                height: newHeight
            });
            this.pointsEffect(this.block.x, this.block.y, 100);
            this.sounds.collect.play();

            this.blocks.push(this.block);
            this.updateScore(100);

            if (this.blocks.length >= 4) {
                this.movingBlock.y -= this.movingBlock.displayHeight;
                this.cameraYAxis = this.movingBlock.y + this.movingBlock.displayHeight * 3;
                this.cameras.main.pan(
                    this.cameras.main.scrollX + this.width / 2,
                    this.cameraYAxis,
                    1000
                );
            }
        }
    }
    pointsEffect(x, y, score) {
        let scoreText = this.add.bitmapText(x, y, 'pixelfont', `+${score}`, 50);
        this.tweens.add({
            targets: scoreText,
            y: { from: scoreText.y, to: scoreText.y - 100 }, // Move upwards
            alpha: { from: 1, to: 0 }, // Fade out
            scale: { start: 1, to: 1.5 },
            angle: { from: 0, to: 10 },
            duration: 2000,
            ease: 'Power2',
            onComplete: function () { scoreText.destroy(); },
            onStart: () => {
                scoreText.setTint(0xffff00);
            },
            yoyo: false,
            repeat: 0,
        });

    }

    update() {


    }


    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(this.score);
    }

    gameOver() {
        initiateGameOver.bind(this)({
            score: this.score
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
        default: "matter",
        arcade: {
            gravity: { y: .1 },
            debug: false,
        },
    },
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: false,
}
