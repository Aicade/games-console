// Touch Screen Controls
const joystickEnabled = true;
const buttonEnabled = true;
const hideButtons = true;
var isMobile = false;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

// BUTTON DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

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

    const progressBar = this.add.graphics();
    this.load.on('progress', (value) => {
        progressBar.clear();
        progressBar.fillStyle(0x364afe, 1);
        progressBar.fillRect(x, y, width * value, height);
    });
    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
    });
}

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.sounds = {};
        this.player = null;
        this.platforms = null;
        this.cursors = null;
        this.nailWall = null;
        this.score = 0;
        this.scoreText = null;
        this.backgroundSpeed = 0.8;
        this.lastPlatformY = 0;
        this.playerOnPlatform = null;
        this.gameIsOver = false;
        this.isResetting = false;
    }

    preload() {
        gameScenePreload(this);
        displayProgressLoader.call(this);
        addEventListenersPhaser.bind(this)();
    }

    create() {

        //for keyboard
        this.input.keyboard.disableGlobalCapture();
        
        this.initializeGame();
    }

    initializeGame() {
        this.background = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'background').setOrigin(0, 0);
        
        this.vfx = new VFXLibrary(this);

        this.createNailWall();
        this.createInputListeners();
        this.createPlatforms();
        this.createPlayer();
        this.createScoreText();
        this.createSounds();

        this.cursors = this.input.keyboard.createCursorKeys();

        this.createInitialPlatform();
        this.createPlatformGenerator();
        this.createScoreUpdater();
    }

    createNailWall() {
        this.nailWall = this.physics.add.staticGroup();
        for (let i = 0; i < 36; i++) {
            let nail = this.nailWall.create(i * 40, 20, 'avoidable').setScale(0.12);
            nail.body.setSize(nail.width, nail.height);
            this.vfx.addShine(nail, 50000000000, .2);
            this.vfx.scaleGameObject(nail, .5, 1000);
        }
    }

    createInputListeners() {
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
        this.pauseButton.on('pointerdown', () => this.pauseGame());
    }

    createPlatforms() {
        this.platforms = this.physics.add.group();
    }

    createPlayer() {
        if (this.player) this.player.destroy();
        this.player = this.physics.add.sprite(400, 300, 'player').setScale(0.12);
        if (this.player.body) {
            this.player.setCollideWorldBounds(true);
        }

        if (this.trail) this.trail.destroy();
        this.trail = this.add.particles(0, 40, 'bubbles', {
            speed: 200,
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 600,
            angle: { min: -40, max: -10 },
            emitZone: { type: 'edge', source: new Phaser.Geom.Line(-10, -10, 10, 10), quantity: .2, yoyo: false }
        });
        this.trail.startFollow(this.player);

        if (this.vfx) {
            this.vfx.scaleGameObject(this.player, 1.1, 500);
        }
    }

    createScoreText() {
        this.scoreText = this.add.bitmapText(12, 40, 'pixelfont', 'Score: 0', 32);
    }

    createSounds() {
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }
        this.sound.play('background');
    }

    createInitialPlatform() {
        this.createPlatform(400, 500);
    }

    createPlatformGenerator() {
        this.time.addEvent({
            delay: 1000,
            callback: this.createPlatformSequence,
            callbackScope: this,
            loop: true
        });
    }

    createScoreUpdater() {
        this.time.addEvent({
            delay: 1000,
            callback: this.updateScore,
            callbackScope: this,
            loop: true
        });
    }

    update() {
        if (this.isResetting || this.gameIsOver) return;

        this.updateBackground();
        if (this.player && this.player.body) {
            this.updatePlayerMovement();
            this.updatePlatforms();
            this.checkGameOver();
        }
    }

    updateBackground() {
        this.background.tilePositionY -= this.backgroundSpeed;
    }

    updatePlayerMovement() {
        if (!this.player || !this.player.body || !this.cursors) return;

        const acceleration = 10;
        const maxSpeed = 170;
        const friction = 0.95;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(Math.max(this.player.body.velocity.x - acceleration, -maxSpeed));
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(Math.min(this.player.body.velocity.x + acceleration, maxSpeed));
        } else {
            this.player.setVelocityX(this.player.body.velocity.x * friction);
        }

        if (!this.playerOnPlatform) {
            this.player.setVelocityY(this.player.body.velocity.y + 1.8);
        } else if (this.playerOnPlatform && this.playerOnPlatform.body) {
            this.player.y = this.playerOnPlatform.y - this.playerOnPlatform.displayHeight / 2 - this.player.displayHeight / 2;
            this.player.setVelocityY(this.playerOnPlatform.body.velocity.y);
        }
    }

    updatePlatforms() {
        this.platforms.children.entries.forEach(platform => {
            platform.y -= this.backgroundSpeed;
            platform.body.setVelocityY(-this.backgroundSpeed * 60);

            if (platform.y < -100) {
                platform.destroy();
            }

            if (this.player.y <= platform.y - platform.displayHeight / 2 &&
                this.player.y >= platform.y - platform.displayHeight / 2 - this.player.displayHeight &&
                this.player.x >= platform.x - platform.displayWidth / 2 &&
                this.player.x <= platform.x + platform.displayWidth / 2) {
                this.playerOnPlatform = platform;
            }
        });

        if (this.playerOnPlatform &&
            (this.player.x < this.playerOnPlatform.x - this.playerOnPlatform.displayWidth / 2 ||
             this.player.x > this.playerOnPlatform.x + this.playerOnPlatform.displayWidth / 2)) {
            this.playerOnPlatform = null;
        }
    }

    checkGameOver() {
        if (this.player.y > this.cameras.main.height * 0.94) {
            this.vfx.shakeCamera();
            this.time.delayedCall(1000, this.gameOver, [], this);
        }

        this.nailWall.getChildren().forEach(nail => {
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, nail.x, nail.y);
            
            if (distance < 50) {
                this.vfx.shakeCamera();
                this.time.delayedCall(1000, this.gameOver, [], this);
            }
        });
    }

    createPlatform(x, y) {
        const platform = this.physics.add.sprite(x, y, 'platform');
        platform.displayWidth = 150;
        platform.displayHeight = 15;
        platform.refreshBody();
        platform.setImmovable(true);
        platform.body.allowGravity = false;
        this.platforms.add(platform);
        return platform;
    }

    createPlatformSequence() {
        const minGap = 80;
        const maxGap = 120;
        const minX = this.cameras.main.width * 0.1;
        const maxX = this.cameras.main.width * 0.9;
        const platformWidth = this.textures.get('platform').getSourceImage().width;
    
        const platformCount = Phaser.Math.Between(3, 4);
    
        for (let i = 0; i < platformCount; i++) {
            const gap = Phaser.Math.Between(minGap, maxGap);
            this.lastPlatformY += gap;
    
            const x = Phaser.Math.Clamp(
                Phaser.Math.Between(minX, maxX),
                platformWidth / 5,
                this.cameras.main.width - platformWidth / 5
            );
    
            this.createPlatform(x, this.cameras.main.height + this.lastPlatformY);
        }
    }

    updateScore() {
        if (!this.gameIsOver) {
            this.score += 1;
            this.scoreText.setText(`Score: ${this.score}`);
        }
    }

    gameOver() {
        if (this.gameIsOver) return;
        this.gameIsOver = true;
        initiateGameOver.bind(this)({ score: this.score });
        if (this.sounds && this.sounds.lose) {
            this.sounds.lose.setVolume(0.5).setLoop(false).play();
        }
    }

    pauseGame() {
        handlePauseGame.bind(this)();
    }

    resetGame() {
        this.isResetting = true;
        this.gameIsOver = false;
        this.score = 0;
        this.lastPlatformY = 0;
        this.playerOnPlatform = null;

        // Clear existing game objects
        if (this.platforms) this.platforms.clear(true, true);
        if (this.player) this.player.destroy();
        if (this.trail) this.trail.destroy();
        if (this.nailWall) this.nailWall.clear(true, true);

        // Reinitialize the game
        this.initializeGame();

        this.isResetting = false;
    }
}

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
    deviceOrientation: _CONFIG.deviceOrientation === "landscape"
};

function createGame() {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.height = '100vh';
    document.body.style.backgroundColor = '#000000';
    document.body.style.overflow = 'hidden';

    const gameContainer = document.createElement('div');
    gameContainer.style.display = 'flex';
    gameContainer.style.justifyContent = 'center';
    gameContainer.style.alignItems = 'center';
    gameContainer.style.height = '100%';
    gameContainer.style.width = '100%';
    document.body.appendChild(gameContainer);

    config.scale.parent = gameContainer;

    new Phaser.Game(config);
}

function gameScenePreload(game) {
    for (const key in _CONFIG.imageLoader) {
        game.load.image(key, _CONFIG.imageLoader[key]);
    }

    for (const key in _CONFIG.soundsLoader) {
        game.load.audio(key, [_CONFIG.soundsLoader[key]]);
    }

    game.load.bitmapFont('pixelfont',
        'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
        'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
    game.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
}
