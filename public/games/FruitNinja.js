let assetsLoader = {
    "background": "background",
    "collectible": "collectible",
    "avoidable": "avoidable"
};

let soundsLoader = {
    "background": "background",
    'destroy': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/blast.mp3',
    'slice': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/slice.flac',
};

const title = `Fruit and Meat Slasher`
const description = `A game where the player slices through various fruits and meats to earn points and progress through levels.`
const instructions = `Instructions:
  1. Slice collectibles
  2. Avoid enemies`;

// Game Orientation
const orientation = "landscape";

var difficulty = 1;
var difficultyDelay = 5000;
var spawnTimeDelay = 1000 * difficulty;
var bombTimeDelay = 2000 * difficulty;
const startDelay = 4000;


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
        this.chances = 3; // Player's chances
        this.hearts = []; // Array to store heart graphics
        this.timerText = null; // Text object to display the timer
        this.timeLeft = 25; // Time in seconds given to answer each question
        this.timerEvent = null; // Phaser timer event
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

        this.load.bitmapFont('pixelfont',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
        displayProgressLoader.call(this);
    }

    create() {
        this.timeLeft = 25;
        this.cam = this.cameras.main;

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(3).setLoop(true).play();

        this.explosionEmitter = this.add.particles('avoidable', {
            speed: 150,
            scale: { start: 0.025, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 5000,
            on: false // Prevent it from emitting immediately
        });

        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.pointerDown = false;

        this.gameSceneBackground();
        this.gameOverFlag = false;

        // Add UI elements
        // this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: globalPrimaryFontColor });

        let fruitLabel = this.add.sprite(this.width / 2 - 70, 55, 'collectible').setScale(0.05);
        this.scoreText = this.add.bitmapText(this.width / 2 - 40, 15, 'pixelfont', 'x 0', 40);

        this.scoreText.setTint(0xff9900); // For red tint
        // Or you can use tint blend mode to apply a blend mode over the text
        // this.scoreText.setTintBlendMode(Phaser.BlendModes.MULTIPLY); // Apply multiply
        this.scoreText.setDepth(11)


        this.timerText = this.add.bitmapText(50, 30, 'pixelfont', `Time left : ${this.timeLeft}s`, 28).setTint(0xffffff);

        // Score as much as you can in timeLeft seconds 
        this.instructionText = this.add.bitmapText(this.game.config.width * 0.5, this.game.config.height * 0.3, 'pixelfont', `Score as much as you can in ${this.timeLeft} seconds`, 25).setOrigin(0.5, 0.5);
        this.instructionText.setScrollFactor(0).setDepth(11).setTint(0xff0000);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        const pauseButton = this.add.sprite(this.game.config.width * 0.9, this.game.config.height * 0.1, "pauseButton").setOrigin(0.5, 0.5).setScale(2);
        // const pauseButton = this.add.text(this.game.config.width - 20, 10, 'Pause', { fontSize: '16px', fill: globalSecondaryFontColor }).setOrigin(1, 0);
        pauseButton.setInteractive({ cursor: 'pointer' });
        pauseButton.on('pointerdown', () => this.pauseGame());

        this.score = 0;

        this.fruits = this.physics.add.group({});
        this.bombs = this.physics.add.group({});

        this.centerText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', '', 70).setOrigin(0.5, 0.5).setVisible(true).setDepth(100);

        this.input.on("pointerdown", () => {
            this.preScore = this.score;
            this.pointerDown = true;
        });

        this.sliceEffect = new SliceEffect(this);

        this.input.on("pointerup", () => {
            this.postScore = this.score;
            const combo = this.postScore - this.preScore;
            if (combo > 1 && !this.gameOverFlag) {
                this.centerText.setText("COMBO x" + (this.postScore - this.preScore).toString());
                this.centerText.setVisible(true);
                this.time.delayedCall(500, () => {
                    this.centerText.setVisible(false);
                });
            }
            this.pointerDown = false;
        })

        this.startDelayTimer = this.time.delayedCall(startDelay - 2000, () => {
            this.instructionText.setAlpha(0);
            this.startTimer();
        })
        this.input.keyboard.disableGlobalCapture();


    }

    update() {
        if (this.gameOverFlag) return;
        if (this.pointerDown) {
            this.sliceEffect.addSlice(this.input.x, this.input.y, this.input.activePointer.prevPosition.x, this.input.activePointer.prevPosition.y);
        }

        if (this.time.now > spawnTimeDelay && this.time.now > startDelay) {
            this.spawnFruit();
            spawnTimeDelay = this.time.now + (2500 * difficulty);
        }

        if (this.time.now > bombTimeDelay && this.time.now > startDelay) {
            this.spawnBomb();
            bombTimeDelay = this.time.now + (3000 * difficulty);
        }

        if (this.time.now > difficultyDelay && difficulty > 0.1) {
            difficulty -= 0.02;
            difficultyDelay = this.time.now + 10000;
        }


    }

    createParticles(x, y, type = "collectible") {
        // Create an emitter for the particles

        const emitter = this.add.particles(x, y, type, {
            speed: 100,
            scale: { start: 0.025, end: 0 },
            blendMode: 'ADD',
            lifespan: 400,
            on: false // Prevent it from emitting immediately
        });

        // Explode particles at the given position (x, y)
        emitter.explode(20);

        // Optional: Destroy the particles object after all particles have vanished
        // to clean up and save resources.
        this.time.delayedCall(1000, () => {
            emitter.destroy();
        });
    }

    startTimer() {
        // Create and start the timer event
        this.timerEvent = this.time.addEvent({
            delay: 1000, // 1 second
            callback: this.updateTimer,
            callbackScope: this,
            loop: true // Repeat infinitely
        });

    }
    updateTimer() {
        this.timeLeft--; // Decrement the time left
        this.timerText.setText(`Time left: ${this.timeLeft}s`); // Update the displayed time

        // Check if time is up
        if (this.timeLeft <= 0) {
            this.gameOver(); // Trigger game over
        }
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(`x ` + this.score);
    }

    gameOver() {
        initiateGameOver.bind(this)({
            "score": this.score,
        });
    }

    pauseGame() {
        handlePauseGame.bind(this)();
    }
    gameSceneBackground() {
        let bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);

        // Use the larger scale factor to ensure the image covers the whole canvas
        const scale = Math.max(this.width / bg.displayWidth, this.height / bg.displayHeight);
        bg.setScale(scale);
    }

    cutFruit(fruit) {
        if (!this.pointerDown) return;
        this.sounds.slice.play();
        this.createParticles(fruit.x, fruit.y); // Create particles where the fruit is sliced
        fruit.setAlpha(0);
        this.time.delayedCall(100, () => {
            this.fruits.remove(fruit, true, true); // Remove the fruit from the group and scene
        });
        // this.fruits.remove(fruit, true, true);
        this.updateScore(1);
        console.log("score updated");

    }

    cutBomb(bomb) {
        if (this.pointerDown) {
            this.centerText.alpha = 0;
            this.gameOverFlag = true;
            this.timerEvent.destroy();
            this.physics.pause();
            this.cam.shake(100, 0.1);

            this.time.delayedCall(500, () => {
                this.cam.flash(200);
                this.sounds.destroy.play();
                this.createParticles(bomb.x, bomb.y, "avoidable");
                bomb.setAlpha(0);
                this.bombs.remove(bomb, true, true);
                this.time.delayedCall(2000, () => {
                    this.gameOver();
                });
            });
        }
    }

    spawnFruit() {
        for (var i = 0; i < Phaser.Math.Between(2, 5); i++) {
            const fruit = this.fruits.create(Phaser.Math.Between(150, this.width - 150), this.height, 'collectible');
            fruit.setScale(0.1);
            fruit.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-350, -500));
            fruit.setAngularVelocity(Phaser.Math.Between(-200, 200));

            fruit.setInteractive();
            fruit.on("pointerover", function (pointer) {
                this.cutFruit(fruit);
            }, this);
        }
    }

    spawnBomb() {
        const bomb = this.bombs.create(Phaser.Math.Between(150, this.width - 150), this.height, 'avoidable');
        bomb.setScale(0.1);
        bomb.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-350, -500));
        bomb.setAngularVelocity(Phaser.Math.Between(-200, 200));

        bomb.setInteractive();
        bomb.on("pointerover", function (pointer) {
            this.cutBomb(bomb);
        }, this);
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
    width: orientationSizes[orientation].width,
    height: orientationSizes[orientation].height,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 },
            debug: false
        }
    },
    orientation: true,
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
}
