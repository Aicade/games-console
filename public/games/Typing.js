// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0; // Initialize score to 0
      this.balloons = [];
        this.words = [];
        this.background = null;
        this.currentWordIndex = 0;
        this.score = 0;
        this.scoreText = null;
        this.timeRemaining = 60;
        this.timeText = null;
        this.timerEvent = null;
        this.GameOver = false;
        this.music = null;
        this.typingSound = null;
        this.popSound = null;
        this.quackSound = null;
        this.currentInput = '';
        this.inputText = null;
        this.wordList = [
            'cat', 'dog', 'sun', 'moon', 'star',
            'hat', 'ball', 'book', 'tree', 'fish',
            'bird', 'frog', 'bear', 'duck', 'cow',
            'pig', 'run', 'jump', 'play', 'sing',
            'read', 'draw', 'swim', 'bike', 'kite',
            'game', 'toys', 'cake', 'ice', 'milk',
            'clash', 'dense', 'dread', 'prank', 'strict',
            'drill', 'swan', 'prod', 'shrunk', 'scuff',
            'clutch', 'threat', 'dwell', 'fund', 'text',
            'rank', 'brink', 'mock'
        ];
        this.level = 1;
        this.wordsTyped = 0;
        this.balloonSpacing = 200; // Minimum space between balloons
        this.gameStarted = false;
        this.player = null;
        this.bullets = null;
    }

    preload() {
        addEventListenersPhaser.bind(this)();

        for (const key in _CONFIG.imageLoader) {
            this.load.image(key, _CONFIG.imageLoader[key]);
        }

        for (const key in _CONFIG.soundsLoader) {
            this.load.audio(key, [_CONFIG.soundsLoader[key]]);
        }

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.image('heart', 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png');
        this.load.bitmapFont('pixelfont',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');

        displayProgressLoader.call(this);
    }

    create() {    
        this.vfx = new VFXLibrary(this);
 this.vfx.addCircleTexture('red', 0xFF0000, 1, 10);
        this.vfx.addCircleTexture('orange', 0xFFA500, 1, 10);
        this.vfx.addCircleTexture('yellow', 0xFFFF00, 1, 10);
        // Make an empty object for all #sounds
        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }
        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.gameSceneBackground();

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 20, 'pixelfont', 'Score: 0', 35).setOrigin(0.5, 0).setTint(0xff9900).setDepth(11);


        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        const pauseButton = this.add.sprite(this.game.config.width * 0.9, this.game.config.height * 0.1, "pauseButton").setOrigin(0.5, 0.5).setScale(2);
        pauseButton.setInteractive({ cursor: 'pointer' });
        pauseButton.on('pointerdown', () => this.pauseGame());


        this.sounds.background.setVolume(3).setLoop(true).play();

        this.input.keyboard.disableGlobalCapture();
     
        // Bullet glow graphics
        this.bulletGlowGraphics = this.add.graphics();

this.initializeGame();
      
    }
    triggerEffects(x, y, bullet) {
        this.vfx.createEmitter('red', x, y - 5, 1, 0, 500).explode(bullet);
        this.vfx.createEmitter('yellow', x, y, 1, 0, 500).explode(bullet);
        this.vfx.createEmitter('orange', x, y + 5, 1, 0, 500).explode(bullet);
    }
   initializeGame() {
        this.children.removeAll();

        this.GameOver = false;
        this.score = 0;
        this.timeRemaining = 60;
        this.balloons = [];
        this.words = [];
        this.currentWordIndex = 0;
        this.currentInput = '';
        this.level = 1;
        this.wordsTyped = 0;
        this.gameStarted = true;

        this.background = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'background');
        this.background.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        this.gameTitle = this.add.bitmapText(this.cameras.main.width / 2, 50, 'pixelfont', "Text Typing: ", 32).setOrigin(0.5).setTint(0xff9900).setDepth(11);

        this.scoreText = this.add.bitmapText(16, 16, 'pixelfont', 'Score: 0', 32).setTint(0xff9900).setDepth(11);

        this.timeText = this.add.bitmapText(this.cameras.main.width - 16, 16, 'pixelfont', 'Time: 60', 32)
        .setOrigin(1, 0).setTint(0xff9900).setDepth(11);

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });

        this.inputText = this.add.bitmapText(this.cameras.main.width / 2, 100, 'pixelfont', '', 32)
        .setOrigin(0.5).setDepth(11);

        this.input.keyboard.on('keydown', this.handleInput, this);

        // Add physics
        this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Create player
        this.player = this.physics.add.sprite(this.cameras.main.width / 2, this.cameras.main.height - 40, 'player').setScale(.3);
        this.player.setCollideWorldBounds(true);
