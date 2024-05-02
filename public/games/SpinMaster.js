const assetsLoader = {
    "background": "background",
    "player": "player",
    "enemy": "enemy",
    "projectile": "projectile"
};

const title = `Spin Master Game`
const description = `Spin and cut your enemies.`
const instructions =
    `Instructions:
  1. Use ARROW keys to move.`;

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
var isMobile = false;

// Touuch Screen Controls
const joystickEnabled = true;
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
        this.additionalLives = 0;
        this.livesThreshold = 150;
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
        this.load.audio('damage', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_2.mp3']);

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);

    }

    create() {
        isMobile = !this.sys.game.device.os.desktop;

        this.score = 0;
        // gameScore = 0;
        this.additionalLives = 0;
        this.isGameOver = false;

        this.sound.add('bgm', { loop: true, volume: 1 }).play();

        this.vfx = new VFXLibrary(this);

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0).setDepth(-10);
        this.bg.setScrollFactor(0);
        this.bg.displayHeight = this.game.config.height;
        this.bg.displayWidth = this.game.config.width;

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
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

        this.player = this.physics.add.sprite(400, 300, 'player').setScale(.09);
        var newBodyWidth = this.player.body.width * 0.6; // Decrease width by 20%
        var newBodyHeight = this.player.body.height * 0.8; // Decrease height by 20%
        this.player.setSize(newBodyWidth, newBodyHeight);
        this.targetPosition = null;
        this.revolveAngle = 0;
        this.player.setInteractive();

        // this.input.on('pointerdown', (pointer) => {
        //   this.physics.moveToObject(this.player, pointer, 200);
        //   this.targetPosition = { x: pointer.x, y: pointer.y };
        // });

        this.knives = this.physics.add.group();
        const knifeCount = 5;
        const radius = 100;

        for (let i = 0; i < knifeCount; i++) {
            const angle = (i / knifeCount) * Phaser.Math.PI2;
            const x = this.player.x + radius * Math.cos(angle);
            const y = this.player.y + radius * Math.sin(angle);
            const knife = this.knives.create(x, y, 'projectile').setScale(.07);
        }

        this.enemies = this.physics.add.group();
        this.lastEnemiesCount = this.enemies.getLength();
        // console.log(this.lastEnemiesCount);
        this.timeOfDelay = 2000;


        this.spawnTimer = this.time.addEvent({
            delay: this.timeOfDelay,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
        this.toggleControlsVisibility(isMobile);
    }

    toggleControlsVisibility(visibility) {
        this.joyStick.base.visible = visibility;
        this.joyStick.thumb.visible = visibility;
        // this.buttonA.visible = visibility;
    }

    update(time, delta) {
        if (!this.isGameOver) {

            var keyboardKeys = this.input.keyboard.createCursorKeys();
            var joystickKeys = this.joyStick.createCursorKeys();
            let velocityX = 0;
            let velocityY = 0;

            // Horizontal movement
            if (joystickKeys.right.isDown || keyboardKeys.right.isDown) {
                velocityX = 160;
            } else if (joystickKeys.left.isDown || keyboardKeys.left.isDown) {
                velocityX = -160;
            }

            // Vertical movement
            if (joystickKeys.up.isDown || keyboardKeys.up.isDown) {
                velocityY = -160;
            } else if (joystickKeys.down.isDown || keyboardKeys.down.isDown) {
                velocityY = 160;
            }

            // Apply the calculated velocities
            this.player.setVelocityX(velocityX);
            this.player.setVelocityY(velocityY);

            // Stop movement when no keys are pressed
            if (velocityX === 0 && velocityY === 0) {
                this.player.setVelocityX(0);
                this.player.setVelocityY(0);
            }

            const knifeCount = this.knives.getChildren().length;
            const radius = 100;
            const rotateSpeed = 0.002;

            this.revolveAngle += rotateSpeed * delta;

            for (let i = 0; i < knifeCount; i++) {
                const knife = this.knives.getChildren()[i];
                const angle = (i / knifeCount) * Phaser.Math.PI2 + this.revolveAngle;
                knife.x = this.player.x + radius * Math.cos(angle);
                knife.y = this.player.y + radius * Math.sin(angle);
            }

            this.enemies.getChildren().forEach((enemy) => {
                if (enemy.livesText) {
                    enemy.livesText.setPosition(enemy.x, enemy.y - 20);
                }
            });

            this.physics.overlap(this.enemies, this.player, this.playerHit, null, this);
            this.updateGameLevel();
        }
    }
    updateGameLevel() {
        gameScore = this.score;
        if (gameScore >= levelThreshold) {
            levelThreshold += 200;
            console.log(gameScore + " : " + levelThreshold)
            this.spawnDelay = this.timeOfDelay - levelThreshold;
            this.spawnTimer.delay = this.spawnDelay;

        }
        if (gameScore >= this.livesThreshold) {
            this.additionalLives++;
            this.livesThreshold += 200;
        }

    }
    spawnEnemy() {
        if (!this.isGameOver) {

            const { width, height } = this.sys.game.canvas;
            let x, y;

            // Determine random border position
            if (Math.random() < 0.5) {
                x = Math.random() < 0.5 ? 0 : width;
                y = Math.random() * height;
            } else {
                x = Math.random() * width;
                y = Math.random() < 0.5 ? 0 : height;
            }

            let enemy = this.physics.add.sprite(x, y, 'enemy').setScale(.1);
            enemy.lives = 3 + this.additionalLives;

            // Create text for lives above the enemy
            let livesText = this.add.bitmapText(x, y - 20, 'pixelfont', enemy.lives.toString(), 45)
                .setOrigin(0.5, 0.5); enemy.livesText = livesText;

            this.enemies.add(enemy);
            this.physics.moveToObject(enemy, this.player, 120);
            this.physics.add.collider(enemy, this.knives, this.enemyHit, null, this);
            // console.log(this.lastEnemiesCount);
        }
    }


    playerHit(player, enemy) {
        this.isGameOver = true;
        this.physics.pause();
        this.player.destroy();

        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 200, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15);

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

    enemyHit(enemy, knife) {
        this.sound.add('damage', { loop: false, volume: .5 }).play();
        enemy.lives--;
        if (enemy.lives == 0) {
            this.updateScore(10);
        }

        // Apply squeeze effect
        this.tweens.add({
            targets: enemy,
            scaleX: 0.04,
            scaleY: .05,
            duration: 100,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => {

                if (enemy.lives <= 0) {


                    if (enemy.livesText) {
                        enemy.livesText.destroy();
                    }
                    let pointsText = this.add.bitmapText(enemy.x, enemy.y - 25, 'pixelfont', '+10', 45)
                        .setOrigin(0.5, 0.5);

                    this.tweens.add({
                        targets: pointsText,
                        y: enemy.y - 100,
                        alpha: 0,
                        ease: 'Linear',
                        duration: 1000,
                        onComplete: function () {
                            pointsText.destroy();
                        }
                    });
                    enemy.destroy();

                } else {
                    enemy.livesText.setText("" + enemy.lives);
                }

            }
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

let gameScore = 0;
let gameLevel = 1;
let levelThreshold = 100;
