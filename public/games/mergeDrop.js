class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.cursors = null;
        this.playerSpeed = 300;
        this.jumpSpeed = 600;
        this.isJumping = false;
        this.playerState = 'idle';
        this.gameScene = 1;
        this.loadNextScene = false;
        this.gameStarted = false;
        this.gameOverC = false;
        this.levelOver = false;
        this.gameScore = 0;
        this.levelOverText = null;
        this.nextLevelButton = null;
        this.enemyKilledScore = 0;
        this.gameOverText = null;
        this.loseSoundPlayed = false;
        this.isGameOver = false;
        this.playerBulletBounces = 8;
        this.playerBullets = 5;
        this.playerBulletsRemaining = 5;
        this.playerBullets = [];
        this.bulletsRemainingImages = [];
        this.enemies = [];
        this.bridges = [];
        this.lives = 3; this.processedCollectibles = {};
        this.bucketParts = [];
        this.tileSize = 32;
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
        this.matter.world.setBounds(0, 0, this.game.config.width, this.game.config.height);
        this.graphics = this.add.graphics();
        this.lives = 6;
        this.collectibles = ['collectible', 'collectible_1', 'collectible_2', 'collectible_3', 'collectible_4', 'collectible_5'];
        this.hearts = [];
        for (let i = 0; i < this.lives; i++) {
            let x = this.game.config.width / 2 - 300 + (i * 600 / this.lives);
            console.log(x);
            let collectibleKey = this.collectibles[i % this.collectibles.length];
            this.hearts[i] = this.add.image(x, 60, collectibleKey).setScale(0.2 + i / 35).setDepth(11);
        }
        // this.hearts[1] = this.add.image(340, 60, collectibleKey).setScale(0.3).setDepth(11);
        // this.hearts[2] = this.add.image(440, 60, collectibleKey).setScale(0.4).setDepth(11);
        // this.hearts[3] = this.add.image(540, 60, collectibleKey).setScale(0.5).setDepth(11);
        // this.hearts[4] = this.add.image(640, 60, collectibleKey).setScale(0.6).setDepth(11);
        // this.hearts[5] = this.add.image(740, 60, collectibleKey).setScale(0.7).setDepth(11);
        // this.hearts[6] = this.add.image(740, 60, collectibleKey).setScale(0.8).setDepth(11);

        this.newKey = true;
        this.vfx = new VFXLibrary(this);
        this.cursor = this.input.keyboard.createCursorKeys();
        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }
        this.scoreText = this.add.bitmapText(40, 50, 'pixelfont', '0', 64).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(100)
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
        this.dropperKeys = ['collectible'];
        const initialKey = Phaser.Utils.Array.GetRandom(this.dropperKeys);
        this.initialKeyAll = initialKey;
        this.dropper = this.matter.add.sprite(400, 125, 'collectible', null, {
            isStatic: true,
            circleRadius: 75
        }).setScale(0.3).setDepth(12);
        this.objects = this.add.group();

        this.input.on('pointermove', this.handleMouseMove, this);
        this.input.on('pointerdown', this.dropObject, this);
        this.vfx.addCircleTexture('red', 0xFF0000, 1, 10);
        this.vfx.addCircleTexture('orange', 0xFFA500, 1, 10);
        this.vfx.addCircleTexture('yellow', 0xFFFF00, 1, 10);
        this.meterValue = 0;
        this.meterBar = this.add.graphics();
        this.meterBar.setScrollFactor(0).setDepth(10);
        this.meterBarContainer = this.add.container(this.game.config.width / 2, 60);
        this.meterBarContainer.setDepth(10);

        // Background for meter bar
        this.meterBarBg = this.add.graphics();
        this.meterBarFill = this.add.graphics();
        this.meterBarContainer.add([this.meterBarBg, this.meterBarFill]);

        // Particle emitter for meter increase
        // this.particleEmitter = this.add.particles(0, 0, 'particle', {
        //     speed: { min: 50, max: 100 },
        //     scale: { start: 0.5, end: 0 },
        //     blendMode: 'ADD',
        //     lifespan: 1000
        // });
        // this.meterBarContainer.add(this.particleEmitter);

        this.updateMeterBar();

        this.updateVerticalLine();
        this.matter.world.on('collisionstart', (event, bodyA, bodyB) => {
            const objectA = bodyA.gameObject;
            const objectB = bodyB.gameObject;
            if (objectA && objectB && this.objects.contains(objectA) && this.objects.contains(objectB)) {
                this.mergeObjects(objectA, objectB);
            }
        });

        // this.matter.world.drawDebug = true;
        // this.matter.world.debugGraphic.clear();
        // this.matter.world.debugGraphic.lineStyle(5, 0x00ff00);
        this.createUBucket(200, 250, 30, 15); // x, y, width, height

        // this.createTimer();
    }

    // createTimer() {
    //     this.gameInitTimer = this.gameTimer = 40; // 40 seconds
    //     this.timerBar = null;
    //     this.timerEvent = null;

    //     this.timerText = this.add.bitmapText(10, 10, 'pixelfont', 'Life: ' + this.gameTimer, 28).setDepth(11);

    //     // Create timer bar
    //     this.timerBar = this.add.graphics();
    //     this.timerBar.fillStyle(0x00ff00, 1);
    //     this.timerBar.lineStyle(4, 0x000000);
    //     this.timerBar.fillRoundedRect(13, 60, 150, 20, 10).strokeRoundedRect(13, 60, 150, 20, 10);
    // }
    createUBucket(x, y, width, height) {
        const Bodies = Phaser.Physics.Matter.Matter.Bodies;

        // Create left wall (|)
        for (let i = 0; i < height - Math.floor(width / 4); i++) {
            this.createTile(x, y + i * this.tileSize);
        }

        // Create right wall (|)
        for (let i = 0; i < height - Math.floor(width / 4); i++) {
            this.createTile(x + (width - 1) * this.tileSize, y + i * this.tileSize);
        }

        // Create left diagonal part of V (\)
        for (let i = 0; i < Math.floor(width / 2) - 1; i++) {
            this.createTile(x + i * this.tileSize, y + (height - Math.floor(width / 4) + i) * this.tileSize);
        }

        // Create right diagonal part of V (/)
        for (let i = 0; i < Math.floor(width / 2) - 1; i++) {
            this.createTile(x + (width - 1 - i) * this.tileSize, y + (height - Math.floor(width / 4) + i) * this.tileSize);
        }
        const bottomY = y + height * this.tileSize - this.tileSize; // Position of the bottom line
        for (let i = 1; i < width - 12; i++) {
            this.createTile(x + 170 + i * this.tileSize, bottomY + 20);
        }

    }

    createTile(x, y) {
        const Bodies = Phaser.Physics.Matter.Matter.Bodies;

        let tile = this.matter.add.image(x, y, 'platform');
        let staticBody = Bodies.rectangle(x, y, this.tileSize, this.tileSize, {
            isStatic: true,
            restitution: 0 // No bouncing
        });

        tile.setExistingBody(staticBody).setScale(2);
        tile.setStatic(true);
        tile.setDisplaySize(this.tileSize, this.tileSize);

        this.bucketParts.push(tile);

    }



    updateMeterBar() {
        this.meterBar.clear();
        const barX = this.game.config.width / 2 - 300;
        const barY = 40;
        const barWidth = 550;
        const barHeight = 45;
        const arrowWidth = 30;
        const filledWidth = Phaser.Math.Clamp(this.meterValue / 100 * (barWidth - arrowWidth), 0, barWidth - arrowWidth);

        // Draw outer black shape (border)
        this.meterBar.fillStyle(0x000000);
        this.meterBar.beginPath();
        this.meterBar.moveTo(barX, barY);
        this.meterBar.lineTo(barX + barWidth - arrowWidth, barY);
        this.meterBar.lineTo(barX + barWidth, barY + barHeight / 2);
        this.meterBar.lineTo(barX + barWidth - arrowWidth, barY + barHeight);
        this.meterBar.lineTo(barX, barY + barHeight);
        this.meterBar.closePath();
        this.meterBar.fillPath();

        // Draw inner green fill
        this.meterBar.fillStyle(0x00ff00);
        this.meterBar.beginPath();
        this.meterBar.moveTo(barX + 2, barY + 2);
        this.meterBar.lineTo(barX + filledWidth, barY + 2);
        this.meterBar.lineTo(barX + filledWidth + arrowWidth * (filledWidth / (barWidth - arrowWidth)), barY + barHeight / 2);
        this.meterBar.lineTo(barX + filledWidth, barY + barHeight - 2);
        this.meterBar.lineTo(barX + 2, barY + barHeight - 2);
        this.meterBar.closePath();
        this.meterBar.fillPath();

        // Draw white outline
        this.meterBar.lineStyle(2, 0xffffff);
        this.meterBar.beginPath();
        this.meterBar.moveTo(barX, barY);
        this.meterBar.lineTo(barX + barWidth - arrowWidth, barY);
        this.meterBar.lineTo(barX + barWidth, barY + barHeight / 2);
        this.meterBar.lineTo(barX + barWidth - arrowWidth, barY + barHeight);
        this.meterBar.lineTo(barX, barY + barHeight);
        this.meterBar.closePath();
        this.meterBar.strokePath();
    }

    increaseMeter(value) {
        this.meterValue = Phaser.Math.Clamp(this.meterValue + value, 0, 100);
        this.updateMeterBar();
        if (this.meterValue == 100) {
            if (!this.isGameOver)
                this.resetGame();
        }
    }

    updateVerticalLine() {
        this.graphics.clear();
        this.graphics.lineStyle(5, 0xffffff, 0.4);
        this.graphics.moveTo(this.dropper.x, 150);
        this.graphics.lineTo(this.dropper.x, this.game.config.height - 200);
        this.graphics.strokePath();
    }

    triggerEffects(x, y, bullet) {
        this.vfx.createEmitter('red', x, y - 5, 1, 0, 500).explode(bullet);
        this.vfx.createEmitter('yellow', x, y, 1, 0, 500).explode(bullet);
        this.vfx.createEmitter('orange', x, y + 5, 1, 0, 500).explode(bullet);
    }

    handleMouseMove(pointer) {
        this.dropper.x = Phaser.Math.Clamp(pointer.x, 220, this.game.config.width - 175);
    }

    dropObject() {
        if (!this.isGameOver) {
            this.sounds.shoot.setVolume(1).setLoop(false).play();
            if (this.newKey) {
                console.log("first");
                this.objectType = 'collectible';
                this.newKey = false;
            } else {
                this.objectType = this.newDropperKey;
            }
            const newObject = this.matter.add.sprite(this.dropper.x, this.dropper.y + 5, this.objectType, null, {
                circleRadius: 100
            }).setScale(0.3).setDepth(12);
            this.objects.add(newObject);
            newObject.setBounce(.2);
            this.newDropperKey = Phaser.Utils.Array.GetRandom(this.dropperKeys);
            this.dropper.setTexture(this.newDropperKey);
        }
    }

    mergeObjects(object1, object2) {
        var newText = 0;
        var collect = false;
        var collect_1 = false;
        var collect_2 = false;
        var collectible_3 = false;
        const mergeMap = {
            'collectible': 'collectible_1',
            'collectible_1': 'collectible_2',
            'collectible_2': 'collectible_3',
            'collectible_3': 'collectible_4',
            'collectible_4': 'collectible_5',
            'collectible_5': null
        };
        if (object1.texture.key === object2.texture.key) {
            this.updateScore(10);
            const currentType = object1.texture.key;
            if (currentType == "collectible_5") {
                console.log("collectible_5");

                this.resetGame();

            }
            if (!this.processedCollectibles[currentType]) {
                this.processedCollectibles[currentType] = true;

                switch (currentType) {
                    case 'collectible':
                        this.increaseMeter(15);
                        this.dropperKeys.push('collectible_1');
                        console.log("Processed collectible");
                        break;
                    case 'collectible_1':
                        this.increaseMeter(20);
                        this.dropperKeys.push('collectible_2');
                        console.log("Processed collectible_1");
                        break;
                    case 'collectible_2':
                        this.increaseMeter(25);
                        // this.dropperKeys.push('collectible_2');
                        // console.log("Processed collectible_1");
                        break;
                    case 'collectible_3':
                        this.increaseMeter(25);
                        // this.dropperKeys.push('collectible_2');
                        // console.log("Processed collectible_1");
                        break;
                    case 'collectible_4':
                        this.increaseMeter(15);
                        // this.dropperKeys.push('collectible_2');
                        // console.log("Processed collectible_1");
                        break;
                    // case 'collectible_5':
                    //     console.log("collectible_5");
                    //     this.increaseMeter(15);
                    //     // this.dropperKeys.push('collectible_2');
                    //     // console.log("Processed collectible_1");
                    //     break;
                }
            }
            console.log(this.dropperKeys);
            const nextObjectType = mergeMap[currentType];
            if (nextObjectType) {
                this.sounds.collect.setVolume(1).setLoop(false).play();
                this.pointsEffect(object1.x, object1.y - 50, 10);
                const newObject = this.matter.add.sprite(object1.x, object1.y, nextObjectType, null, {
                    circleRadius: 100
                }).setScale(0.3);
                this.objects.add(newObject);
                this.triggerEffects(object1.x, object1.y - 50, 250);
                this.triggerEffects(object1.x, object1.y - 100, 250);
                newObject.setBounce(0.5);
                newObject.texture.key = nextObjectType;
                object1.destroy();
                object2.destroy();
            }
        }
    }

    update() {
        this.updateVerticalLine();
    }

    pointsEffect(x, y, score) {
        let scoreText = this.add.bitmapText(x, y, 'pixelfont', `+${score}`, 50);
        this.tweens.add({
            targets: scoreText,
            y: { from: scoreText.y, to: scoreText.y - 200 }, // Move upwards
            alpha: { from: 1, to: 0 }, // Fade out
            scale: { start: 1, to: 1.5 },
            angle: { from: 0, to: 10 },
            duration: 4000,
            ease: 'Power2',
            onComplete: function () { scoreText.destroy(); },
            onStart: () => {
                scoreText.setTint(0xffff00);
            },
            yoyo: false,
            repeat: 0,
        });

    }

    resetGame() {
        this.isGameOver = true;
        this.score = 0;
        this.vfx.shakeCamera();
        this.sounds.background.stop();
        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 250, 'pixelfont', 'Game Win', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15)
            .setDepth(10)
            .setTint(0xffff00);
        this.time.delayedCall(500, () => {
            this.sounds.success.setVolume(0.5).setLoop(false).play()
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
    physics: {
        default: "matter",
        matter: {
            gravity: { y: .7 },
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