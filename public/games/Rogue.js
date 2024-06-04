let assetsLoader = {
    "background": "background",
    "player": "player",
    "enemy": "enemy",
    "projectile": "projectile",
    "collectible": "collectible",
};

let soundsLoader = {
    'background': "background",
    'shoot': "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_3.mp3",
    'damage': "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/damage_1.mp3",
    'upgrade': "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/upgrade_1.mp3",
    'lose': "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3",
    'collect': "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3",
};

// Custom UI Elements
const title = `Rogue`
const description = `A thrilling shooting survival game.`
const instructions =
    `Instructions:
1. Use arrow keys OR joystick to move.
2. Collect power ups to upgrade weapons and regenrated health.`;

// Game Orientation
const orientation = "landscape";

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
    }

    preload() {
        addEventListenersPhaser.bind(this)();

        this.load.image("heart", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png");
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }

        this.load.image('plus', this.createPlusTexture());
        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);

        displayProgressLoader.call(this);
    }

    create() {
        this.vfx = new VFXLibrary(this);
        this.isMobile = !this.sys.game.device.os.desktop;

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.add.image(0, 0, 'background').setOrigin(0).setScrollFactor(0);

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
            this.joystickKeys = this.joyStick.createCursorKeys();
        }

        if (buttonEnabled) {
            this.buttonA = this.add.rectangle(this.width - 80, this.height - 100, 80, 80, 0xcccccc, 0.5)
            this.buttonA.button = this.plugins.get('rexbuttonplugin').add(this.buttonA, {
                mode: 1,
                clickInterval: 100,
            });

            this.buttonA.button.on('down', () => this.fireBullet(), this);
        }

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.input.keyboard.on('keydown-M', () => {
            this.sound.setMute(!this.sound.mute);
        });

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.setScrollFactor(0);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.sounds.background.setVolume(1).setLoop(true).play();

        this.player;
        this.enemies;
        this.bullets;
        this.lastFired = 0;
        this.lastFiredDelay = 800;
        this.score = 0;
        this.scoreText;
        this.playerHealth = 100;
        this.playerSpeed = 100;
        this.healthRegenPoints = 0;
        this.healthRegenPointsRequired = 15;
        this.bulletAddPoints = 0;
        this.bulletAddPointsRequired = 10;
        this.collectibleChance = 0.8;
        this.enemySpeed = 30;
        this.gameOverTrigerred = false;

        // Create player
        this.player = this.physics.add.sprite(this.width / 2, this.height / 2, 'player').setScale(0.08);
        this.player.preFX.addShadow(0, 0, 0.1, 1, 0x000000, 6, 1);
        // this.player.postFX.addShadow();
        this.healthBar = this.add.graphics();
        this.updateHealthBar();

        // Create enemies group
        this.enemies = this.physics.add.group();

        // Create bullets group
        this.bullets = this.physics.add.group();

        this.collectibles = this.physics.add.group();

        // Set up camera to follow player
        this.cameras.main.startFollow(this.player, true, 0.03, 0.03);

        // Set up arrow key input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Display score
        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', this.score, 64).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
        this.healthIcon = this.add.image(80, 100, "plus").setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
        this.healthText = this.add.bitmapText(180, 90, 'pixelfont', this.healthRegenPoints + "/" + this.healthRegenPointsRequired, 64).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);

        this.bulletIcon = this.add.image(80, 200, "projectile").setScale(0.08).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
        this.bulletText = this.add.bitmapText(180, 190, 'pixelfont', this.bulletAddPoints + "/" + this.bulletAddPointsRequired, 64).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);

        // Spawn enemies
        this.time.addEvent({
            delay: 600,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        this.vfx.addCircleTexture('red', 0xFF0000, 1, 10);
        this.vfx.addCircleTexture('orange', 0xFFA500, 1, 10);
        this.vfx.addCircleTexture('yellow', 0xFFFF00, 1, 10);

        // Check for collisions between enemies and player
        this.physics.add.collider(this.player, this.enemies, this.playerEnemyCollision, null, this);
        this.physics.add.collider(this.bullets, this.enemies, this.bulletEnemyCollision, null, this);
        this.physics.add.collider(this.player, this.collectibles, this.collectCollectible, null, this);
        this.input.keyboard.disableGlobalCapture();
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-this.playerSpeed);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(this.playerSpeed);
            this.player.flipX = false;
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-this.playerSpeed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(this.playerSpeed);
        } else {
            this.player.setVelocityY(0);
        }

        this.enemies.getChildren().forEach(enemy => {
            this.physics.moveToObject(enemy, this.player, this.enemySpeed);
        });

        // Automatic shooting
        if (this.time.now > this.lastFired) {
            this.shootBullet();
            this.lastFired = this.time.now + this.lastFiredDelay;
        }

        this.healthBar.setPosition(this.player.x - 50, this.player.y - 60);

        // Update score
        this.scoreText.setText('Score: ' + this.score);
    }

    updateHealthBar() {
        this.healthBar.clear();

        // Draw the background of the health bar
        this.healthBar.fillStyle(0x000000, 0.8);
        this.healthBar.fillRect(0, 0, 100, 10);

        // Draw the actual health level
        this.healthBar.fillStyle(0x00ff00, 1);
        this.healthBar.fillRect(0, 0, this.playerHealth, 10);
    }

    createPlusTexture() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // Set the fill color to green
        graphics.fillStyle(0x00ff00);

        // Draw the horizontal bar
        graphics.fillRect(0, 15, 50, 20);

        // Draw the vertical bar
        graphics.fillRect(15, 0, 20, 50);

        // Generate the texture from the graphics object
        graphics.generateTexture('plus', 50, 50);

        // Clean up the graphics object
        graphics.destroy();

        return 'plus';
    }

    spawnEnemy() {

        const edge = Phaser.Math.Between(1, 4);
        let x, y;

        switch (edge) {
            case 1:
                x = Phaser.Math.Between(this.player.x - this.width / 2, this.player.x + this.width / 2);
                y = this.player.y - this.height / 2;
                break;
            case 2:
                x = this.player.x + this.width / 2;
                y = Phaser.Math.Between(this.player.y - this.height / 2, this.player.y + this.height / 2);
                break;
            case 3:
                x = Phaser.Math.Between(this.player.x - this.width / 2, this.player.x + this.width / 2);
                y = this.player.y + this.height / 2;
                break;
            case 4:
                x = this.player.x - this.width / 2;
                y = Phaser.Math.Between(this.player.y - this.height / 2, this.player.y + this.height / 2);
                break;
        }

        const numEnemies = Phaser.Math.Between(1, 3); // Adjust as needed
        const spacing = 100;

        for (let i = 0; i < numEnemies; i++) {
            const enemy = this.enemies.create(((i + 1) * spacing) + x, y, 'enemy');
            enemy.setScale(0.05);
            this.tweens.add({
                targets: enemy,
                scale: '+=0.01',
                duration: 200,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: i * 200 // Add delay for staggered effect
            });
            this.physics.moveToObject(enemy, this.player, this.enemySpeed);
        }
    }

    shootBullet() {
        const closestEnemy = this.findClosestEnemy(this.player.x, this.player.y);

        if (closestEnemy) {
            const bullet = this.bullets.create(this.player.x, this.player.y, 'projectile').setScale(0.025);
            this.physics.moveToObject(bullet, closestEnemy, 500);
            this.sounds.shoot.setVolume(0.5).setLoop(false).play()
        }
    }

    findClosestEnemy(x, y) {
        let minDistance = 350;
        let closestEnemy = null;

        this.enemies.getChildren().forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        });

        return closestEnemy;
    }

    playerEnemyCollision(player, enemy) {
        this.sounds.damage.setVolume(1).setLoop(false).play()
        this.vfx.shakeCamera(200, 0.015);
        this.vfx.createEmitter('heart', player.x, player.y, 0.025, 0, 1000).explode(10);
        this.playerHealth -= 10;
        this.updateHealthBar();
        enemy.destroy();
        if (this.playerHealth <= 0 && !this.gameOverTrigerred) {
            this.gameOverTrigerred = true;

            this.time.delayedCall(500, () => {
                let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 200, 'pixelfont', 'Game Over', 64)
                    .setOrigin(0.5)
                    .setVisible(false)
                    .setAngle(-15)
                    .setDepth(100);

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

    bulletEnemyCollision(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.vfx.createEmitter('red', enemy.x, enemy.y, 1, 0, 500).explode(10);
        this.vfx.createEmitter('yellow', enemy.x, enemy.y, 1, 0, 500).explode(10);
        this.vfx.createEmitter('orange', enemy.x, enemy.y, 1, 0, 500).explode(10);
        this.score += 10; // Increase score when enemy is destroyed

        const chance = Phaser.Math.Between(0, 100);
        if (chance < this.collectibleChance * 100) {
            this.createCollectible(enemy.x, enemy.y);
        }
    }

    createCollectible(x, y) {
        const collectible = this.physics.add.image(x, y, 'collectible').setScale(0.05);
        this.vfx.addShine(collectible, 500);
        // this.vfx.addGlow(collectible);
        this.vfx.scaleGameObject(collectible);
        this.collectibles.add(collectible);
    }

    collectCollectible(player, collectible) {
        collectible.destroy();
        this.sounds.collect.setVolume(1).setLoop(false).play()
        this.healthRegenPoints += 1
        this.bulletAddPoints += 1
        if (this.healthRegenPoints >= this.healthRegenPointsRequired) {
            this.sounds.upgrade.setVolume(1).setLoop(false).play();
            this.vfx.createEmitter('plus', player.x, player.y, 1, 0, 1000).explode(10);
            this.healthRegenPoints = 0
            this.playerHealth = 100;
            this.updateHealthBar();
            this.centerTextHealth = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', "HEALTH REGENERATED!", 64).setOrigin(0.5, 0.5).setDepth(100).setScrollFactor(0);
            this.time.delayedCall(1000, () => {
                this.centerTextHealth.destroy();
            });
        }
        if (this.bulletAddPoints >= this.bulletAddPointsRequired) {
            this.sounds.upgrade.setVolume(1).setLoop(false).play();
            this.vfx.createEmitter('projectile', player.x, player.y, 0.025, 0, 1000).explode(10);
            this.bulletAddPoints = 0
            this.lastFiredDelay *= 0.9;
            this.centerTextWeapon = this.add.bitmapText(this.width / 2, this.height / 2 + 100, 'pixelfont', "WEAPON UPGRADED!", 64).setOrigin(0.5, 0.5).setDepth(100).setScrollFactor(0);
            this.time.delayedCall(1000, () => {
                this.centerTextWeapon.destroy();
            });
        }
        this.healthText.setText(this.healthRegenPoints + "/" + this.healthRegenPointsRequired);
        this.bulletText.setText(this.bulletAddPoints + "/" + this.bulletAddPointsRequired);
        this.score += 50; // Increase score when coin is collected
    }

    pauseGame() {
        handlePauseGame.bind(this)();
    }

    gameOver() {
        initiateGameOver.bind(this)({ score: this.score });
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
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: true,
    parent: "game-container",
};