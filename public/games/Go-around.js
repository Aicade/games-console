let assetsLoader = {
    "background": "background",
    "enemy": "enemy",
    "player": "player",
};

let soundsLoader = {
    "background": "background",
    "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3",
    "jump": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_1.mp3",
    "spawn": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_2.mp3",
};

// this.load.audio('flap', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_3.mp3']);
// this.load.audio('collect', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3']);
// this.load.audio('lose', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3']);
// this.load.audio('damage', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_2.mp3']);

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


// Custom UI Elements
const title = `GO-Around`
const description = `GO around the circle and dodge the enemies`
const instructions =
    `Instructions:
  1. Tap to jump and dodge`;


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
        this.score = 0;
        this.enemySpawnDelay = 2000;
    }

    preload() {
        addEventListenersPhaser.bind(this)();

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);
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
        this.input.keyboard.disableGlobalCapture();
        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }
        this.score = 0;
        this.enemySpawnDelay = 2000;
        this.sounds.background.setVolume(2.5).setLoop(true).play();

        this.vfx = new VFXLibrary(this);

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0).setDepth(-10);
        this.bg.setScrollFactor(0);
        this.bg.displayHeight = this.game.config.height;
        this.bg.displayWidth = this.game.config.width;


        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11);

        this.levelUpText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 50, 'pixelfont', 'LEVEL UP', 80).setOrigin(0.5, 0.5)
            .setAlpha(0).setDepth(11).setTint(0xffff00);

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

        this.circle = new Phaser.Geom.Circle(400, 600, 300);
        this.graphics = this.add.graphics({ fillStyle: { color: 0xffffff } });
        this.graphics.setAlpha(0.6);

        this.graphics.fillCircleShape(this.circle);

        this.enemies = this.physics.add.group();

        this.playerAngle = 0;
        this.playerDistance = 255;
        this.player = this.physics.add.sprite(this.circle.x, this.circle.y - this.playerDistance, 'player').setScale(.1);
        let currentWidth = this.player.body.width;
        let currentHeight = this.player.body.height;
        let newWidth = currentWidth * 0.5; // 30% decrease
        let newHeight = currentHeight * 0.5; // 30% decrease

        this.player.setBodySize(newWidth, newHeight, true);

        this.input.on('pointerdown', this.jump, this);
        this.spawnEnemyTimer = this.time.addEvent({
            delay: this.enemySpawnDelay,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        this.time.addEvent({
            delay: 100,
            callback: this.scorePoints,
            callbackScope: this,
            loop: true
        });

        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            player.destroy();
            this.resetGame();
        });

    }

    levelUp() {
        this.levelUpText.setAlpha(1);

        this.tweens.add({
            targets: this.levelUpText,
            alpha: 0,
            ease: 'Linear',
            duration: 500,
            repeat: 1,
            yoyo: false
        });
    }

    resetGame() {
        this.isGameOver = true;
        this.physics.pause();
        this.score = 0;
        this.vfx.shakeCamera();

        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 200, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15).setTint(0xFF0000);

        this.time.delayedCall(500, () => {
            this.sounds.lose.setVolume(1).setLoop(false).play();
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

    update(time, delta) {
        this.playerAngle += 0.01;
        const playerX = this.circle.x + Math.cos(this.playerAngle) * this.playerDistance;
        const playerY = this.circle.y + Math.sin(this.playerAngle) * this.playerDistance;
        this.player.setPosition(playerX, playerY);
        this.player.rotation = this.playerAngle - Math.PI - 30;

    }

    jump() {
        const jumpDistance = 200;

        if (this.playerDistance == 255) {
            this.sounds.jump.setVolume(1).setLoop(false).play();
            this.tweens.add({
                targets: this,
                playerDistance: this.circle.radius - jumpDistance,
                duration: 500,
                yoyo: true,
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    this.player.x = this.circle.x + Math.cos(this.playerAngle) * this.playerDistance;
                    this.player.y = this.circle.y + Math.sin(this.playerAngle) * this.playerDistance;
                },
                onComplete: () => {
                    this.vfx.shakeCamera(200);
                }
            });
        }
    }

    spawnEnemy() {
        if (!this.isGameOver) {
            const randomAngle = Phaser.Math.FloatBetween(0.7, 1.3);

            const spawnAngle = this.playerAngle + randomAngle;
            const x = this.circle.x + Math.cos(spawnAngle) * this.circle.radius;
            const y = this.circle.y + Math.sin(spawnAngle) * this.circle.radius;
            const enemy = this.enemies.create(x, y, 'enemy').setScale(.05);
            const newWidth = enemy.body.width * 0.6; // Reduce width by 20%
            const newHeight = enemy.body.height * 0.8; // Reduce height by 20%

            enemy.body.setSize(newWidth, newHeight);

            this.vfx.addShine(enemy, 4000, .3);
            this.vfx.rotateGameObject(enemy);
            this.sounds.spawn.setVolume(.75).setLoop(false).play();

            this.time.delayedCall(5000, () => enemy.destroy(), [], this);
        }
    }
    scorePoints() {
        if (!this.isGameOver) {
            this.score++;
            this.updateScore(1);
            if (this.score % 100 === 0) {
                this.levelUp();
                this.timerDelay = this.enemySpawnDelay - 100;
                this.enemySpawnDelay = this.timerDelay;
                this.spawnEnemyTimer.delay = this.timerDelay;
            }
        }
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
    orientation: false,
};