this.vfx.scaleGameObject(this.player,1.1);
        // Create bullet group
        this.bullets = this.physics.add.group();

        this.createBalloons();

        this.scale.on('resize', this.resize, this);

        const leftMargin = 20;
        const bottomMargin = 20;
        const lineSpacing = 40;
        const fontSize = 24;

        const yellowTint = 0xFFFF00;

        const bottomLineY = this.cameras.main.height - bottomMargin;

        const line3 = this.add.bitmapText(leftMargin, bottomLineY - lineSpacing * 3, 'pixelfont', 'How many words can you type?', fontSize);
        const line2 = this.add.bitmapText(leftMargin, bottomLineY - lineSpacing, 'pixelfont', 'Press "enter" to shoot', fontSize);
        const line1 = this.add.bitmapText(leftMargin, bottomLineY - lineSpacing * 2, 'pixelfont', 'Type the word on the balloon,', fontSize);

        [line1, line2, line3].forEach(line => line.setTint(yellowTint));
    }

    resize (gameSize, baseSize, displaySize, resolution)
    {
        this.cameras.resize(gameSize.width, gameSize.height);

        if (this.background) {
            this.background.setPosition(gameSize.width / 2, gameSize.height / 2);
            this.background.setDisplaySize(gameSize.width, gameSize.height);
        }

        if (this.gameTitle) {
            this.gameTitle.setPosition(gameSize.width / 2, 50);
        }

        if (this.timeText) {
            this.timeText.setPosition(gameSize.width - 16, 16);
        }

        if (this.inputText) {
            this.inputText.setPosition(gameSize.width / 2, gameSize.height - 50);
        }

        if (this.player) {
            this.player.setPosition(gameSize.width / 2, gameSize.height - 50);
        }

        this.physics.world.setBounds(0, 0, gameSize.width, gameSize.height);

        this.balloons.forEach((balloon) => {
            if (balloon.y < 50) {
                balloon.y = 50;
            }
            balloon.wordText.y = balloon.y + 50;
        });
    }

    update()
    {if(!this.isGameOver){
        if (!this.gameStarted || this.GameOver) return;

        this.balloons.forEach((balloon, index) => {
            balloon.y -= 0.5 * this.level;
            balloon.wordText.y = balloon.y + 50;
            if (balloon.y < -50) {
                this.removeBalloon(index);
            }
        });

        if (this.balloons.length < this.level + 1) {
            this.createBalloons();
        }}
    }

    createBalloons() {
        const balloonCount = this.level + 1 - this.balloons.length;
        for (let i = 0; i < balloonCount; i++) {
            let newBalloonX = Phaser.Math.Between(100, this.cameras.main.width - 100);
            let newBalloonY = this.cameras.main.height + i * this.balloonSpacing;

            let overlap = true;
            while (overlap) {
                overlap = false;
                for (let existingBalloon of this.balloons) {
                    if (Math.abs(existingBalloon.x - newBalloonX) < 100) {
                        overlap = true;
                        newBalloonX = Phaser.Math.Between(100, this.cameras.main.width - 100);
                        break;
                    }
                }
            }

            const balloon = this.physics.add.image(newBalloonX, newBalloonY, 'projectile');
            balloon.setScale(1.2);
            this.vfx.scaleGameObject(balloon,1.1);

            const word = this.getRandomWord();
            this.words.push(word);
            const wordText = this.add.bitmapText(balloon.x, balloon.y + 50, 'pixelfont', word, 26.4).setOrigin(0.5).setDepth(10);
            
            balloon.wordText = wordText;
            this.balloons.push(balloon);
        }
    }

    removeBalloon(index) {
        this.balloons[index].destroy();
        this.balloons[index].wordText.destroy();
        this.balloons.splice(index, 1);
        this.words.splice(index, 1);
        if (index <= this.currentWordIndex) {
            this.currentWordIndex = Math.max(0, this.currentWordIndex - 1);
        }
    }

    getRandomWord() {
        return this.wordList[Math.floor(Math.random() * this.wordList.length)];
    }

    handleInput(event) {
        if(!this.isGameOver){
        if (!this.gameStarted || this.GameOver) return;

        if (event.key === 'Backspace' && this.currentInput.length > 0) {

            this.currentInput = this.currentInput.slice(0, -1);
        } else if (event.key === 'Enter') {
            this.checkWord();
        } else if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
            this.currentInput += event.key.toLowerCase();
        }

        this.inputText.setText(this.currentInput);
        this.sounds.click.setVolume(.5).setLoop(false).play();
        this.vfx.addShine(this.inputText);
        this.inputText.alpha = 1;}
    }

    checkWord() {
        if(!this.isGameOver){
        let targetBalloon = null;
        for (let i = 0; i < this.words.length; i++) {
            if (this.currentInput === this.words[i]) {
                targetBalloon = this.balloons[i];
                this.score += 10 * this.level;
                this.scoreText.setText('Score: ' + this.score);
                this.wordsTyped++;
                break;
            }
        }

        if (targetBalloon) {
            this.shootBullet(targetBalloon);
        }

        this.currentInput = '';
        this.inputText.setText('');}
    }

    shootBullet(targetBalloon) {
        const bullet = this.bullets.create(this.player.x, this.player.y+50, 'projectile_1').setScale(.2);
        // bull
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetBalloon.x, targetBalloon.y);
        this.physics.velocityFromRotation(angle, 300, bullet.body.velocity);

        this.physics.add.overlap(bullet, targetBalloon, (bullet, balloon) => {
            bullet.destroy();
            this.triggerEffects(targetBalloon.x,targetBalloon.y,140);
            this.sounds.collect.setVolume(1).setLoop(false).play();
            this.removeBalloon(this.balloons.indexOf(balloon));
            if (this.words.length === 0) {
                this.level++;
                this.createBalloons();
            }
        });
    }

    updateTimer() {
        if(!this.isGameOver){
        if (!this.gameStarted || this.GameOver) return;

        this.timeRemaining -= 1;
        this.timeText.setText('Time: ' + this.timeRemaining);

        if (this.timeRemaining <= 0 ) {
            this.resetGame();
        }}
    }   

    resetGame() {
        this.isGameOver = true;
        // this.score = 0;
        this.vfx.shakeCamera();
        this.sounds.background.stop();
        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 250, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15)
            .setDepth(10)
            .setTint(0xffff00);
        this.time.delayedCall(500, () => {
            // this.sounds.success.setVolume(0.5).setLoop(false).play()
            this.sounds.background.stop();
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
        this.scoreText.setText(`Score: ${this.score}`);
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
        this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);
        const scale = Math.max(this.width / this.bg.displayWidth, this.height / this.bg.displayHeight);
        this.bg.setScale(scale);

        // this.lives = 3;
        // this.hearts = [];
        // for (let i = 0; i < this.lives; i++) {
        //     let x = 40 + (i * 35);
        //     this.hearts[i] = this.add.image(x, 40, "heart").setScale(0.5).setDepth(11).setScrollFactor(0);
        // }

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
    orientation: _CONFIG.deviceOrientation === "landscape"
};