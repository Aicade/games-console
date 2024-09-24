class GameScene extends Phaser.Scene
{
    constructor ()
    {
        super();
        this.player;
        this.opponents = [];
        this.totalOpponents = 25; 
        this.staminaText;
        this.timeScale = 1.0; // Add a timeScale property
        this.isGamePaused = 2;
        this.highScore = 0 ;
        this.titleText;
        this.controlText;
    }

    preload ()
    {
                for (const key in _CONFIG.imageLoader) {
            this.load.image(key, _CONFIG.imageLoader[key]);
        }

        for (const key in _CONFIG.soundsLoader) {
            this.load.audio(key, [_CONFIG.soundsLoader[key]]);
        }
        // this.load.image('Title', `https://play.rosebud.ai/assets/Title.png.png?mNLc`);
        // this.load.image('BG', `https://play.rosebud.ai/assets/BG.png?9BRj`);
        this.load.image('jumpingSheep', `https://play.rosebud.ai/assets/Sheep.png.png?Dv5b`);
        // this.load.bitmapFont('star14', `https://play.rosebud.ai/assets/Starborn14.png.png?1VYt`, `https://play.rosebud.ai/assets/Starborn14.xml.xml?4rIK`);
        // this.load.bitmapFont('star18', `https://play.rosebud.ai/assets/Starborn18.png.png?ottP`, `https://play.rosebud.ai/assets/Starborn18.xml.xml?gj5z`);
        // this.load.audio('backgroundMusic', `https://play.rosebud.ai/assets/Boss Theme (Kirby's Adventure Style) - Kirby's Dream Land.mp3.mp3?4nBL`);
        // this.load.audio('eatingSound', `https://play.rosebud.ai/assets/munch-sound-effect.mp3.mp3?VCtm`);
        // this.load.audio('snoreSound', `https://play.rosebud.ai/assets/cartoon-snore-sound.mp3.mp3?y1NR`);

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.bitmapFont('pixelfont',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
    } 

    create ()
    {
        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.score = 0;
        this.level = 0;

                this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }
        this.sounds.background.setVolume(4).setLoop(true).play();

        //   this.bg = this.add.sprite(0, 0, 'background').setOrigin(0);
        // const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        // this.bg.setScale(scale)

        // this.scoreText = this.add.bitmapText(this.width / 2, 10, 'pixelfont', 'Score: 0', 35).setDepth(11).setTint(0xffa500).setOrigin(0.5, 0);
        // this.levelText = this.add.bitmapText(20, 20, 'pixelfont', 'Level: 0', 28).setDepth(11);
        // this.levelUpText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', 'LEVEL UP', 50).setOrigin(0.5, 0.5).setAlpha(0).setDepth(11);

        // Clear the opponents array
        this.opponents.splice(0, 20);



        const worldSize = 2048 / 1.5; 


        //  input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.image(worldSize * 2 - 60, 60, "pauseButton");
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(12);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.bg1 = this.add.tileSprite(512, 512, worldSize * 2, worldSize * 2, 'background').setScale(2, 2);
        this.bg1.setAlpha(0.2);
        this.bg1.setTilePosition(100, 100);

        this.bg2 = this.add.tileSprite(512, 512, worldSize * 2, worldSize * 2, 'background').setScale(2, 2);
        this.bg2.setAlpha(0.4);
        this.bg2.setTilePosition(200, 200);

        this.bg3 = this.add.tileSprite(512, 512, worldSize * 2, worldSize * 2, 'background').setScale(2, 2);
        this.bg3.setAlpha(0.6);
        this.bg3.setTilePosition(300, 300);

        const borderSize = 10;
        const borderColor = 0xff0000; 

        this.player = this.physics.add.sprite(Phaser.Math.Between(worldSize / 2 - 250, worldSize / 2 + 250), Phaser.Math.Between(worldSize / 2 - 250, worldSize / 2 + 250), 'player')
        .setScale(.05);
        this.player.setCollideWorldBounds(true);
        this.player.stamina = 100; 
        this.player.isSleeping = false;

        // Add a bitmap text object to display the player's scale
        this.player.scaleText = this.add.bitmapText(this.player.x, this.player.y - 20, 'pixelfont', '', 16);
        this.player.scaleText.setOrigin(0.5);

        // Set the depth of the text to a high value to ensure it's always on top
        this.player.scaleText.setDepth(10);

        // this.bubbleParticles = this.add.particles('bubble');

        // this.player.setTint(Phaser.Display.Color.RandomRGB().color);
        // this.titleImage = this.add.image(this.player.x, this.player.y-15, 'Title').setScale(0.2);
      
        this.cameras.main.setBounds(0, 0, worldSize, worldSize);
        this.physics.world.setBounds(0, 0, worldSize, worldSize);
        this.cameras.main.startFollow(this.player,0.1,0.1)
        this.cameras.main.setZoom(10);
        this.cameras.main.fadeIn(750);

        this.tweens.add({
            targets: this.cameras.main,
            zoom: { from: 10, to: 2 },
            duration: 500,
        });
      
        this.staminaText = this.add.text(10 , 10, ` `, { fontSize: '18px', fill: '#fff' }); 
        this.children.bringToTop(this.staminaText);

        // Add score property to the player
        this.player.score = 0;
        this.player.username = "Player";

        // Create the score text UI element
                // this.scoreText = this.add.bitmapText(this.width / 2, 10, 'pixelfont', 'Score: 0', 35).setDepth(11).setTint(0xffa500).setOrigin(0.5, 0);

        this.scoreText = this.add.text( 10, 300, ` `, { fontSize: '14px', fill: '#fff'});
        this.children.bringToTop(this.scoreText);
        this.scoreText.setAlign('right');

        this.staminaText = this.add.bitmapText(10 , 10, 'pixelfont', ` `, 14,1);
        this.mainText = this.add.bitmapText(this.width/2 , 10, 'pixelfont', ` `, 14,1).setDepth(11).setTint(0xffa500).setOrigin(0.5, 0);
        this.scoreText = this.add.bitmapText(10, 300, 'pixelfont', ` `, 8);

        // this.titleText = this.add.bitmapText(this.player.x - 140 , this.player.y - 130 , 'pixelfont', `a  Sleep.io  a`, 28,1);
        this.controlText = this.add.bitmapText(this.player.x - 120 , this.player.y + 75 , 'pixelfont', `a    Arrow Keys - MOVE    a\na    Space - SLEEP    a\n`, 12,1);

        // Listen for any key press
        this.input.keyboard.on('keydown', () => {
            // If the game is paused and any key is pressed, unpause the game
            this.isGamePaused += 1;
            if (this.isGamePaused === 3) {
                this.spawnOpponents();
                this.tweens.add({
                    targets: this.controlText,
                    alpha: { start: 1, to: 0 },
                    duration: 1000,
                });
                for (let i = 0; i < this.totalOpponents; i++) {
                    this.createOpponent();
                }
            }
        });


    }

    spawnOpponents() {
        const activeOpponents = this.opponents.filter(opponent => opponent.active).length;
        const spawnDelay = 5000 * (this.totalOpponents / (activeOpponents + 1)); // speed up spawning when fewer opponents

        this.time.addEvent({
            delay: spawnDelay,
            callback: this.createOpponent,
            callbackScope: this,
            loop: true
        });
    }

    createOpponent() {
        const worldSize = 2048 / 1.5; 
        let opponentX, opponentY;
        do {
            opponentX = Phaser.Math.Between(worldSize / 2 - 650, worldSize / 2 + 650);
            opponentY = Phaser.Math.Between(worldSize / 2 - 250, worldSize / 2 + 250);
        } while(Phaser.Math.Distance.Between(this.player.x, this.player.y, opponentX, opponentY) < 200);
        const opponent = this.physics.add.sprite(opponentX, opponentY, 'enemy');

        opponent.setCollideWorldBounds(true);
        opponent.stamina = 100; 
        opponent.isSleeping = false;
        opponent.sprintingFramesLeft = 0;  // Add a property to track the remaining sprinting frames
        const minScale = 0.05;  // Minimum scale for opponents
        const maxScale = this.player.scale * 0.9;  // Maximum scale is 90% of player's current scale
        opponent.scale = Phaser.Math.FloatBetween(minScale, maxScale);
        
        opponent.score = 0;
        opponent.username = `Guest${ Math.round(Math.random() * 1000) }`; // Assign a unique username for each opponent
        // opponent.setTint(Phaser.Display.Color.RandomRGB().color);

        // Add a bitmap text object to display the opponent's scale
        opponent.scaleText = this.add.bitmapText(0, 0, 'pixelfont', '', 4);
        opponent.scaleText.setOrigin(0.5);
        
        this.opponents.push(opponent);
        this.physics.add.overlap(this.player, opponent, this.eatOpponent, null, this);

        for (let i = 0; i < this.opponents.length - 1; i++) {
            this.physics.add.overlap(opponent, this.opponents[i], this.eatOpponent, null, this);
        }
    }

    update ()
    {

        this.bg1.tilePositionX += this.cameras.main.scrollX * 0.0002;
        this.bg1.tilePositionY -= this.cameras.main.scrollY * 0.0004;

        this.bg2.tilePositionX -= this.cameras.main.scrollX * 0.0005;
        this.bg2.tilePositionY += this.cameras.main.scrollY * 0.0004;

        this.bg3.tilePositionX -= this.cameras.main.scrollX * 0.0006;
        this.bg3.tilePositionY -= this.cameras.main.scrollY * 0.0003;

        // If the game is paused, don't execute the game logic
        if (this.isGamePaused < 3) {
            return;
        } 

        const worldSize = 2048 / 1.5; 

        if (!this.player.active) return;
        
        this.staminaText.setPosition(this.cameras.main.worldView.x + ( 10 * (0/this.cameras.main.zoom) ), this.cameras.main.worldView.y + ( 270 * (2.2/this.cameras.main.zoom) )).setScale(2/this.cameras.main.zoom);
        this.mainText.setPosition(this.cameras.main.worldView.x + ( 100 * (6/this.cameras.main.zoom) ) , this.cameras.main.worldView.y + ( 10 * (2/this.cameras.main.zoom) ) );
        this.scoreText.setPosition(this.cameras.main.worldView.x + 10, this.cameras.main.worldView.y - 120).setScale(2/this.cameras.main.zoom);

        this.mainText.setText(` Score : ${this.player.score}\n  Highscore : ${this.highScore}`);

        // this.scoreText.setText(`Score: ${this.player.score}`);
        // Get all scores, sort them in descending order, and take the top 5
        let scores = [{username: this.player.username, score: this.player.score}, ...this.opponents.map(opponent => ({username: opponent.username, score: opponent.score}))].sort((a, b) => b.score - a.score).slice(0, 5);
        this.scoreText.setText(`\n\n\n\n\n\n\n\n\nTop Players\n\n${scores.map(score => `${score.username}\n   ${score.score}`).join('\n\n')}`);
    
        const cursorKeys = this.input.keyboard.createCursorKeys();
        const speedUpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z) || this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        const sleepKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) || this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        let targetPlayerVelocityX = 0;
        let targetPlayerVelocityY = 0;
        let playerSizeFactor = Math.sqrt(this.player.scale / 3);  // Change to sqrt for less size influence
        let playerStaminaFactor = .2; 
        let isPlayerSprinting = false;
        let isOpponentSprinting = false;

        this.player.scaleText.x = this.player.x + this.player.body.velocity.x*0.2;
        this.player.scaleText.y = this.player.y + this.player.body.velocity.y*0.2;
        this.player.scaleText.setScale(this.player.scale*10);
        this.player.scaleText.text = `${Math.round(this.player.scale * 100) / 100}`;

        if (this.highScore < this.player.score) {
            this.highScore = this.player.score;
        }

        if (speedUpKey.isDown && this.player.stamina > 0 && !this.player.isSleeping) {
            playerStaminaFactor = .7; 
            isPlayerSprinting = true;
            this.player.rotation += (this.player.body.velocity.x > 0 ? 0.2 : -0.2);  // Decrease spinny effect
            this.player.stamina -= 0.75;
        }

        if (sleepKey.isDown) {
            if (this.player.scale > 0.02) {
                this.player.isSleeping = true;
                this.player.setScale(this.player.scale * 0.995);
                // this.startEmittingBubbles(this.player);

            } else {
                this.player.isSleeping = false;
                // this.stopEmittingBubbles(this.player);
            }
        } else if (!sleepKey.isDown && this.player.isSleeping) {
            this.player.isSleeping = false;
        }

        if (!this.player.isSleeping) {
            if (cursorKeys.up.isDown) targetPlayerVelocityY = -75 / playerSizeFactor * playerStaminaFactor;
            else if (cursorKeys.down.isDown) targetPlayerVelocityY = 75 / playerSizeFactor * playerStaminaFactor;
            if (cursorKeys.right.isDown) targetPlayerVelocityX = 75 / playerSizeFactor * playerStaminaFactor;
            else if (cursorKeys.left.isDown) targetPlayerVelocityX = -75 / playerSizeFactor * playerStaminaFactor;

            const cam = this.cameras.main;
            cam.setZoom( cam.zoom + ( (2 - cam.zoom) * 0.1 ) );

        } else {
            this.player.stamina += 3; 
            this.player.score += 3;

            const cam = this.cameras.main;
            cam.setZoom( cam.zoom + ( (2.5 - cam.zoom) * 0.1 ) );

        }

        this.player.setVelocityX(Phaser.Math.Linear(this.player.body.velocity.x, targetPlayerVelocityX, 0.1));
        this.player.setVelocityY(Phaser.Math.Linear(this.player.body.velocity.y, targetPlayerVelocityY, 0.1));

        if (this.player.body.velocity.x < 0) {
            this.player.setFlipY(true);
        } else if (this.player.body.velocity.x > 0) {
            this.player.setFlipY(false);
        }

        if (!isPlayerSprinting) {
            this.player.rotation = Phaser.Math.Angle.Between(0, 0, this.player.body.velocity.x, this.player.body.velocity.y);
        }

        this.opponents.forEach(opponent => {
            if (!opponent.active) return; 

            let targetOpponentVelocityX = opponent.body.velocity.x;
            let targetOpponentVelocityY = opponent.body.velocity.y;
            let opponentSizeFactor = Math.sqrt(opponent.scale / 3);  // Change to sqrt for less size influence
            let opponentStaminaFactor = .2; 

            let closestSprite = this.player;
            let closestSpriteDist = Phaser.Math.Distance.Between(opponent.x, opponent.y, this.player.x, this.player.y);
           
            opponent.scaleText.x = opponent.x + opponent.body.velocity.x*0.2;
            opponent.scaleText.y = opponent.y + opponent.body.velocity.y*0.2;
            opponent.scaleText.text = `${Math.round(opponent.scale * 100) / 100}`;
            opponent.scaleText.setScale(opponent.scale*50);

            this.opponents.forEach(otherOpponent => {
                if (otherOpponent === opponent || !otherOpponent.active) return;
                const dist = Phaser.Math.Distance.Between(opponent.x, opponent.y, otherOpponent.x, otherOpponent.y);
                if (dist < closestSpriteDist) {
                    closestSprite = otherOpponent;
                   closestSpriteDist = dist;
                }
            });

            if (opponent.isSleeping) {
                if (Math.random() > (opponent.scale/2)/0.95 || opponent.scale < 0.5) { // Only wake up when random number is very high
                    opponent.isSleeping = false;
                    // this.stopEmittingBubbles(opponent);
                }

                opponent.setScale(opponent.scale*0.995);
                opponent.stamina += 3;
                opponent.score += 4;

            } else {
                if (Math.random() > 0.99 && opponent.scale > 1) { // Only sleep when random number is high
                    opponent.isSleeping = true;
                    // this.startEmittingBubbles(opponent);
                    opponent.sprintingFramesLeft = 0;
                }
            }

            if ((closestSprite.scale <= opponent.scale || closestSprite.scale > opponent.scale && closestSpriteDist < 200) && opponent.stamina > 0 &&Math.random() > 0.7 && !opponent.isSleeping && opponent.sprintingFramesLeft <= 0) {  // Only start sprinting when not already sprinting
                opponentStaminaFactor = .15; 
                isOpponentSprinting = true;
                opponent.rotation += (opponent.body.velocity.x > 0 ? 0.2 : -0.2);  // Decrease spinny effect
                opponent.sprintingFramesLeft = Phaser.Math.Between(60, 240);  // Randomly assign a new sprinting duration
                opponent.stamina -= 1;
            }
            opponent.sprintingFramesLeft--;

            if (!opponent.isSleeping) {
                if (closestSprite.scale <= opponent.scale && Math.random() > 0.5) {
                    const angle = Phaser.Math.Angle.Between(opponent.x, opponent.y, closestSprite.x, closestSprite.y);
                    targetOpponentVelocityX = Math.cos(angle) * 75 / opponentSizeFactor * opponentStaminaFactor;
                    targetOpponentVelocityY = Math.sin(angle) * 75 / opponentSizeFactor * opponentStaminaFactor;
                } else if (closestSprite.scale > opponent.scale && closestSpriteDist < 200 && Math.random() > 0.5) {
                    const angle = Phaser.Math.Angle.Between(opponent.x, opponent.y, closestSprite.x, closestSprite.y) + Math.PI;
                    targetOpponentVelocityX = Math.cos(angle) * 75 / opponentSizeFactor * opponentStaminaFactor;
                    targetOpponentVelocityY = Math.sin(angle) * 75 / opponentSizeFactor * opponentStaminaFactor;
                } else {
                    if (Math.random() > 0.95) {
                        targetOpponentVelocityX = Phaser.Math.Between(-75, 75) / opponentSizeFactor * opponentStaminaFactor;
                        targetOpponentVelocityY = Phaser.Math.Between(-75, 75) / opponentSizeFactor * opponentStaminaFactor;
                    }
                }
            }

            if (!opponent.isSleeping) {
                opponent.setVelocityX(Phaser.Math.Linear(opponent.body.velocity.x, targetOpponentVelocityX, 0.05));
                opponent.setVelocityY(Phaser.Math.Linear(opponent.body.velocity.y, targetOpponentVelocityY, 0.05));
            }

            if (opponent.body.velocity.x < 0) {
                opponent.setFlipY(true);
            } else if (opponent.body.velocity.x > 0) {
                opponent.setFlipY(false);
            }

            if (!isOpponentSprinting) {
                opponent.rotation = Phaser.Math.Angle.Between(0, 0, opponent.body.velocity.x, opponent.body.velocity.y);
            }
        });
    }

    eatOpponent(larger, smaller) {
        if (larger.scale < smaller.scale) {
            [larger, smaller] = [smaller, larger];
        } else if (larger.scale === smaller.scale) {
            if (Math.random() < 0.5 ) {
                [larger, smaller] = [smaller, larger];
            }
        }

        if (smaller === this.player) {
            // this.backgroundMusic.stop();
            this.scene.restart();
            this.isGamePaused = 0;
        }

        if (larger === this.player) {
            this.player.score += 10 + smaller.score;
            // this.sound.play('eatingSound');
            if (smaller.isSleeping) {
                this.player.score += 10 + smaller.score;
            }
        } else {
            if (smaller != this.player) {
                larger.score += 10 + smaller.score;
                if (smaller.isSleeping) {
                    larger.score += 10 + smaller.score;
                larger.setScale(larger.scale + 0.1);
                }
            }
        }

        const sizeIncrease = smaller.scale * 0.2;
        const sizeLimit = 5;
        // this.stopEmittingBubbles(smaller);

        // Remove the opponent from the opponents array
        const index = this.opponents.indexOf(smaller);
        if (index > -1) {
            this.opponents.splice(index, 1);
        }

        smaller.scaleText.destroy();
        smaller.destroy();
        let newSize = larger.scale + sizeIncrease;
        if (newSize > sizeLimit) {
            newSize = sizeLimit;
        }
        larger.setScale(newSize);
        this.createOpponent();

    }

    updateScoreText() {
        this.scoreText.setText(`Score: ${this.score}`);
    }

    gameOver() {
        this.enemyTimer.destroy();
        initiateGameOver.bind(this)({
            score: this.score
        })
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
