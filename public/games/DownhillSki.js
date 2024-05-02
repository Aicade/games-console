const assetsLoader = {
    "background": "background",
    "player": "player",
    "enemy": "enemy",
};

const title = `Down Hill Ski`
const description = `Tap to change direction.`
const instructions =
    `Instructions:
  1. Avoid enemies.`;

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
    }

    preload() {
        this.score = 0;
        this.isGameOver = false;

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

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);

    }
    gameSceneBackground() {
        let bgSize = orientationSizes[orientation].width > orientationSizes[orientation].height ? orientationSizes[orientation].width : orientationSizes[orientation].height;
        this.bg = this.add
            .tileSprite(0, 0, bgSize, bgSize, "background")
            .setOrigin(0, 0)
            .setScrollFactor(1).setDepth(-11);
    }

    create() {
        this.isGameOver = false;

        this.sound.add('bgm', { loop: true, volume: .75 }).play();
        this.gameSceneBackground();

        this.vfx = new VFXLibrary(this);
        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.score = 0;
        this.gameScore = 0;
        this.gameLevel = 1;
        this.levelThreshold = 100;

        this.player = this.physics.add.image(this.width / 2, this.height / 2 - 250, 'player').setScale(0.15, 0.15);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(this.player.width * 0.7, this.player.height * 0.7);

        this.enemies = this.physics.add.group();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.isMovingRight = true;
        this.input.on('pointerdown', () => {
            this.sound.add('flap', { loop: false, volume: 1 }).play();
            this.isMovingRight = !this.isMovingRight;
        });

        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            this.resetGame();
        });

        this.time.addEvent({
            delay: 1000,
            callback: this.updateGameLevel,
            callbackScope: this,
            loop: true,
            args: [1]
        });

        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11)

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
        this.vfx.scaleGameObject(this.player, 1.1, 500);

    }

    update(time, delta) {
        if (this.isGameOver == false) {
            this.bg.tilePositionY += 3;

            if (this.isMovingRight) {
                this.player.setVelocityX(300);
                this.player.flipX = true;
            } else {
                this.player.setVelocityX(-300);
                this.player.flipX = false;
            }

            this.enemySpawn();
        }
    }

    updateGameLevel() {
        if (!this.isGameOver) {
            this.gameScore += 1;
            this.updateScore(1);
            if (this.gameScore >= this.levelThreshold) {
                this.gameLevel++;
                this.levelThreshold += 200;
            }
        }
    }
    enemySpawn() {

        let spawnProbability = 0.005 + this.gameLevel * 0.005;

        if (Math.random() < spawnProbability) {
            let spawnX = Phaser.Math.Between(0, this.game.config.width);
            let velocityY = -(200 + this.gameLevel * 10);

            var enemy = this.enemies.create(spawnX, this.game.config.height + 50, 'enemy').setScale(.1);
            enemy.body.setSize(enemy.width * 0.7, enemy.height * 0.7);
            enemy.setVelocityY(velocityY);
        }
    }
    resetGame() {
        this.isGameOver = true;
        this.physics.pause();
        this.player.destroy();
        this.score = 0;
        this.vfx.shakeCamera();

        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 200, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15);

        this.time.delayedCall(500, () => {
            this.sound.add('lose', { loop: false, volume: .5 }).play();
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

    updateScoreText() {
        this.scoreText.setText(this.score);
    }

    gameOver() {
        initiateGameOver.bind(this)({ score: this.score });
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
    /* ADD CUSTOM CONFIG ELEMENTS HERE */
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