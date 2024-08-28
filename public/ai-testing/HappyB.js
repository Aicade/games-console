// Game Scene
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
        this.enemyCount = 5;
        this.isGameOver = false;
        this.hitCounter = 5;

        this.playerBulletBounces = 8;
        this.playerBullets = 5;
        this.playerBulletsRemaining = 7;

        this.playerBullets = [];
        this.bulletsRemainingImages = [];
        this.enemies = [];
        this.bridges = [];


        this.happyName = "Aicade";
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
        this.load.image('cave_ground', `https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Bricks/s2+Brick+01+Grey.png`);
        this.load.image('bridge_mid', `https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Wall/s2+greenish+tile+horizontal.png`);
        this.load.image('bridge_mid_v', `https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Wall/s2+greenish+tile+vertical.png`);
        this.load.image('next_level', `https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/arrow.png`)
        this.load.image('heart', 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png');

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');
    }

    shootPlayerBullet(pointer, bulletBounces, offset = 0, myGravity = false) {
        this.sounds.shoot.setVolume(1).setLoop(false).play();

        if (this.gameOverC) {
            return;
        }
        if (this.playerBulletsRemaining > 0) {
            this.playerBulletsRemaining -= 1;
            this.displayBulletsRemaining();
        }
        else
            return;
        var ninjaStar = this.physics.add.sprite(this.player.x, this.player.y, 'heart');
        ninjaStar.setScale(0.03);
        ninjaStar.setDepth(1);
        this.physics.moveTo(ninjaStar, pointer.x + offset, pointer.y + offset, 600);
        ninjaStar.setCollideWorldBounds(true);
        ninjaStar.setBounce(1);
        ninjaStar.body.allowGravity = myGravity;
        ninjaStar.setData('bounces', bulletBounces);
        ninjaStar.setData('currentBounces', 0);
        this.playerBullets.push(ninjaStar);

        this.tweens.add({
            targets: ninjaStar,
            angle: 360,
            duration: 1000,
            repeat: -1,
            ease: 'Linear'
        });

    }

    handlePlayerBulletBounce() {
        this.physics.world.bodies.entries.forEach(function (body) {

            if (body.gameObject.texture.key === 'heart' && body.blocked.none === false) {
                body.gameObject.setData('currentBounces', body.gameObject.getData('currentBounces') + 1);
                body.gameObject.setFlipX(!body.gameObject.flipX);
                if (body.gameObject.getData('currentBounces') >= body.gameObject.getData('bounces')) {
                    body.gameObject.destroy();
                }

            }
        }, this);
    }

    destroyPlayerBullet(bullet) {

        bullet.destroy();
    }


    spawnEnemy(x, y, enemyObj, speed, distX, distY) {
        let enemy = this.physics.add.sprite(x, y, enemyObj);
        enemy.name = enemyObj;
        this.enemies.push(enemy); enemy.body.setAllowGravity(false);
        enemy.setScale(0.25);
        enemy.setSize(enemy.body.width, enemy.body.height / 1.3);
        enemy.body.setImmovable(true); // Correct usage
        this.vfx.scaleGameObject(enemy);
    }


    destroyEnemy(enemy) {
        // this.playerDestroyEmitter.explode(400, enemy.x, enemy.y);
        this.enemies = this.enemies.filter(e => e !== enemy);
        // let x = enemy.x;
        // let y = enemy.y;
        enemy.destroy();

    }
    bulletHitsEnemy(bullet, enemy) {
        this.increaseMeter(20);
        this.sounds.destroy.setVolume(1).setLoop(false).play();

        this.hitCounter--;

        this.tweens.add({
            targets: enemy,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            yoyo: true,
            ease: 'Quad.easeInOut',
            onComplete: () => {
                // let persistentScale = enemy.originalScale + (enemy.hitCount * 0.01);
                // enemy.setScale(persistentScale);
            }
        });

        const radius = 75;
        const numEmitters = 4;
        for (let i = 0; i < numEmitters; i++) {
            const angle = (Math.PI * 2 / numEmitters) * i; // angle for each emitter
            const x = enemy.x + radius * Math.cos(angle); // x position based on angle
            const y = enemy.y + radius * Math.sin(angle); // y position based on angle

            // Create different colored emitters at each point around the circle
            this.vfx.createEmitter('red', x, y - 50, 1, 0, 500).explode(270);
            this.vfx.createEmitter('yellow', x, y, 1, 0, 500).explode(270);
            this.vfx.createEmitter('orange', x, y - 20, 1, 0, 500).explode(270);
        }
        this.destroyEnemy(enemy);

        this.destroyPlayerBullet(bullet);
    }

    create_Bridge(x, y, length, rotate = false) {
        let bridge_mid_width = 50; // Manually setting width of bridge_mid
        if (rotate) {
            for (let i = 0; i < length; i++) {
                this.bridges.create(x, y + i * bridge_mid_width, 'bridge_mid_v');
            }
        }
        else {
            for (let i = 0; i < length - 1; i++) {
                this.bridges.create(x + i * bridge_mid_width, y, 'bridge_mid');
            }
        }
    }

    add_colliders() {
        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.enemies, this.ground);
        this.physics.add.collider(this.enemies, this.bridges);
        this.physics.add.collider(this.playerBullets, this.enemies, this.bulletHitsEnemy, null, this);
        // this.physics.add.collider(this.playerBullets, this.bridges);
        this.physics.add.collider(this.playerBullets, this.ground);
    }

    create() {
        this.hitCounter = 5;
        this.vfx = new VFXLibrary(this);

        this.cursor = this.input.keyboard.createCursorKeys();

        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(1).setLoop(true).play();
        var me = this;
        this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);      // Use the larger scale factor to ensure the image covers the whole canvas
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale).setDepth(-5);

        this.width = this.game.config.width;
        this.height = this.game.config.height;


        this.pauseButton = this.add.sprite(this.width - 50, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.setDepth(11)
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        // this.playerDestroyEmitter = this.vfx.createEmitter('enemy', 0, 0, 0.035, 0, 1000).setAlpha(0.5)
        this.bridges = this.physics.add.staticGroup();
        this.ground = this.physics.add.staticImage(0, this.height + 120, 'cave_ground').setScale(9, 1);
        this.ground.body.setSize(this.ground.width * 15, this.ground.height);

        this.player = this.physics.add.sprite(150, 0, 'player');
        this.player.setScale(0.4);
        this.vfx.scaleGameObject(this.player, 1.1);


        this.add_colliders();

        this.clearScreen();
        this.create_scenes(this.gameScene);

        this.displayBulletsRemaining();
        this.gameScoreHandler(0)

        this.input.on('pointerdown', function (pointer) {
            if (!this.gameStarted)
                this.gameStarted = true;
            this.shootPlayerBullet(pointer, this.playerBulletBounces, 0, false);
        }, this);

        this.vfx.addCircleTexture('red', 0xFF0000, 1, 10);
        this.vfx.addCircleTexture('orange', 0xFFA500, 1, 10);
        this.vfx.addCircleTexture('yellow', 0xFFFF00, 1, 10);

        this.meterValue = 0;

        // Create a graphics object for the meter bar
        this.meterBar = this.add.graphics();
        this.meterBar.setScrollFactor(0).setDepth(10);


        this.updateMeterBar();
        this.scoreImg = this.add.image(250, 45, 'collectible').setScale(0.2).setScrollFactor(0).setDepth(11)
        this.vfx.scaleGameObject(this.scoreImg, 1.1);
    }

    updateMeterBar() {
        // Clear previous graphics
        this.meterBar.clear();

        // Define the meter bar dimensions and position
        const barX = 10;
        const barY = 30;
        const barWidth = 250; // Total width of the bar
        const barHeight = 35; // Height of the bar

        const filledWidth = Phaser.Math.Clamp(this.meterValue / 100 * barWidth, 0, barWidth);
        console.log(this.meterValue);
        // Draw the background of the bar
        this.meterBar.fillStyle(0x000000); // Black color for background
        this.meterBar.fillRect(barX, barY, barWidth, barHeight);

        // Set the color based on the increase condition (e.g., green when increased)
        const fillColor = 0xffff00; // Green color for increase

        // Draw the filled portion of the bar
        this.meterBar.fillStyle(fillColor);
        this.meterBar.fillRect(barX, barY, filledWidth, barHeight);

        // Draw the outline of the bar
        this.meterBar.lineStyle(2, 0xffffff); // White outline
        this.meterBar.strokeRect(barX, barY, barWidth, barHeight);


    }

    increaseMeter(value) {
        this.meterValue = Phaser.Math.Clamp(this.meterValue + value, 0, 100);
        this.updateMeterBar();
        // this.checkForExplode();

    }

    update(delta) {
        this.handlePlayerBulletBounce();
        this.checkGameOver();
        if (this.hitCounter == 0) {
            if (!this.isGameOver)
                this.resetGame();
        }
        console.log(this.hitCounter);
    }

    checkGameOver() {
        let bulletsAlive = this.playerBullets.some(bullet => bullet.active);
        if (this.gameStarted && !bulletsAlive && this.playerBulletsRemaining === 0 && this.enemies.length > 0) {

            if (!this.loseSoundPlayed) {
                this.sounds.lose.setVolume(1).setLoop(false).play();
                this.loseSoundPlayed = true;
                // this.resetGame();
            }
        }
    }

    create_scenes(scene) {
        this.loadNextScene = false;
        this.enemyKilledScore = 0;
        this.gameStarted = false;


        this.physics.add.collider(this.enemies, this.bridges);
        this.physics.add.collider(this.playerBullets, this.enemies, this.bulletHitsEnemy, null, this);
        switch (scene) {
            case 1:
                this.playerBulletsRemaining = 7;
                this.displayBulletsRemaining();
                this.create_Bridge(600, 35, 6, true);
                this.spawnEnemy(600, 300, 'enemy', 100, 0, 0);

                this.create_Bridge(750, 35, 3, true);
                this.spawnEnemy(750, 150, 'enemy', 100, 0, 0);

                this.create_Bridge(900, 35, 7, true);
                this.spawnEnemy(900, 380, 'enemy', 100, 0, 0)

                this.create_Bridge(1050, 35, 6, true);
                this.spawnEnemy(1050, 300, 'enemy', 100, 0, 0);

                this.create_Bridge(1200, 35, 7, true);
                this.spawnEnemy(1200, 380, 'enemy', 100, 0, 0)


                break;

            default:
                const randomCase = Math.floor(Math.random() * 2) + 1;
                switch (randomCase) {
                    case 1:
                        this.playerBulletsRemaining = 6;
                        this.displayBulletsRemaining();
                        this.create_Bridge(10, 550, 4);
                        this.spawnEnemy(65, 250, 'enemy', 100, 0, 0)
                        break;

                    case 2:
                        this.playerBulletsRemaining = 6;
                        this.displayBulletsRemaining();
                        this.create_Bridge(65, 500, 4);
                        this.spawnEnemy(100, 250, 'enemy', 100, 250, 0)
                        this.create_Bridge(290, 250, 4);
                        this.spawnEnemy(250, 100, 'enemy', 75, 300, 0)
                        break;

                }
                break;

        }
    }


    gameScoreHandler(score) {
        this.gameScore += score;
    }

    clearScreen() {
        this.enemies.forEach(enemy => this.destroyEnemy(enemy));
        this.playerBullets.forEach(bullet => this.destroyPlayerBullet(bullet));
        this.bridges.clear(true, true); // Add this line to clear bridges

    }


    displayBulletsRemaining() {
        // Destroy previous images
        if (this.bulletsRemainingImages.length > 0) {
            this.bulletsRemainingImages.forEach(image => image.destroy());
            this.bulletsRemainingImages = [];
        }
        let startingX = 25;
        let y = 90;
        for (let i = 0; i < this.playerBulletsRemaining; i++) {
            let x = startingX + i * 35;
            let image = this.add.image(x, y, "heart");
            image.setScale(0.02);
            this.vfx.scaleGameObject(image, 1.1);

            this.bulletsRemainingImages.push(image);
        }
    }

    randomExplosion() {
        const numExplosions = 20; // Number of random explosions you want to create

        // Get the bounds of the camera (visible area)
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;

        for (let i = 0; i < numExplosions; i++) {
            // Generate random positions within the screen bounds
            const randomX = Math.random() * screenWidth;
            const randomY = Math.random() * screenHeight;

            // Create emitters with random colors at the random positions
            const colors = ['red', 'yellow', 'orange']; // Array of colors to choose from
            const randomColor = colors[Math.floor(Math.random() * colors.length)]; // Select random color

            // Create an explosion effect at the random position with a random color
            this.vfx.createEmitter(randomColor, randomX, randomY, 1, 0, 500).explode(270);
        }

        const numHearts = 5; // Number of hearts to bounce around the screen

        for (let i = 0; i < numHearts; i++) {
            // Create a heart sprite at random positions within the screen
            const randomX = Math.random() * this.cameras.main.width;
            const randomY = Math.random() * this.cameras.main.height;
            var heart = this.physics.add.sprite(randomX, randomY, 'heart');

            // Configure the heart sprite

            heart.setScale(0.03);
            heart.setDepth(1);
            heart.setCollideWorldBounds(true);
            heart.setBounce(1);
            heart.body.allowGravity = false; // Assuming you want the hearts to float without gravity

            // Randomize the initial velocity for more dynamic motion
            const velocityX = (Math.random() * 2 - 1) * 300; // Random X velocity
            const velocityY = (Math.random() * 2 - 1) * 300; // Random Y velocity
            heart.setVelocity(velocityX, velocityY);

            this.playerBullets.push(heart);
        }

    }

    resetGame() {
        this.isGameOver = true;
        // this.score = 0;
        this.sounds.background.stop();
        this.sounds.success.setVolume(3).setLoop(false).play();

        this.randomExplosion();

        let gametext0 = this.add.text(this.cameras.main.centerX - 200, this.cameras.main.centerY - 300, '🎈', { font: '64px Arial', color: '#ff0000' })
            .setOrigin(0.5)
            .setVisible(true)
            .setAngle(-15);

        let gametext1 = this.add.text(this.cameras.main.centerX - 300, this.cameras.main.centerY, '🎈', { font: '64px Arial', color: '#ff0000' })
            .setOrigin(0.5)
            .setVisible(true)
            .setAngle(-15);

        let gametext2 = this.add.text(this.cameras.main.centerX + 200, this.cameras.main.centerY - 200, '🎂', { font: '64px Arial', color: '#ff0000' })
            .setOrigin(0.5)
            .setVisible(true)
            .setAngle(-15);

        this.vfx.scaleGameObject(gametext0);
        this.vfx.scaleGameObject(gametext1);
        this.vfx.scaleGameObject(gametext2);

        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 300, 'pixelfont', `Happy Birthday !!!`, 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15).setTint(0xFFFF00).setDepth(15);

        this.time.delayedCall(500, () => {
            gameOverText.setVisible(true);
            this.tweens.add({
                targets: gameOverText,
                y: '+=200',
                angle: 0,
                scale: { from: 0.5, to: 1.5 },
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
        // this.scoreText.setText(this.score);
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
