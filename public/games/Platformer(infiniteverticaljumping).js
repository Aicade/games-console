let assetsLoader = {
  "background": "background",
  "player": "player",
  "enemy": "enemy",
  "platform": "platform",
  "collectible": "collectible",
};

let soundsLoader = {
  "background": "background",
  "jump": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_1.mp3",
  "collect": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_3.mp3",
  "damage": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/damage_1.mp3",
  "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_1.mp3",
  "success": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/success_1.wav"
};

// Custom UI Elements
const title = `ENDLESS JUMPER`
const description = `Jump and dodge the enemies. Set high score.`
const instructions =
  `Instructions:
1. Use left right arrow keys to move player
2. Use up arrow key to jump`;


// Custom Font Colors
const globalPrimaryFontColor = "#FFF";
const globalSecondaryFontColor = "#0F0"

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
const orientation = "portrait";

// Touuch Screen Controls
const joystickEnabled = true;
const buttonEnabled = true;
var isMobile = false;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

// BUTTON DOCMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

// Game Scene
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.score = 0;

    this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
    this.load.plugin('rexbuttonplugin', rexButtonUrl, true);

    // Load In-Game Assets from assetsLoader
    for (const key in assetsLoader) {
      this.load.image(key, assetsLoader[key]);
    }

    for (const key in soundsLoader) {
      this.load.audio(key, [soundsLoader[key]]);
    }

    this.load.image('heart', 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png');
    this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
    this.load.bitmapFont('pixelfont',
      'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
      'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
    addEventListenersPhaser.bind(this)();
    displayProgressLoader.call(this);
  }

  create() {

    this.sounds = {};
    for (const key in soundsLoader) {
      this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
    }

    this.input.keyboard.disableGlobalCapture();

    this.width = this.game.config.width;
    this.height = this.game.config.height;
    isMobile = !this.sys.game.device.os.desktop;
    this.input.addPointer(3);
    this.vfx = new VFXLibrary(this);
    this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
    this.bg.setScrollFactor(0);
    const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
    this.bg.setScale(scale);

    this.lives = 3;
    this.hearts = [];
    for (let i = 0; i < this.lives; i++) {
      let x = 40 + (i * 35);
      this.hearts[i] = this.add.image(x, 40, "heart").setScale(0.025).setDepth(11).setScrollFactor(0);
    }

    this.sounds.background.setVolume(2).setLoop(false).play()

    // Add UI elements
    this.scoreText = this.add.bitmapText(this.width / 2, 35, 'pixelfont', 'Meter: 0m', 35).setOrigin(0.5).setDepth(11);
    this.scoreText.setScrollFactor(0);

    // Add input listeners
    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
    this.pauseButton.setInteractive({ cursor: 'pointer' });
    this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
    this.pauseButton.on('pointerdown', () => this.pauseGame());

    this.createMobileButtons();
    gameSceneCreate(this);

    // game.player = this.add.sprite(300, 200, 'player').setScale(0.2);
  }

  createMobileButtons() {
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
      this.buttonA = this.add.rectangle(this.width - 80, this.height - 100, 80, 80, 0xcccccc, 0.5).setScrollFactor(0);
      this.buttonA.button = this.plugins.get('rexbuttonplugin').add(this.buttonA, {
        mode: 1,
        clickInterval: 100,
      });
    }
    this.toggleControlsVisibility(isMobile)
  }

  toggleControlsVisibility(visibility) {
    this.joyStick.base.visible = visibility;
    this.joyStick.thumb.visible = visibility;
    this.buttonA.visible = visibility;
  }

  update(time, delta) {
    gameSceneUpdate(this, time, delta);
  }

  updateScore(points) {
    this.score += points;
    this.updateScoreText();
  }

  updateScoreText() {
    this.scoreText.setText(`Meter: ${this.score}`);
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
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1800 },
      debug: false,
    },
  },
  dataObject: {
    name: title,
    description: description,
    instructions: instructions,
  },
  orientation: false
};

