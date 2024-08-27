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
        super({ key: 'GameScene' });
        this.enemyBaseVelocityX = -100;
        this.isGameOver = false;

    }

    preload() {
        this.score = 0;
        this.enemySpawnDelay = 2000;

        addEventListenersPhaser.bind(this)();

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);
        for (const key in _CONFIG.imageLoader) {
            this.load.image(key, _CONFIG.imageLoader[key]);
          }
        
          for (const key in _CONFIG.soundsLoader) {
            this.load.audio(key, [_CONFIG.soundsLoader[key]]);
          }

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.image("pillar", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Bricks/s2+Brick+01+Grey.png");

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);

    }

    create() {
        this.isGameOver = false;
        this.score = 0;
        this.enemySpawnDelay = 2000;

        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
        this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(0.75).setLoop(false).play()

        this.vfx = new VFXLibrary(this);

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.tileSprite(0, 0, this.width/2, this.height/2, 'background').setOrigin(0, 0);
        this.bgSpeed = 1.5;
        this.bg.setScrollFactor(0);
        this.bg.displayHeight = this.game.config.height;
        this.bg.displayWidth = this.game.config.width;

        this.player = this.physics.add.sprite(50, this.sys.game.config.height - 50, 'player').setScale(.2).setDepth(5).setOrigin(0.5, 1);
        this.player.body.setGravityY(100); // Adjust gravity strength as needed
        this.player.setCollideWorldBounds(true);
        var newBodyWidth = this.player.body.width * 0.5; // Decrease width by 20%
        var newBodyHeight = this.player.body.height * 0.5;
        this.player.body.setSize(newBodyWidth, newBodyHeight);

        let bubble = this.add.graphics({ x: -100, y: 0, add: false });

        // Define the bubble's properties
        const bubbleRadius = 50;
        const bubbleColor = 0xEF6C8B; // A nice bubble color

        // Draw the bubble
        bubble.fillStyle(bubbleColor, 0.5); // Semi-transparent
        bubble.fillCircle(bubbleRadius, bubbleRadius, bubbleRadius);
        bubble.generateTexture('bubbles', 100, 100);

        // Enemies
        this.enemies = this.physics.add.group({
            collideWorldBounds: false,
            bounceY: 0.2,
            bounceX: 0.2
        });
        this.platforms = this.physics.add.group({
            collideWorldBounds: true,
            bounceY: 0.2,
            bounceX: 0.2
        });
        this.physics.add.collider(this.player, this.platforms);

        this.physics.add.collider(this.platforms, this.enemies, (platform, enemy) => {

            this.enemyVFXEffect(platform, enemy);
            this.scoreUpdate();
            platform.destroy();
        });

        this.physics.add.collider(this.platforms, this.platforms);

        this.spawnEnemyTimer = this.time.addEvent({
            delay: this.enemySpawnDelay,
            callback: this.spawnEnemies,
            callbackScope: this,
            loop: true
        });

        this.input.on('pointerdown', (pointer) => {
            this.sounds.damage.setVolume(0.5).setLoop(false).play()
            const platform = this.platforms.create(this.player.x, this.player.y - 120, 'platform').setScale(.18).setOrigin(0.5, 0);
            platform.body.setAllowGravity(true);
            this.player.setY(platform.y - 10);
        });


        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11)

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        const joyStickRadius = 50;

        if (joystickEnabled) {
            this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: joyStickRadius * 2,
                y: this.height - (joyStickRadius * 2),
                radius: 50,
                base: this.add.circle(0, 0, 80, 0x888888, 0.5),
                thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5),
                dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
                // forceMin: 16,
            });
            this.joystickKeys = this.joyStick.createCursorKeys();
        }

        if (buttonEnabled) {
            this.buttonA = this.add.rectangle(this.width - 80, this.height - 100, 80, 80, 0xcccccc, 0.5)
            this.buttonA.button = this.plugins.get('rexbuttonplugin').add(this.buttonA, {
                mode: 1,
                clickInterval: 100,
            });

            this.buttonA.button.on('down', (button, gameObject) => {
                console.log("buttonA clicked");
            });
        }
        this.input.keyboard.disableGlobalCapture();

    }

    enemyVFXEffect(bullet, enemy) {
        this.sounds.collect.setVolume(1).setLoop(false).play()
        // Tween for moving up
        // this.tweens.add({
        //     targets: enemy,
        //     y: '-=1', // Moves up by 100 units
        //     ease: 'Power1',
        //     // angle: 360,
        //     duration: 400, // Adjust duration as needed
        //     onComplete: () => {
        this.tweens.add({
            targets: enemy,
            alpha: 0,
            // scaleY: 0,
            ease: 'Linear',
            duration: 500,
            onComplete: () => {
                enemy.destroy();
            }
        });
        //     }
        // });
        // enemy.destroy();

        let pointsText = this.add.bitmapText(enemy.x, enemy.y - 75, 'pixelfont', '+10', 45)
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
    }


    update(time, delta) {
        if (!this.isGameOver) {
            Phaser.Actions.IncX(this.enemies.getChildren(), -2);
            this.platforms.children.iterate((platform) => {
                platform.body.setGravityY(100);
            });
            this.bg.tilePositionX += this.bgSpeed;

            this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
                this.isGameOver = true;
                const emitter = this.add.particles(player.x, player.y, 'bubbles', {
                    speed: { min: -100, max: 300 },
                    scale: { start: .2, end: 0 },
                    blendMode: 'MULTIPLY',
                    lifespan: 750,
                    // tint: 0x93C54B
                });

                // emitter.setPosition(x, y);
                emitter.explode(75);
                this.physics.pause();
                this.player.destroy();
                let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 200, 'pixelfont', 'Game Over', 64)
                    .setOrigin(0.5)
                    .setVisible(false)
                    .setAngle(-15);

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
            });
        }

    }
    spawnEnemies() {
        if (!this.isGameOver) {

            const formations = [[4, 1], [7, 1], [5, 2]];
            const formation = formations[Math.floor(Math.random() * formations.length)];
            const startX = this.sys.game.config.width - 40;
            const randomY = Phaser.Math.Between(0, this.sys.game.config.height - formation[1] * 40);

            for (let y = 0; y < formation[1]; y++) {
                for (let x = 0; x < formation[0]; x++) {
                    let enemy = this.enemies.create(startX + x * 40, randomY + y * 40, 'enemy').setScale(.1);
                    var newBodyWidth = enemy.body.width * 0.3; // Decrease width by 20%
                    var newBodyHeight = enemy.body.height * 0.5; // Decrease height by 20%
                    enemy.body.setSize(newBodyWidth, newBodyHeight);
                    enemy.setVelocityX(this.enemyBaseVelocityX);
                }
            }
        }
    }

    scoreUpdate() {
        this.updateScore(10);

        if (this.score % 100 === 0) {
            this.enemyBaseVelocityX -= 20;
            this.timerDelay = Math.max(200, this.enemySpawnDelay - 200);
            this.enemySpawnDelay = this.timerDelay;
            this.spawnEnemyTimer.delay = this.timerDelay;
            console.log("delayTime " + this.enemySpawnDelay);
            console.log("VelocityX " + this.enemyBaseVelocityX);
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
    width: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].width,
    height: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].height,
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
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