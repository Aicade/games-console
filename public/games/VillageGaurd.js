// Touuch Screen Controls
const joystickEnabled = true;
const buttonEnabled = true;
const hideButtons = true;
var isMobile = false;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

// BUTTON DOCMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

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


class GameScene extends Phaser.Scene {
    constructor() {
        super();
        this.boatSpawnInterval = 5000;
        this.boatSpawnEvent = null;
        this.boats = [];
        this.rocks = [];
        this.livesText = null;
        this.scoreText = null;
        this.restartText = null;
        this.blackScreen = null;
        this.pendingRestart = false;
        this.hearts = []; 
        this.gameOverText = null; 
        
    }

    preload() {
        for (const key in _CONFIG.imageLoader) {
            this.load.image(key, _CONFIG.imageLoader[key]);
        }

        for (const key in _CONFIG.soundsLoader) {
            this.load.audio(key, [_CONFIG.soundsLoader[key]]);
        }

        if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
        if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);

        this.load.image("heart", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png");
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.bitmapFont('pixelfont','https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png','https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');

        
        displayProgressLoader.call(this);
        addEventListenersPhaser.bind(this)();
        
    }
    // temppreload(){
    //     this.load.image('rock', `assets/mark.png`);
    //     this.load.image('ship', `assets/elon.png`);
    //     this.load.image('player', `assets/Player_rg.png`);
    //     this.load.image('singing', `assets/Player_rg.png`);
    //     this.load.image('background', 'assets/park_bg.jpg');
    // }

    create() {

        //for keyboard
        this.input.keyboard.disableGlobalCapture();

        this.showInstructions();

         

        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(3).setLoop(true).play();
         //vfx calling
        this.vfx = new VFXLibrary(this);

        
        this.add.image(0, 0, 'background1').setOrigin(0, 0).setDisplaySize(this.sys.game.config.width, this.sys.game.config.height);

        this.createPlayer();
        this.createRocks();
        this.spawnBoat();
        this.createBoatSpawnEvent();
        this.createHUD();
        this.createRestartScreen();





         // Create the game over text (initially invisible)
         this.gameOverText = this.add.bitmapText(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'pixelfont',
            'Game Over',
            64
        )
        .setOrigin(0.5)
        .setTint(0xFF0000)  // Set the text color to red
        .setVisible(false);


        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
        this.pauseButton.on('pointerdown', () => this.pauseGame());
 

        this.input.keyboard.on('keydown-R', () => {
            if (this.pendingRestart) {
                this.pendingRestart = false;
                this.resetScene();
                this.toggleRestartScreen(false);
            }
        });
    }



    showInstructions() {
        const instructions = [
            "Use arrow keys to move the Player",
            "Press space to make gravity zero",
            "Save the villager from enemy"
        ];

        this.instructionsText = this.add.bitmapText(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'pixelfont',
            instructions,
            24
        )
        .setOrigin(0.5)
        .setAlpha(1)
        .setDepth(1000) // Ensure it's on top of everything
        .setTint(0xFF0000); // Set the text color to red

        // Fade out and destroy after 3 seconds
        this.tweens.add({
            targets: this.instructionsText,
            alpha: 0,
            duration: 500,
            delay: 2500,
            onComplete: () => {
                this.instructionsText.destroy();
            }
        });
    }


    pauseGame() {
        handlePauseGame.bind(this)();
    }
    gameOver() {
        initiateGameOver.bind(this)({ score: this.player.score });
        if (this.sounds.background.isPlaying) {
            this.sounds.background.stop();
        }
        if (this.sounds && this.sounds.lose) {
            this.sounds.lose.setVolume(0.5).setLoop(false).play();
        }
        this.gameOverText.setVisible(true);
        this.vfx.shakeCamera();
    }
    newGameOver() {
        // Show the game over text
        this.gameOverText.setVisible(true);

        // Stop all boats
        this.boats.forEach(boat => {
            boat.sprite.setVelocity(0);
        });

        // Stop spawning new boats
        if (this.boatSpawnEvent) {
            this.boatSpawnEvent.remove();
        }

        // Call the original gameOver function
        this.gameOver();

        // You might want to add a slight delay before ending the scene or showing a final score
        this.time.delayedCall(3000, () => {
            // Here you could transition to a "Game Over" scene or reset the game
            // For example: this.scene.start('GameOverScene', { score: this.player.score });
        });
    }
    createPlayer() {
        this.player = {
            
            sprite: this.physics.add.sprite(600, 300, 'player_2').setDisplaySize(75, 75).setDepth(1),
            speed: 250,
            isSinging: false,
            singingRange: 300,
            lives: 5,
            outOfLives: false,
            score: 0,
            
            singingCircle: this.add.sprite(600, 300, 'collectible_6').setDisplaySize(300, 300).setAlpha(0.7).setVisible(false),
            cursors: this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D,
                sing: Phaser.Input.Keyboard.KeyCodes.SPACE
            }),
            
