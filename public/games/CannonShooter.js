const assetsLoader = {
    "background": "background",
    "player": "player",
    "projectile": "projectile",
    "enemy": "enemy",
};

// Custom UI Elements
const title = `Ball Blast`
const description = `Shoot the enemies falling from the sky`
const instructions =
    `Instructions:
  1. Use arrow keys OR joystick to move.
  2. Use Spacebar/button to shoot.`;

// Game Orientation
const orientation = "portrait";

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
    }

    preload() {

        addEventListenersPhaser.bind(this)();

        for (const key in assetsLoader) {
            this.load.image(key, assets_list[assetsLoader[key]]);
        }

        this.load.image("platform", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Glass/s2+Glass+03.png")
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.image("heart", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png");
        this.load.audio('bgm', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-3.mp3']);
        this.load.audio('blast', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/blast.mp3']);
        this.load.audio('shoot', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_2.mp3']);
        this.load.audio('upgrade', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/upgrade_2.mp3']);
        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);

        displayProgressLoader.call(this);
    }

    create() {
        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.vfx = new VFXLibrary(this);

        this.sound.add('bgm', { loop: true, volume: 1 }).play();
        this.bg = this.add.image(0, 0, "background").setOrigin(0, 0);
        this.bg.displayHeight = this.game.config.height;
        this.bg.displayWidth = this.game.config.width;

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
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

            this.buttonA.button.on('down', () => this.fireBullet(this), this);
        }

        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', gameScore, 64).setOrigin(0.5, 0.5);

        this.levelText = this.add.bitmapText(10, 30, 'pixelfont', `Level: ${gameLevel}`, 48).setOrigin(0, 0.5);
        this.scoreText.setDepth(10);
        this.levelText.setDepth(10);

        const centerX = this.game.config.width / 2;
        const centerY = this.game.config.height / 2;

        this.platform = this.physics.add.image(this.width / 2, this.height, 'platform').setOrigin(0.5, 1);
        this.platform.body.immovable = true;
        this.platform.body.moves = false;
        this.platform.setImmovable(true);
        this.platform.setGravity(0, 0);
        this.platform.setDisplaySize(this.width, this.height * 0.1);
        // this.platform.enableBody();
        // this.platform.body.setSize(this.width, this.height * 0.1);

        let pivotDiffX = (this.platform.displayWidth - this.platform.width) * -0.5;

        let pivotDiffY = (this.platform.displayHeight - this.platform.height) * -0.5;

        this.player = this.physics.add.image(centerX, this.height - this.platform.height + 80, 'player').setScale(0.15);
        this.player.setCollideWorldBounds(true);

        this.bullets = this.physics.add.group();

        this.enemies = this.physics.add.group();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            this.gameOver();
        });
        this.physics.add.collider(this.platform, this.enemies);
        this.physics.add.collider(this.bullets, this.enemies, (bullet, enemy) => {
            this.sound.add('blast', { loop: false, volume: 0.01 }).play();
            this.vfx.createEmitter('enemy', enemy.x, enemy.y, 0, 0.03, 400).explode(50);
            if (enemy.level != 1) {
                bullet.destroy();
                enemy.scaleX = enemy.scaleX / 2;
                enemy.scaleY = enemy.scaleY / 2;
                enemy.level = enemy.level - 1;
            }
            else {
                bullet.destroy();
                enemy.destroy();
                this.increaseScore(10);
            }
        });

        spawnTimer = this.time.addEvent({
            delay: 2000,
            callback: () => this.spawnEnemy(),
            loop: true
        });
        enemies = this.physics.add.group();
    }

    update() {
        if (this.cursors.left.isDown || this.joystickKeys.left.isDown) {
            this.player.setVelocityX(-600);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown || this.joystickKeys.right.isDown) {
            this.player.flipX = false;
            this.player.setVelocityX(600);

        } else {
            this.player.setVelocityX(0);
        }

        this.updateGameLevel();

        if (this.cursors.space.isDown && canFireBullet) {
            this.fireBullet();
            canFireBullet = false;
        } else if (this.cursors.space.isUp) {
            canFireBullet = true;
        }
    }

    updateGameLevel() {
        if (gameScore >= levelThreshold) {
            this.sound.add('upgrade', { loop: false, volume: 0.5 }).play();
            this.centerText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', "LEVEL UP!", 64).setOrigin(0.5, 0.5).setDepth(100);
            this.time.delayedCall(500, () => {
                this.centerText.destroy();
            });
            velocityY += 20;
            gameLevel++;
            levelThreshold += 50;
            let newDelay = baseSpawnDelay - (spawnDelayDecrease * (gameLevel - 1));
            newDelay = Math.max(newDelay, 200);
            spawnTimer.delay = newDelay;
            this.updateLevelText();
        }
    }

    spawnEnemy() {
        let rand = Math.floor(Math.random() * 2);
        let spawnX = rand == 0 ? 50 : this.game.config.width - 50;

        var enemy = this.enemies.create(spawnX, 200, 'enemy').setScale(0.1 * gameLevel);
        enemy.setBounce(0.9);
        enemy.setCollideWorldBounds(true);
        enemy.setGravity(0, 200);
        enemy.setVelocityY(velocityY);

        let velocityX = rand == 0 ? 200 : -200;
        enemy.setVelocityX(velocityX);
        enemy.level = gameLevel;
    }

    fireBullet() {
        this.sound.add('shoot', { loop: false, volume: 0.01 }).play();
        var bullet = this.bullets.create(this.player.x, this.player.y, 'projectile').setScale(.05);
        bullet.setVelocityY(-1000);
        var bulletDestroyTimer = this.time.addEvent({
            delay: 10000,
            callback: () => {
                bullet.destroy();
            },
            callbackScope: this,
            loop: false
        });
    }

    increaseScore(points) {
        gameScore += points;
        this.updateScoreText();
        this.updateGameLevel();
    }

    updateLevelText() {
        this.levelText.setText(`Level: ${gameLevel}`);
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(`Score: ${gameScore}`);
    }

    gameOver() {
        initiateGameOver.bind(this)({
            "score": gameScore
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
        console.log(file.src);
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
            gravity: { y: 0 },
            debug: false,
        },
    },
    orientation: false,
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
};

let gameScore = 0;
let gameLevel = 1;
let levelThreshold = 50;
let enemySpeed = 120;
let baseSpawnDelay = 2000;
let spawnDelayDecrease = 400;
let spawnTimer;
let enemies;
let bg;
let canFireBullet = true;
let velocityX = 100;
let velocityY = 250;

