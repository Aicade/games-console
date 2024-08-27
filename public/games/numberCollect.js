let assetsLoader = {
    "background": "background",
    "player": "player",
    "collectible": "collectible",
    "avoidable": "avoidable"
};

let soundsLoader = {
    "background": "background",
    'collect': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_2.mp3',
    'destroy': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/blast.mp3',
    "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3"
};

// Custom UI Elements
const title = `Space Drive`
const description = `A thrilling tap-to-destroy game where quick reflexes are \n key to defeating waves of unique enemies`
const instructions =
    `Instructions:
1. Use arrow keys OR joystick to move.
2. Use Spacebar/button to shoot.`;

// Game Orientation
const orientation = "portrait";
var isMobile = false;
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

// Touuch Screen Controls
const joystickEnabled = true;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

/*
------------------- GLOBAL CODE STARTS HERE -------------------
*/

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.isGameOver = false; this.dropDelay = 5000;
    }

    preload() {

        addEventListenersPhaser.bind(this)();

        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }
        this.load.image('heart', 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png');

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        displayProgressLoader.call(this);
    }

    create() {

        isMobile = !this.sys.game.device.os.desktop;

        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.vfx = new VFXLibrary(this);

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(3).setLoop(true).play();

        this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.input.addPointer(3);
        const joyStickRadius = 50;

        this.scoreText = this.add.bitmapText(this.width / 2 - 40, 45, 'pixelfont', this.score, 80).setOrigin(0.5, 0.5).setTint(0xff9900);
        this.scoreText.setDepth(10);
        
        this.startText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', 'Collect all the Prime numbers \n & avoid other numbers. \n Start Game >>', 40).setOrigin(0.5).setDepth(11).setTint(0xFFB000).setCenterAlign();
        this.startText.setInteractive({ cursor: 'pointer' });
        this.startText.on('pointerdown', ()=> {
            this.startEggDrop();
            this.startText.destroy();
        }, this);

        this.player = this.physics.add.image(this.width / 2, this.game.config.height, 'player').setScale(0.25);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(this.player.body.width / 1.1, this.player.body.height)
        this.vfx.scaleGameObject(this.player, 1.1);

        if (joystickEnabled) {
            this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: joyStickRadius * 2,
                y: this.height - (joyStickRadius * 2),
                radius: 50,
                base: this.add.circle(0, 0, 80, 0x888888, 0.5),
                thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5),
            });
            this.joystickKeys = this.joyStick.createCursorKeys();
        }
        // Keyboard Controls
        this.cursors = this.input.keyboard.createCursorKeys();

        this.toggleControlsVisibility(isMobile);

        this.lives = 3;
        this.hearts = [];
        for (let i = 0; i < this.lives; i++) {
            let x = 40 + (i * 35);
            this.hearts[i] = this.add.image(x, 35, "heart").setScale(0.025).setDepth(11);
        }

        this.eggs = [];
        this.avoidables = [];

        this.cursors = this.input.keyboard.createCursorKeys();
    }

    toggleControlsVisibility(visibility) {
        this.joyStick.base.visible = visibility;
        this.joyStick.thumb.visible = visibility;
    }

    update() {
        if (this.cursors.left.isDown || this.joystickKeys.left.isDown) {
            this.player.setVelocityX(-400);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown || this.joystickKeys.right.isDown) {
            this.player.flipX = false;
            this.player.setVelocityX(400);
        } else {
            this.player.setVelocityX(0);
        }

        this.eggs.forEach((egg) => {
            if (egg && egg.y > this.height) {
                egg.destroy();
            }
        })
    }

    startEggDrop() {
        if (!this.isGameOver) {
            this.time.addEvent({
                delay: Phaser.Math.Between(1000, this.dropDelay),
                callback: () => {
                    this.dropEgg();
                    this.startEggDrop();
                },
                callbackScope: this
            });
        }
    }

    dropEgg() {
        let randomX = Phaser.Math.Between(80, this.width - 80)

        if (!this.isGameOver) {
            if (Math.random() < 0.6) {
                const randomPrime = this.generateRandomPrime();
                const primeNumText = this.add.bitmapText(randomX, -10, 'pixelfont', randomPrime, 60);
                this.physics.world.enable(primeNumText);
                primeNumText.body.setVelocityY(200);
                this.vfx.scaleGameObject(primeNumText);
                this.eggs.push(primeNumText);
                this.physics.add.collider(this.player, primeNumText, (player, enemy) => {
                    this.sounds.collect.play();
                    enemy.destroy();
                    this.collectEgg();
                    this.scorePointAnim();
                    this.updateScore(10);
                });
                console.log("PRIME : ", randomPrime)

            } else {
                const randomNonPrime = this.generateRandomNonPrime();
                const randomNonPrimeText = this.add.bitmapText(randomX, -10, 'pixelfont', randomNonPrime, 60);
                this.physics.world.enable(randomNonPrimeText);
                randomNonPrimeText.body.setVelocityY(200);
                this.vfx.scaleGameObject(randomNonPrimeText);
                this.eggs.push(randomNonPrimeText);
                this.physics.add.collider(this.player, randomNonPrimeText, (bullet, enemy) => {
                    this.hitAvoidable(enemy);
                });
                console.log("NON : ", randomNonPrime)

            }
        }
    }

    isPrime(num) {
        if (num <= 1) return false;
        if (num <= 3) return true;

        if (num % 2 === 0 || num % 3 === 0) return false;

        for (let i = 5; i * i <= num; i += 6) {
            if (num % i === 0 || num % (i + 2) === 0) return false;
        }
        return true;
    }

    generateRandomPrime() {
        let prime = 0;
        while (!this.isPrime(prime)) {
            prime = Math.floor(Math.random() * 100) + 1;
        }
        return prime;
    }

    generateRandomNonPrime() {
        let nonPrime = 0;
        while (this.isPrime(nonPrime) || nonPrime <= 1) {
            nonPrime = Math.floor(Math.random() * 100) + 1;
        }
        return nonPrime;
    }

    collectEgg() {
        if (this.score % 50 == 0) {
            this.dropDelay = Math.max(1000, this.dropDelay - 500); // Ensure the delay doesn't go below 1 second
        }

    }

    hitAvoidable(avoidable) {
        avoidable.destroy();
        this.lives--;
        this.hearts[this.lives].destroy();
        this.vfx.shakeCamera(400, .009);
        this.sounds.destroy.play()
        if (this.lives <= 0) {
            this.isGameOver = true;
            this.resetGame();
            this.eggs.forEach((egg) => {
                egg.destroy();
            })
        }
    }

    scorePointAnim() {
        let dx = this.player.x - 30;
        let dy = this.player.y - 80;
        let scoreText = this.add.bitmapText(dx, dy, 'pixelfont', '+10', 45).setTint(0xff9900);

        this.tweens.add({
            targets: scoreText,
            y: dy - 100,
            duration: 800,
            ease: 'Power1',
            onComplete: function () {
                scoreText.destroy();
            }
        });
    }

    resetGame() {
        this.isGameOver = true;
        this.vfx.shakeCamera();

        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 250, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15)
            .setDepth(10)
            .setTint(0xff0000);
        this.time.delayedCall(500, () => {
            this.sounds.lose.setVolume(0.5).setLoop(false).play()
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

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(`${this.score}`);
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
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 200 },
            debug: false,
        },
    },
    orientation: true,
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
};