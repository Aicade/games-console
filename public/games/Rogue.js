// Touch Screen Controls
const joystickEnabled = true;
var isMobile = false;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";


// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        console.log('GameScene constructor called');
    }

    preload() {
        console.log('Preload started');



        addEventListenersPhaser.bind(this)();

        this.load.image("heart", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png");
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

        for (const key in _CONFIG.imageLoader) {
            this.load.image(key, _CONFIG.imageLoader[key]);
        }

        for (const key in _CONFIG.soundsLoader) {
            this.load.audio(key, [_CONFIG.soundsLoader[key]]);
        }

        this.load.image('plus', this.createPlusTexture());
        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);

        displayProgressLoader.call(this);
    }

    create() {

        console.log('Create method started');
        this.vfx = new VFXLibrary(this);
        this.isMobile = !this.sys.game.device.os.desktop;
        isMobile = !this.sys.game.device.os.desktop;
        this.maxCoverage = 20000;
        this.minCoverage = -this.maxCoverage / 2;

        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.bg = this.add
            .tileSprite(this.minCoverage, this.minCoverage, this.maxCoverage, this.maxCoverage, "background")
            .setOrigin(0, 0)
            .setScrollFactor(1);
        this.cameras.main.setBounds(this.minCoverage, this.minCoverage, this.maxCoverage, this.maxCoverage);

        const joyStickRadius = 50;

        if (joystickEnabled) {
            this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: this.width - (joyStickRadius * 2),
                y: this.height - (joyStickRadius * 2),
                radius: 50,
                base: this.add.circle(0, 0, 80, 0x888888, 0.5),
                thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5),
                // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
                // forceMin: 16,
            });
            this.joystickKeys = this.joyStick.createCursorKeys();
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

        if (this.sounds.background.isPlaying) {
            this.sounds.background.stop();
        }      

        this.sounds.background.setVolume(2).setLoop(true).play();

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
        this.player = this.physics.add.sprite(this.width / 2, this.height / 2, 'player').setScale(0.2);
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

        this.scoreText = this.add.bitmapText(this.width / 2 - 30, 0, 'pixelfont', this.score, 32).setScrollFactor(0).setDepth(100);
        this.enemyIcon = this.add.image(this.width / 2 - 70, 30, "enemy").setScale(0.12).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
        this.healthIcon = this.add.image(20, 20, "plus").setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
        this.healthText = this.add.bitmapText(140, 20, 'pixelfont', this.healthRegenPoints + "/" + this.healthRegenPointsRequired, 32).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
        this.bulletIcon = this.add.image(this.width / 2 + 150, 30, "projectile").setScale(0.08).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100).setAngle(-50);
        this.bulletText = this.add.bitmapText(this.width / 2 + 280, 30, 'pixelfont', this.bulletAddPoints + "/" + this.bulletAddPointsRequired, 32).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);

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
        this.toggleControlsVisibility(isMobile)

        this.rehealthBar = this.createBar(40, 10, 200, 30, 'Health', 0x00ff00);
        // Create weapon bar
        this.weaponBar = this.createBar(this.width / 2 + 170, 20, 200, 30, 'Weapon', 0x0000ff);
    }

    createBar(x, y, width, height, label, color) {
        const bar = {};
        bar.value = 0;
        bar.graphics = this.add.graphics();
        bar.graphics.setScrollFactor(0).setDepth(10);
        bar.update = () => {
            bar.graphics.clear();
            const filledWidth = Phaser.Math.Clamp(bar.value / 100 * width, 0, width);
            bar.graphics.fillStyle(0x000000);
            bar.graphics.fillRect(x, y, width, height);
            bar.graphics.fillStyle(color);
            bar.graphics.fillRect(x, y, filledWidth, height);
            bar.graphics.lineStyle(2, 0xffffff);
            bar.graphics.strokeRect(x, y, width, height);
        };
        bar.update();
        return bar;
    }
    increaseBar(bar, value) {
        bar.value = Phaser.Math.Clamp(bar.value + value, 0, 100);
        if (bar.value == 100) {
            bar.value = 0;
        }
        bar.update();
    }
    decreaseBar(bar, value) {
        bar.value = Phaser.Math.Clamp(bar.value - value, 0, 100);
        bar.update();
    } 

    toggleControlsVisibility(visibility) {
        this.joyStick.base.visible = visibility;
        this.joyStick.thumb.visible = visibility;
    }

    update() {
        if (this.cursors.left.isDown || this.joystickKeys.left.isDown) {
            this.player.setVelocityX(-this.playerSpeed);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown || this.joystickKeys.right.isDown) {
            this.player.setVelocityX(this.playerSpeed);
            this.player.flipX = false;
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown || this.joystickKeys.up.isDown) {
            this.player.setVelocityY(-this.playerSpeed);
        } else if (this.cursors.down.isDown || this.joystickKeys.down.isDown) {
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

        this.scoreText.setText(': ' + this.score);
    }

    updateHealthMeterBar() {
        // Clear previous graphics
        this.HealthMeterBar.clear();
        // Define the meter bar dimensions and position
        const barX = 100;
        const barY = 40;
        const barWidth = 250; // Total width of the bar
        const barHeight = 35; // Height of the bar
        const filledWidth = Phaser.Math.Clamp(this.HealthMeterBarValue / 100 * barWidth, 0, barWidth);
        console.log(this.meterValue);
        // Draw the background of the bar
        this.HealthMeterBar.fillStyle(0x000000); // Black color for background
        this.HealthMeterBar.fillRect(barX, barY, barWidth, barHeight);
        // Set the color based on the increase condition (e.g., green when increased)
        const fillColor = 0x00ff00; // Green color for increase
        // Draw the filled portion of the bar
        this.HealthMeterBar.fillStyle(fillColor);
        this.HealthMeterBar.fillRect(barX, barY, filledWidth, barHeight);
        // Draw the outline of the bar
        this.HealthMeterBar.lineStyle(2, 0xffffff); // White outline
        this.HealthMeterBar.strokeRect(barX, barY, barWidth, barHeight);
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
    
        graphics.fillRect(10, 20, 30, 10);  // Smaller and repositioned
        // Draw the vertical bar
        graphics.fillRect(20, 10, 10, 30);

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
            enemy.setScale(0.1);
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
            const bullet = this.bullets.create(this.player.x, this.player.y, 'projectile').setScale(0.05);
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
                    .setScrollFactor(0)
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
        // this.increaseBar(this.weaponBar, 10);
        // this.increaseBar(this.rehealthBar, 7);
        const collectible = this.physics.add.image(x, y, 'collectible').setScale(0.1);
        this.vfx.addShine(collectible, 500);
        // this.vfx.addGlow(collectible);
        this.vfx.scaleGameObject(collectible);
        this.collectibles.add(collectible);
    }

    collectCollectible(player, collectible) {
        this.increaseBar(this.weaponBar, 10);
        this.increaseBar(this.rehealthBar, 7);
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
    width: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].width,
    height: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].height,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.Orientation.LANDSCAPE
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
        name: _CONFIG.title,
        description: _CONFIG.description,
        instructions: _CONFIG.instructions,
    },
    deviceOrientation: _CONFIG.deviceOrientation
};
