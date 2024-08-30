//Slice Effect
class SliceEffect {
    constructor(scene) {
        this.scene = scene;
        this.lines = []; // For the slice lines
        this.maxLifetime = 100; // Lifetime of a slice line in milliseconds
    }

    addSlice(x1, y1, x2, y2) {
        let line = new Phaser.Geom.Line(x1, y1, x2, y2);
        let graphics = this.scene.add.graphics({ lineStyle: { width: 4, color: 0xffffff } });
        graphics.strokeLineShape(line);
        this.lines.push({ graphics, createdAt: this.scene.time.now });

        // Automatically fade and destroy old lines
        this.scene.time.delayedCall(this.maxLifetime, () => {
            graphics.clear();
            graphics.destroy();
        }, [], this);
        // Now, for the sparkling trail effect:
        // this.emitter.emitParticleAt(x1, y1);
    }

    update(x, y) {
        // Emit sparkles as the slice moves
        if (this.scene.pointerDown) {
            // this.emitter.emitParticleAt(x, y);
        }
    }
}


// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.isGameOver = false;

    }

    preload() {
        for (const key in _CONFIG.imageLoader) {
            this.load.image(key, _CONFIG.imageLoader[key]);
        }

        for (const key in _CONFIG.soundsLoader) {
            this.load.audio(key, [_CONFIG.soundsLoader[key]]);
        }

        addEventListenersPhaser.bind(this)();

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');
    }

    create() {
        this.score = 0;
        this.vfx = new VFXLibrary(this);

        this.cursor = this.input.keyboard.createCursorKeys();

        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(1).setLoop(true).play()

        this.isGameOver = false;
        this.sliceEffect = new SliceEffect(this);

        var me = this;

          this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);      // Use the larger scale factor to ensure the image covers the whole canvas
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale).setDepth(-5);

        this.width = this.game.config.width;
        this.height = this.game.config.height;

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 50, 'pixelfont', '0', 64).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(100)

        this.levelUpText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 50, 'pixelfont', 'LEVEL UP', 80).setOrigin(0.5, 0.5)
            .setAlpha(0).setDepth(11).setTint(0xffff00);

        // here u can remove the keyword to have less tile sheet
        this.pauseButton = this.add.sprite(this.width - 50, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.setDepth(11)
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.matter.world.setGravity(0, 1);
        let bounds = this.matter.world.setBounds(-1000, -1000, this.game.config.width + 2000, this.game.config.height + 2000);
        bounds.walls.bottom.label = 'bottom';

        this.createPortal();
        this.createPlayer();
        this.input.keyboard.disableGlobalCapture();
    }

    createPlayer() {
        this.ballsL = [];
        this.ballsR = [];
        this.jointsL = [];
        this.jointsR = [];
        var distance = 300;
        var rand = Phaser.Math.Between(0 + 50, this.game.config.width - (distance + 50));
        this.firstLeft = this.matter.add.image(rand, 80, 'projectile', null, { shape: 'circle', mass: 10, ignoreGravity: true }).setDisplaySize(35, 35);
        this.firstRight = this.matter.add.image(rand + distance, 80, 'projectile', null, { shape: 'circle', mass: 10, ignoreGravity: true }).setDisplaySize(35, 35);
        this.firstLeft.setStatic(true);
        this.firstRight.setStatic(true);
        this.ballsL.push(this.firstLeft);
        this.ballsR.push(this.firstRight);
        var x2L = rand;
        var y2L = 100;
        var x2R = rand + distance;
        var y2R = 100;
        var prevL = this.firstLeft;
        var prevR = this.firstRight;

        var lastL;
        var lastR;

        this.pointerDown = false;
        var leftJoint;
        var rightJoint;

        this.input.on("pointerdown", () => {
            this.pointerDown = true;
            this.sounds.stretch.setVolume(.5).setLoop(false).play()
        })

        this.input.on("pointerup", () => {
            this.pointerDown = false;
        })

        for (var i = 0; i < 5; i++) {
            var ball = this.matter.add.image(x2L, y2L, 'projectile', null, { shape: 'circle', mass: 0.0001 }).setDisplaySize(32, 32).setDepth(11);

            this.jointsL.push(this.matter.add.joint(prevL, ball, 30, 0.2));
            this.ballsL.push(ball);

            prevL = ball;

            y2L += 35;

            lastL = ball;

            ball.setInteractive().on('pointerover', function (pointer, localX, localY, event) {
                if (this.pointerDown) {
                    this.matter.world.remove(leftJoint);
                }
            }, this);
        }

        for (var i = 0; i < 5; i++) {
            var ball = this.matter.add.sprite(x2R, y2R, 'projectile', null, { shape: 'circle', mass: 0.0001 }).setDisplaySize(32, 32).setDepth(11);

            this.jointsR.push(this.matter.add.joint(prevR, ball, 30, 0.2));
            this.ballsR.push(ball);

            prevR = ball;

            y2R += 35;

            lastR = ball;

            ball.setInteractive().on('pointerover', function (pointer, localX, localY, event) {
                if (this.pointerDown) {
                    this.matter.world.remove(rightJoint);
                }
            }, this);
        }



        let x = Phaser.Math.Between(0 + 50, this.game.config.width - 50);
        let y = Phaser.Math.Between(50, this.game.config.height / 2 - 50);
        this.player = this.matter.add.sprite(x2L + distance / 2, y2R, 'player');
        this.player.setDepth(2);
        this.player.label = 'player';
        this.player.setMass(0.00001);
        this.player.setOrigin(0.5);
        this.player.setDisplaySize(96, 96);
        leftJoint = this.matter.add.joint(lastL, this.player, 35, 0.01);
        rightJoint = this.matter.add.joint(lastR, this.player, 35, 0.01);

        this.player.setOnCollideWith(this.portal, pair => {
            this.sounds.collect.setVolume(1).setLoop(false).play()
            let pointsText = this.add.bitmapText(this.player.x, this.player.y - 75, 'pixelfont', '+1', 45)
                .setOrigin(0.5, 0.5).setTint(0xffff00);

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
            this.player.destroy();
            this.portal.destroy();
            this.jointsR.forEach(joint => this.matter.world.remove(joint))
            this.jointsL.forEach(joint => this.matter.world.remove(joint))
            this.ballsL.forEach(ball => {
                ball.destroy();
            });
            this.ballsR.forEach(ball => {
                ball.destroy();
            });
            this.createPortal();
            this.createPlayer();
        });

        this.matter.world.on('collisionstart', (event, bodyA, bodyB) => {
            if (bodyA.label == 'bottom' || bodyB.label == 'bottom') {
                if (!this.isGameOver) {
                    this.resetGame();
                }
            }
        });

    }

    createPortal() {
        let x = Phaser.Math.Between(0 + 50, this.game.config.width - 50);
        let y = Phaser.Math.Between(this.game.config.height / 2 + 100, this.game.config.height - 50);
        this.portal = this.matter.add.sprite(x, y, 'platform', null, { ignoreGravity: true }).setScale(0.25, 0.25);
        this.portal.setStatic(true);
    }

    resetGame() {
        this.isGameOver = true;
        this.score = 0;
        this.vfx.shakeCamera();

        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 200, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15).setTint(0xFF0000);

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

    update(time, delta) {
        if (this.pointerDown) {
            this.sliceEffect.addSlice(this.input.x, this.input.y, this.input.activePointer.prevPosition.x, this.input.activePointer.prevPosition.y);
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
            "score": this.score
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

// Configuration object
const config = {
    type: Phaser.AUTO,
    width: _CONFIG.deviceOrientationSizes[_CONFIG.deviceOrientation].width,
    height: _CONFIG.deviceOrientationSizes[_CONFIG.deviceOrientation].height,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    /* ADD CUSTOM CONFIG ELEMENTS HERE */
    physics: {
        default: 'matter',
        matter: { debug: false }
    },
    dataObject: {
        name: _CONFIG.title,
        description: _CONFIG.description,
        instructions: _CONFIG.instructions,
    },
    orientation: _CONFIG.deviceOrientation === "portrait"
};
