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

        for (const key in _CONFIG.imageLoader) {
            this.load.image(key, _CONFIG.imageLoader[key]);
        }

        for (const key in _CONFIG.soundsLoader) {
            this.load.audio(key, [_CONFIG.soundsLoader[key]]);
        }

        addEventListenersPhaser.bind(this)();

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);


        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.image("pillar", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Bricks/s2+Brick+01+Grey.png");

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);

    }
    gameSceneBackground() {
        let bgSize = _CONFIG.orientationSizes[_CONFIG.deviceOrientation].width > _CONFIG.orientationSizes[_CONFIG.deviceOrientation].height ? _CONFIG.orientationSizes[_CONFIG.deviceOrientation].width : _CONFIG.orientationSizes[_CONFIG.deviceOrientation].height;
        this.bg = this.add
            .tileSprite(0, 0, bgSize, bgSize, "background")
            .setOrigin(0, 0)
            .setScrollFactor(1).setDepth(-11);
    }

    create() {

        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.isGameOver = false;

        this.sounds.background.setVolume(1.0).setLoop(true).play();
        this.gameSceneBackground();

        this.vfx = new VFXLibrary(this);
        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.score = 0;
        this.gameScore = 0;
        this.gameLevel = 1;
        this.levelThreshold = 100;

        this.player = this.physics.add.image(this.width / 2, this.height / 2 - 250, 'player').setScale(0.25, 0.25);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(this.player.width * 0.7, this.player.height * 0.7);

        this.enemies = this.physics.add.group();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.isMovingRight = true;
        this.input.on('pointerdown', () => {
            this.sounds.move.setVolume(1).setLoop(false).play()
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

        let bubble = this.add.graphics({ x: -100, y: 0, add: false });

        const bubbleRadius = 10;
        const bubbleColor = 0xffffff; // A nice bubble color

        bubble.fillStyle(bubbleColor, .3); // Semi-transparent
        bubble.fillCircle(bubbleRadius, bubbleRadius, bubbleRadius);
        bubble.generateTexture('bubbles', 100, 100);

        this.trail = this.add.particles(0, 70, 'bubbles', {
            speed: 100,
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 600,
            angle: { min: -40, max: -10 },
            emitZone: { type: 'edge', source: new Phaser.Geom.Line(-10, -10, 10, 10), quantity: .2, yoyo: false }
        });
        this.trail.startFollow(this.player);
        this.input.keyboard.disableGlobalCapture();
    }

    update(time, delta) {
        if (!this.isGameOver) {
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

            var enemy = this.enemies.create(spawnX, this.game.config.height + 50, 'enemy').setScale(.25);
            enemy.body.setSize(enemy.width * 0.7, enemy.height * 0.7);
            enemy.setVelocityY(velocityY);
        }
    }
    resetGame() {
        this.isGameOver = true;
        this.physics.pause();
        this.player.destroy();
        this.vfx.shakeCamera();
        this.trail.destroy();

        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 200, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15);

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
    width: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].width,
    height: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].height,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.Orientation.LANDSCAPE
    },
    pixelArt: true,
    /* ADD CUSTOM CONFIG ELEMENTS HERE */
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    dataObject: {
        name: _CONFIG.title,
        description: _CONFIG.description,
        instructions: _CONFIG.instructions,
    },
    deviceOrientation: _CONFIG.deviceOrientation
};