class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {

    for (const key in _CONFIG.imageLoader) {
      this.load.image(key, _CONFIG.imageLoader[key]);
    }
    for (const key in _CONFIG.soundsLoader) {
      this.load.audio(key, [_CONFIG.soundsLoader[key]]);
    }

    this.load.image('heart', 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png');
    this.load.bitmapFont('pixelfont',
      'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
      'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
    this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

    addEventListenersPhaser.bind(this)();
    displayProgressLoader.call(this);

  }

  create() {
    this.score = 0;
    this.width = this.game.config.width;
    this.height = this.game.config.height;

    this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);

    // Use the larger scale factor to ensure the image covers the whole canvas
    const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
    this.bg.setScale(scale);

    this.scoreText = this.add.bitmapText(10, 10, 'pixelfont', 'Score: 0', 28);

    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
    this.pauseButton.setInteractive({ cursor: 'pointer' });
    this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
    this.pauseButton.on('pointerdown', () => this.pauseGame());
    this.vfx = new VFXLibrary(this);
    gameSceneCreate(this);


    this.sounds = {};
    for (const key in _CONFIG.soundsLoader) {
      this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
    }

    this.sounds.background.setVolume(3).setLoop(true).play();
    this.input.keyboard.disableGlobalCapture();
  }

  update(time, delta) {

    gameSceneUpdate(this, time, delta);

  }

  updateScore(points) {
    this.score += points;
    this.updateScoreText();
  }

  updateScoreText() {
    this.scoreText.setText(`Score: ${this.score}`);
  }

  gameOver() {
    initiateGameOver.bind(this)({ score: this.score });
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


function gameSceneCreate(game) {

  game.physics.world.setBoundsCollision(1, 1, 1, 0);

  bricks = game.physics.add.group({
    immovable: true,
    allowGravity: false
  });

  let brick;

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 15; x++) {
      brick = bricks.create(265 + x * 50, 100 + y * 52, 'enemy').setDisplaySize(64, 64);
      brick.body.setBounce(1);
      game.vfx.scaleGameObject(brick);

    }
  }

  paddle = game.physics.add.sprite(game.width * 0.5, 600, 'platform').setDisplaySize(200, 35).setImmovable();
  paddle.refreshBody();

  ball = game.physics.add.sprite(game.width * 0.5, paddle.y - 16, 'projectile').setDisplaySize(48, 48).setOrigin(0.5).setCollideWorldBounds(true).setBounce(1);
  ball.refreshBody();
  ball.setData('onPaddle', true);

  game.physics.add.collider(ball, paddle, ballHitPaddle, null, game);
  game.physics.add.collider(ball, bricks, ballHitBrick, null, game);

  game.input.on('pointerdown', releaseBall, game);

  game.gameOverText = game.add.bitmapText(game.width / 2, 40, 'pixelfont', 'GAME OVER !', 40).setDepth(11).setOrigin(0.5).setTint(0xff0000).setAlpha(0);
}

function gameSceneUpdate(game) {
  paddle.x = game.input.x;

  if (paddle.x < 24) {
    paddle.x = 24;
  } else if (paddle.x > game.physics.world.bounds.width - 24) {
    paddle.x = game.physics.world.bounds.width - 24;
  }

  if (ball.getData('onPaddle')) {
    ball.x = paddle.x;
  }

  if (ball.body.y > game.height) {
    game.gameOverText.setAlpha(1);
    game.sound.stopAll();
    game.sounds.lose.play();
    game.physics.pause();
    game.time.delayedCall(500, () => {
      game.gameOver();
    })
  }
}

function releaseBall() {
  if (ball.getData('onPaddle')) {
    ball.setVelocity(-75, -300);
    ball.setData('onPaddle', false);
  }
}

function ballHitBrick(ball, brick) {

  this.vfx.createEmitter('enemy', brick.x, brick.y, 0.01, 0, 200).explode(30);
  brick.destroy();
  this.sounds.destroy.play()
  this.updateScore(1);

  if (bricks.countActive() === 0) {
    this.sound.stopAll();
    this.sounds.success.play();
    this.gameOverText.setAlpha(1).setTint(0x00ff00).setText("YOU WON !");
    this.physics.pause();
    this.time.delayedCall(1500, () => {
      this.gameOver();
    })
  }
}

function ballHitPaddle(ball, paddle) {
  let diff = 0;
  this.sounds.jump.play();
  if (ball.x < paddle.x) {
    diff = paddle.x - ball.x;
    ball.setVelocityX(-10 * diff);
  } else if (ball.x > paddle.x) {
    diff = ball.x - paddle.x;
    ball.setVelocityX(10 * diff);
  } else {
    ball.setVelocityX(2 + Math.random() * 8);
  }
}