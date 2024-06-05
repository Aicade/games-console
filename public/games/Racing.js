let assetsLoader = {
    "background": "background",
    "player": "player",
    "enemy": "enemy",
    "collectible": "collectible",
    "avoidable": "avoidable",
};

let soundsLoader = {
    "background": "background",
    "move": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_3.mp3",
    "collect": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3",
    "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3",
    "damage": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_2.mp3",
};

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
const orientation = "landscape";
const title = "Car Racing";
const description = "Highway racing";
const instructions = "Dodge against the cars";
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
        this.trackWidth = 500;
        this.borderStripWidth = 10;
        this.playerStep = 10;
        this.enemies = [];
        this.enemySpeeds = {
            normal: 2,
            fast: 4,
            veryFast: 6
        };
        this.powerUpStep = 2;
        this.score = 0;
        this.spawnDelay = 1500;
        this.enemySpawnEvent = null;
        this.blocks = [];
        this.isGameOver = false;
        this.lives = 3;
    }

    preload() {
        this.score = 0;
        this.spawnDelay = 1500;
        this.isGameOver = false;

        addEventListenersPhaser.bind(this)();

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);
        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }
        this.load.image('heart', 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png');
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.image("pillar", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Bricks/s2+Brick+01+Grey.png");
        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);

    }

    create() {
        isMobile = !this.sys.game.device.os.desktop;

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.lives = 3;
        this.hearts = [];
        for (let i = 0; i < this.lives; i++) {
            let x = 50 + (i * 35);
            this.hearts[i] = this.add.image(x, 50, "heart").setScale(0.025).setDepth(11);
        }

        this.sounds.background.setVolume(1).setLoop(true).play()

        this.vfx = new VFXLibrary(this);

        this.gamePoint = 0;
        this.spawnDelay = 1500;

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
        this.bg.setScrollFactor(0);
        this.bg.displayHeight = this.game.config.height;
        this.bg.displayWidth = this.game.config.width;

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11)

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5).setDepth(1);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        const joyStickRadius = 50;

        if (joystickEnabled) {
            this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: joyStickRadius * 2,
                y: this.height - (joyStickRadius * 2),
                radius: 50,
                base: this.add.circle(0, 0, 80, 0x888888, 0.5).setDepth(1),
                thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5).setDepth(1),
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
        this.add.rectangle(0, 0, (this.scale.width - this.trackWidth) / 2, this.scale.height, 0x008000).setOrigin(0, 0);
        this.add.rectangle(this.scale.width - (this.scale.width - this.trackWidth) / 2, 0, (this.scale.width - this.trackWidth) / 2, this.scale.height, 0x008000).setOrigin(0, 0);

        // Draw the racing track
        this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.trackWidth, this.scale.height, 0x808080);

        // Draw the alternating red and white border stripes
        this.drawBorder();
        this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 190, 'player').setScale(0.09);
        this.police = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 40, 'avoidable').setScale(0.09).setDepth(1);

        // Input handling for left and right arrows
        this.cursors = this.input.keyboard.createCursorKeys();
        this.enemies = this.physics.add.group();

        // Add collision between player and enemies
        this.physics.add.collider(this.player, this.enemies, this.policecar, null, this);
        this.physics.add.collider(this.player, this.police, this.resetGame, null, this);

        this.setupEnemySpawn();

        this.powerUps = this.physics.add.group();

        // Collision between player and power-ups
        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerup, null, this);

        // Spawn a power-up every 5 seconds
        this.time.addEvent({
            delay: Phaser.Math.Between(1000, 7000),
            callback: this.spawnPowerUp,
            callbackScope: this,
            loop: true
        });
        this.graphics = this.add.graphics({ fillStyle: { color: 0x000000 } });
        this.isGameOver = false;
        this.toggleControlsVisibility(isMobile);
        this.input.keyboard.disableGlobalCapture();

    }

    toggleControlsVisibility(visibility) {
        this.joyStick.base.visible = visibility;
        this.joyStick.thumb.visible = visibility;
    }
    setupEnemySpawn() {
        if (this.enemySpawnEvent) {
            this.enemySpawnEvent.remove();
        }

        this.enemySpawnEvent = this.time.addEvent({
            delay: this.spawnDelay,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
    }
    adjustDifficulty() {
        this.spawnDelay = Math.max(500, this.spawnDelay - 200);
        // console.log("spawnDelay: " + this.spawnDelay);
        this.setupEnemySpawn();
    }
    drawBorder() {
        const numStripes = Math.ceil(this.scale.height / (this.borderStripWidth * 2)) + 1;
        for (let i = 0; i < numStripes; i++) {
            let y = i * this.borderStripWidth * 2;
            this.blocks.push(this.add.rectangle((this.scale.width - this.trackWidth) / 2, y, this.borderStripWidth, this.borderStripWidth, 0x000000).setOrigin(0, 0));
            this.blocks.push(this.add.rectangle(this.scale.width - (this.scale.width - this.trackWidth) / 2 - this.borderStripWidth, y, this.borderStripWidth, this.borderStripWidth, 0x000000).setOrigin(0, 0));

            y += this.borderStripWidth;
            this.blocks.push(this.add.rectangle((this.scale.width - this.trackWidth) / 2, y, this.borderStripWidth, this.borderStripWidth, 0xffffff).setOrigin(0, 0));
            this.blocks.push(this.add.rectangle(this.scale.width - (this.scale.width - this.trackWidth) / 2 - this.borderStripWidth, y, this.borderStripWidth, this.borderStripWidth, 0xffffff).setOrigin(0, 0));

            // Adding two additional white stripes within the track width
            const innerStripeX1 = (this.scale.width / 2) - (this.trackWidth / 4) + this.borderStripWidth; // Position for the first additional white stripe
            const innerStripeX2 = (this.scale.width / 2) + (this.trackWidth / 4) - 2 * this.borderStripWidth; // Position for the second additional white stripe
            this.blocks.push(this.add.rectangle(innerStripeX1, y, this.borderStripWidth, this.borderStripWidth, 0xffffff).setOrigin(0, 0));
            this.blocks.push(this.add.rectangle(innerStripeX2, y, this.borderStripWidth, this.borderStripWidth, 0xffffff).setOrigin(0, 0));
        }
    }

    update(time, delta) {

        // How to use joystick with keyboard

        if (!this.isGameOver) {
            // Clamp player's position
            this.player.x = Phaser.Math.Clamp(
                this.player.x,
                (this.scale.width - this.trackWidth) / 2 + this.player.displayWidth * this.player.scale / 2 + 30,
                this.scale.width - (this.scale.width - this.trackWidth) / 2 - this.player.displayWidth * this.player.scale / 2 - 30
            );
            this.police.x = Phaser.Math.Clamp(
                this.police.x,
                (this.scale.width - this.trackWidth) / 2 + this.police.displayWidth * this.police.scale / 2 + 50,
                this.scale.width - (this.scale.width - this.trackWidth) / 2 - this.police.displayWidth * this.police.scale / 2 - 30
            );
            var joystickKeys = this.joyStick.createCursorKeys();
            if (joystickKeys.left.isDown || this.cursors.left.isDown) {
                this.player.x -= this.playerStep;
            } else if (joystickKeys.right.isDown || this.cursors.right.isDown) {
                this.player.x += this.playerStep;
            }
            if (this.cursors.left.isDown) {
                this.player.x -= this.playerStep;
                // this.time.delayedCall(100, () => {
                //     this.police.x -= this.playerStep;
                // });

            } else if (this.cursors.right.isDown) {
                this.player.x += this.playerStep;
                // this.time.delayedCall(200, () => {
                //     this.police.x += this.playerStep;
                // });
            }
        }

        // How to use button

        // if (this.buttonA.button.isDown) {
        //     console.log("button pressed");
        // }
        const moveSpeed = 4; // Adjust this value to control the speed of the movement
        this.blocks.forEach(block => {
            block.y += moveSpeed;
            if (block.y > this.scale.height) {
                block.y -= this.scale.height + this.borderStripWidth * 2; // Reset it to the top
            }
        });
        // console.log(this.score);
        this.enemies.children.iterate((enemy) => {
            if (enemy) {
                enemy.y += enemy.getData('speed');
                if (enemy.y > this.scale.height - 90) {
                    this.enemies.remove(enemy, true, true);
                }
            }
        });
        this.powerUps.children.iterate((powerUp) => {
            if (powerUp) {
                powerUp.y += this.powerUpStep;
                if (powerUp.y > this.scale.height) {
                    this.powerUps.remove(powerUp, true, true);
                }
            }
        });

        this.updatePolicePosition(delta);
        if (this.isGameOver) {
            // console.log("isGameOver: " + this.isGameOver);
            this.tweens.add({
                targets: this.police,
                y: this.police.y - 100, // Moves up by 1000 units
                duration: 700, // Half a second
                ease: 'Power2'
            });

        }


    }
    updatePolicePosition(delta) {
        if (!this.isGameOver) {
            const chaseSpeed = 0.02;
            const distanceToPlayer = this.player.x - this.police.x;
            const minDistance = 5;
            if (Math.abs(distanceToPlayer) > minDistance) {
                this.police.x += chaseSpeed * distanceToPlayer * delta;
            }
        }
    }

    spawnEnemy() {
        const xPosition = Phaser.Math.Between((this.scale.width - this.trackWidth) / 2, this.scale.width - (this.scale.width - this.trackWidth) / 2);
        const speeds = Object.values(this.enemySpeeds);
        const speed = speeds[Phaser.Math.Between(0, speeds.length - 1)];
        const enemy = this.enemies.create(xPosition, -50, 'enemy');
        enemy.setScale(0.09);
        enemy.setData('speed', speed);
    }

    spawnPowerUp() {
        // console.log("powerup");

        const xPosition = Phaser.Math.Between((this.scale.width - this.trackWidth) / 2, this.scale.width - (this.scale.width - this.trackWidth) / 2);
        const powerUp = this.powerUps.create(xPosition, -50, 'collectible');
        powerUp.setScale(.1); // Scale if necessary

        this.tweens.add({
            targets: powerUp,
            alpha: 0,
            ease: 'Linear',
            duration: 500,
            repeat: -1,
            yoyo: true
        });
    }

    collectPowerup(player, powerup) {
        this.sounds.collect.setVolume(1).setLoop(false).play()

        let pointsText = this.add.bitmapText(powerup.x, powerup.y, 'pixelfont', '+10', 30)
            .setOrigin(0.5, 0.5);

        this.tweens.add({
            targets: pointsText,
            y: pointsText.y - 50, // Move up by 50 pixels
            alpha: 0, // Fade out
            ease: 'Linear', // Animation ease
            duration: 1000,
            onComplete: function () {
                pointsText.destroy();
            }
        });
        powerup.destroy();
        this.updateScore(10);
    }
    policecar(player, enemy) {
        this.lives--;
        this.hearts[this.lives].destroy();
        this.sounds.damage.setVolume(1).setLoop(false).play()
        // this.vfx.shakeCamera();
        enemy.destroy();

        this.tweens.add({
            targets: this.police,
            y: this.police.y - 40,
            ease: 'Sine.easeInOut',
            duration: 1000,
            onStart: () => {
                this.vfx.shakeCamera();
            }
        });

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
            this.sounds.lose.setVolume(1).setLoop(false).play()
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
        this.gamePoint = this.score;

        if (this.score % 50 === 0) {
            // console.log("increase");
            this.adjustDifficulty();
        }
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
        
    });
    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
    });
}

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
    orientation: true,
};
