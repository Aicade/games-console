<<<<<<< HEAD
=======
// let assetsLoader = {

//     "player": "player",
//     "key":"key",
//     "exit": "exit",
//     "circleSpike":"circleSpike",
//     "tiles":"tiles"
// };
// let soundsLoader = {
//     "background": "background",
//     'upgrade': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/upgrade_2.mp3',
//     'stretch': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/stretch.mp3',
//     'shoot': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_3.mp3',
//     'collect': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3',
// };

// const title = `Missonman`
// const description = `cross all level.`
// const instructions =
//     `Instructions:
//   1. Click, hold, and drag to aim.
//   2. Release to shoot.
//   3. Destroy all obstacles.
//   4. You have 3 lives.`;

// const orientationSizes = {
//     "landscape": {
//         "width": 1440,
//         "height": 960,
//     },
//     "portrait": {
//         "width": 960,
//         "height": 1440,
//     }
// }
// const orientation = "landscape";

>>>>>>> 2dc3652 (New Games and updates)
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
        this.player = null;
        this.currentMap = null;
        this.groundLayer = null;
        this.wallsLayer = null;
        this.exit = null;
        this.key = null;
        this.collider = null;
        this.levels = ['level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8'];
        this.currentLevelIndex = 0;
        this.circleSpikes = [];
        this.circleSpikeRotationRate = 0.005;
        this.gameOverText = null;
        this.hasKey = false;
        this.isLevelTransitioning = false;
        this.isGameOver = false;
        this.playerIsDead = false;
        this.isResetting = false;
        this.startTime = null;
        this.sound={};
        this.startButton=null;
        this.isGameStarted = false;

        // Player-specific properties
        this.cursors = null;
        this.wasd = null;
        this.jumpKeys = null;
        this.isWallJumping = false;
        this.isJumping = false;
        this.moveSpeed = 700;
        this.jumpSpeed = 700;
        this.wallJumpSpeed = 700;
        this.jumpHeight = 130;
        this.initialJumpY = 0;
        this.canResetJumpFlags = true;
        this.minJumpVelocity = -400;
        this.maxJumpVelocity = -700;
        this.minWallJumpVelocityX = 400;
        this.maxWallJumpVelocityX = 700;
        this.jumpHoldDuration = 275;
        this.jumpTimer = 0;
        this.isJumpKeyHeld = false;
        this.wallJumpDirection = 0;
    }

    preload() {
        for (const key in _CONFIG.imageLoader) {
            this.load.image(key, _CONFIG.imageLoader[key]);
          }
      
          for (const key in _CONFIG.soundsLoader) {
            this.load.audio(key, [_CONFIG.soundsLoader[key]]);
          }
<<<<<<< HEAD
          this.load.bitmapFont('pixelfont','https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png','https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
          this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
=======
            // this.add.image( 'key','key');
            // this.add.image('exit','exit');
            // this.add.image('tiles','tiles');
            // this.add.image('circleSpike','circleSpike');
      
          //this.load.image('heart', 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png');
          this.load.bitmapFont('pixelfont','https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png','https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
          this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");


        // this.load.image('tiles');
        // const levelUrls = [
        //     'https://play.rosebud.ai/assets/level1.json?qvJh',
        //     'https://play.rosebud.ai/assets/level2.json?000p',
        //     'https://play.rosebud.ai/assets/level3.json?CZ3i',
        //     'https://play.rosebud.ai/assets/level4.json?JjD4',
        //     'https://play.rosebud.ai/assets/level5.json?pi9Y',
        //     'https://play.rosebud.ai/assets/level6.json?YnUS',
        //     'https://play.rosebud.ai/assets/level7.json?CjrQ',
        //     'https://play.rosebud.ai/assets/level8.json?T2Dd'
        // ];
        // this.levels.forEach((level, index) => {
        //     this.load.tilemapTiledJSON(level, levelUrls[index]);
        // });
        // this.load.audio('backgroundMusic', 'https://play.rosebud.ai/assets/Compressed_Juhani Junkala [Retro Game Music Pack] Level 3.wav?DtpX');
>>>>>>> 2dc3652 (New Games and updates)
        
        displayProgressLoader.call(this);
        addEventListenersPhaser.bind(this)();
    }
<<<<<<< HEAD
    dummypreload() {
=======
    loadAssets() {
>>>>>>> 2dc3652 (New Games and updates)
        this.load.image('tiles', 'assets/marble.jpg');
        const levelUrls = [
            'https://play.rosebud.ai/assets/level1.json?qvJh',
            'https://play.rosebud.ai/assets/level2.json?000p',
            'https://play.rosebud.ai/assets/level3.json?CZ3i',
            'https://play.rosebud.ai/assets/level4.json?JjD4',
            'https://play.rosebud.ai/assets/level5.json?pi9Y',
            'https://play.rosebud.ai/assets/level6.json?YnUS',
            'https://play.rosebud.ai/assets/level7.json?CjrQ',
            'https://play.rosebud.ai/assets/level8.json?T2Dd'
        ];
        this.levels.forEach((level, index) => {
            this.load.tilemapTiledJSON(level, levelUrls[index]);
        });
        
    }

    create() {
<<<<<<< HEAD
        this.dummypreload();

=======
        this.loadAssets();
        // this.cameras.main.setZoom(0.8); // Adjust this value to fit your needs
        // this.cameras.main.setBounds(0, 0, this.currentMap.widthInPixels, this.currentMap.heightInPixels);
        // this.cameras.main.startFollow(this.player, true, 0.05, 0.05);


        
>>>>>>> 2dc3652 (New Games and updates)
        //vfx calling
        this.vfx = new VFXLibrary(this);
         
        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5});
        }
        this.bgMusic = this.sound.add('background', { loop: true }).setVolume(3);
<<<<<<< HEAD
        this.bgMusic.play();
=======
    this.bgMusic.play();
>>>>>>> 2dc3652 (New Games and updates)
        //score  
        this.scoreText = this.add.bitmapText(this.width / 2, 20, 'pixelfont', 'Score: 0', 28).setDepth(11).setTint(0xffa500);

        

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
        this.pauseButton.on('pointerdown', () => this.pauseGame());


        this.load.on('complete', () => {
            this.createStartButton();
        });
        this.load.start();
    }
    

    createStartButton() {
        const button = document.createElement('button');
        button.innerText = 'PLAY';
        button.style.position = 'absolute';
        button.style.top = '12%';
        button.style.left = '50%';
        button.style.transform = 'translate(-50%, -50%)';
        button.style.padding = '10px 20px';
        button.style.fontSize = '16px';
        button.style.color = '#fff';
        button.style.backgroundColor = '#000';
        button.style.border = 'none';
        button.style.borderRadius = '10px';
        button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        button.style.cursor = 'pointer';
        button.style.fontWeight = 'bold';
        button.style.transition = 'all 0.2s ease';
        button.onmouseover = () => {
            button.style.backgroundColor = '#333';
            button.style.transform = 'translate(-50%, -50%) translateY(-2px)';
        };
        button.onmouseout = () => {
            button.style.backgroundColor = '#000';
            button.style.transform = 'translate(-50%, -50%) translateY(0)';
        };
        button.onmousedown = () => {
            button.style.transform = 'translate(-50%, -50%) translateY(4px)';
        };
        button.onmouseup = () => {
            button.style.transform = 'translate(-50%, -50%) translateY(-2px)';
        };
        button.onclick = () => {
            button.disabled = true;
            button.style.visibility = 'hidden';
            this.startTime = new Date();
            this.startGame();
        };
        document.body.appendChild(button);
    }

    startGame() {
        if (this.startButton) {
            this.startButton.style.display = 'none';
            document.body.removeChild(this.startButton); // Properly remove the button from the DOM
            this.startButton = null; // Clear the reference
        }
        
        this.createUI();
        this.createLevel();
        this.backgroundMusic = this.sound.add('backgroundMusic', {
            volume: 0.05,
            loop: true
        });
        this.backgroundMusic.play();

        // Ensure that the game is running
        this.scene.resume();
    }
    update(time, delta) {
        if (this.isGameOver || this.isLevelTransitioning || this.isResetting) {
            return;
        }
        if (this.player) {
            this.checkPlayerDeath();
            if (!this.playerIsDead) {
                this.updatePlayer(time, delta);
                if (this.key && !this.hasKey && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.key.getBounds())) {
                    this.collectKey();
                }
                if (this.exit && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.exit.getBounds())) {
                    this.tryCompleteLevel();
                }
                this.checkCircleSpikeCollision();
            }
        }
        this.rotateCircleSpikes(delta);
    }

    updatePlayer(time, delta) {
        if (!this.isWallJumping) {
            if (this.cursors.left.isDown || this.wasd.A.isDown) {
                this.player.setVelocityX(-this.moveSpeed);
                this.player.flipX = true;
            } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
                this.player.setVelocityX(this.moveSpeed);
                this.player.flipX = false;
            } else {
                this.player.setVelocityX(0);
            }

            if (this.jumpKeys.some(key => Phaser.Input.Keyboard.JustDown(key))) {
                this.jump();
            }
        }

        if (this.isJumping || this.isWallJumping) {
            if (this.jumpKeys.some(key => key.isDown)) {
                this.isJumpKeyHeld = true;
                this.jumpTimer += delta;
                const jumpProgress = Math.min(this.jumpTimer / this.jumpHoldDuration, 1);
                const currentJumpVelocity = Phaser.Math.Linear(this.minJumpVelocity, this.maxJumpVelocity, jumpProgress);
                this.player.setVelocityY(currentJumpVelocity);

                if (this.isWallJumping) {
                    const currentWallJumpVelocityX = Phaser.Math.Linear(this.minWallJumpVelocityX, this.maxWallJumpVelocityX, jumpProgress);
                    this.player.setVelocityX(currentWallJumpVelocityX * this.wallJumpDirection);
                }

                if (this.jumpTimer > this.jumpHoldDuration) {
                    this.stopJump();
                }
            } else {
                this.stopJump();
            }
        }

        if (this.player.body.onFloor() && this.canResetJumpFlags) {
            this.isJumping = false;
            this.isWallJumping = false;
            this.jumpTimer = 0;
            this.isJumpKeyHeld = false;
            this.wallJumpDirection = 0;
        }

        if (this.player.body.velocity.y > 800) {
            this.player.setVelocityY(800);
        }
    }

    createPlayer(x, y) {
        this.player = this.physics.add.sprite(x, y, 'player');
        this.player.setScale(0.22);
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(1500);
        this.player.body.setDragX(500);
        this.player.body.setMaxVelocity(600, 800);

        // Apply VFX to the player
        this.vfx.scaleGameObject(this.player, 0.9, 1000);
        

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.jumpKeys = [
            this.cursors.up,
            this.wasd.W,
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        ];
    }

    createUI() {}

    createLevel() {
        if (this.currentMap) {
            this.clearLevel();
        }
        this.hasKey = false;
        this.playerIsDead = false;
        this.isResetting = false;
        this.currentMap = this.make.tilemap({
            key: this.levels[this.currentLevelIndex]
        });
        const tileset = this.currentMap.addTilesetImage('marble_packed_32', 'tiles');
        this.groundLayer = this.currentMap.createLayer('ground', tileset, 0, 0);
        this.groundLayer.setCollisionByExclusion([-1, 0]);
        if (this.currentMap.getLayer('walls')) {
            this.wallsLayer = this.currentMap.createLayer('walls', tileset, 0, 0);
            this.wallsLayer.setCollisionByExclusion([-1, 0]);
        }
        const exitLayer = this.currentMap.getObjectLayer('exit');
        if (exitLayer && exitLayer.objects && exitLayer.objects.length > 0) {
            const exitObject = exitLayer.objects[0];
            this.exit = this.add.sprite(exitObject.x, exitObject.y, 'exit');
            this.exit.setOrigin(0, 0);
            this.exit.setDepth(-1)
            this.exit.setDisplaySize(exitObject.width * 1.5, exitObject.height * 1.5);
        }
        const keyLayer = this.currentMap.getObjectLayer('key');
        if (keyLayer && keyLayer.objects && keyLayer.objects.length > 0) {
            const keyObject = keyLayer.objects[0];
            this.key = this.add.sprite(keyObject.x, keyObject.y, 'key');
            this.key.setOrigin(0, 0);
            const scaleFactor = 1.5;
            this.key.setDisplaySize(
                keyObject.width * scaleFactor, 
                keyObject.height * scaleFactor
            );
        }
        const playerLayer = this.currentMap.getObjectLayer('player');
        if (playerLayer && playerLayer.objects && playerLayer.objects.length > 0) {
            const playerObject = playerLayer.objects[0];
            this.createPlayer(playerObject.x, playerObject.y);
        } else {
            return;
        }
        this.createCircleSpikes();
<<<<<<< HEAD
        
=======
>>>>>>> 2dc3652 (New Games and updates)
        if (this.player) {
            this.collider = this.physics.add.collider(this.player, this.groundLayer);
            if (this.wallsLayer) {
                this.physics.add.collider(this.player, this.wallsLayer);
            }
        }
        this.isLevelTransitioning = false;
    }

    createCircleSpikes() {
        const circleSpikeLayer = this.currentMap.getObjectLayer('circleSpikes');
        if (circleSpikeLayer && circleSpikeLayer.objects) {
            circleSpikeLayer.objects.forEach(spikeObj => {
                const spike = this.createCircleSpike(spikeObj.x, spikeObj.y);
                this.circleSpikes.push(spike);
            });
        }
    }
