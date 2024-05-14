const assetsLoader = {
    "background": "background",
    "platform": "platform",
    "player": "player",
}

const soundsLoader = {
    "background": "background",
    'jump': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_3.mp3',
    'lose': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3',
    'collect': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3',
}

const title = `Flappy Bird`
const description = `Reaction and survival game.`
const instructions =
    `Instructions:
    1. Use SPACE or touch to make the player jump.
    2. Avoid touching the avoidables or ground.`;

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

const gameConstants = {
    dropSpeed: 500,
    pipeWidth: 120,
    jumpDistance: 20,
    pipeGap: 400,
    pipeMovingSpeed: 400,
    pipeSpawnTime: 100,
}

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
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

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(3).setLoop(true).play();

        this.vfx = new VFXLibrary(this);

        this.score = -1;

        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.dropSpeed = gameConstants.dropSpeed;
        this.pipeWidth = gameConstants.pipeWidth;
        this.jumpDistance = gameConstants.jumpDistance;
        this.pipeGap = gameConstants.pipeGap;
        this.pipeMovingSpeed = gameConstants.pipeMovingSpeed;
        this.pipeSpawnTime = gameConstants.pipeSpawnTime;

        this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);

        // Use the larger scale factor to ensure the image covers the whole canvas
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale);

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11)

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.pipesGroup = this.physics.add.group();

        this.ground = this.physics.add.sprite(0, this.game.config.height, "platform");
        this.ground.displayHeight = 50;
        this.ground.displayWidth = this.game.config.width;
        this.ground.setOrigin(0, 1).setCollideWorldBounds(true).setImmovable(true).setDepth(10);

        this.upButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.framesMoveUp = 0;
        this.nextPipes = 0;

        this.input.on('pointerdown', () => this.moveBird());

        this.player = this.physics.add.sprite(80, this.game.config.height / 2, "player");
        this.player.setCollideWorldBounds(true).setScale(0.13);
        this.player.body.setSize(this.player.body.width / 1.5, this.player.body.height / 1.5);
        this.player.body.allowGravity = false;

        this.physics.add.collider(this.player, this.ground, this.hitBird, null, this);
        this.physics.add.collider(this.player, this.pipesGroup, this.hitBird, null, this);
        this.makePipes(this);

    }

    update(time, delta) {

        if (this.framesMoveUp > 0)
            this.framesMoveUp--
        else if (Phaser.Input.Keyboard.JustDown(this.upButton))
            this.moveBird();
        else {
            this.player.setVelocityY(this.dropSpeed)

            if (this.player.angle < 90)
                this.player.angle += 1;
        }

        this.pipesGroup.children.iterate((child) => {
            if (child == undefined)
                return

            if (child.x < -(this.pipeWidth + 50))
                child.destroy();
            else
                child.setVelocityX(-this.pipeMovingSpeed);
        })

        this.nextPipes++
        if (this.nextPipes === this.pipeSpawnTime) {
            this.makePipes();
            this.nextPipes = 0;
        }

    }

    hitBird() {
        this.sounds.lose.play();
        this.vfx.shakeCamera();
        this.physics.pause();
        this.player.setTint(0xff0000);
        this.time.delayedCall(1000, () => {
            this.gameOver();
        })
    }

    makePipes() {

        const randomHeight = Phaser.Math.Between(this.game.config.height * 0.2, this.game.config.height * 0.6);
        const pipeX = this.game.config.width - 20;

        const pipeTop = this.pipesGroup.create(pipeX, 0, "pillar");
        pipeTop.displayHeight = randomHeight;
        pipeTop.displayWidth = this.pipeWidth;
        pipeTop.body.allowGravity = false;
        pipeTop.setOrigin(0, 0);

        const pipeBottom = this.pipesGroup.create(pipeX, randomHeight + this.pipeGap, "pillar");
        pipeBottom.displayHeight = this.game.config.height - this.pipeGap - randomHeight;
        pipeBottom.displayWidth = this.pipeWidth;
        pipeBottom.body.allowGravity = false;
        pipeBottom.setOrigin(0, 0);
        this.updateScore(1);
        this.sounds.collect.play();
    }

    moveBird() {
        this.sounds.jump.play();
        this.player.setVelocityY(-400);
        this.player.angle = -15;
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
            gravity: { y: 30 },
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