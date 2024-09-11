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
// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.grid = [];
        this.diceData = [
            { "name": "DIE0", "sides": ["R", "I", "F", "O", "B", "X"] },
            { "name": "DIE1", "sides": ["I", "F", "E", "H", "E", "Y"] },
            { "name": "DIE2", "sides": ["D", "E", "N", "O", "W", "S"] },
            { "name": "DIE3", "sides": ["U", "T", "O", "K", "N", "D"] },
            { "name": "DIE4", "sides": ["H", "M", "S", "R", "A", "O"] },
            { "name": "DIE5", "sides": ["L", "U", "P", "E", "T", "S"] },
            { "name": "DIE6", "sides": ["A", "C", "I", "T", "O", "A"] },
            { "name": "DIE7", "sides": ["Y", "L", "G", "K", "U", "E"] },
            { "name": "DIE8", "sides": ["Qu", "B", "M", "J", "O", "A"] },
            { "name": "DIE9", "sides": ["E", "H", "I", "S", "P", "N"] },
            { "name": "DIE10", "sides": ["V", "E", "T", "I", "G", "N"] },
            { "name": "DIE11", "sides": ["B", "A", "L", "I", "Y", "T"] },
            { "name": "DIE12", "sides": ["E", "Z", "A", "V", "N", "D"] },
            { "name": "DIE13", "sides": ["R", "A", "L", "E", "S", "C"] },
            { "name": "DIE14", "sides": ["U", "W", "I", "L", "R", "G"] },
            { "name": "DIE15", "sides": ["P", "A", "C", "E", "M", "D"] }
        ];
        this.chosenWord = '';
        this.lastClickedDice = null;
        this.score = 0; this.isGameOver = false;
        this.scoreWord = 0;
    }
    preload() {
        this.load.json('dictionary', `https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fdb35c81-f6d8-4572-beb2-fd760c0a6e60.json`);

        for (const key in _CONFIG.imageLoader) {
            this.load.image(key, _CONFIG.imageLoader[key]);
        }

        for (const key in _CONFIG.soundsLoader) {
            this.load.audio(key, [_CONFIG.soundsLoader[key]]);
        }
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");


        addEventListenersPhaser.bind(this)();
        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');
        displayProgressLoader.call(this);
        
    }
    create() {

        //for keyboard
        this.input.keyboard.disableGlobalCapture();


        this.isGameOver = false;

        this.vfx = new VFXLibrary(this);

        this.cursor = this.input.keyboard.createCursorKeys();

        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }


        this.sounds.background.setVolume(1).setLoop(true).play();
        var me = this;

        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0).setDepth(-5);
        this.bg.displayWidth = this.game.config.width;
        this.bg.displayHeight = this.game.config.height;


        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.pauseButton = this.add.sprite(this.width - 50, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.setDepth(11)
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.words = this.cache.json.get('dictionary');
        this.cameras.main.setBackgroundColor('#283747');
        this.populateGrid();

        this.add.bitmapText(this.cameras.main.width / 2, this.cameras.main.height / 4 - 50, 'pixelfont', 'Current Word: ', 48).setOrigin(0.5, 0.5);

        this.chosenWordText = this.add.bitmapText(this.cameras.main.width / 2, this.cameras.main.height / 4, 'pixelfont', ' ', 48).setOrigin(0.5, 0.5);

        this.scoreText = this.add.bitmapText(
            150,
            50, 'pixelfont',
            'Score: 0', 48
        ).setOrigin(0.5, 0.5);

        // Create Timer Text in Upper Right Corner
        this.timerText = this.add.bitmapText(
            this.cameras.main.width - 220,
            50, 'pixelfont',
            'Time: 0:30.00',
            48
        ).setOrigin(0.5, 0.5);

        // Create Submit Button
        const submitButton = this.add.graphics();
        submitButton.fillStyle(0x3498db, 1);
        submitButton.fillRoundedRect(this.cameras.main.width / 2 - 250, this.cameras.main.height - 790, 500, 100, 10);
        submitButton.setInteractive(new Phaser.Geom.Rectangle(this.cameras.main.width / 2 - 250, this.cameras.main.height - 790, 500, 100), Phaser.Geom.Rectangle.Contains);

        this.add.bitmapText(
            this.cameras.main.width / 2,
            this.cameras.main.height - 810 + (125 / 2), 'pixelfont',
            'Submit',
            48
        ).setOrigin(0.5, 0.5);

        submitButton.on('pointerdown', () => {
            this.submitWord();
            this.rollDice();
            // this.sound.play('rollSound');
        });

        // Start Timer
        this.startTime = 45; // Set the initial timer value
        this.updateTimerDisplay(); // Update the timer display initially

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.startTime -= 1;
                this.updateTimerDisplay();
                if (this.startTime <= 0) {
                    this.chosenWord = '';
                    this.resetGame();
                }
            },
            callbackScope: this,
            loop: true
        });

    }

    populateGrid() {

        if (this.grid.length > 0) {
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    this.grid[i][j].destroy();
                }
            }
        }

        this.lastClickedDice = null; // Reset the last clicked dice when populating the grid

        const gridWidth = 4; // Number of columns in the grid
        const squareSize = 120;
        const margin = 20; // Adjust the margin as needed

        for (let i = 0; i < 4; i++) {
            this.grid[i] = [];
            for (let j = 0; j < 4; j++) {
                const dice = this.diceData[i * 4 + j];
                const side = dice.sides[Phaser.Math.Between(0, dice.sides.length - 1)];

                // Create a container for each dice
                const diceContainer = this.add.container();
                const x = (this.cameras.main.width - gridWidth * (squareSize + margin) + margin) / 2 + j * (squareSize + margin);
                const y = 670 + i * 150 - squareSize / 2;

                // Create graphics for the dice
                const square = this.add.graphics();
                square.fillStyle(0xf5f5f5);
                square.fillRoundedRect(x, y, squareSize, squareSize, 10);
                // Create text for the letter
                const letter = this.add.bitmapText(x + squareSize / 2 - 10, y + squareSize / 2 - 10, 'pixelfont', side, 64);
                letter.setOrigin(0.5, 0.5);

                // Add both graphics and text to the container
                diceContainer.add([square, letter]);

                // Add the container to the grid array
                this.grid[i][j] = diceContainer;

                diceContainer.setInteractive(new Phaser.Geom.Rectangle(x, y, squareSize, squareSize), Phaser.Geom.Rectangle.Contains);
                diceContainer.on('pointerdown', () => {
                    if (!diceContainer.clicked && this.isDiceAdjacentToLastClicked(i, j)) {
                        if (!this.isGameOver) {
                            this.sounds.collect.setVolume(.75).setLoop(false).play();

                            this.chosenWord += side;
                            this.chosenWordText.setText(this.chosenWord);

                            // Change the color of the clicked die to light blue
                            square.clear();
                            square.fillStyle(0xadd8e6);
                            square.fillRoundedRect(x, y, squareSize, squareSize, 10);

                            // Set the clicked flag to true
                            diceContainer.clicked = true;

                            this.lastClickedDice = { i, j }; // Update the last clicked dice
                        }
                    }
                });
            }
        }

    }

    isDiceAdjacentToLastClicked(i, j) {
        if (this.lastClickedDice === null) {
            return true; // All dice are adjacent to the last clicked dice if no dice has been clicked yet
        }

        const dx = Math.abs(this.lastClickedDice.i - i);
        const dy = Math.abs(this.lastClickedDice.j - j);

        return (dx <= 1 && dy <= 1); // Adjacent dice are within a distance of 1 in both x and y
    }

    rollDice() {
        this.chosenWord = '';
        this.chosenWordText.setText('');
        Phaser.Utils.Array.Shuffle(this.diceData);
        this.populateGrid();
    }

    submitWord() {
        const chosenWordInUpperCase = this.chosenWord.toUpperCase();
        // this.updateScore(10);

        if (this.words.includes(chosenWordInUpperCase) && this.chosenWord.length >= 3) {
            console.log("The word " + this.chosenWord + " is valid.");
            let points = 0;
            if (this.chosenWord.length <= 4) points = 1;
            else if (this.chosenWord.length === 5) points = 2;
            else if (this.chosenWord.length === 6) points = 3;
            else if (this.chosenWord.length === 7) points = 5;
            else points = 11;

            // // Add points to the score
            // this.scoreWord += points;
            // console.log(this.scoreWord);
            this.updateScore(points);
            // this.scoreText.setText(`Score: ${this.score}`);
            this.sounds.success.setVolume(.75).setLoop(false).play();

            // Add seconds to the timer: double the points scored
            this.startTime += points * 2;
            // Ensure the timer text is updated
            this.updateTimerDisplay();
        } else {
            console.log("The word " + this.chosenWord + " is not valid.");
        }
        this.chosenWord = '';
        this.chosenWordText.setText('');
    }

    updateTimerDisplay() {
        if (!this.isGameOver)
            this.timerText.setText(`Time: ${this.startTime < 10 ? '0' : ''}${this.startTime}`);
    }

    resetGame() {
        if (!this.isGameOver) {
            this.sounds.background.stop();
            this.sounds.lose.setVolume(1).setLoop(false).play();

            this.isGameOver = true;
            this.score = 0;
            this.vfx.shakeCamera();
            // this.car.destroy();
            // this.physics.pause();
            this.sounds.background.stop();

            let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 400, 'pixelfont', 'Game Over', 64)
                .setOrigin(0.5)
                .setVisible(false)
                .setAngle(-15).setTint(0xFF0000);

            this.time.delayedCall(500, () => {
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
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(`Score: ${this.score}`);
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
    orientation: _CONFIG.deviceOrientation === "portrait"
};