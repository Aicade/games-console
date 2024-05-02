const assetsLoader = {
  "background": "background",
  "enemy": "enemy",
  "projectile": "projectile",
  "platform": "platform",

};

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

const gameTitle = `Puzzle Shooter`
const gameDescription = `A puzzle shooter where you break objects by controlling a projectile`
const gameInstruction =
  `Instructions:
1. Move the paddle to bounce the projectile
2. Break the objects using the projectile`;

const globalPrimaryFontColor = "#FFF";
const globalSecondaryFontColor = "#0F0"

const orientation = "landscape";

const joystickEnabled = false;
const buttonEnabled = false;

const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  preload() {
    startScenePreload(this);
    loadBlurredBg(this);
  }

  create() {

    this.width = this.game.config.width;
    this.height = this.game.config.height;
    createBlurredBg(this);

    this.add.text(this.width / 2, this.height / 2 - 300, gameTitle, { fontSize: '32px', fill: globalPrimaryFontColor }).setOrigin(0.5);
    this.add.text(this.width / 2, this.height / 2 - 200, gameDescription, { fontSize: '24px', fill: globalPrimaryFontColor }).setOrigin(0.5);
    this.add.text(this.width / 2, this.height / 2 - 100, gameInstruction, { fontSize: '20px', fill: globalPrimaryFontColor }).setOrigin(0.5);

    const startButton = this.add.text(this.width / 2, this.height / 2, 'Start', { fontSize: '24px', fill: globalSecondaryFontColor }).setOrigin(0.5);
    startButton.setInteractive({ cursor: 'pointer' });
    startButton.on('pointerdown', () => this.scene.start('GameScene'));
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
    this.load.plugin('rexbuttonplugin', rexButtonUrl, true);

    for (const key in assetsLoader) {
      this.load.image(key, assets_list[assetsLoader[key]]);
    }

    gameScenePreload(this);
    displayProgressLoader.call(this);
  }

  create() {
    this.score = 0;
    this.width = this.game.config.width;
    this.height = this.game.config.height;
    gameSceneBackground(this);

    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: globalPrimaryFontColor });

    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    const pauseButton = this.add.text(this.game.config.width - 20, 10, 'Pause', { fontSize: '16px', fill: globalSecondaryFontColor }).setOrigin(1, 0);
    pauseButton.setInteractive({ cursor: 'pointer' });
    pauseButton.on('pointerdown', () => this.pauseGame());

    const joyStickRadius = 50;

    if (joystickEnabled) {
      this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
        x: joyStickRadius * 2,
        y: this.height - (joyStickRadius * 2),
        radius: 50,
        base: this.add.circle(0, 0, 80, 0x888888, 0.5),
        thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5),

      });
    }

    if (buttonEnabled) {
      this.buttonA = this.add.rectangle(this.width - 80, this.height - 100, 80, 80, 0xcccccc, 0.5)
      this.buttonA.button = this.plugins.get('rexbuttonplugin').add(this.buttonA, {
        mode: 1,
        clickInterval: 100,
      });

      this.buttonA.button.on('down', function(button, gameObject) {
        console.log("button clicked");
      });
    }

    gameSceneCreate(this);
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
    this.scene.start('GameOverScene', { score: this.score });
  }

  pauseGame() {
    this.scene.pause();
    this.scene.launch('PauseScene');
  }
}

class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  preload() {
    pauseScenePreload(this);
    loadBlurredBg(this);

  }

  create() {

    this.width = this.game.config.width;
    this.height = this.game.config.height;
    createBlurredBg(this)

    const resumeButton = this.add.text(this.game.config.width / 2, this.game.config.height / 2, 'Resume', { fontSize: '24px', fill: globalSecondaryFontColor }).setOrigin(0.5);
    resumeButton.setInteractive({ cursor: 'pointer' });
    resumeButton.on('pointerdown', () => this.resumeGame());

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
  }

  resumeGame() {
    this.scene.resume('GameScene');
    this.scene.stop();
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  preload() {
    this.width = this.game.config.width;
    this.height = this.game.config.height;
    gameOverScenePreload(this);
    loadBlurredBg(this);

  }

  create(data) {

    this.width = this.game.config.width;
    this.height = this.game.config.height;
    createBlurredBg(this);

    this.add.text(this.width / 2, 100, 'GAME OVER', { fontSize: '32px', fill: globalPrimaryFontColor }).setOrigin(0.5);
    this.add.text(this.width / 2, 200, `Score: ${data.score}`, { fontSize: '24px', fill: globalPrimaryFontColor }).setOrigin(0.5);

    const restartButton = this.add.text(this.width / 2, this.height / 2, 'Restart', { fontSize: '24px', fill: globalSecondaryFontColor }).setOrigin(0.5);
    restartButton.setInteractive({ cursor: 'pointer' });
    restartButton.on('pointerdown', () => this.scene.start('GameScene'));
  }
}

