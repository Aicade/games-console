// Game constants
const gameConstants = {
    dropSpeed: 500,
    pipeWidth: 120,
    jumpDistance: 20,
    pipeGap: 400,
    pipeMovingSpeed: 400,
    pipeSpawnTime: 100,
};

// Preload function for GameScene
function gameScenePreload(scene) {
    for (const key in _CONFIG.imageLoader) {
        scene.load.image(key, _CONFIG.imageLoader[key]);
    }

    for (const key in _CONFIG.soundsLoader) {
        scene.load.audio(key, _CONFIG.soundsLoader[key]);
    }

    scene.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
    scene.load.image("pillar", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Bricks/s2+Brick+01+Grey.png");

    const fontName = 'pix';
    const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/";
    scene.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

    scene.load.on('loaderror', (file) => {
        console.error('Error loading asset:', file.key);
    });
}

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        gameScenePreload(this);
        displayProgressLoader.call(this);
        addEventListenersPhaser.bind(this)();
    }

    create() {
        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            if (this.cache.audio.exists(key)) {
                this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
            } else {
                console.warn(`Audio ${key} not found in cache`);
            }
        }

        if (this.sounds.background) {
            this.sounds.background.setVolume(3).setLoop(true).play();
        }

        this.vfx = new VFXLibrary(this);

        this.score = -1;
        this.width = this.game.config.width;
        this.height = this.game.config.height;

        Object.assign(this, gameConstants);

        if (this.textures.exists('background')) {
            this.bg = this.add.image(this.width / 2, this.height / 2, "background").setOrigin(0.5);
            const scale = Math.max(this.width / this.bg.displayWidth, this.height / this.bg.displayHeight);
            this.bg.setScale(scale);
        } else {
            console.warn('Background image not found');
        }

        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11);

        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        if (this.textures.exists('pauseButton')) {
            this.pauseButton = this.add.sprite(this.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
            this.pauseButton.setInteractive({ cursor: 'pointer' });
            this.pauseButton.setScale(3);
            this.pauseButton.on('pointerdown', () => this.pauseGame());
        } else {
            console.warn('Pause button image not found');
        }

        this.pipesGroup = this.physics.add.group();

        if (this.textures.exists('platform')) {
            this.ground = this.physics.add.sprite(0, this.height, "platform");
            this.ground.displayHeight = 50;
            this.ground.displayWidth = this.width;
            this.ground.setOrigin(0, 1).setCollideWorldBounds(true).setImmovable(true).setDepth(10);
        } else {
            console.warn('Platform image not found');
        }

        this.upButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.framesMoveUp = 0;
        this.nextPipes = 0;

        this.input.on('pointerdown', () => this.moveBird());

        if (this.textures.exists('player')) {
            this.player = this.physics.add.sprite(80, this.height / 2, "player");
            this.player.setCollideWorldBounds(true).setScale(0.15);
            this.player.body.setSize(this.player.body.width / 1.5, this.player.body.height / 1.5);
            this.player.body.allowGravity = false;
        } else {
            console.warn('Player image not found');
        }

        if (this.player && this.ground) {
            this.physics.add.collider(this.player, this.ground, this.hitBird, null, this);
        }
        if (this.player && this.pipesGroup) {
            this.physics.add.collider(this.player, this.pipesGroup, this.hitBird, null, this);
        }

        this.makePipes(this);
        this.input.keyboard.disableGlobalCapture();
    }

    update(time, delta) {
        if (this.framesMoveUp > 0) {
            this.framesMoveUp--;
        } else if (Phaser.Input.Keyboard.JustDown(this.upButton)) {
            this.moveBird();
        } else if (this.player) {
            this.player.setVelocityY(this.dropSpeed);
            if (this.player.angle < 90) {
                this.player.angle += 1;
            }
        }

        this.pipesGroup.children.iterate((child) => {
            if (child == undefined) return;
            if (child.x < -(this.pipeWidth + 50)) {
                child.destroy();
            } else {
                child.setVelocityX(-this.pipeMovingSpeed);
            }
        });

        this.nextPipes++;
        if (this.nextPipes === this.pipeSpawnTime) {
            this.makePipes();
            this.nextPipes = 0;
        }
    }

    hitBird() {
        if (this.sounds.lose) {
            this.sounds.lose.play();
        }
        this.vfx.shakeCamera();
        this.physics.pause();
        if (this.player) {
            this.player.setTint(0xff0000);
        }
        this.time.delayedCall(1000, () => {
            this.gameOver();
        });
    }

    makePipes() {
        const randomHeight = Phaser.Math.Between(this.height * 0.2, this.height * 0.6);
        const pipeX = this.width - 20;

        if (this.textures.exists('pillar')) {
            const pipeTop = this.pipesGroup.create(pipeX, 0, "pillar");
            pipeTop.displayHeight = randomHeight;
            pipeTop.displayWidth = this.pipeWidth;
            pipeTop.body.allowGravity = false;
            pipeTop.setOrigin(0, 0);

            const pipeBottom = this.pipesGroup.create(pipeX, randomHeight + this.pipeGap, "pillar");
            pipeBottom.displayHeight = this.height - this.pipeGap - randomHeight;
            pipeBottom.displayWidth = this.pipeWidth;
            pipeBottom.body.allowGravity = false;
            pipeBottom.setOrigin(0, 0);
        } else {
            console.warn('Pillar texture not found');
        }

        this.updateScore(1);
        if (this.sounds.collect) {
            this.sounds.collect.play();
        }
    }

    moveBird() {
        if (this.sounds.jump) {
            this.sounds.jump.play();
        }
        if (this.player) {
            this.player.setVelocityY(-400);
            this.player.angle = -15;
        }
        this.framesMoveUp = this.jumpDistance;
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(this.score);
    }

    gameOver() {
        this.sounds.background.stop();
        initiateGameOver.bind(this)({
            score: this.score,
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

// Configuration object
const config = {
    type: Phaser.AUTO,
    width: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].width,
    height: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].height,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.Orientation.PORTRAIT
    },
    pixelArt: true,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 30 },
            debug: false,
        },
    },
    dataObject: {
        name: _CONFIG.title,
        description: _CONFIG.description,
        instructions: _CONFIG.instructions,
    },
    deviceOrientation: _CONFIG.deviceOrientation==="portrait"
};