<<<<<<< HEAD
    
=======
>>>>>>> 2dc3652 (New Games and updates)

    checkCircleSpikeCollision() {
        if (this.player && this.circleSpikes.length > 0) {
            const playerRect = this.player.getBounds();
            this.circleSpikes.forEach(circleSpike => {
                const circleSpikeCenter = circleSpike.getCenter();
                if (Phaser.Geom.Intersects.CircleToRectangle(
                        new Phaser.Geom.Circle(circleSpikeCenter.x, circleSpikeCenter.y, circleSpike.radius),
                        playerRect
                    )) {
                    this.onPlayerHitCircleSpike(this.player, circleSpike);
                }
            });
        }
    }

    onPlayerHitCircleSpike(player, circleSpike) {
        console.log('Player hit circle spike!');
        this.killPlayer();
    }

    killPlayer() {
        if (!this.playerIsDead) {
            this.playerIsDead = true;
            this.player.setVelocity(0, 0);
            this.player.body.setAllowGravity(false);
            this.isResetting = true;
            this.clearLevel();
            this.time.delayedCall(500, () => {
                this.createLevel();
            }, [], this);
        }
    }

    createCircleSpike(x, y, scale = 1) {
        const circleSpike = this.physics.add.image(x, y, 'circleSpike');
<<<<<<< HEAD
        circleSpike.setScale(0.5);
=======
        circleSpike.setScale(scale);
>>>>>>> 2dc3652 (New Games and updates)
        circleSpike.setImmovable(true);
        circleSpike.radius = circleSpike.displayWidth / 2;
        return circleSpike;
    }

    rotateCircleSpikes(delta) {
        this.circleSpikes.forEach(spike => {
            spike.rotation += this.circleSpikeRotationRate * delta;
        });
    }

    clearLevel() {
        if (this.collider) {
            this.collider.destroy();
            this.collider = null;
        }
        if (this.groundLayer) {
            this.groundLayer.destroy();
            this.groundLayer = null;
        }
        if (this.wallsLayer) {
            this.wallsLayer.destroy();
            this.wallsLayer = null;
        }
        if (this.exit) {
            this.exit.destroy();
            this.exit = null;
        }
        if (this.key) {
            this.key.destroy();
            this.key = null;
        }
        if (this.currentMap) {
            this.currentMap.destroy();
            this.currentMap = null;
        }
        if (this.gameOverText) {
            this.gameOverText.destroy();
            this.gameOverText = null;
        }
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
        this.circleSpikes.forEach(spike => spike.destroy());
        this.circleSpikes = [];
    }

    collectKey() {
        this.hasKey = true;
        this.key.setVisible(false);
        this.sound.play('collect');

    }

    tryCompleteLevel() {
        if (this.hasKey && !this.isLevelTransitioning) {
            this.isLevelTransitioning = true;
            this.time.delayedCall(100, () => {
                this.completeLevel();
            });
        }
    }

    completeLevel() {
        this.clearLevel();
        this.currentLevelIndex++;

        if (this.currentLevelIndex < this.levels.length) {
            this.time.delayedCall(500, () => {
                this.createLevel();
            }, [], this);
        } else {
            const endTime = new Date();
            const elapsedTime = endTime - this.startTime;
            this.gameOver(elapsedTime);
        }
    }

    gameOverone(elapsedTime) {
        this.isGameOver = true;
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        const timeString = `${minutes} min ${seconds} sec`;
        if (this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }

        this.gameOverText = this.load.bitmapFont(this.sys.game.config.width / 2, this.sys.game.config.height / 2, `Congratulations, you completed all the levels!\nTime: ${timeString}`, {
            fontSize: '48px',
            fill: '#fff',
            align: 'center',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        });
        this.gameOverText.setOrigin(0.5);

        this.createPlayAgainButton()
        // initiateGameOver.bind(this)({ score: this.score });
    }
    gameOver() {
        initiateGameOver.bind(this)({ score: this.score });
        if (this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }
    }
    pauseGame() {
        handlePauseGame.bind(this)();
    }

    

    createPlayAgainButton() {
        const button = document.createElement('button');
        button.innerText = 'PLAY AGAIN';
        button.style.position = 'absolute';
        button.style.top = '70%';
        button.style.left = '50%';
        button.style.transform = 'translate(-50%, -50%)';
        button.style.padding = '20px 40px';
        button.style.fontSize = '24px';
        button.style.color = '#fff';
        button.style.backgroundColor = '#000';
        button.style.border = 'none';
        button.style.borderRadius = '10px';
        button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        button.style.cursor = 'pointer';
        button.style.fontWeight = 'bold';
        button.style.transition = 'all 0.2s ease';
        button.onmouseover = () => {
            button.style.backgroundColor = '#333';
            button.style.transform = 'translate(-50%, -50%) translateY(-2px)';
        };
        button.onmouseout = () => {
            button.style.backgroundColor = '#000';
            button.style.transform = 'translate(-50%, -50%) translateY(0)';
        };
        button.onmousedown = () => {
            button.style.transform = 'translate(-50%, -50%) translateY(4px)';
        };
        button.onmouseup = () => {
            button.style.transform = 'translate(-50%, -50%) translateY(-2px)';
        };
        button.onclick = () => {
            button.style.display = 'none';
            this.resetGame();
        };
        document.body.appendChild(button);
    }

    resetGame() {
        this.isGameOver = false;
        this.gameOverText.destroy()
        this.currentLevelIndex = 0;
        this.startTime = new Date();
        this.createLevel();
<<<<<<< HEAD
       
=======
        //this.bgMusic.play()
        //this.bgMusic.stop();
        
        //this.backgroundMusic.play()
>>>>>>> 2dc3652 (New Games and updates)
    }

    checkPlayerDeath() {
        if (this.player && this.player.y > this.sys.game.config.height && !this.playerIsDead) {
            this.playerIsDead = true;
            this.player.setVelocity(0, 0);
            this.player.body.setAllowGravity(false);

            this.isResetting = true;
            this.clearLevel();

            this.time.delayedCall(1000, () => {
                this.createLevel();
            }, [], this);
        }
    }

    jump() {
        if (!this.isJumping && !this.isWallJumping) {
            if (this.player.body.onFloor()) {
                this.normalJump();
            } else {
                this.tryWallJump();
            }
        }
    }

    normalJump() {
        this.isJumping = true;
        this.initialJumpY = this.player.y;
        this.player.setVelocityY(this.minJumpVelocity);
        this.preventJumpFlagReset();
        this.jumpTimer = 0;
        this.isJumpKeyHeld = true;
    }

    tryWallJump() {
        const touchingLeft = this.player.body.blocked.left;
        const touchingRight = this.player.body.blocked.right;
        const canWallJump = touchingLeft || touchingRight;

        if (canWallJump) {
            this.isWallJumping = true;
            this.initialJumpY = this.player.y;
            console.log(`[Wall Jump] Started at y: ${this.player.y}, initialJumpY: ${this.initialJumpY}`);

            this.wallJumpDirection = touchingLeft ? 1 : -1;
            this.player.setVelocityX(this.minWallJumpVelocityX * this.wallJumpDirection);
            this.player.setVelocityY(this.minJumpVelocity);

            this.preventJumpFlagReset();
            this.jumpTimer = 0;
            this.isJumpKeyHeld = true;
        }
    }

    stopJump() {
        if (this.player.body.velocity.y < 0) {
            this.player.setVelocityY(0);
        }
        this.isJumping = false;
        this.isWallJumping = false;
        this.isJumpKeyHeld = false;
        console.log(`[Stop Jump] Velocity set to 0, stopping jump`);
    }

    preventJumpFlagReset() {
        this.canResetJumpFlags = false;
        this.time.delayedCall(150, () => {
            this.canResetJumpFlags = true;
        });
    }
}