let PLAYER_SPEED = 600;
let INIT_ENEMY_SPEED = 500;
let LEVEL_SCORE_THRESHOLD = 50; // Difficulty level increases after every 50 score
let ENEMY_SPEED_INCREMENTER = 50;
let SCORE_UPDATE_TIMER = 500; // in millisec, score increases every 500ms
let timer = 0;
let ENEMY_SPEED = INIT_ENEMY_SPEED;
let DIFFICULTY_LEVEL = 0;
let BG_SCROLL_INIT = 0.5;

let SPAWNER_LEVEL = 1;
let SPAWN_TIMER = 300; // in millisec
let SPAWN_DELAY_PERCENT_THRESHOLD = 5; // decrement 
let SPAWN_DIFFICULTY_THRESHOLD = 5;


//CREATE FUNCTION FOR THE GAME SCENE
function gameSceneCreate(game) {
  game.physics.world.bounds.setTo(0, 0, game.game.config.width, game.game.height + 2000);
  game.physics.world.setBoundsCollision(true, true, false, true);

  game.player = game.physics.add.sprite(400, game.game.config.height - 200, 'player').setScale(0.13);
  game.player.setBounce(0.1).setDepth(11);
  game.player.body.setSize(game.player.body.width / 1.5, game.player.body.height);

  const fx = game.player.preFX.addBarrel(0.9);

  game.tweens.add({
    targets: fx,
    amount: 1.1,
    duration: 600,
    yoyo: true,
    loop: -1,
    ease: 'sine.inout'
  });

  game.cursors = game.input.keyboard.createCursorKeys();

  game.platforms = game.physics.add.staticGroup();
  let platform = game.platforms.create(400, game.game.config.height - 32, 'platform').setScale(0.3, 0.02).refreshBody();

  let totalPlatforms = 750;
  for (let i = 0; i < totalPlatforms; i++) {
    let x = Phaser.Math.Between(game.game.config.width * 0.2, game.game.config.width * 0.9);
    let y = game.game.config.height - 270 * (i + 1);
    let nextPlats = game.platforms.create(x, y, 'platform').setScale(0.3, 0.03).refreshBody();

    nextPlats.body.checkCollision.down = false;
    nextPlats.body.checkCollision.left = false;
    nextPlats.body.checkCollision.right = false;
    // platform.postFX.addShine(0.9);
    if (i === totalPlatforms - 1) {

      game.finisjText = game.add.bitmapText(game.width / 1.8, y - 250, 'pixelfont', 'FINISH', 35).setTint(0x00ff00).setOrigin(0.5).setDepth(11);
      let lastPlat = game.platforms.create(0, y - 150, 'platform').setScale(0.3, 0.07).setOrigin(0).setTint(0x00ff00);
      lastPlat.displayWidth = game.width + 250;
      lastPlat.refreshBody();
      game.physics.add.collider(game.player, lastPlat, () => {

        game.physics.pause();
        game.sound.stopAll();
        this.sounds.success.setVolume(0.5).setLoop(false).play()
        game.player.setTint(0x00ff00);
        game.time.delayedCall(2000, () => {
          game.gameOver();
        });

      });
    }
  }
  game.physics.add.collider(game.player, game.platforms);

  game.cameras.main.startFollow(game.player, true, 0, 0.1);
  game.cameras.main.setDeadzone(game.width, game.height / 2.5);

  game.enemies = game.physics.add.group();
  game.physics.add.collider(game.enemies, game.platforms);

  game.powerUps = game.physics.add.group();

  game.nextEnemyTime = 0;

  game.time.addEvent({
    delay: 20000,
    callback: spawnPowerUp,
    callbackScope: game,
    loop: true
  });

  game.physics.add.overlap(game.player, game.powerUps, collectPowerUp, null, game);
  game.highestY = game.player.y;
  game.physics.add.collider(game.player, game.enemies, onPlayerEnemyCollision, null, game);
  game.physics.add.collider(game.powerUps, game.platforms);
  game.joystickKeys = game.joyStick.createCursorKeys();

  game.whiteParticle = game.vfx.addCircleTexture('whiteCircle', 0xffffff, 1, 8);
  game.followEmitter = game.vfx.createEmitter('whiteCircle', 0, 0, 1, 0, 600).setAlpha(0.8);
  game.followEmitter.startFollow(game.player);
}

