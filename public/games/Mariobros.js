const assetsLoader = {
    "background": "background",
    "player": "player",
    "enemy": "enemy",
    "collectible_1": "collectible_1",
    "collectible_2": "collectible_2",
    "projectile": "projectile",
    "platform": "platform",
};

// Custom UI Elements
const title = `MARIO LITE`
const description = `A Platformer game where you collect powerups and kill enemies by \n stomping them. Game ends after you reach 500m`
const instructions =
    `Instructions:
    1. Use LEFT / RIGHT arrow key to move.
    2. Use UP arrow / Square button to jump
    3. Use SPACE/ round button to shoot and destroy enemies`;

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
const joystickEnabled = true;
const buttonEnabled = true;
const hideButtons = true;
var isMobile = false;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

// BUTTON DOCMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";


/*
------------------- GLOBAL CODE STARTS HERE -------------------
*/

const PLAYER_STATE = {
    SMALL: 0,
    BIG: 1,
    BULLETS: 2,
}

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init() {
        this.cursors = null;
        this.player = null;
        this.platforms = null;
        this.enemies = null;
        this.nextEnemyTime = 0;
        this.nextBricksTime = 0;
        this.scoreText = null;
        this.powerUps = null;
        this.score = 0;
        this.width = this.game.config.width;
        this.height = this.game.config.height;
    }

    preload() {

        for (const key in assetsLoader) {
            this.load.image(key, assets_list[assetsLoader[key]]);
        }

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.audio('backgroundMusic', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-1.mp3']);
        this.load.audio('jump', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_1.mp3']);
        this.load.audio('enemyKill', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/flap_1.wav']);
        this.load.audio('mushroomCollect1', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/upgrade_1.mp3']);
        this.load.audio('mushroomCollect2', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/upgrade_2.mp3']);
        this.load.audio('coinCollect', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_3.mp3']);
        this.load.audio('damage', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/damage_1.mp3']);
        this.load.audio('shoot', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_3.mp3']);
        this.load.audio('brick', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_1.mp3']);
        this.load.audio('loose', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_1.mp3']);
        this.load.audio('success', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/success_1.wav']);
        this.load.bitmapFont('pixelfont',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
        addEventListenersPhaser.bind(this)();
        displayProgressLoader.call(this);
    }

    create() {
        isMobile = !this.sys.game.device.os.desktop;
        this.vfx = new VFXLibrary(this);

        this.backgroundMusic = this.sound.add('backgroundMusic', { loop: true, volume: 2 });
        this.jumpSound = this.sound.add('jump', { loop: false, volume: 1 });
        this.mushCollectSound1 = this.sound.add('mushroomCollect1', { loop: false, volume: 1 });
        this.mushCollectSound2 = this.sound.add('mushroomCollect2', { loop: false, volume: 1 });
        this.coinSound = this.sound.add('coinCollect', { loop: false, volume: 1 });
        this.damegeSound = this.sound.add('damage', { loop: false, volume: 1 });
        this.shootSound = this.sound.add('shoot', { loop: false, volume: 1 });
        this.enemyKill = this.sound.add('enemyKill', { loop: false, volume: 1 });
        this.brickSound = this.sound.add('brick', { loop: false, volume: 1 });
        this.looseSound = this.sound.add('loose', { loop: false, volume: 1 });
        this.successSound = this.sound.add('success', { loop: false, volume: 1 });

        this.backgroundMusic.play();
        this.input.addPointer(3);
        this.score = 0;
        this.meter = 0;
        this.finishPoint = 20000;
        this.playerState = PLAYER_STATE.SMALL; // 0 : small | 1 : Big | 2 : Big + Bullets
        this.brickSize = 50;

        this.bg = this.add.tileSprite(0, 0, this.finishPoint + 200, this.game.config.height, 'background').setOrigin(0, 0);
        this.bg.setScrollFactor(1);

        this.endPole = this.add.sprite(this.finishPoint, 100, 'platform').setOrigin(0, 0);
        this.endPole.setScrollFactor(1);
        this.endPole.displayHeight = this.game.config.height;
        this.endPole.displayWidth = 40;
        // Add UI elements
        this.meterText = this.add.bitmapText(10, 7, 'pixelfont', 'Meter: 0m', 28);
        this.meterText.setScrollFactor(0).setDepth(11);

        this.scoreImg = this.add.image(30, 80, 'collectible_1').setScale(0.05, 0.05).setScrollFactor(0).setDepth(11)
        this.scoreText = this.add.bitmapText(60, 50, 'pixelfont', 'x 0', 28);
        this.scoreText.setScrollFactor(0).setDepth(11);
        this.powerUpText = this.add.bitmapText(this.width / 2, 200, 'pixelfont', 'POWER UP', 60).setOrigin(0.5, 0.5);
        this.powerUpText.setScrollFactor(0).setAlpha(0).setDepth(11);

        this.finishText = this.add.bitmapText(this.finishPoint - 30, 50, 'pixelfont', 'FINISH', 30).setScrollFactor(1);
        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.physics.world.bounds.setTo(0, 0, this.finishPoint + 200, this.game.config.height);
        this.physics.world.setBoundsCollision(true);


        this.player = this.physics.add.sprite(0, 0, 'player').setScale(0.13).setBounce(0.1).setCollideWorldBounds(true);
        this.player.body.setSize(this.player.body.width / 1.5, this.player.body.height);
        this.player.setGravityY(500);
        this.player.power_state = PLAYER_STATE.SMALL;

        this.cursors = this.input.keyboard.createCursorKeys();

        this.bullets = this.physics.add.group({
            defaultKey: 'projectile',
            active: false,
            maxSize: 20
        });

        this.ground = this.add.tileSprite(0, this.game.config.height, this.finishPoint + 200, 50, 'platform');

        this.ground.postFX.addShine(0.5);
        this.physics.add.existing(this.ground);
        this.ground.body.immovable = true;
        this.ground.body.allowGravity = false;
        this.ground.body.setCollideWorldBounds(true);
        this.ground.setOrigin(0, 0).setDepth(10);

        this.platforms = this.physics.add.staticGroup();
        let y = this.game.config.height - this.ground.displayHeight - this.player.displayHeight - 100;
        let x = this.player.x + this.game.config.width / 2 + 100;
        let platform = this.platforms.create(x, y, 'platform');
        platform.displayHeight = platform.displayWidth = this.brickSize;
        platform.refreshBody();
        let i = 5;
        while (i) {
            x = x + platform.displayWidth + 1;
            platform = this.platforms.create(x, y, 'platform');
            platform.displayHeight = platform.displayWidth = this.brickSize;
            platform.refreshBody();
            i--;
        }

        this.physics.add.collider(this.player, this.platforms, this.hitBrick, null, this);
        this.physics.add.collider(this.player, this.ground);

        this.enemies = this.physics.add.group();
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.collider(this.enemies, this.ground);

        this.powerUps = this.physics.add.group();
        this.cameras.main.setBounds(0, 0, this.finishPoint + 200, this.game.config.height);
        this.physics.add.collider(this.powerUps, this.ground);
        this.physics.add.collider(this.powerUps, this.platforms);

        this.cameras.main.startFollow(this.player);

        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);
        this.highestX = this.player.x;
        this.physics.add.collider(this.player, this.enemies, this.onPlayerEnemyCollision, null, this);
        this.physics.add.collider(this.bullets, this.enemies, this.bulletHit, null, this);
        this.physics.add.collider(this.bullets, this.platforms);
        this.physics.add.collider(this.bullets, this.ground);

        this.playerMovedBackFrom = this.player.x;
        this.canSpawnEnemies = true;
        this.createMobileButtons();
        this.bindWalkingMovementButtons();
    }

    update(time, delta) {
        if (this.player.x > this.endPole.x - 20) {
            this.player.setTint(0x00ff00);
            this.physics.pause();
            this.time.delayedCall(1000, () => {
                this.gameOver();
            });
        }

        if ((this.cursors.left.isDown || this.joystickKeys.left.isDown) && this.player.x > this.cameras.main.scrollX) {
            this.player.leftShoot = true;
            if (this.canSpawnEnemies) this.canSpawnEnemies = false;
            if (this.playerMovedBackFrom < this.player.x) {
                this.playerMovedBackFrom = this.player.x;
            }
            this.cameras.main.stopFollow();
            this.player.flipX = true;
            // if(this.player.x > this.game.canvas.width)
            this.player.setVelocityX(-160);

        } else if (this.cursors.right.isDown || this.joystickKeys.right.isDown) {
            this.player.leftShoot = false;
            if (!this.canSpawnEnemies) this.canSpawnEnemies = true;
            if (this.player.x > this.playerMovedBackFrom) {
                this.cameras.main.startFollow(this.player);
            }

            this.player.setVelocityX(160);
            this.player.flipX = false;

        } else {
            this.player.setVelocityX(0);
        }

        if ((this.cursors.up.isDown || this.buttonA.button.isDown) && this.player.body.touching.down) {

            this.jumpSound.play();
            this.player.setVelocityY(-650);
        }
        if (time > this.nextEnemyTime) {
            this.spawnEnemy();
            this.nextEnemyTime = time + Phaser.Math.Between(2000, 6000);
        }
        if (this.nextBricksTime && time > this.nextBricksTime && (this.cursors.right.isDown || this.joystickKeys.right.isDown)) {
            this.nextBricksTime = time + Phaser.Math.Between(6000, 15000);
            let bricksNum = Phaser.Math.Between(2, 5);
            this.spawnBricks(bricksNum);
            if (Phaser.Math.Between(0, 5)) {
                this.spawnBricks(3, this.brickSize * bricksNum + 200, Phaser.Math.Between(150, 250));
            }
        }
        if (this.nextBricksTime == 0 && this.player.x > this.game.config.width) {
            this.nextBricksTime = time;
        }

        if (this.player.x > this.highestX) {
            this.highestX = this.player.x;
            this.meter = Math.abs(Math.round(this.player.x / 100));
            this.meterText.setText('Meter: ' + this.meter + 'm');
        }

    }

    bindWalkingMovementButtons() {
        this.input.keyboard.on('keydown-RIGHT', this.walkingAnimationStart, this);
        this.input.keyboard.on('keydown-LEFT', this.walkingAnimationStart, this);
        this.input.keyboard.on('keyup-RIGHT', this.walkingAnimationStop, this);
        this.input.keyboard.on('keyup-LEFT', this.walkingAnimationStop, this);
        this.joystickKeys.left.on('down', this.walkingAnimationStart, this)
        this.joystickKeys.right.on('down', this.walkingAnimationStart, this)
        this.joystickKeys.left.on('up', this.walkingAnimationStop, this)
        this.joystickKeys.right.on('up', this.walkingAnimationStop, this)
    }

    walkingAnimationStart() {
        this.animEvent && this.animEvent.destroy();
        this.animEvent = this.time.addEvent({
            delay: 200,
            callback: () => {
                if (this.player.leftLeg) {
                    this.player.leftLeg = false;
                    this.player.rightLeg = true;
                    this.player.setAngle(-5);
                } else {
                    this.player.leftLeg = true;
                    this.player.rightLeg = false;
                    this.player.setAngle(5);
                }
            },
            loop: true
        });
    }

    walkingAnimationStop() {
        this.player.setAngle(0);
        this.animEvent.destroy();
    }

    spawnBricks(numOfBricks = 2, XOffset = 100, YOffset = 0) {

        if (!this.canSpawnEnemies) return;
        console.log(this.player.displayHeight);
        let y = this.game.config.height - this.ground.displayHeight - 215 - YOffset;
        let x = this.player.x + this.game.config.width / 2 + 100 + XOffset;
        let platform = this.platforms.create(x, y, 'platform');
        platform.displayHeight = platform.displayWidth = this.brickSize;
        platform.refreshBody();
        while (numOfBricks - 1) {
            x = x + platform.displayWidth + 1;
            platform = this.platforms.create(x, y, 'platform');
            let coinProbability = Phaser.Math.Between(1, 10) % 3 === 0; // 33% chance
            let mushroomProbability = Phaser.Math.Between(1, 10) % 5 === 0; // 20% chance
            if (coinProbability) {
                platform.setTint(0xffff00);
                platform.coin = Phaser.Math.Between(1, 5)
            } else if (mushroomProbability) {
                platform.setTint(0x00ff00);
                platform.mushroom = 1;

            }
            platform.displayHeight = platform.displayWidth = this.brickSize;
            platform.refreshBody();
            numOfBricks--
        }
    }

    hitBrick(player, brick) {
        if (player.body.touching.up && brick.body.touching.down) {
            this.brickSound.play();
            this.tweens.add({
                targets: this.cameras.main,
                y: this.cameras.main.worldView.y - 5, // Adjust value for desired intensity
                duration: 50, // Adjust timing as needed
                ease: 'Power1',
                yoyo: true, // Automatically returns to starting position
                repeat: 0 // Number of times to repeat the effect
            });
            this.tweens.add({
                targets: brick,
                y: brick.y - 10,
                duration: 50,
                ease: 'Linear',
                yoyo: true
            })
            if (brick.mushroom) {
                delete brick.mushroom;
                brick.setTint(0xffffff);
                let powerUp = this.powerUps.create(brick.x, brick.y - 70, 'collectible_2').setScale(0);
                this.tweens.add({
                    targets: powerUp,
                    scaleY: 0.07,
                    scaleX: 0.07,
                    duration: 300,
                    ease: 'Power1',
                    onComplete: () => {
                        powerUp.setVelocityX(50);
                    }
                })
            }
            if (brick.coin) {
                brick.coin--;
                this.coinSound.play();
                this.updateScore(1);
                if (!brick.coin) {
                    delete brick.mushroom;
                    brick.setTint(0xffffff);
                }
                let powerUp = this.powerUps.create(brick.x, brick.y - brick.displayHeight, 'collectible_1').setScale(0);
                this.tweens.add({
                    targets: powerUp,
                    scaleY: 0.07,
                    scaleX: 0.07,
                    duration: 200,
                    ease: 'Power1',
                    yoyo: true,
                    onComplete: (tween, targets) => {
                        targets[0].destroy();
                    },
                })
            }
        }
    }

    spawnEnemy() {

        if (!this.canSpawnEnemies) return;
        let x = this.player.x + this.game.config.width / 2;
        let y = Phaser.Math.Between(70, this.game.config.height / 1.5);

        let enemy = this.enemies.create(x, y, 'enemy').setScale(.1);
        let speed = -150;
        if (this.player.power_state === PLAYER_STATE.BIG) {
            speed = -200
        } else if (this.player.power_state === PLAYER_STATE.BULLETS) {
            speed = -250
        }
        enemy.setVelocityX(speed);
        enemy.setGravityY(100);
        // enemy.setCollideWorldBounds(true);
        enemy.setBounceX(1);
    }

    blinkEffect(object = this.powerUpText, duration = 300, blinks = 3) {
        this.blinkTween && this.blinkTween.stop();
        object.setAlpha(0);
        this.blinkTween = this.tweens.add({
            targets: object,
            alpha: 1,
            duration: duration,
            yoyo: true,
            repeat: blinks - 1,
            ease: 'Power1',
            onComplete: () => {
                object.setAlpha(0);
            },
            onStop: () => {
                object.setAlpha(0);
            }
        })
    }

    collectPowerUp(player, powerUp) {
        powerUp.destroy();

        if (player.power_state === PLAYER_STATE.SMALL) {
            this.powerUpText.text = "SIZE POWER UP";
            this.blinkEffect(this.powerUpText, 200, 5);
            player.power_state++;
            this.mushCollectSound1.play();
            this.tweens.add({
                targets: this.player,
                y: player.y - 30,
                scaleY: player.scaleX + 0.03,
                scaleX: player.scaleY + 0.03,
                duration: 100,
                ease: 'Power1',
            })
        } else if (player.power_state === PLAYER_STATE.BIG) {
            this.powerUpText.text = "BULLET POWER UP"
            this.blinkEffect(this.powerUpText, 200, 5);
            player.power_state++;
            this.mushCollectSound2.play();
            player.setTint(0xff00ff);
            this.input.keyboard.on('keydown-SPACE', this.shootBullet, this);
            this.colorAnimation(true, this.player);
        } else {
            this.updateScore(10);
        }

    }

    colorAnimation(startColorAnimation, obj) {
        if (!startColorAnimation && this.colorAnimEvent) {
            this.colorAnimEvent.destroy();
            obj.setTint(0xffffff);
            return;
        }

        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        let currentIndex = 0;

        // Change color every 500 milliseconds
        this.colorAnimEvent = this.time.addEvent({
            delay: 100,
            callback: () => {
                obj.setTint(colors[currentIndex]);
                // Move to the next color
                currentIndex++;
                if (currentIndex >= colors.length) {
                    currentIndex = 0;
                }
            },
            loop: true
        });
    }

    shootBullet() {
        if (this.player.power_state === PLAYER_STATE.BULLETS) {
            this.shootSound.play();
            let bullet = this.bullets.get(this.player.x, this.player.y);
            if (bullet) {
                bullet.setActive(true).setVisible(true).setScale(0.04).setVelocityX(this.player.leftShoot ? -300 : 300)
                this.time.delayedCall(3000, () => {
                    bullet.destroy();
                    if (bullet.active) {
                        bullet.setActive(false).setVisible(false);
                        bullet.body.stop();
                    }
                });
            }
        }
    }

    bulletHit(bullet, enemy) {
        this.enemyKill.play();
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.stop();

        this.blueEmitter = this.vfx.createEmitter('enemy', enemy.x, enemy.y, 0.01, 0, 600);
        this.blueEmitter.explode(300);
        enemy.destroy();
        this.updateScore(1);
    }

    onPlayerEnemyCollision(player, enemy) {
        if (player.body.touching.down && enemy.body.touching.up) {
            this.enemyKill.play();
            enemy._scaleY = 0.01;
            enemy.refreshBody();
            this.tweens.add({
                targets: this.cameras.main,
                y: this.cameras.main.worldView.y + 10, // Adjust value for desired intensity
                duration: 50, // Adjust timing as needed
                ease: 'Power1',
                yoyo: true, // Automatically returns to starting position
                repeat: 0 // Number of times to repeat the effect
            });
            this.time.delayedCall(
                300, () => {
                    enemy.destroy();
                }
            )
        } else {
            this.input.keyboard.off('keydown-SPACE', this.shootBullet, this);
            if (player.power_state === PLAYER_STATE.BULLETS) {
                this.damegeSound.play();
                this.colorAnimation(false, this.player);
                player.power_state--;
                player.setAngularVelocity(-900);
                this.time.delayedCall(500, () => {
                    player.setAngle(0);
                    player.setAngularVelocity(0);
                });
                this.cameras.main.shake(50);
                enemy.destroy();
            } else if (player.power_state === PLAYER_STATE.BIG) {
                this.damegeSound.play();

                player.power_state--;
                player.setAngularVelocity(-900);
                this.time.delayedCall(500, () => {
                    player.setAngle(0);
                    player.setAngularVelocity(0);
                });
                this.tweens.add({
                    targets: player,
                    scaleY: player.scaleX - 0.03,
                    scaleX: player.scaleY - 0.03,
                    duration: 100,
                    ease: 'Power1',
                })
                this.cameras.main.shake(100);
                enemy.destroy();
            } else {
                player.setTint(0xff0000);
                this.physics.pause();
                this.cameras.main.shake(200);

                this.sound.stopAll();
                this.looseSound.play();
                this.looseSound.on('complete', () => {
                    this.gameOver();
                });
            }
        }
    }

    createMobileButtons() {
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
            this.buttonA.setDepth(11).setScrollFactor(0);
            this.buttonB = this.add.circle(this.width - 60, this.height - 220, 60, 0xcccccc, 0.5)
            this.buttonB.button = this.plugins.get('rexbuttonplugin').add(this.buttonB, {
                mode: 1,
                clickInterval: 5,
            });
            this.buttonB.setDepth(11).setScrollFactor(0);
            this.buttonB.button.on('down', this.shootBullet, this);
        }

        this.toggleControlsVisibility(isMobile)
    }

    toggleControlsVisibility(visibility) {
        this.joyStick.base.visible = visibility;
        this.joyStick.thumb.visible = visibility;
        this.buttonA.visible = visibility;
        this.buttonB.visible = visibility;
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(`x ${this.score}`);
    }

    gameOver() {
        this.sound.stopAll();
        // this.scene.stop();
        initiateGameOver.bind(this)({
            meter: this.meter,
            coins: this.score,
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
    width: orientationSizes[orientation].width,
    height: orientationSizes[orientation].height,
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
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: true
};