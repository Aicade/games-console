const assetsLoader = {
  "background": "background",
  "player": "player",
  "avoidable": "avoidable",
  "collectible": "collectible",
};

// Custom UI Elements
const title = `SILVER SURFER`
const description = `Player is hovering in space. Avoid not to collide
with enemies. He has limited life, so keep collecting the
materials to increase life.`
const instructions =
  `Instructions:
  1. Touch and hold to hover.
  2. Tilt device to landscape for best experience.`;

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

// Game Orientation
const orientation = "landscape";


/*
------------------- GLOBAL CODE STARTS HERE -------------------
*/

// Game Scene
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    gameScenePreload(this);
    displayProgressLoader.call(this);
    addEventListenersPhaser.bind(this)();
  }

  create() {
    this.score = 0;

    this.width = this.game.config.width;
    this.height = this.game.config.height;
    gameSceneBackground(this);

    // Add UI elements
    this.scoreText = this.add.bitmapText(this.width / 2, 20, 'pixelfont', 'Score: 0', 28).setDepth(11).setTint(0xffa500);

    // Add input listeners
    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
    this.pauseButton.setInteractive({ cursor: 'pointer' });
    this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
    this.pauseButton.on('pointerdown', () => this.pauseGame());

    gameSceneCreate(this);

  }

  update(time, delta) {
    if (this.gameOverFlag) return;
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
    initiateGameOver.bind(this)({score: this.score});
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
    console.log(file.src);
  });
  this.load.on('complete', function () {
    progressBar.destroy();
    progressBox.destroy();
    loadingText.destroy();
  });
}

/*
------------------- GLOBAL CODE ENDS HERE -------------------
*/

// Configuration object
const config = {
  type: Phaser.AUTO,
  width: orientationSizes[orientation].width,
  height: orientationSizes[orientation].height,
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt : true,
  /* ADD CUSTOM CONFIG ELEMENTS HERE */
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 100 },
      debug: false,
    },
  },
  dataObject: {
    name: title,
    description: description,
    instructions: instructions,
  },
  orientation: true
};

// Game instance
const game = new Phaser.Game(config);

let INIT_PLAYER_SPEED,
  PLAYER_SPEED = INIT_PLAYER_SPEED,
  INIT_ENEMY_SPEED,
  LEVEL_SCORE_THRESHOLD, // Difficulty level increases after every 50 score
  ENEMY_SPEED_INCREMENTER,
  SCORE_UPDATE_TIMER, // in millisec, score increases every 500ms
  timer,
  ENEMY_SPEED = INIT_ENEMY_SPEED,
  DIFFICULTY_LEVEL,
  BG_SCROLL_INIT,
  SPAWNER_LEVEL,
  SPAWN_TIMER, // in millisec
  SPAWN_DELAY_PERCENT_THRESHOLD, // decrement 
  SPAWN_DIFFICULTY_THRESHOLD, // Every 5 difficulty level, spawner level will increase
  POWER_UP_TIMER

