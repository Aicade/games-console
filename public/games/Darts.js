const assetsLoader = { "background": "image_2_background_background_1..png", "player": "image_6_player_player_1..png", "projectile": "image_4_projectile_cannonball_1..png" }

const title = `Dart Throw`
const description = `Tap to throw.`
const instructions =
    `Instructions:
  1. Tap to throw darts.`;


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

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.isgameover = false;

    }

    preload() {
        this.score = 0;
        addEventListenersPhaser.bind(this)();

        for (const key in assetsLoader) {
            this.load.image(key, assets_list[assetsLoader[key]]);
        }
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.audio('bgm', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-3.mp3']);
        this.load.audio('flap', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_3.mp3']);
        this.load.audio('lose', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3']);

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);

    }
    createPin(x, y, dt, text) {
        // this.projectiles = this.physics.add.group();

        let ret = { x: x, y: y, dt: dt, text: text, sprite: null };

        ret.sprite = this.add.sprite(x, y, 'projectile').setOrigin(0.5);
        let scale = 32 / 1024;
        ret.sprite.setScale(scale, scale);
        // console.log(ret.sprite.width);
        // this.projectiles.add(ret.sprite);
        // this.physics.add.collider(this.projectiles, this.projectiles, this.gameOver, null, this);

        let style = { font: "10px Arial", fill: "#000", align: "center" };
        let t = this.add.text(x, y, text, style).setOrigin(0.5);

        ret.sprite.t = t;

        return ret;
    }
    create() {
        this.isgameover = false;

        this.score = 0;
        this.sound.add('bgm', { loop: true, volume: 2.5 }).play();

        this.vfx = new VFXLibrary(this);

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0).setDepth(-10);
        this.bg.setScrollFactor(0);
        this.bg.displayHeight = this.game.config.height;
        this.bg.displayWidth = this.game.config.width;


        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 60, 'pixelfont', '0', 80).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11)

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.numberofPins = 50;
        this.pins = [];
        this.toLaunch = [];
        this.elapsed = 0;
        this.gameover = false;

        // let bg = this.add.tileSprite(0, 0, this.cameras.main.width + 900, this.cameras.main.height + 1500, 'background');

        let centerCir = this.add.sprite(this.cameras.main.centerX, 350, 'player').setDepth(1).setScale(.2);
        this.linesCanvasGraphic = this.add.graphics(0, 0);

        // let style = { font: "24px Arial", fill: "#000", align: "center" };


        let p = this.createPin(this.cameras.main.centerX + 100, 150, 0, '1');
        this.pins.push(p);

        for (let i = 2; i < this.numberofPins; i++) {
            this.toLaunch.push(this.createPin(this.cameras.main.centerX, 850 + ((i - 2) * 50), 0, i.toString()));
        }

        this.pinLaunch = this.toLaunch[0].sprite;

        this.input.on('pointerdown', this.releasePin, this);
    }
    releasePin() {
        if (!this.isgameover) {
            this.sound.add('flap', { loop: false, volume: 3 }).play();
            let pointsText = this.add.bitmapText(this.pinLaunch.x, this.pinLaunch.y - 75, 'pixelfont', '+10', 45)
                .setOrigin(0.5, 0.5);


            this.tweens.add({
                targets: pointsText,
                y: pointsText.y - 50,
                alpha: 0, // Fade out
                ease: 'Linear', // Animation ease
                duration: 1000,
                onComplete: function () {
                    pointsText.destroy();
                }
            });
            this.updateScore(1);
            if (this.gameover) {
                return;
            }
            if (this.tweenRunning && this.tweenRunning.isPlaying()) {
                return;
            }

            this.tweenRunning = this.tweens.add({
                targets: this.pinLaunch,
                y: 550,
                duration: 100,
                ease: 'Linear',
                onComplete: () => {
                    this.tweenRunning = null;
                    this.pinLaunch.y = 550;
                    this.checkIntersection();

                    let current = this.toLaunch.shift();
                    current.dt = this.elapsed;
                    this.pins.push(current);

                    if (this.toLaunch.length === 0) {
                        this.gameover = true;
                        this.winAnimations();
                        return;
                    }

                    this.pinLaunch = this.toLaunch[0].sprite;

                    this.toLaunch.forEach((pin) => {
                        this.tweens.add({
                            targets: pin.sprite,
                            y: '-=50',
                            duration: 30,
                            ease: 'Linear'
                        });
                    });
                }
            });
        }
    }


    winAnimations() {
        // alert('You win!');
        this.scene.restart();
    }

    update() {
        if (this.gameover) {
            return;
        }
        this.elapsed += 1;

        let graphics = this.linesCanvasGraphic;
        graphics.clear();

        graphics.lineStyle(2, 0xFFFF83, 1); // Width, Color, Alpha

        let ang120 = Math.PI / 2;
        for (let i = 0; i < this.pins.length; i++) {
            let pin = this.pins[i];

            let angle = Math.PI * ((this.elapsed - pin.dt) / 120) + ang120;
            let x = Math.cos(angle) * 200 + this.cameras.main.centerX;
            let y = Math.sin(angle) * 200 + 350;

            pin.sprite.x = x;
            pin.sprite.y = y;

            graphics.moveTo(this.cameras.main.centerX, 350);
            graphics.lineTo(pin.sprite.x, pin.sprite.y);
            graphics.strokePath();
        }

        this.checkIntersection();

        // gameSceneUpdate(this);
    }

    circlesIntersect(s1, s2) {
        let scale = 32 / 1024;

        let c1X = s1.x, c1Y = s1.y;
        let c1Radius = (s1.width * scale) / 2;

        let c2X = s2.x, c2Y = s2.y;
        let c2Radius = (s2.width * scale) / 2;

        let distanceX = c2X - c1X;
        let distanceY = c2Y - c1Y;

        let magnitude = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        // console.log("magnitude: " + magnitude + "|| c1Radius + c2Radius: " + c1Radius + c2Radius);
        console.log(magnitude < (c1Radius + c2Radius));
        return magnitude < (c1Radius + c2Radius);
    }

    checkIntersection() {
        if (!this.tweenRunning || !this.tweenRunning.isPlaying()) {
            return;
        }

        for (let i = 0; i < this.pins.length; i++) {
            let p = this.pins[i];
            if (this.circlesIntersect(p.sprite, this.pinLaunch)) {
                p.sprite.setTint(0xCC0000);
                this.pinLaunch.setTint(0xCC0000);
                this.gameover = true;
                this.isgameover = true;
                this.tweenRunning.pause();
                this.vfx.shakeCamera();
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
                break;
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
    pixelArt: true,
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: false
};

let gameScore = 0;
let gameLevel = 1;
let gameScoreText;
