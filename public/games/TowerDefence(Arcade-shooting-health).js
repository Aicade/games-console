let assetsLoader = {
    "background": "background",
    "collectible": "collectible",
    "player": "player",
    "projectile": "projectile",
    "enemy": "enemy",
};

let soundsLoader = {
    "background": "background",
    "damage": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/damage_1.mp3",
    "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3",
    "shoot": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_2.mp3",
    "destroy": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/flap_1.wav"
}

// Custom UI Elements
const title = `Defend the yellow Tower`
const description = `Shoot the enemies before they destroy
  the tower`
const instructions =
    `Instructions:
  1. Touch or click to shoot bullets.
  2. Game gets over when tower's heath gets to 0`;

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


// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.score = 0;

        // Load In-Game Assets from assetsLoader
        for (const key in assetsLoader) {
            this.load.image(key, assets_list[assetsLoader[key]]);
        }

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.bitmapFont('pixelfont',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
        addEventListenersPhaser.bind(this)();
        displayProgressLoader.call(this);
    }

    create() {

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale);

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.input.keyboard.disableGlobalCapture();

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 30, 'pixelfont', 'Score: 0', 35).setOrigin(0.5).setTint(0xff7575);
        this.instructionText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', 'Tap to Shoot', 35).setOrigin(0.5).setDepth(11);
        this.time.delayedCall(4000, () => {
            this.instructionText.destroy();
        })

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        gameSceneCreate(this);
    }

    update() {
        gameSceneUpdate(this);
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(`Score: ${this.score}`);
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
        console.log(file.src);
    });
    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
    });
}

//CREATE FUNCTION FOR THE GAME SCENE
function gameSceneCreate(game) {
    game.vfx = new VFXLibrary(game);
    game.gameOverFlag = false;
    game.scoreText.setDepth(11); // Bring to the front

    const centerX = game.game.config.width / 2;
    const centerY = game.game.config.height / 2;

    game.tower = game.physics.add.image(100, centerY, 'collectible').setScale(0.15);
    game.tower.health = 100;
    game.tower.setImmovable(true).setCollideWorldBounds(true);
    game.tower.body.setSize(
        game.tower.body.width / 1.5,
        game.tower.body.height / 1.5
    );
    game.tower.postFX.addShine(0.3);


    game.player = game.physics.add.image(250, centerY, 'player').setScale(0.13);
    game.player.setCollideWorldBounds(true);

    const fx = game.player.preFX.addBarrel(0.9);

    game.tweens.add({
        targets: fx,
        amount: 1.1,
        duration: 600,
        yoyo: true,
        loop: -1,
        ease: 'sine.inout'
    });

    game.bullets = game.physics.add.group({
        defaultKey: 'projectile',
        active: false,
        maxSize: 15
    });
    // Enemies
    game.enemies = game.physics.add.group();

    game.input.on('pointerdown', fireBullet.bind(game), this);

    game.spawnEnemyEvent = game.time.addEvent({
        delay: 800,
        callback: spawnEnemy,
        callbackScope: game,
        loop: true
    });


    // game.cursors = game.input.keyboard.createCursorKeys();

    game.physics.add.collider(game.tower, game.enemies, function (tower, enemy) {
        updateTowerHealth.bind(game)(tower, enemy);
    });

    game.physics.add.collider(game.bullets, game.enemies, function (bullet, enemy) {
        enemy.destroy();
        bullet.destroy();
        this.sounds.destroy.setVolume(0.3).setLoop(false).play()
        game.particleEmitter.explode(250, enemy.x, enemy.y);
        game.updateScore(10);
    });
    makeHealthMeter.bind(game)(55, game.tower.y - game.tower.displayHeight, 100, 15);
    game.particleEmitter = game.vfx.createEmitter('enemy', 0, 0, 0.02, 0, 600).setAlpha(0.5);
    game.redParticle = game.vfx.addCircleTexture('redCircle', 0xff0000, 0.4, 10);
    game.towerEmitter = game.vfx.createEmitter('redCircle', 0, 0, 1, 0, 1000).setAlpha(0.5);
    game.towerDestroyEmitter = game.vfx.createEmitter('collectible', 0, 0, 0.015, 0, 1500).setAlpha(0.5);

    this.sounds.background.setVolume(2.5).setLoop(false).play()
}

//UPDATE FUNCTION FOR THE GAME SCENE
function gameSceneUpdate(game) {
    if (game.gameOverFlag) return;
    let angle = Phaser.Math.Angle.Between(game.player.x, game.player.y, game.input.x, game.input.y);
    //rotation cannon
    game.player.setRotation(angle);
}

function updateTowerHealth(tower, enemy) {
    enemy.destroy();
    this.towerEmitter.explode(50, tower.x, tower.y);
    // return;
    this.cameras.main.shake(150, 0.02);
    this.tower.health -= 10; // 10 is 10% of health
    if (this.tower.health <= 0) {
        this.spawnEnemyEvent.destroy();
        this.gameOverFlag = true;
        this.physics.pause();
        this.sound.stopAll();

        this.time.delayedCall(1000, () => {
            this.sounds.lose.setVolume(0.5).setLoop(false).play()
            this.towerDestroyEmitter.explode(400, tower.x, tower.y);
            // this.looseMusic.play();
            this.vfx.shakeCamera(300, 0.04);
            tower.destroy();
            this.time.delayedCall(2000, () => {
                this.gameOver();
            });

        });
    } else {
        this.sounds.damage.setVolume(0.5).setLoop(false).play()
    }
    if (this.tower.health <= 30) {
        this.healthMeter.fillColor = 0xff0000;
    }
    this.healthMeterText.text = this.tower.health;
    this.healthMeter.width = this.healthMeter.width - 10; // 15 is 10% of width ( = 150) as 10% of health is getting decreased on every hit
}

function makeHealthMeter(x = 200, y = 10, width = 150, height = 25) {
    // Create the power meter background (empty part)
    this.healthMeterBg = this.add.rectangle(x, y, width, height, 0x888888).setOrigin(0);
    this.healthMeter = this.add.rectangle(x, y, width, height, 0x00ff00).setOrigin(0);
    this.healthMeterText = this.add.bitmapText(x + this.healthMeterBg.width / 2, y, 'pixelfont', this.tower.health, 20).setOrigin(0.5, 1);
}


// Function to spawn and adjust enemy speed based on the level
function spawnEnemy() {
    let spawnX = Math.random() * this.game.config.width;
    if (spawnX < 500) {
        spawnX = 600
    }
    let spawnY = Math.random() * this.game.config.height;
    var enemy = this.enemies.create(spawnX, spawnY, 'enemy').setScale(.11);
    enemy.body.setSize(
        enemy.body.width / 1.5,
        enemy.body.height / 1.5
    );
    this.physics.moveTo(enemy, this.tower.x, this.tower.y, 400);
}

function fireBullet(pointer) {
    let bullet = this.bullets.get(this.player.x, this.player.y);
    if (bullet) {
        this.sounds.shoot.setVolume(0.2).setLoop(false).play()
        bullet.setScale(0.05);
        bullet.body.setSize(
            bullet.body.width / 1.5,
            bullet.body.height / 1.5
        );
        bullet.setActive(true);
        bullet.setVisible(true);
        this.physics.moveTo(bullet, pointer.x, pointer.y, 900);
        this.time.delayedCall(1500, () => {
            if (bullet.active) {
                bullet.setActive(false);
                bullet.setVisible(false);
                bullet.body.stop();
            }
        });
    }
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
    orientation: true
};