<<<<<<< HEAD


const config = {
    type: Phaser.AUTO,
    width: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].width,
    height: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].height,
=======
// const container = document.getElementById('renderDiv');

// // Add these lines to set the container size
// container.style.maxWidth = '1024px';  // Adjust this value as needed
// container.style.maxHeight = '768px';  // Adjust this value as needed
// container.style.margin = '0 auto';
// container.style.position = 'relative';

const config = {
    type: Phaser.AUTO,
    width: _CONFIG.OrientationSizes[_CONFIG.deviceOrientation].width,
    height: _CONFIG.OrientationSizes[_CONFIG.deviceOrientation].height,
>>>>>>> 2dc3652 (New Games and updates)
    scene: [GameScene],  
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      orientation: Phaser.Scale.Orientation.LANDSCAPE
    },
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: {
<<<<<<< HEAD
        gravity: { y: 0 },  
=======
        gravity: { y: 1500 },  // Note: This is different from the original gravity setting
>>>>>>> 2dc3652 (New Games and updates)
        debug: false,
      },
    },
    dataObject: {
        name: _CONFIG.title,
        description: _CONFIG.description,
        instructions: _CONFIG.instructions,
    },
<<<<<<< HEAD
    deviceOrientation: _CONFIG.deviceOrientation==="landscape"
};
=======
    orientation: _CONFIG.deviceOrientation==="landscape"
};
  
// Replace the existing game instance with the new configuration
// if (window.phaserGame) {
//     window.phaserGame.destroy(true);
// }
// window.phaserGame = new Phaser.Game(_CONFIG);
>>>>>>> 2dc3652 (New Games and updates)
