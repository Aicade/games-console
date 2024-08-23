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


/*--------------GLOBAL CODE STARTS HERE----------------------*/

//Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.sounds={};
        this.player = null;
        this.platforms = null;
        this.cursors = null;
        this.nailWall = null;
        this.score = 0;
        this.scoreText = null;
        this.backgroundSpeed = 0.8;
        this.lastPlatformY = 0;
        this.playerOnPlatform = null;
        this.gameIsOver = false;
    }

    preload() {
        gameScenePreload(this);
        displayProgressLoader.call(this);

        addEventListenersPhaser.bind(this)();
      }

    create() {
        this.background = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'background').setOrigin(0, 0);
        

        //vfx calling
        this.vfx = new VFXLibrary(this);


        this.nailWall = this.physics.add.staticGroup();
        for (let i = 0; i < 36; i++) {
            let nail = this.nailWall.create(i * 40, 20, 'avoidable').setScale(0.12);
            nail.body.setSize(nail.width, nail.height);
            //vfx to nails 
            this.vfx.addShine(nail, 50000000000, .2);
            this.vfx.scaleGameObject(nail,.5,1000);
        }
        // Adding input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.platforms = this.physics.add.group();

        this.player = this.physics.add.sprite(400, 300, 'player').setScale(0.12);

        //adding trail effect    
        this.trail = this.add.particles(0, 40, 'bubbles', {
            speed: 200,
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 600,
            angle: { min: -40, max: -10 },
            emitZone: { type: 'edge', source: new Phaser.Geom.Line(-10, -10, 10, 10), quantity: .2, yoyo: false }
        });
        this.trail.startFollow(this.player);

        this.vfx.scaleGameObject(this.player,1.1,500);
        this.player.setCollideWorldBounds(true);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.scoreText = this.add.bitmapText(12, 40, 'pixelfont', 'Score: 0', 32);
        this.createPlatform(400, 500);

        this.time.addEvent({
            delay: 1000,
            callback: this.createPlatformSequence,
            callbackScope: this,
            loop: true
        });

        this.time.addEvent({
            delay: 1000,
            callback: this.updateScore,
            callbackScope: this,
            loop: true
        });

        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }
        this.sound.play('background');
    }

    update() {
        this.background.tilePositionY -= this.backgroundSpeed;

        const acceleration = 10;
        const maxSpeed = 170;
        const friction = 0.95;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(Math.max(this.player.body.velocity.x - acceleration, -maxSpeed));
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(Math.min(this.player.body.velocity.x + acceleration, maxSpeed));
        } else {
            this.player.setVelocityX(this.player.body.velocity.x * friction);
        }

        // if (this.cursors.up.isDown && this.playerOnPlatform) {
        //     this.player.setVelocityY(-330);
        //     this.playerOnPlatform = null;
        // }
        
        //Gravitywork from here
        if (!this.playerOnPlatform) {
            this.player.setVelocityY(this.player.body.velocity.y + 1.8);
        } else {
            this.player.y = this.playerOnPlatform.y - this.playerOnPlatform.displayHeight / 2 - this.player.displayHeight / 2;
            this.player.setVelocityY(this.playerOnPlatform.body.velocity.y);
        }

        this.platforms.children.entries.forEach(platform => {
            platform.y -= this.backgroundSpeed;
            platform.body.setVelocityY(-this.backgroundSpeed * 60);

            if (platform.y < -100) {
                platform.destroy();
            }

            if (this.player.y <= platform.y - platform.displayHeight / 2 &&
                this.player.y >= platform.y - platform.displayHeight / 2 - this.player.displayHeight &&
                this.player.x >= platform.x - platform.displayWidth / 2 &&
                this.player.x <= platform.x + platform.displayWidth / 2) {
                this.playerOnPlatform = platform;
            }
        });

        if (this.playerOnPlatform &&
            (this.player.x < this.playerOnPlatform.x - this.playerOnPlatform.displayWidth / 2 ||
             this.player.x > this.playerOnPlatform.x + this.playerOnPlatform.displayWidth / 2)) {
            this.playerOnPlatform = null;
        }

        if (this.player.y > this.cameras.main.height *0.94) {
            this.vfx.shakeCamera();
            this.time.delayedCall(1000, this.gameOver, [], this);
            // this.gameOver();
        }

        this.nailWall.getChildren().forEach(nail => {
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, nail.x, nail.y);
            
            if (distance < 50) {
                this.vfx.shakeCamera();
                this.time.delayedCall(1000, this.gameOver, [], this);
                // this.gameOver();
            }
        });
        
    }

    createPlatform(x, y) {
        const platform = this.physics.add.sprite(x, y, 'platform');
        platform.displayWidth=150;
        platform.displayHeight=15;
        platform.refreshBody();
        platform.setImmovable(true);
        platform.body.allowGravity = false;
        this.platforms.add(platform);
        return platform;
    }

    createPlatformSequence() {
        const minGap = 80;
        const maxGap = 120;
        const minX = this.cameras.main.width * 0.1; // 10% of screen width
        const maxX = this.cameras.main.width * 0.9; // 90% of screen width
        const platformWidth = this.textures.get('platform').getSourceImage().width; // Assuming scale is 3
    
        const platformCount = Phaser.Math.Between(3,4);
    
        for (let i = 0; i < platformCount; i++) {
            const gap = Phaser.Math.Between(minGap, maxGap);
            this.lastPlatformY += gap;
    
            // Ensure the platform doesn't go off-screen
            const x = Phaser.Math.Clamp(
                Phaser.Math.Between(minX, maxX),
                platformWidth / 5,
                this.cameras.main.width - platformWidth / 5
            );
    
            this.createPlatform(x, this.cameras.main.height + this.lastPlatformY);
        }
    }

    updateScore() {
        if (!this.gameIsOver) {
            this.score += 1;
            this.scoreText.setText(`Score: ${this.score}`);
        }
    }
    
    // GameOver 
    gameOver() {
        
        initiateGameOver.bind(this)({ score: this.score });
        
    }
    //SpikeFlight
    pauseGame() {
        handlePauseGame.bind(this)();
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
    deviceOrientation: _CONFIG.deviceOrientation
};

function createGame() {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.height = '100vh';
    document.body.style.backgroundColor = '#000000';
    document.body.style.overflow = 'hidden';

    const gameContainer = document.createElement('div');
    gameContainer.style.display = 'flex';
    gameContainer.style.justifyContent = 'center';
    gameContainer.style.alignItems = 'center';
    gameContainer.style.height = '100%';
    gameContainer.style.width = '100%';
    document.body.appendChild(gameContainer);

    config.scale.parent = gameContainer;

    new Phaser.Game(config);
}
function gameScenePreload(game) {
    // Load In-Game Assets from assetsLoader
    for (const key in _CONFIG.imageLoader) {
      game.load.image(key, _CONFIG.imageLoader[key]);
    }
  
    for (const key in _CONFIG.soundsLoader) {
      game.load.audio(key, [_CONFIG.soundsLoader[key]]);
    }
  
  
    game.load.bitmapFont('pixelfont',
      'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
      'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
    game.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
  }

window.onload = createGame;