//UPDATE FUNCTION FOR THE GAME SCENE
function gameSceneUpdate(game, time, delta) {

  if (game.cursors.left.isDown || game.joystickKeys.left.isDown) {
    game.player.setVelocityX(-160);
    game.player.flipX = true;
  } else if (game.cursors.right.isDown || game.joystickKeys.right.isDown) {
    game.player.setVelocityX(160);
    game.player.flipX = false;
  } else {
    game.player.setVelocityX(0);
  }

  if ((game.cursors.up.isDown || game.buttonA.button.isDown) && game.player.body.touching.down) {
    game.sounds.jump.setVolume(0.5).setLoop(false).play()
    game.player.setVelocityY(-1200);
  }

  if (time > game.nextEnemyTime) {
    spawnEnemy(game);
    game.nextEnemyTime = time + Phaser.Math.Between(1000, 4000);
  }

  if (game.player.y < game.highestY) {
    game.highestY = game.player.y;
    game.score = Math.abs(Math.round(game.player.y - game.game.config.height + 50));
    game.scoreText.setText('Meter: ' + game.score + 'm');
  }
  if (game.player.y > (game.game.config.height)) {
    game.gameOver();
  }

  if (game.player.y < game.physics.world.bounds.height - 1500 && game.player.body.velocity.y < 0) {
    game.physics.world.bounds.setTo(
      0,
      0,
      game.game.config.width,
      game.physics.world.bounds.height + 500
    );
  }

}

function spawnEnemy(game) {
  let side = Phaser.Math.Between(0, 1);
  let x = Phaser.Math.Between(0, game.game.config.width);
  let y = game.player.y - 500;

  let enemy = game.enemies.create(x, y, 'enemy').setScale(.06);
  enemy.body.setSize(enemy.body.width / 1.3, enemy.body.height / 1.3);
  enemy.setVelocityX(side === 0 ? 250 : -250);
  enemy.setGravityY(10);
  enemy.setCollideWorldBounds(true);
  enemy.setBounceX(1);
  enemy.setBounceY(0.4);
}

function collectPowerUp(player, powerUp) {
  this.sounds.collect.setVolume(0.5).setLoop(false).play()
  this.followEmitter.start();
  powerUp.destroy();

  player.setGravityY(Phaser.Math.Between(-2000, -2500));

  this.time.delayedCall(3000, () => {
    this.followEmitter.stop();
    player.setGravityY(0);
  });
}

function spawnPowerUp() {
  let x = Phaser.Math.Between(100, game.config.width - 100);
  let y = this.player.y - 400;
  let powerUp = this.powerUps.create(x, y, 'collectible').setScale(.11);
}

function onPlayerEnemyCollision(player, enemy) {

  this.vfx.blinkEffect(player, 200, 3);
  this.lives--;
  this.hearts[this.lives] && this.hearts[this.lives].destroy();
  if (this.lives > 0) {
    this.sounds.damage.setVolume(0.5).setLoop(false).play()
    enemy.destroy();
    this.time.delayedCall(1400, () => {
      player.setAlpha(1);
    })
    this.vfx.shakeCamera(200, 0.01);
  } else {
    enemy.destroy()
    this.physics.pause();
    player.setAngularVelocity(600);
    this.sound.stopAll();
    this.sounds.lose.setVolume(0.5).setLoop(false).play()
    this.player.setTint(0xff0000);
    this.vfx.shakeCamera(300, 0.04);
    this.time.delayedCall(2000, () => {
      this.gameOver();
    });
  }
}