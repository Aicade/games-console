
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        displayProgressLoader.call(this);
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
  
    }

    create() {
        this.playerTurn = true;
        this.playerScore = 0;
        this.enemyScore = 0;
        this.isBallMoving = false;

        this.vfx = new VFXLibrary(this);

        this.sounds = {};
        for (const key in _CONFIG.soundsLoader) {
        this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale);

        this.powerUpMessage = this.add.bitmapText(2* this.width / 4, 65, 'pixelfont', '', 35).setOrigin(0.5).setTint(0xff7575).setAlpha(0);

        this.playerScoreText = this.add.bitmapText(this.width / 4, 25, 'pixelfont', '0', 35).setOrigin(0.5).setTint(0xff7575);
        this.enemyScoreText = this.add.bitmapText((3 * this.width) / 4, 25, 'pixelfont', '0', 35).setOrigin(0.5).setTint(0x7575ff);

        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.sounds.background.setVolume(2.5).setLoop(true).play();

        this.player = this.physics.add.image(250, this.height / 2, 'player').setScale(0.1).setCollideWorldBounds(true);
        this.enemy = this.physics.add.image(this.width - 250, this.height / 2, 'defender').setScale(0.15).setCollideWorldBounds(true);
        this.ball = this.physics.add.image(250, this.height / 2, 'ball').setScale(0.05).setCollideWorldBounds(true);

        this.playerGoal = this.add.rectangle(200, this.height / 2, 10, this.height/2, 0.5).setOrigin(0.5);
        this.enemyGoal = this.add.rectangle(this.width - 200, this.height / 2, 10, this.height/2, 0.5).setOrigin(0.5);

        this.playerGoal.setAlpha(0.5);
        this.enemyGoal.setAlpha(0.5);

        this.physics.add.existing(this.playerGoal);
        this.physics.add.existing(this.enemyGoal);

        this.playerGoal.body.setImmovable(true);
        this.enemyGoal.body.setImmovable(true);


        this.input.on('pointerdown', this.handleUserInput, this);

        this.physics.add.collider(this.ball, this.playerGoal, (ball, goal) => {
            console.log('Player goal collision detected');
            this.scoreEnemyGoal(ball, goal);
        }, null, this);
        
        this.physics.add.collider(this.ball, this.enemyGoal, (ball, goal) => {
            console.log('Enemy goal collision detected');
            this.scorePlayerGoal(ball, goal);
        }, null, this);
        

        this.physics.add.overlap(this.ball, this.enemy, this.defendBall, null, this);
        this.physics.add.overlap(this.ball, this.player, this.defendingBall, null, this);

        this.cursors = this.input.keyboard.createCursorKeys();

        const randomY1 = Phaser.Math.Between(100, 700);
        const randomY2 = Phaser.Math.Between(100, 700);
    
        this.powerUp = this.physics.add.image(250, randomY1, 'powerUp').setScale(0.04);
        this.physics.add.overlap(this.player, this.powerUp, this.collectPowerUp, null, this);
    
        this.powerUp2 = this.physics.add.image(250, randomY2, 'powerUp2').setScale(0.04);
        this.physics.add.overlap(this.player, this.powerUp2, this.collectPowerUp2, null, this);

        this.vfx.rotateGameObject(this.ball);
        this.vfx.scaleGameObject(this.powerUp) ;
        this.vfx.scaleGameObject(this.powerUp2) ;
        this.vfx.scaleGameObject(this.player);
        this.vfx.scaleGameObject(this.enemy);
    }

    update() {

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200);
        } else {
            this.player.setVelocityY(0);
        }

        if (!this.enemyFrozen) {
            this.handleEnemyMovement();
        }
        if (this.playerScore >= 5 || this.enemyScore >= 5) {
            this.gameOver();
        }
    }

    handleEnemyMovement() {
        const enemySpeed = 20; 
        const diff = this.ball.y - this.enemy.y;
        
        if (Math.abs(diff) > 20) {
            if (diff < 0) {
                this.enemy.setVelocityY(-enemySpeed);
            } else if (diff > 0) {
                this.enemy.setVelocityY(enemySpeed);
            }
        } else {
            this.enemy.setVelocityY(0);
        }
    }

    handleUserInput(pointer) {
        if (!this.isBallMoving && this.playerTurn) {
            this.shootBall(pointer);
            this.isBallMoving = true; 
        }
    }

    shootBall(pointer) {
        if (this.playerTurn) {

            if (pointer) {
                this.physics.moveTo(this.ball, this.width, pointer.y, 1500);
            } else {
                this.time.delayedCall(100, () => {   this.physics.moveTo(this.ball, this.width, this.ball.y, 2000); });

            }
            this.playerTurn = false;
            this.time.delayedCall(500, () => { this.enemyTakeShot(); });
        }
    }    
    
    enemyTakeShot() {
        const randomY = Phaser.Math.Between(
            this.playerGoal.y - (this.playerGoal.height / 2),
            this.playerGoal.y + (this.playerGoal.height / 2)
        );
        const randomSpeed = Phaser.Math.Between(600, 900); 
        this.physics.moveTo(this.ball, this.playerGoal.x, randomY, randomSpeed);
        this.playerTurn = true;
    }
    
    
    defendingBall(ball, player){
        console.log("Ball defended by player");
        this.sounds.damage.play();
        
            console.log("Player taking shot");
            this.shootBall();
    }
    
    defendBall(ball, enemy) {
        console.log("Ball defended by enemy");
        
        this.sounds.damage.play();
        
        ball.body.setVelocity(0);
        enemy.body.setVelocity(0);
        
            console.log("Enemy taking shot");
            this.enemyTakeShot();
    }
       
    scorePlayerGoal(ball, goal) {
        console.log('Player scored a goal');
        this.sounds.goal.play();
        this.playerScore += 1;
        this.updateScoreText();
        this.playerTurn = true;
        this.resetBall();
    }
    
    scoreEnemyGoal(ball, goal) {
        console.log('Enemy scored a goal');
        this.sounds.goal.play();
        this.enemyScore += 1;
        this.updateScoreText();
        this.playerTurn = false;
        this.resetBall();
    }
    
    updateScoreText() {
        this.playerScoreText.setText(`${this.playerScore}`);
        this.enemyScoreText.setText(`${this.enemyScore}`);
    }

    resetBall() {
        this.ball.body.setVelocity(0);
        this.ball.setPosition(this.playerTurn ? 250 : this.width - 250, this.height / 2);
        this.enemy.setPosition(this.width - 250, this.height / 2);
        this.player.setPosition(250, this.height / 2);

        
        if (this.playerTurn) {
            this.time.delayedCall(1000, () => { 
                this.shootBall(); 
            });
        } else {
            this.time.delayedCall(1000, () => { 
                this.enemyTakeShot(); 
            });
        }
    }

    collectPowerUp(player, powerUp) {
        powerUp.destroy(); 
        player.setVelocityY(player.body.velocity.y * 3.5); 
        this.sounds.collect.play();
        this.powerUpMessage.setText('Speed Boost Activated!').setAlpha(1);
        this.time.delayedCall(2000, () => { 
            this.powerUpMessage.setAlpha(0);
        });

        this.time.delayedCall(5000, () => {
            player.setVelocityY(player.body.velocity.y / 1.5); 
        });
    }
    collectPowerUp2(player, powerUp2) {
        powerUp2.destroy(); 
        this.enemy.setVelocity(0);
        this.sounds.collect.play();
        this.powerUpMessage.setText('Enemy Frozen for 3 seconds!').setAlpha(1);
        this.time.delayedCall(3000, () => { 
            this.powerUpMessage.setAlpha(0);
        });


        this.enemyFrozen = true;
        this.enemy.setTint(0x0000ff);

        this.time.delayedCall(3000, () => {  

            this.enemyFrozen = false;
            this.enemy.clearTint();

        });
        console.log("Freeze power-up collected! Enemy frozen for 3 seconds.");
    }

    gameOver() {
        this.sounds.background.stop();

        const winner = this.playerScore > this.enemyScore ? 'Player' : 'Enemy';
        const winnerScore = this.playerScore > this.enemyScore ? this.playerScore : this.enemyScore;
        const loserScore = this.playerScore > this.enemyScore ? this.enemyScore : this.playerScore;

        if(winner === 'Player') this.sounds.success.setVolume(1).setLoop(false).play()
        else this.sounds.lose.setVolume(1).setLoop(false).play()
    
            initiateGameOver.bind(this)({
                "score": winnerScore- loserScore,
            });

        this.add.bitmapText(this.width / 2, this.height / 2, "pixelfont", "TIME UP!\n GAME OVER", 90).setDepth(11).setOrigin(0.5).setTint(0xff0000);
        this.add.bitmapText(this.width / 2, this.height / 4, 'pixelfont', `${winner} Wins by ${winnerScore} to ${loserScore}!`, 50).setOrigin(0.5);

        this.time.delayedCall(5000, () => {
            this.scene.pause();
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
    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
    });
}

const config = {
    type: Phaser.AUTO,
    width: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].width,
    height: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].height,
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
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