// GAME SCENE PHASER FUNCTIONS
function gameScenePreload(game) {
  // Load In-Game Assets from assetsLoader
  for (const key in assetsLoader) {
    game.load.image(key, assets_list[assetsLoader[key]]);
  }

  game.load.bitmapFont('pixelfont',
    'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
    'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
  game.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
  game.load.audio('backgroundMusic', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-1.mp3']);
  game.load.audio('loose', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_1.mp3']);
  game.load.audio('footsteps', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/footsteps_1.mp3']);
  game.load.audio('collect', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/flap_1.wav']);
}

//FUNCTION FOR THE GAME SCENE BACKGROUND
function gameSceneBackground(game) {
  game.bg = game.add
    .tileSprite(0, 0, game.game.config.width, game.game.config.height, "background")
    .setOrigin(0, 0)
    .setScrollFactor(1);

}

//CREATE FUNCTION FOR THE GAME SCENE
function gameSceneCreate(game) {
  game.pointerTouched = false;
  setVariables(game);
  createTimer(game);
  // game.levelText = game.add.bitmapText(10, 52, 'pixelfont', 'Level: 1', 28);
  game.backgroundMusic = game.sound.add('backgroundMusic', { loop: true, volume: 2 });
  game.backgroundMusic.play();
  game.collectMusic = game.sound.add('collect', { volume: 0.5 });
  game.looseMusic = game.sound.add('loose', { volume: 0.5 });
  game.footStepsMusic = game.sound.add('footsteps', { volume: 2.5, loop:true });

  game.enemies = game.physics.add.group();
  game.collectibles = game.physics.add.group();

  game.player = game.physics.add.image(50, 150, "player").setOrigin(0, 0);
  game.player.setScale(0.14).setDepth(10);
  game.player.setImmovable(true);
  game.player.body.setSize(game.player.body.width / 1.5, game.player.body.height / 1.5);

  game.physics.add.collider(game.player, game.enemies, targetHit, null, game)
  game.physics.add.collider(game.player, game.collectibles, collectPowerUp, null, game)
  game.cursor = game.input.keyboard.createCursorKeys();

  game.emitter = game.add.particles(game.player.displayWidth / 2, game.player.displayHeight, 'collectible', {
    speed: 100,
    lifespan: 300,
    alpha: {
      onEmit: (particle, key, t, value) => Phaser.Math.Percent(game.player.body.speed, 0, 300) * 1000
    },
    scale: { start: 0.025, end: 0 },
    blendMode: 'ADD',
  });
  game.emitter.startFollow(game.player);
  game.emitter.stop();

  // Set up game timer
  game.timerEvent = game.time.addEvent({
    delay: 1000,
    callback: onSecondElapsed,
    callbackScope: game,
    loop: true
  });

  game.enemyTimer = game.time.addEvent({
    delay: SPAWNER_LEVEL * SPAWN_TIMER,
    callback: spawnEnemy,
    callbackScope: game,
    loop: true
  });

  game.collectibleTimer = game.time.addEvent({
    delay: POWER_UP_TIMER,
    callback: spawnCollectible,
    callbackScope: game,
    loop: true
  });

  game.input.on('pointerdown', () => {
    game.pointerTouched = true;
    game.emitter.start();
  }, this);

  game.input.on('pointerup', () => {
    game.pointerTouched = false;
    game.emitter.stop();
  }, this);


  game.instructionText = game.add.bitmapText(game.width / 2, game.height / 3, 'pixelfont', 'Touch and hold to hover', 50).setOrigin(0.5, 0.5);
  game.instructionText.setScrollFactor(0).setDepth(11);
  game.time.delayedCall(5000, () => {
    game.tweens.add({
      targets: game.instructionText,
      alpha: 0,
      duration: 500,
      ease: 'Linear'
    });
  })
}

//UPDATE FUNCTION FOR THE GAME SCENE
function gameSceneUpdate(game, time, delta) {
  if (game.player.y > game.game.config.height || game.player.y < 0 - game.player.displayHeight) {
    targetHit.bind(game)(game.player);
  }

  game.bg.tilePositionX += BG_SCROLL_INIT;
  timer += delta;
  while (timer > SCORE_UPDATE_TIMER) {
    game.updateScore(10);
    timer -= SCORE_UPDATE_TIMER;
    DIFFICULTY_LEVEL = Math.floor(game.score / LEVEL_SCORE_THRESHOLD);
    updateLevelText(game)
    if (DIFFICULTY_LEVEL) {
      ENEMY_SPEED = INIT_ENEMY_SPEED + DIFFICULTY_LEVEL * ENEMY_SPEED_INCREMENTER;
    }
    if (DIFFICULTY_LEVEL > SPAWN_DIFFICULTY_THRESHOLD) {
      SPAWN_DIFFICULTY_THRESHOLD += 10;
      SPAWNER_LEVEL++;
      newEnemyTimer(game, SPAWNER_LEVEL);
    }
  }
  if (game.pointerTouched) {
    game.footStepsMusic.play();
    PLAYER_SPEED -= 4;
    if (PLAYER_SPEED > INIT_PLAYER_SPEED) PLAYER_SPEED -= 8;
    game.player.setVelocityY(PLAYER_SPEED);
  } else {
    game.footStepsMusic.stop();
    PLAYER_SPEED += 10;
    if (PLAYER_SPEED < INIT_PLAYER_SPEED) PLAYER_SPEED += 20;
    game.player.setVelocityY(PLAYER_SPEED);
  }
}

function createTimer(game) {
  game.gameInitTimer = game.gameTimer = 40; // 40 seconds
  game.timerBar = null;
  game.timerEvent = null;

  game.timerText = game.add.bitmapText(10, 10, 'pixelfont', 'Life: ' + game.gameTimer, 28).setDepth(11);

  // Create timer bar
  game.timerBar = game.add.graphics();
  game.timerBar.fillStyle(0x00ff00, 1);
  game.timerBar.lineStyle(4, 0x000000);
  game.timerBar.fillRoundedRect(13, 60, 150, 20, 10).strokeRoundedRect(13, 60, 150, 20, 10);
}

function onSecondElapsed() {
  this.gameTimer--;
  updateTimer(this);
  if (this.gameTimer <= 0) {
    this.timerEvent.remove();
    targetHit.bind(this)(this.player);
  }
}


function manipulateTime(game, seconds) {
  game.gameTimer += seconds;
  updateTimer(game);
}

function updateTimer(game) {
  game.timerText.setText('Life: ' + game.gameTimer);
  updateTimerBar(game);
}

function updateTimerBar(game) {
  game.timerBar.clear();
  if (game.gameTimer <= 10) {
    game.timerBar.fillStyle(0xff0000, 1);
  } else {
    game.timerBar.fillStyle(0x00ff00, 1);
  }
  let newWidth = 150 * (game.gameTimer / game.gameInitTimer);
  if (newWidth > 150) {
    newWidth = 150;
  }
  game.timerBar.lineStyle(4, 0x000000);
  game.timerBar.fillRoundedRect(13, 60, newWidth, 20, 10).strokeRoundedRect(13, 60, 150, 20, 10);
}

function newEnemyTimer(game) {
  let newTimer = SPAWN_TIMER - ((SPAWNER_LEVEL / SPAWN_DELAY_PERCENT_THRESHOLD) * SPAWN_TIMER);
  if (newTimer) {
    game.enemyTimer.remove();
    game.enemyTimer = game.time.addEvent({
      delay: SPAWN_TIMER - ((SPAWNER_LEVEL / 10) * SPAWN_TIMER),
      callback: spawnEnemy,
      callbackScope: game,
      loop: true
    });
  } else {
    SPAWN_DELAY_PERCENT_THRESHOLD = 10;
  }

}

function spawnCollectible() {
  const y = Phaser.Math.Between(5, this.game.config.height * 0.98);
  const x = this.game.config.width + 50;
  const collectble = this.collectibles.create(x, y, "collectible");
  collectble.body.allowGravity = false;
  collectble.body.setSize(collectble.body.width / 1.5, collectble.body.height / 1.5);
  collectble.setVelocity(ENEMY_SPEED, 0);
  collectble.setScale(0.07).setOrigin(0, 0).refreshBody();
}

function spawnEnemy() {
  const y = Phaser.Math.Between(5, this.game.config.height * 0.98);
  const x = this.game.config.width + 50;
  const enemy = this.enemies.create(x, y, "avoidable");
  enemy.body.allowGravity = false;
  enemy.body.setSize(enemy.body.width / 1.5, enemy.body.height / 1.5);
  enemy.setVelocity(ENEMY_SPEED, 0);
  enemy.setScale(0.16).setOrigin(0, 0).refreshBody();
}

function collectPowerUp(player, collectible) {
  this.collectMusic.play();
  collectible.destroy();
  manipulateTime(this, 5);
}

function targetHit(player, enemy) {
  setVariables(this);
  this.physics.pause();
  this.sound.stopAll()
  this.gameOverFlag = true;

  this.timerEvent.destroy(); this.enemyTimer.destroy(); this.collectibleTimer.destroy();
  this.looseMusic.play();
  player.setTint(0xff0000);
  this.cameras.main.shake(200);
  this.instructionText.setText("GAME OVER").setAlpha(1).setTint(0xff0000);

  this.tweens.add({
    targets: player,
    y: player.y - 200,
    duration: 500,
    ease: 'Linear',
    onComplete: () => {
      player.flipY = true;
      this.tweens.add({
        targets: player,
        y: player.y + 400,
        duration: 800,
        ease: 'Linear',
        onComplete: () => {
          this.gameOver();
        }
      });
    }
  });
}

function setVariables(game) {
  INIT_PLAYER_SPEED = -200;
  PLAYER_SPEED = INIT_PLAYER_SPEED;
  INIT_ENEMY_SPEED = -200;
  LEVEL_SCORE_THRESHOLD = 100; // Difficulty level increases after every 50 score
  ENEMY_SPEED_INCREMENTER = -100;
  SCORE_UPDATE_TIMER = 1000; // in millisec, score increases every 500ms
  timer = 0;
  ENEMY_SPEED = INIT_ENEMY_SPEED;
  DIFFICULTY_LEVEL = 0;
  BG_SCROLL_INIT = 0.9;

  SPAWNER_LEVEL = 1;
  SPAWN_TIMER = 1300; // in millisec
  SPAWN_DELAY_PERCENT_THRESHOLD = 10; // decrement 
  SPAWN_DIFFICULTY_THRESHOLD = 3; // Every 5 difficulty level, spawner level will increase
  POWER_UP_TIMER = 4000;

}

function updateLevelText(game) {
  // game.levelText.text = 'Level: ' + (DIFFICULTY_LEVEL + 1);

}