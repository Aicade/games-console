let assetsLoader = {
};

let soundsLoader = {
    "background": "background",
    "success": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/success_1.wav",
    "damage": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/flap_1.wav",
    "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_1.mp3"
}

// Custom UI Elements
const title = `Click the different colour`
const description = `A puzzle game where you have to click the colour which is different`
const instructions =
    `Instructions:
1. Click the colour which is different from the rest`;


// Custom Font Colors
const globalPrimaryFontColor = "#FFF";
const globalSecondaryFontColor = "#0F0"

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
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }

        this.load.image('heart', 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png');
        this.load.bitmapFont('pixelfont',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

        addEventListenersPhaser.bind(this)();
        displayProgressLoader.call(this);
    }

    create() {

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.input.keyboard.disableGlobalCapture();

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        // this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
        // this.bg.setScrollFactor(0);
        // this.bg.displayHeight = this.game.config.height;
        // this.bg.displayWidth = this.game.config.width;

        this.vfx = new VFXLibrary(this);
        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 50, 'pixelfont', 'Score: 0', 40).setOrigin(0.5).setDepth(11);
        this.gameOverText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', 'GAME OVER!', 60).setOrigin(0.5).setDepth(11).setTint(0xff0000).setAlpha(0);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
        this.pauseButton.on('pointerdown', () => this.pauseGame());
        this.lives = 3;
        this.hearts = [];
        for (let i = 0; i < this.lives; i++) {
            let x = 50 + (i * 35);
            this.hearts[i] = this.add.image(x, 60, "heart").setScale(0.025).setDepth(11);
        }
        gameSceneCreate(this);
    }

    update() {

    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(`Score: ${this.score}`);
    }

    gameOver() {
        this.sound.stopAll();
        this.sounds.lose.setVolume(0.5).setLoop(false).play()
        this.timerEvent.destroy()
        this.gameOverText.setAlpha(1);
        this.vfx.blinkEffect(this.gameOverText, 400, 3)
        this.vfx.shakeCamera(300, 0.04);
        this.time.delayedCall(2500, () => {
            initiateGameOver.bind(this)({ score: this.score });
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
    orientation: true,
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
};


//CREATE FUNCTION FOR THE GAME SCENE
function gameSceneCreate(game) {

    game.sounds.background.setVolume(3).setLoop(true).play()

    game.difficulty = 0.75;

    game.answer = 0;

    game.centerX = game.cameras.main.width / 2;
    game.centerY = game.cameras.main.height / 1.8;

    const squareSize = 100;

    game.squarePositions = [
        { x: (game.centerX - squareSize / 2) - 50, y: (game.centerY - squareSize / 2) - 50 },
        { x: (game.centerX + squareSize / 2) + 50, y: (game.centerY - squareSize / 2) - 50 },
        { x: (game.centerX - squareSize / 2) - 50, y: (game.centerY + squareSize / 2) + 50 },
        { x: (game.centerX + squareSize / 2) + 50, y: (game.centerY + squareSize / 2) + 50 }
    ];

    fillColour(game);

    const progressBarWidth = squareSize * 3;
    const progressBarHeight = 30;

    const progressBarBackground = game.add.graphics();
    progressBarBackground.fillStyle(0x808080, 0.5);
    progressBarBackground.fillRect(game.centerX - progressBarWidth / 2, game.centerY - squareSize * 2.5, progressBarWidth, progressBarHeight);

    game.progressBar = game.add.graphics();

    startTimer(game);
}

function fillColour(game) {

    const colors = ["#1abc9c", "#2ecc71", "#3498db", "#9b59b6", "#34495e", "#f1c40f", "#e67e22", "#e74c3c", "#7f8c8d", "#523D1F", "#D33257", "#45362E", "#E3000E", "#60646D", "#AAB69B", "#8870FF", "#3E4651", "#EB9532", "#FACA9B", "#D8335B", "#897FBA", "#BF4ACC", "#710301", "#8F6910", "#FFF457"];

    let n = Math.floor(Math.random() * colors.length);
    let color = colors[n];
    let factor = game.difficulty;

    let red = Math.min(Math.floor((parseInt(color.substring(1, 3), 16) * (1 - factor) + factor * 255)), 255);
    let green = Math.min(Math.floor((parseInt(color.substring(3, 5), 16) * (1 - factor) + factor * 255)), 255);
    let blue = Math.min(Math.floor((parseInt(color.substring(5, 7), 16) * (1 - factor) + factor * 255)), 255);
    let newColor = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;

    color = color.replace("#", "0x");
    newColor = newColor.replace("#", "0x");

    let randSquare = Math.floor(Math.random() * 4);
    game.answer = randSquare;

    game.squarePositions.forEach((pos, index) => {
        if (index == randSquare) {
            let square = game.add.rectangle(pos.x, pos.y, 100, 100, newColor)
                .setInteractive()
                .on('pointerdown', function () {
                    if (index == randSquare) {
                        if (game.difficulty > 0.05)
                            game.difficulty -= 0.05
                        game.updateScore(1);
                        game.sounds.success.setVolume(0.5).setLoop(false).play()
                        game.timerEvent.destroy();
                        game.time.delayedCall(0, restartTimer, null, game);
                        fillColour(game);
                    }
                    else { checkLife(game) }
                });
        }
        else {
            game.add.rectangle(pos.x, pos.y, 100, 100, color)
                .setInteractive()
                .on('pointerdown', function () {
                    if (index == randSquare) {
                        if (game.difficulty > 0.05)
                            game.difficulty -= 0.05
                        fillColour(game);
                    }
                    else { checkLife(game) }
                });
        }
    });
}

function checkLife(game) {
    game.lives--;
    game.hearts[game.lives].destroy();

    if (game.lives > 0) {
        game.sounds.damage.setVolume(0.5).setLoop(false).play();
        game.vfx.shakeCamera(100, 0.01);
    } else {
        game.gameOver();
    }
}

function startTimer(game) {
    game.timerValue = 2;

    let timerDuration = game.timerValue * 1000;
    let iterations = timerDuration / 10;

    updateProgressBar(game, game.timerValue);
    game.timerEvent = game.time.addEvent({
        delay: 2000 / iterations,
        callback: function () {
            game.timerValue -= (2 / iterations);
            updateProgressBar(game, game.timerValue);
            if (game.timerValue <= 0) {
                game.timerEvent.destroy();
                game.gameOver();
            }
        },
        callbackScope: this,
        loop: true
    });
}

function restartTimer() {
    startTimer(this);
}

function updateProgressBar(game, value) {
    game.progressBar.clear();

    const squareSize = 100;
    const progressBarWidth = squareSize * 3;
    const progressBarHeight = 30;

    const progressWidth = (value / 2) * progressBarWidth;

    game.progressBar.fillStyle(0x00ff00);
    if (progressWidth >= 0)
        game.progressBar.fillRect(game.centerX - progressBarWidth / 2, game.centerY - (squareSize * 2.5), progressWidth, progressBarHeight);
}