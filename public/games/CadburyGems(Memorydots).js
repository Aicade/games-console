const assetsLoader = {
    "background": "background",
    "player": "player",
};

// Custom UI Elements
const title = `Cadbury Gems`;
const description = `Learning & Development game where you
have to memorize the color & position
of the objects.`;
const instructions =
    `
      Instructions:
        1. Observe closely & memorize the color and
        the position of the objects.

        2. Once the background fades to a color, touch
        the objects with the same color as of the
        background`;

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
        super('GameScene');
        this.gridSize = 80;
        this.colorsInGame = [0xff0000, 0xff8800, 0x00ff00, 0x0000ff, 0xff00ff, 0x555555];
        this.circlesInGame = 5;
    }

    preload() {

        for (const key in assetsLoader) {
            this.load.image(key, assets_list[assetsLoader[key]]);
        }
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.audio('backgroundMusic', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-2.mp3']);
        this.load.audio('loose', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3']);
        this.load.audio('newCircles', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_2.mp3']);
        this.load.audio('wrong', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/flap_1.wav']);
        this.load.audio('correct', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/upgrade_2.mp3']);
        this.load.bitmapFont('pixelfont',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
        addEventListenersPhaser.bind(this)();
        displayProgressLoader.call(this);
    }

    create() {
        this.score = 0;
        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.vfx = new VFXLibrary(this);
        // Add UI elements
        this.scoreText = this.add.bitmapText(30, 60, 'pixelfont', 'Score: 0', 30);
        this.scoreText.setDepth(11)

        this.gameOverText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', 'Game Over !', 60).setOrigin(0.5).setAlpha(0);
        this.gameOverText.setDepth(11).setTint(0xff0000);

        this.clickGuideText = this.add.bitmapText(this.width / 2, this.height - 30, 'pixelfont', 'select object(s) that had same color \n as background.', 30).setOrigin(0.5, 1).setAlpha(0);
        this.clickGuideText.setDepth(11);
        this.clickGuideText.align = 1;

        // Add UI elements
        this.insText = this.add.bitmapText(this.width / 2, this.height / 2.4, 'pixelfont', 'Memorise the colors \nbefore the timer ends.', 32).setOrigin(0.5).setDepth(11);
        this.insText.align = 1;
        this.insText.shown = false;

        this.startText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', 'Start Round >>', 50).setOrigin(0.5).setDepth(11).setTint(0xFFB000);
        this.startText.setInteractive({ cursor: 'pointer' });
        this.startText.on('pointerdown', this.startRound, this);

        this.levelUpText = this.add.bitmapText(this.width / 2, this.height / 2.6, 'pixelfont', 'Level Up!', 60).setOrigin(0.5).setDepth(11).setTint(0xFFB000).setAlpha(0);

        this.tryAgainText = this.add.bitmapText(this.width / 2, this.height / 2.5, 'pixelfont', 'Oops !! \nTry again', 50).setOrigin(0.5).setDepth(11).setTint(0xffffff).setAlpha(0);
        this.tryAgainText.align = 1; //1 is for center align

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.sprite(this.game.config.width - 60, 95, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.cover = this.add.rectangle(0, 0, this.width, this.height, 0xffffff).setOrigin(0);
        this.cover.alpha = 0;

        this.memoriseTime = 5;
        this.timeElapsed = 0;

        this.circleGroup = this.add.group();
        this.circleGroup.setOrigin(0, 0);
        this.makeTimerMeter();

        this.backgroundMusic = this.sound.add('backgroundMusic', { loop: true, volume: 2.5 });
        this.backgroundMusic.play()
        this.wrongSound = this.sound.add('wrong', { volume: 1 });
        this.correctound = this.sound.add('correct', { volume: 1 });
        this.looseSound = this.sound.add('loose', { volume: 1 });
        this.newCirclesSound = this.sound.add('newCircles', { volume: 1 });
    }

    startRound() {
        if (!this.insText.shown) {
            this.insText.shown = true;
            this.insText.visible = false;
        }
        this.startText.visible = false;
        this.handleCircles();
        this.startClockTimer();
    }

    startClockTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimerMeter,
            callbackScope: this,
            loop: true
        });
    }

    makeTimerMeter(startAngle = -90, endAngle = 270, isUpdated = false) {

        if (isUpdated) {
            this.clockText.setText(this.memoriseTime - this.timeElapsed);
        } else {
            this.clockText = this.add.bitmapText(this.width / 2 - 5, 85, 'pixelfont', this.memoriseTime - this.timeElapsed, 30).setOrigin(0.5);
            this.clockText.setDepth(11).setTint(0xFFB000);
        }
        if (this.memoriseTime - this.timeElapsed <= 0) {
            this.timeElapsed = 0;
            this.time.delayedCall(100, () => {
                this.clockText.visible = false;
                this.fadeOut();
            })
        }

        this.clockGraphics = this.add.graphics().setDepth(11);
        this.clockGraphics.lineStyle(4, 0xFFB000, 1);
        this.clockGraphics.arc(this.width / 2, 90, 45, Phaser.Math.DegToRad(startAngle), Phaser.Math.DegToRad(endAngle));
        this.clockGraphics.strokePath();
    }

    updateTimerMeter() {
        this.timeElapsed++;
        let newStartAngle = ((360 / this.memoriseTime) * this.timeElapsed) - 90;
        if (newStartAngle === 270) {
            newStartAngle = 269;
            this.timerEvent.destroy();
        }
        this.clockGraphics.clear();
        this.makeTimerMeter(newStartAngle, 270, true)
    }

    handleCircles() {
        this.removeOldCircles();
        this.addNewCircles();
    }

    removeOldCircles() {
        this.circleGroup.getChildren().forEach((item) => {
            item.tint = item.tintColor;
            let randomDirection = Phaser.Math.Between(1, 4);
            let tweenObject = {};
            switch (randomDirection) {
                case 1: tweenObject.x = -this.gridSize; break;
                case 2: tweenObject.y = -this.gridSize; break;
                case 3: tweenObject.x = this.game.config.width + this.gridSize; break;
                case 4: tweenObject.y = this.game.config.height + this.gridSize; break;
            }
            if (tweenObject.y) {
                this.tweens.add({
                    targets: item,
                    y: tweenObject.y,
                    duration: 500,
                    ease: 'Cubic.easeIn',
                    onComplete: () => item.destroy()
                });
            }
            if (tweenObject.x) {
                this.tweens.add({
                    targets: item,
                    x: tweenObject.x,
                    duration: 500,
                    ease: 'Cubic.easeIn',
                    onComplete: () => item.destroy()
                });
            }
        });
    }

    addNewCircles() {
        this.newCirclesSound.play();
        this.possibleColors = [];
        for (let i = 0; i < this.colorsInGame.length; i++) {
            for (let j = 0; j < this.circlesInGame - 1; j++) {
                this.possibleColors.push(this.colorsInGame[i])
            }
        }
        let boardWidth = this.game.config.width / this.gridSize - 2;
        let boardHeight = this.game.config.height / this.gridSize - 2;
        this.positionsArray = [];
        for (let i = 0; i < boardWidth * boardHeight; i++) {
            this.positionsArray.push(i);
        }
        this.pickedColors = [];
        for (let i = 0; i < this.circlesInGame; i++) {
            let randomPosition = Phaser.Utils.Array.RemoveRandomElement(this.positionsArray);
            let posX = (1 + randomPosition % boardWidth) * this.gridSize;
            posX = posX > this.game.width - 50 ? this.game.width - 50 : posX;
            posX = posX < 100 ? 100 : posX;
            let posY = (1 + Math.floor(randomPosition / boardWidth)) * this.gridSize;
            posY = posY > this.game.height - 150 ? this.game.height - 150 : posY;
            posY = posY < 200 ? 200 : posY;
            let circle = this.add.sprite(posX, posY, 'player').setInteractive({ cursor: 'pointer' }).setScale(0.1);
            circle.on('pointerdown', () => this.circleSelected(circle));
            this.circleGroup.add(circle);
            circle.tintColor = Phaser.Utils.Array.RemoveRandomElement(this.possibleColors);
            circle.tint = circle.tintColor;
            circle.fillColor = circle.tintColor;
            if (this.pickedColors.indexOf(circle.tint) === -1) {
                this.pickedColors.push(circle.tint);
            }
            let randomDirection = Phaser.Math.Between(1, 4);
            let tweenObject = {};
            switch (randomDirection) {
                case 1: circle.x = -this.gridSize; tweenObject.x = posX; break;
                case 2: circle.y = -this.gridSize; tweenObject.y = posY; break;
                case 3: circle.x = this.game.config.width + this.gridSize; tweenObject.x = posX; break;
                case 4: circle.y = this.game.config.height + this.gridSize; tweenObject.y = posY; break;
            }
            if (tweenObject.y) {
                this.tweens.add({
                    targets: circle,
                    y: tweenObject.y,
                    duration: 500,
                    ease: 'Cubic.easeOut',
                    delay: 0
                });
            }
            if (tweenObject.x) {
                this.tweens.add({
                    targets: circle,
                    x: tweenObject.x,
                    duration: 500,
                    ease: 'Cubic.easeOut',
                    delay: 0
                });
            }
        }
    }

    fadeOut() {

        this.clickGuideText.setAlpha(1);
        let randColor = Phaser.Utils.Array.GetRandom(this.pickedColors)
        this.cover.tint = randColor;
        this.cover.fillColor = randColor;
        this.tweens.add({
            targets: this.cover,
            alpha: 1,
            duration: 200,
            ease: 'Linear',
            onComplete: () => {
                this.circleGroup.getChildren().forEach((item) => {
                    item.fillAlpha = 0;
                    item.setTint(0xffffff);
                    // item.setStrokeStyle(4, 0xffffff);
                });
            }
        });
    }

    circleSelected(circle) {
        if (this.cover.alpha === 1) {
            if (circle.tintColor === this.cover.tint) {
                this.correctound.play();
                circle.destroy();
                this.updateScore(10)
                this.scorePointAnim(circle.x, circle.y)
                let levelCompleted = !this.circleGroup.getChildren().some((item) => item.tintColor === this.cover.tint);
                if (levelCompleted) {
                    if (this.score > 90) {
                        this.memoriseTime = 4;
                    }
                    this.removeOldCircles();
                    this.time.delayedCall(1000, () => {
                        this.clickGuideText.setAlpha(0);
                        this.lifeUsed = false;
                        this.cover.alpha = 0;
                        if (this.score > 90 && this.memoriseTime > 4) {
                            this.memoriseTime = 4;
                            this.vfx.blinkEffect(this.levelUpText, 400, 4);
                        }
                        this.makeTimerMeter();
                        this.startText.text = "Next Round >>";
                        this.startText.visible = true;
                    })
                }
            } else {
                this.wrongSound.play();
                if (this.lifeUsed) {
                    this.tryAgainText.text = "Wrong Again! You Lost."
                    this.vfx.blinkEffect(this.tryAgainText, 400, 2)
                    this.circleGroup.getChildren().forEach((item) => {
                        item.fillAlpha = 1;
                        item.setTint(item.tintColor);
                        item.setAlpha(1);
                    });
                    this.time.delayedCall(1500, () => {
                        this.looseSound.play();
                        this.gameOverText.setAlpha(1);
                        this.time.delayedCall(2000, () => {
                            this.gameOver();
                        });
                    });
                } else {
                    this.cameras.main.shake(150, 0.02);
                    this.vfx.blinkEffect(this.tryAgainText, 300, 2)
                    this.lifeUsed = true;
                    circle.fillAlpha = 1;
                    circle.setTint(circle.tintColor);
                    circle.setAlpha(1);
                }
            }
        }
    }

    scorePointAnim(x, y) {
        let scoreText = this.add.bitmapText(x, y, 'pixelfont', '+10', 35);

        this.tweens.add({
            targets: scoreText,
            y: y - 100,
            duration: 800,
            ease: 'Power1',
            onComplete: function () {
                scoreText.destroy();
            }
        });
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

// Configuration object
const config = {
    type: Phaser.AUTO,
    width: orientationSizes[orientation].width,
    height: orientationSizes[orientation].height,
    // backgroundColor: '#ffffff',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    scene: [GameScene],
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: false
};