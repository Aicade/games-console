let assetsLoader = {
    "background": "background",
    "enemy": "enemy",
};

let soundsLoader = {
    "background": "background",
    "destroy": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/whack.mp3",
    "spawn": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/pop.mp3"
};

// Custom UI Elements
const title = `Whack a Mole`;
const description = `Reaction arcade game. Tap to kill. `;
const instructions =
    `   Instructions:
        1. Click the enemies to kill them.
        2. Set the highest score in the given time.`;

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

// Touuch Screen Controls
const joystickEnabled = false;
const buttonEnabled = false;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

// BUTTON DOCMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.rows = 4;
        this.columns = 6;
        this.rectWidth = 100;
        this.rectHeight = 100;
        this.spacing = 40;
        this.indexInUse = [];
        this.randomPositions = [];
    }

    preload() {
        addEventListenersPhaser.bind(this)();

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);

        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);
    }

    create() {
        this.vfx = new VFXLibrary(this);
        this.score = 0;
        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.initTimeLimit = 50;
        this.timeLimit = this.initTimeLimit;
        this.sounds = {};

        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(1).setLoop(false).play()

        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
        this.bg.setScrollFactor(0);
        this.bg.displayHeight = this.height;
        this.bg.displayWidth = this.width;

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 50, 'pixelfont', 0, 64).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.vfx.addCircleTexture('red', 0xFF0000, 1, 10);
        this.vfx.addCircleTexture('orange', 0xFFA500, 1, 10);
        this.vfx.addCircleTexture('yellow', 0xFFFF00, 1, 10);

        // To check if rows and columns won't get out of the game canvas area
        this.totalWidth = this.columns * this.rectWidth + ((this.columns - 1) * this.spacing);
        this.totalHeight = this.rows * this.rectHeight + ((this.rows - 1) * this.spacing);
        if (this.totalWidth > this.width) {
            let extraWidth = this.totalWidth - this.width;
            this.rectWidth = this.rectWidth - (extraWidth / this.columns);
        }
        if (this.totalHeight > this.height) {
            let extraHeight = this.totalHeight - this.height;
            this.rectHeight = this.rectHeight - (extraHeight / this.rows);
        }

        this.startPosX = ((this.width - this.totalWidth) / 2) + this.rectWidth / 2;
        this.startPosY = ((this.height - this.totalHeight) / 2) + this.rectHeight / 2 + 50;

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
                this.randomPositions.push({
                    x: this.startPosX + (j * (this.rectWidth + this.spacing)),
                    y: this.startPosY + (i * (this.rectHeight + this.spacing))
                })
            }
        };
        this.timerText = this.add.bitmapText(10, 30, 'pixelfont', `Time: ${this.timeLimit}`, 48).setOrigin(0, 0.5);;

        this.randomPositions.forEach((pos) => {
            let rect = this.add.rectangle(pos.x, pos.y, this.rectWidth, this.rectHeight, 0x000000, 0.5);
            rect.setStrokeStyle(2, 0x222222)
        })

        this.moleGroup = this.add.group();

        this.createSpawnerEvent(700);

        this.timerEvent = this.time.addEvent({
            delay: 500,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });


        const joyStickRadius = 50;

        if (joystickEnabled) {
            this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: joyStickRadius * 2,
                y: this.height - (joyStickRadius * 2),
                radius: 50,
                base: this.add.circle(0, 0, 80, 0x888888, 0.5),
                thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5),
                // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
                // forceMin: 16,
            });
        }

        if (buttonEnabled) {
            this.buttonA = this.add.rectangle(this.width - 80, this.height - 100, 80, 80, 0xcccccc, 0.5)
            this.buttonA.button = this.plugins.get('rexbuttonplugin').add(this.buttonA, {
                mode: 1,
                clickInterval: 100,
            });

            this.buttonA.button.on('down', (button, gameObject) => {
                this.pointerTouched = true;
            });

            this.buttonA.button.on('up', (button, gameObject) => {
                this.pointerTouched = false;
            });
        }
    }

    createSpawnerEvent(time) {
        if (this.spawnerEvent) this.spawnerEvent.destroy();
        this.spawnerEvent = this.time.addEvent({
            delay: time,
            callback: this.spawnMole,
            callbackScope: this,
            loop: true
        });
        this.input.keyboard.disableGlobalCapture();
    }

    updateTimer() {
        this.timeLimit -= 1;
        this.timerText.setText('Time: ' + this.timeLimit);

        if (this.timeLimit === 0) {
            this.endGame();
        } else if (this.timeLimit === Math.floor(this.initTimeLimit / 2)) {
            this.createSpawnerEvent(500)
        } else if (this.timeLimit === Math.floor(this.initTimeLimit / 2.5)) {
            this.createSpawnerEvent(300)
        }
    }

    hitMole(mole) {
        if (mole.missed) return;
        this.sounds.destroy.setVolume(1).setLoop(false).play()
        this.vfx.createEmitter('red', mole.x, mole.y, 1, 0, 500).explode(10);
        this.vfx.createEmitter('yellow', mole.x, mole.y, 1, 0, 500).explode(10);
        this.vfx.createEmitter('orange', mole.x, mole.y, 1, 0, 500).explode(10);
        this.vfx.shakeCamera(100, 0.02);
        this.updateScore(10);
        mole.killed = true;
        this.tweens.add({
            targets: mole,
            alpha: 0,
            duration: 100,
            ease: 'Power2',
            onComplete: (tween, targets) => {
                targets[0].destroy();
            }
        });
    }

    spawnMole() {
        let randomIndex = Phaser.Math.Between(0, this.randomPositions.length - 1);

        // Avoids mole to spawn in the same place
        if (this.indexInUse.includes(randomIndex)) return;

        this.indexInUse.push(randomIndex);
        const randomPosition = this.randomPositions[randomIndex];
        const mole = this.moleGroup.create(randomPosition.x, randomPosition.y + 20, 'enemy');
        mole.killed = false;
        mole.missed = false;
        mole.setAlpha(0).setScale(0.08).setInteractive({ cursor: 'pointer' });
        mole.displayHeight = this.rectHeight;
        mole.displayWidth = this.rectWidth;
        this.sounds.spawn.setVolume(0.1).setLoop(false).play()
        this.tweens.add({
            targets: mole,
            alpha: 1,
            y: randomPosition.y,
            duration: 300,
            ease: 'Power2',
        });
        mole.on('pointerdown', () => this.hitMole(mole), this);

        // Hide the mole after a certain time
        this.time.delayedCall(Phaser.Math.Between(1000, 3000), () => {
            let indexToBeRemoved = this.indexInUse.indexOf(randomIndex);
            this.indexInUse.splice(indexToBeRemoved, 1);
            if (mole.killed) return;
            mole.missed = true;
            this.tweens.add({
                targets: mole,
                alpha: 0,
                y: randomPosition.y + 10,
                duration: 300,
                ease: 'Power2',
                onComplete: (tween, targets) => {
                    targets[0].destroy();
                }
            });
        });
    }

    endGame() {
        this.spawnerEvent.destroy();
        this.timerEvent.destroy();
        this.gameOver();
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
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene],
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: true,
};