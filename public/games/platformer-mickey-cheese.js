// Touuch Screen Controls
const joystickEnabled = true;
const buttonEnabled = true;
var isMobile = false;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

// BUTTON DOCMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

// Game Scene -- EDIT ALL YOUR CODE IN GAMESCENE CLASS
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
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

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);

    }

    create() {
        this.score = 0;
        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.gameIsOver = false;
        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }
        isMobile = !this.sys.game.device.os.desktop;
        this.vfx = new VFXLibrary(this);

        this.sounds.background.setVolume(2).setLoop(true).play();
        this.input.addPointer(3);

        this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);

        // Use the larger scale factor to ensure the image covers the whole canvas
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale);

        // Add UI elements
        this.scoreLabel = this.add.sprite(40, 40, 'collectible').setScale(0.2);
        this.scoreText = this.add.bitmapText(65, 8, 'pixelfont', 'x 0', 28);

        this.levelUpText = this.add.bitmapText(this.width / 2, 180, 'pixelfont', 'LEVEL UP!', 48).setOrigin(0.5).setDepth(11).setVisible(false);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3).setScrollFactor(0);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.numberOfCheese = 10;

        this.platforms = this.physics.add.staticGroup();

        let base = this.platforms.create(0, this.game.config.height, 'platform').setScale(5, 0.035).setOrigin(0, 1).refreshBody();

        this.platforms.create(this.game.config.width, this.game.config.height * 0.8, 'platform')
            .setScale(0.5, 0.03)
            .setOrigin(1, 0).refreshBody();

        this.platforms.create(this.game.config.width / 2, this.game.config.height * 0.7, 'platform')
            .setScale(0.5, 0.03)
            .setOrigin(0.5, 0.5).refreshBody();

        this.platforms.create(0, this.game.config.height * 0.45, 'platform')
            .setScale(0.4, 0.03)
            .setOrigin(0, 0).refreshBody();

        this.platforms.create(this.game.config.width, this.game.config.height * 0.42, 'platform')
            .setScale(0.8, 0.03)
            .setOrigin(1, 0).refreshBody();

        this.platforms.create(this.game.config.width / 2.2, this.game.config.height * 0.32, 'platform')
            .setScale(0.4, 0.03)
            .setOrigin(0.5, 0.5).refreshBody();

        this.player = this.physics.add.sprite(this.game.config.width / 4, this.game.config.height * 0.6, 'player').setScale(0.2);

        this.player.body.setSize(this.player.body.width / 1.5, this.player.body.height);

        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.cheeseGroup = this.physics.add.group({
            key: 'collectible',
            repeat: this.numberOfCheese - 1,
            setXY: { x: 50, y: 0, stepX: Math.floor(this.game.config.width - 50) / (this.numberOfCheese) }
        });

        this.cheeseGroup.children.iterate(child => {
            child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8)).setScale(0.2);
            child.body.setSize(child.body.width / 1.5, child.body.height / 1.5);

        });

        this.bombs = this.physics.add.group();

        this.bullets = this.physics.add.group({
            defaultKey: 'projectile',
            active: false,
            maxSize: 10
        });

        this.input.keyboard.on('keydown-SPACE', this.shootBullet, this);
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.cheeseGroup, this.platforms);
        this.physics.add.collider(this.bombs, this.platforms);
        this.physics.add.overlap(this.player, this.cheeseGroup, this.collect, null, this);
        this.physics.add.overlap(this.bullets, this.bombs, this.killEnemy, null, this)
        this.physics.add.overlap(this.platforms, this.bullets, (platform, bullet) => {
            bullet.destroy();
        }, null, this);
        this.physics.add.collider(this.player, this.bombs, this.hitBomb, null, this);
        const joyStickRadius = 80;

        if (joystickEnabled) {
            this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: joyStickRadius * 1.5,
                y: this.height - (joyStickRadius * 1.6),
                radius: 80,
                base: this.add.circle(0, 0, 80, 0x888888, 0.5),
                thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5),
                // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
                // forceMin: 16,
            });

            this.joystickKeys = this.joyStick.createCursorKeys();
        }

        if (buttonEnabled) {
            this.buttonA = this.add.rectangle(this.width - 60, this.height - 60, 100, 100, 0xcccccc, 0.5)
            this.buttonA.button = this.plugins.get('rexbuttonplugin').add(this.buttonA, {
                mode: 1,
                clickInterval: 10,
            });

            this.buttonB = this.add.circle(this.width - 60, this.height - 220, 60, 0xcccccc, 0.5)
            this.buttonB.button = this.plugins.get('rexbuttonplugin').add(this.buttonB, {
                mode: 1,
                clickInterval: 5,
            });
            this.buttonB.button.on('down', this.shootBullet, this);
        }
        this.toggleControlsVisibility(isMobile)
        this.input.keyboard.disableGlobalCapture();
    }

    toggleControlsVisibility(visibility) {
        this.joyStick.base.visible = visibility;
        this.joyStick.thumb.visible = visibility;
        this.buttonA.visible = visibility;
        this.buttonB.visible = visibility;
    }

    update(time, delta) {
        if (this.gameIsOver) {
            return;
        }

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
            this.player.flipX = true;
            this.player.leftShoot = true;
        }
        else if (this.cursors.right.isDown || this.joystickKeys.right.isDown) {
            this.player.setVelocityX(200);
            this.player.flipX = false;
            this.player.leftShoot = false;
        }
        else {
            this.player.setVelocityX(0);
        }

        if ((this.cursors.up.isDown || this.buttonA.button.isDown) && this.player.body.touching.down) {

            this.sounds.jump.play();
            this.player.setVelocityY(-350);
        } else {
            // this.player.setVelocityY(0);
        }

    }

    scorePointAnim(object) {
        let dx = object.x - 50;
        let dy = object.y - 50;
        let scoreText = this.add.bitmapText(dx, dy, 'pixelfont', '+10', 28).setTint(0xff9900);

        this.tweens.add({
            targets: scoreText,
            y: dy - 40,
            duration: 400,
            ease: 'Power1',
            onComplete: function () {
                scoreText.destroy();
            }
        });
    }

    killEnemy(bullet, bomb) {
        this.sounds.destroy.play();
        this.vfx.createEmitter('enemy', bomb.x, bomb.y, 0.03, 0, 300).explode(20);
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.stop();

        bomb.destroy();
    }

    collect(player, cheese) {
        this.scorePointAnim(cheese);
        cheese.disableBody(true, true);
        this.sounds.collect.play();
        this.updateScore(10);
        if (this.cheeseGroup.countActive(true) === 0) {
            this.sounds.success.play();
            this.levelUpText.setVisible(true);
            this.time.delayedCall(2000, () => {
                this.cheeseGroup.children.iterate(child => {
                    child.enableBody(true, child.x, 0, true, true);
                });

                this.levelUpText.setVisible(false);
                let bombCount = Math.floor(this.score / 100)
                this.spawnBomb(bombCount);
            })
        }
    }

    spawnBomb(numberOfBombs) {
        const x = (this.player.x < this.game.config.width / 2) ? Phaser.Math.Between(this.game.config.width / 2, this.game.config.width) : Phaser.Math.Between(0, this.game.config.width / 2);
        for (let i = 0; i < numberOfBombs; i++) {
            const bomb = this.bombs.create(x, 16, 'enemy').setBounce(1).setScale(0.12)
                .setCollideWorldBounds(true).setVelocity(Phaser.Math.Between(-200, 200), 20);
            bomb.body.setSize(bomb.body.width / 1.5, bomb.body.height);
        }
    }

    hitBomb(player, bomb) {
        this.physics.pause();
        player.setTint(0xff0000);
        this.cameras.main.shake(200);
        this.gameIsOver = true;
        this.sound.stopAll();
        this.sounds.lose.play();
        this.time.delayedCall(2000, () => {
            this.gameOver();
        });
    }

    shootBullet() {
        let bullet = this.bullets.get(this.player.x, this.player.y);
        if (bullet) {

            this.sounds.shoot.play();
            bullet.setActive(true).setVisible(true).setScale(0.03).setVelocityX(this.player.leftShoot ? -600 : 600)
            bullet.body.setAllowGravity(false);
            this.time.delayedCall(2000, () => {
                if (bullet.active) {
                    bullet.setActive(false).setVisible(false);
                    bullet.body.stop();
                }
            });
        }
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(`x ${this.score}`);
    }

    gameOver() {
        initiateGameOver.bind(this)({
            "score": this.score,
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
            gravity: { y: 300 },
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