function loadBlurredBg(game) {
  if (typeof assetsLoader === 'undefined') return;
  game.blurredBg = Object.keys(assetsLoader).find(dataKey => dataKey.includes("background"));
  if (game.blurredBg) {
    game.load.image(game.blurredBg, assets_list[assetsLoader[game.blurredBg]]);
  }
}

function createBlurredBg(game) {
  if (!game.blurredBg) return;
  game.blurredBg = game.add.image(0, 0, game.blurredBg).setOrigin(0, 0);
  game.blurredBg.displayHeight = game.game.config.height;
  game.blurredBg.displayWidth = game.game.config.width;
  game.blurredBg.preFX.addGradient("black", "black", 0.3)
  game.blurredBg.preFX.addBlur(0, 2, 2, 0.3);
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
  this.load.on('fileprogress', function(file) {
    console.log(file.src);
  });
  this.load.on('complete', function() {
    progressBar.destroy();
    progressBox.destroy();
    loadingText.destroy();
  });
}

const config = {
  type: Phaser.AUTO,
  width: orientationSizes[orientation].width,
  height: orientationSizes[orientation].height,
  scene: [StartScene, GameScene, PauseScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }
    },
  }
};

const game = new Phaser.Game(config);

function startScenePreload(game) { }
function startSceneCreate(game) { }
function startSceneUpdate(game) { }

function pauseScenePreload(game) { }
function pauseSceneCreate(game) { }
function pauseSceneUpdate(game) { }

function gameOverScenePreload(game) { }
function gameOverSceneCreate(game) { }
function gameOverSceneUpdate(game) { }

function gameScenePreload(game) {
  game.load.image('background', 'images/starfield.jpg');
  game.load.image('ball', 'images/red.png');
  game.load.image('brick', 'images/white.png');
  game.load.image('paddle', 'images/white platform.png');
}

function gameSceneBackground(game) {

  game.bg = game.add.sprite(0, 0, 'background').setOrigin(0, 0);
  game.bg.setScrollFactor(0);
  game.bg.displayHeight = game.height;
  game.bg.displayWidth = game.width;
}

function gameSceneCreate(game) {

  game.scale.pageAlignHorizontally = true;
  game.scale.pageAlignVertically = true;
  game.scale.refresh();

  game.physics.world.setBoundsCollision(1, 1, 1, 0);

  bricks = game.physics.add.group({
    immovable: true,
    allowGravity: false
  });

  let brick;

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 15; x++) {
      brick = bricks.create(265 + x * 50, 100 + y * 52, 'enemy').setDisplaySize(32, 32);
      brick.body.setBounce(1);
    }
  }

  paddle = game.physics.add.sprite(game.physics.world.bounds.width * 0.5, 600, 'platform').setDisplaySize(100, 25).setImmovable();

  ball = game.physics.add.sprite(game.physics.world.bounds.width * 0.5, paddle.y - 16, 'projectile').setDisplaySize(32, 32).setOrigin(0.5).setCollideWorldBounds(true).setBounce(1);

  ball.setData('onPaddle', true);

  game.physics.add.collider(ball, paddle, ballHitPaddle, null, game);
  game.physics.add.collider(ball, bricks, ballHitBrick, null, game);

  game.input.on('pointerdown', releaseBall, game);
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

  if (ball.body.y > orientationSizes[orientation].height)
    game.gameOver();
}

function releaseBall() {
  if (ball.getData('onPaddle')) {
    ball.setVelocity(-75, -300);
    ball.setData('onPaddle', false);
  }
}

function ballHitBrick(ball, brick) {
  brick.destroy();
  this.updateScore(1);

  if (bricks.countActive() === 0) {
    this.gameOver();
  }
}

function ballHitPaddle(ball, paddle) {
  let diff = 0;

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