            arrowKeys: this.input.keyboard.createCursorKeys()
        };
        this.player.sprite.setCollideWorldBounds(true);
        

        this.playerTrail = this.add.particles(0, 40, 'bubbles', {
            speed: 200,
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 600,
            angle: { min: -40, max: -10 },
            emitZone: { type: 'edge', source: new Phaser.Geom.Line(-10, -10, 10, 10), quantity: .002, yoyo: false }
        });
        this.playerTrail.startFollow(this.player.sprite);
    }

    createRocks() {
        const centerX = this.sys.game.config.width / 2;
        const centerY = this.sys.game.config.height / 2;
        const spreadFactor = 0.8; // Increase this value to spread rocks further apart

        const positions = [
            { x: centerX + 100 * spreadFactor, y: centerY + 200 * spreadFactor },
            { x: centerX - 250 * spreadFactor, y: centerY - 100 * spreadFactor },
            { x: centerX + 250 * spreadFactor, y: centerY - 200 * spreadFactor }
        ];
    
        positions.forEach(pos => {
            const rock = this.physics.add.sprite(pos.x, pos.y, 'platform_3').setDisplaySize(250, 250);
            rock.body.setImmovable(true);

            // Decrease the collision area
            const collisionReduction = 0.4; // Adjust this value to change the collision area size
            const newWidth = rock.width * collisionReduction;
            const newHeight = rock.height * collisionReduction;
            
            rock.body.setSize(newWidth, newHeight);
            rock.body.setOffset((rock.width - newWidth) / 2, (rock.height - newHeight) / 2);
            
            this.rocks.push(rock);
            this.physics.add.collider(this.player.sprite, rock);

            // Add the scaling VFX to each rock
            this.vfx.scaleGameObject(rock, 1.01, 500);
        });
    }

    createBoatSpawnEvent() {
        this.boatSpawnEvent = this.time.addEvent({
            delay: this.boatSpawnInterval,
            callback: this.spawnBoat,
            callbackScope: this,
            loop: true
        });
    }

    spawnBoat() {
        let x, y;
        const border = Phaser.Math.Between(0, 3);
        if (border === 0) {
            x = Phaser.Math.Between(0, this.sys.game.config.width);
            y = -50;
        } else if (border === 1) {
            x = Phaser.Math.Between(0, this.sys.game.config.width);
            y = this.sys.game.config.height + 50;
        } else if (border === 2) {
            x = -50;
            y = Phaser.Math.Between(0, this.sys.game.config.height);
        } else {
            x = this.sys.game.config.width + 50;
            y = Phaser.Math.Between(0, this.sys.game.config.height);
        }

        const boat = this.createBoat(x, y);
        this.boats.push(boat);

        const centerX = this.sys.game.config.width / 2;
        const centerY = this.sys.game.config.height / 2;
        let angleToCenter = Phaser.Math.Angle.Between(x, y, centerX, centerY);
        const offset = Phaser.Math.DegToRad(20);
        const minAngle = angleToCenter - offset;
        const maxAngle = angleToCenter + offset;
        boat.angle = Phaser.Math.FloatBetween(minAngle, maxAngle);
    }

    createBoat(x, y) {
        const boat = {
            sprite: this.physics.add.sprite(x, y, 'player_3').setDisplaySize(75, 75),
            angle: 0,
            speed: 160,
            isDead: false,
            isDistracted: false,
            turnRate: 0.02,
            turnDirection: 1,
            hasEnteredScreen: false,
            hasExitedScreen: false
        };
        
        boat.sprite.body.setImmovable(true);

        this.boats.forEach(otherBoat => {
            if (otherBoat !== boat) {
                this.physics.add.overlap(boat.sprite, otherBoat.sprite, () => this.handleBoatCrash(boat, otherBoat), null, this);
            }
        });

        this.rocks.forEach(rock => {
            this.physics.add.overlap(boat.sprite, rock, () => this.handleRockCrash(boat), null, this);
        });
        

        this.physics.add.collider(boat.sprite, this.player.sprite);

        return boat;
    }

    handleBoatCrash(boat, otherBoat) {
        if (boat.isDead || otherBoat.isDead) return;
        boat.isDead = true;
        otherBoat.isDead = true;
        this.reducePlayerLife();
        this.reducePlayerLife();
    }

    handleRockCrash(boat) {
        if (boat.isDead) return;
        boat.isDead = true;
        this.reducePlayerLife();
        this.vfx.shakeCamera(300, 0.006);
    }

    reducePlayerLife() {
        if (this.player.outOfLives) return;
        this.sounds.destroy.setVolume(1).setLoop(false).play();
        if (this.player.lives > 0) {
            this.player.lives -= 1;
            this.updateHUD();
        }
        if (this.player.lives === 0) {
            this.player.outOfLives = true;
            this.newGameOver(); // Call newGameOver when lives reach 0
        }
    }
    createHUD() {
        // Create heart images
        for (let i = 0; i < 5; i++) {
            let heart = this.add.image(30 + i * 40, 30, 'heart');
            heart.setScale(0.035); // Adjust scale as needed
            heart.setScrollFactor(0); // Keep hearts fixed on screen
            this.hearts.push(heart);
        }
    
        // Create score text using bitmap font
        this.scoreText = this.add.bitmapText(
            this.sys.game.config.width /2, // x position
            10, // y position
            'pixelfont', // key of the bitmap font (should match the key used in preload)
            `Score: ${this.player.score}`, // text to display
            20 // font size
        );
        this.scoreText.setScrollFactor(0);
        this.scoreText.setOrigin(0.5, 0); // Align right
    }
    createRestartScreen() {
        this.blackScreen = this.add.rectangle(0, 0, this.sys.game.config.width, this.sys.game.config.height, 0x000000, 0.5);
        this.blackScreen.setOrigin(0, 0);
        this.restartText = this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2, 'Press R to Restart', { fontSize: '32px', fill: '#fff' });
        this.restartText.setOrigin(0.5, 0.5);
        this.blackScreen.setVisible(false);
        this.restartText.setVisible(false);
    }

    toggleRestartScreen(visible) {
        this.blackScreen.setVisible(visible);
        this.restartText.setVisible(visible);
        this.pendingRestart = visible;
    }


    resetGame() {
        this.isResetting = true;
        this.isGameOver = false;
        this.isFirstClick = true;

        // Stop all ongoing activities
        if (this.boatSpawnEvent) {
            this.boatSpawnEvent.remove();
            this.boatSpawnEvent = null;
        }

        // Destroy all existing boats
        this.boats.forEach(boat => {
            if (boat.sprite && boat.sprite.body) {
                boat.sprite.body.enable = false;
            }
            if (boat.sprite) {
                boat.sprite.destroy();
            }
        });
        this.boats = [];

        // Reset player
        if (this.player && this.player.sprite) {
            this.player.sprite.setPosition(this.sys.game.config.width / 2, this.sys.game.config.height / 2);
            this.player.lives = 5;
            this.player.score = 0;
            this.player.outOfLives = false;
            this.player.isSinging = false;
            this.player.sprite.setVisible(false);
        }

        // Reset HUD
        this.updateHUD();

        // Hide game elements
        if (this.rocks) {
            this.rocks.forEach(rock => rock.setVisible(false));
        }
        if (this.hearts) {
            this.hearts.forEach(heart => heart.setVisible(false));
        }
        if (this.scoreText) {
            this.scoreText.setVisible(false);
        }

        // Show click to play text
        if (this.clickToPlayText) {
            this.clickToPlayText.setVisible(true).setAlpha(1);
        }

        // Schedule the creation of new game elements
        this.time.delayedCall(100, () => {
            this.createBoatSpawnEvent();
            this.spawnBoat();
            this.isResetting = false;
        });
    }
    

    update() {
        if (this.isResetting) return; // Skip update if the game is resetting
        

        if (this.player && !this.player.outOfLives) {
            this.updatePlayer();
            this.updateHUD();
            this.boats.forEach(boat => {
                if (boat && boat.sprite && boat.sprite.body) {
                    this.updateBoat(boat);
                }
            });
            this.cleanupDeadBoats();
        }
    }

    updatePlayer() {
        this.player.sprite.setVelocity(0);

        if (this.player.cursors.left.isDown || this.player.arrowKeys.left.isDown) {
            this.player.sprite.setVelocityX(-this.player.speed);
        } else if (this.player.cursors.right.isDown || this.player.arrowKeys.right.isDown) {
            this.player.sprite.setVelocityX(this.player.speed);
        }

        if (this.player.cursors.up.isDown || this.player.arrowKeys.up.isDown) {
            this.player.sprite.setVelocityY(-this.player.speed);
        } else if (this.player.cursors.down.isDown || this.player.arrowKeys.down.isDown) {
            this.player.sprite.setVelocityY(this.player.speed);
        }

        this.player.sprite.body.velocity.normalize().scale(this.player.speed);
        this.player.singingCircle.setPosition(this.player.sprite.x, this.player.sprite.y);

        if (this.player.cursors.sing.isDown && !this.player.isSinging) {
            this.player.isSinging = true;
            this.player.singingCircle.setVisible(true);
        } else if (!this.player.cursors.sing.isDown && this.player.isSinging) {
            this.player.isSinging = false;
            this.player.singingCircle.setVisible(false);
        }
    }

    updateBoat(boat) {


        if (!boat || !boat.sprite || !boat.sprite.body || boat.isDead) return;
        if (boat.isDead) return;
        this.checkBoatDistraction(boat);
        this.checkBoatEnterScreen(boat);
        this.checkBoatExitScreen(boat);

        if (boat.isDistracted) {
            boat.angle += boat.turnRate * boat.turnDirection;
        }

        boat.sprite.setVelocity(
            Math.cos(boat.angle) * boat.speed,
            Math.sin(boat.angle) * boat.speed
        );
    }

    checkBoatDistraction(boat) {
        if (boat.isDead) return;

        const distance = Phaser.Math.Distance.Between(
            boat.sprite.x,
            boat.sprite.y,
            this.player.sprite.x,
            this.player.sprite.y
        );

        const isInRange = distance <= this.player.singingRange / 2;

        if (isInRange && this.player.isSinging) {
            if (!boat.isDistracted) {
                boat.isDistracted = true;
                const targetAngle = Phaser.Math.Angle.Between(
                    boat.sprite.x,
                    boat.sprite.y,
                    this.player.sprite.x,
                    this.player.sprite.y
                );

                const deltaAngle = Phaser.Math.Angle.Wrap(targetAngle - boat.angle);
                boat.turnDirection = deltaAngle >= 0 ? 1 : -1;
            }
        } else {
            if (boat.isDistracted) {
                boat.isDistracted = false;
            }
        }
    }

    checkBoatEnterScreen(boat) {
        const halfWidth = boat.sprite.displayWidth / 2;
        const halfHeight = boat.sprite.displayHeight / 2;

        if (!boat.hasEnteredScreen) {
            if (boat.sprite.x > halfWidth && boat.sprite.x < this.sys.game.config.width - halfWidth &&
                boat.sprite.y > halfHeight && boat.sprite.y < this.sys.game.config.height - halfHeight) {
                boat.hasEnteredScreen = true;
            }
        }
    }

    checkBoatExitScreen(boat) {
        const halfWidth = boat.sprite.displayWidth / 2;
        const halfHeight = boat.sprite.displayHeight / 2;

        if (boat.hasEnteredScreen && !boat.hasExitedScreen) {
            if (boat.sprite.x < -halfWidth || boat.sprite.x > this.sys.game.config.width + halfWidth ||
                boat.sprite.y < -halfHeight || boat.sprite.y > this.sys.game.config.height + halfHeight) {
                boat.hasExitedScreen = true;
                boat.isDead = true;
                this.player.score += 1;
            }
        }
    }

    updateHUD() {
        // Update heart visibility based on lives
        for (let i = 0; i < this.hearts.length; i++) {
            this.hearts[i].setVisible(i < this.player.lives);
        }
        // Update score text
        this.scoreText.setText(`Score: ${this.player.score}`);
    }

    cleanupDeadBoats() {
        this.boats = this.boats.filter(boat => {
            if (boat.isDead) {
                boat.sprite.destroy();
                return false;
            }
            return true;
        });
    }

    resetScene() {


        this.player.lives = 5;
        this.updateHUD();
        this.boats.forEach(boat => boat.sprite.destroy());
        this.boats = [];

        if (this.boatSpawnEvent) {
            this.boatSpawnEvent.remove();
            this.boatSpawnEvent = null;
        }

        this.player.sprite.setPosition(this.sys.game.config.width / 2, this.sys.game.config.height / 2);
        this.player.lives = 5;
        this.player.score = 0;
        this.player.outOfLives = false;
        this.player.isSinging = false;

        this.createBoatSpawnEvent();
        this.spawnBoat();
    }
}

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
  pixelart: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    }
  },
  dataObject: {
    name: _CONFIG.title,
    description: _CONFIG.description,
    instructions: _CONFIG.instructions,
},
deviceOrientation: _CONFIG.deviceOrientation==="landscape"
};

