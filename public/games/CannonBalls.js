let assetsLoader = {
  "background": "background",
  "player": "player",
  "platform": "platform",
  "enemy": "enemy",
};

let soundsLoader = {
  "background": "background",
  "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3",
  "shoot": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_2.mp3"
}

// Custom UI Elements
const title = `Cannon Ball`
const description = `In Berlin Wall Breaker, players take control of a cannon to aim and shoot at the right time to break down the Berlin Wall. The gameplay is focused on precision and timing to progress through the levels.`
const instructions =
  `Instructions:
1. Tap to shoot.
2. Destroy all obstacles.`;


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
const joystickEnabled = false;
const buttonEnabled = false;

/*
------------------- GLOBAL CODE STARTS HERE -------------------
*/


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
    addEventListenersPhaser.bind(this)();

    this.score = 0;
    this.lives = 3;

    this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
    this.load.plugin('rexbuttonplugin', rexButtonUrl, true);


    // Load In-Game Assets from assetsLoader
    for (const key in assetsLoader) {
      this.load.image(key, assetsLoader[key]);
    }

    for (const key in soundsLoader) {
      this.load.audio(key, [soundsLoader[key]]);
    }


    this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
    this.load.bitmapFont('pixelfont',
      'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
      'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');

    gameScenePreload(this);
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
    this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
    this.bg.setScrollFactor(0);
    this.bg.displayHeight = this.game.config.height;
    this.bg.displayWidth = this.game.config.width;
    this.sounds.background.setVolume(2.5).setLoop(true).play();
    this.vfx = new VFXLibrary(this);

    // Add UI elements
    this.scoreText = this.add.bitmapText(this.width * 0.5, this.height * 0.05, 'pixelfont', 'Score: 0', 35).setOrigin(0.5);
    this.livesText = this.add.bitmapText(this.width * 0.12, this.height * 0.05, 'pixelfont', 'Bullets: 3', 35).setOrigin(0.5);
    this.instructionText = this.add.bitmapText(this.width * 0.5, this.height * 0.3, 'pixelfont', 'Tap to Shoot', 35).setOrigin(0.5).setDepth(11);
    this.time.delayedCall(2500, () => {
      this.instructionText.destroy();
    })
    // Add input listeners
    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    const pauseButton = this.add.sprite(this.game.config.width * 0.9, this.game.config.height * 0.05, "pauseButton").setOrigin(0.5, 0.5).setScale(1.5);
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
        // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
        // forceMin: 16,
      });
    }

    if (buttonEnabled) {
      this.buttonA = this.add.rectangle(this.width - 80, this.height - 100, 80, 80, 0xcccccc, 0.5)
      this.buttonA.button = this.plugins.get('rexbuttonplugin').add(this.buttonA, {
        mode: 1,
        clickInterval: 100,
      });

      this.buttonA.button.on('down', function (button, gameObject) {
        console.log("button clicked");
      });
    }
    this.shootEmitter = this.vfx.createEmitter('enemy', 0, 0, 0.015, 0, 1000).setAlpha(0.5);

    gameSceneCreate(this);


  }

  update() {

    // How to use joystick with keyboard

    // var joystickKeys = this.joyStick.createCursorKeys();
    // var keyboardKeys = this.input.keyboard.createCursorKeys();
    // if (joystickKeys.right.isDown || keyboardKeys.right.isDown) {
    //     console.log("right");
    // }

    // How to use button

    // if (this.buttonA.button.isDown) {
    //     console.log("button pressed");
    // }

    gameSceneUpdate(this);
  }

  updateScore(points) {
    this.score += points;
    this.updateScoreText();
  }

  updateScoreText() {
    this.scoreText.setText(`Score: ${this.score}`);
  }

  updateLives(lives) {
    this.lives = lives;
    this.updateLivesText();
  }

  updateLivesText() {
    this.livesText.setText(`Bullets: ${this.lives}`);
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
    default: "matter",

  },
  dataObject: {
    name: title,
    description: description,
    instructions: instructions,
  },
  orientation: false,
};


// GAME SCENE PHASER FUNCTIONS
function gameScenePreload(game) {
}

//CREATE FUNCTION FOR THE GAME SCENE
function gameSceneCreate(game) {
  game.group1 = game.matter.world.nextGroup();
  game.group2 = game.matter.world.nextGroup(true);

  let x = orientationSizes[orientation].width / 2;
  let y = orientationSizes[orientation].height * 3 / 4;
  game.ground = game.matter.add.sprite(x, y, 'platform', null, { ignoreGravity: true }).setDisplaySize(orientationSizes[orientation].width * 3 / 4, orientationSizes[orientation].width * 3 / 4);
  game.ground.setStatic(true);


  game.ground.setCollisionGroup(game.group2);


  createPlayer(game);
  game.lives = 4;
  game.updateLives(game.lives);

  game.boxesLeft = -1;

  game.startx = 0;
  game.starty = 0;

  game.canShoot = false;
  game.time.delayedCall(500, () => {
    game.canShoot = true
  });

  game.time.addEvent({
    delay: 500,
    callback: addObstacles,
    callbackScope: game,
    loop: false,
    args: [game]
  });

  game.boxes = [];

  game.sniperScope = game.add.graphics({ fillStyle: { color: 0x000000 } });
  game.sniperScope.setDepth(1);

  game.input.on("pointerup", release, game);


}

//UPDATE FUNCTION FOR THE GAME SCENE
function gameSceneUpdate(game) {

  let worldPoint = game.cameras.main.getWorldPoint(game.input.x, game.input.y);
  drawSniperScope(game, worldPoint.x, worldPoint.y);

  game.boxes.forEach(box => {
    if (box.y > 2000) {
      let index = game.boxes.indexOf(box);
      box.destroy();
      game.updateScore(1);
      game.boxesLeft -= 1;
      game.boxes.splice(index, 1);
    }
  })

  if (game.lives == 0) {
    game.respawnTimer.remove();
    this.sounds.lose.setVolume(0.5).setLoop(false).play();
    game.time.delayedCall(2000, () => {
      game.gameOver();

    })
  }
  if (game.boxesLeft == 0) {
    console.log("CLEARED");
    game.respawnTimer.remove();
    game.lives = 3;
    game.updateLives(game.lives);
    game.boxesLeft = -1;
    game.time.addEvent({
      delay: 500,
      callback: addObstacles,
      callbackScope: game,
      loop: false,
      args: [game]
    });
    game.canShoot = true;
    game.player.setPosition(orientationSizes[orientation].width / 2, 1000);
    game.player.setVelocity(0, 0);
    game.player.setStatic(true);
  }
}

function createPlayer(game) {

  game.player = game.matter.add.sprite(orientationSizes[orientation].width / 2, 1000, 'player', { shape: 'circle', mass: 10, ignoreGravity: true }).setScale(0.1, 0.1);

  game.player.label = 'player';
  game.player.setOrigin(0.5);

  game.player.setCollisionGroup(game.group2);

  game.player.setStatic(true);
}

function click(pointer) {
  this.startx = pointer.worldX;
  this.starty = pointer.worldY;
}

function release(pointer) {
  if (this.canShoot == true) {
    this.canShoot = false;
    this.sounds.shoot.setVolume(0.5).setLoop(false).play();
    let endx = pointer.worldX;
    let endy = pointer.worldY;
    this.startx = this.player.x;
    this.starty = this.player.y;
    let movx = endx - this.startx;
    let movy = endy - this.starty;
    moveplayer(this, movx, movy);
    this.respawnTimer = this.time.delayedCall(2000, () => {
      this.canShoot = true;
      this.lives--;
      this.updateLives(this.lives);
      this.player.setPosition(orientationSizes[orientation].width / 2, 1000);
      this.player.setVelocity(0, 0);
      this.player.setStatic(true);

    });

  }
}

function removeBox(a, b) {
  b.destroy()
  this.updateScore(1);
  this.boxesLeft -= 1;
}

function addObstacles(game) {

  let x = Math.ceil(Math.random() * 5);
  let y = Math.ceil(Math.random() * 5 + 1);

  game.boxesLeft = x * y;

  if (game.boxesLeft > 20) {
    game.lives = 7;
    game.updateLives(game.lives);
  }
  else if (game.boxesLeft > 15) {
    game.lives = 6;
    game.updateLives(game.lives);
  }
  else if (game.boxesLeft > 10) {
    game.lives = 5;
    game.updateLives(game.lives);
  }

  for (var i = 0; i < x; i++) {
    for (var j = 0; j < y; j++) {
      let xPosition = (orientationSizes[orientation].width / 2 - x / 2 * 45) + i * 70
      let yPosition = 550 - (j + 1) * 70;
      addBox(game, xPosition, yPosition);
    }
  }

}

function addBox(game, x, y) {
  let box = game.matter.add.sprite(x, y, 'enemy');

  game.boxes.push(box);
  box.label = 'box';

  box.setDisplaySize(64, 64);

  box.setOnCollideWith(game.player, pair => {
    box.setCollisionGroup(game.group2);
  });
}

function moveplayer(game, velx, vely) {
  game.player.setStatic(false);
  velx = velx * 10;
  vely = vely * 10;
  velx = velx * -1;
  vely = vely * -1;
  let movevelocity = new Phaser.Math.Vector2(velx, vely);
  game.player.setVelocity(-velx / 100, -30);

}

function drawSniperScope(game, x, y) {
  game.sniperScope.clear();

  const scopeRadius = 50;

  game.sniperScope.beginPath();
  game.sniperScope.fillStyle(0xffffff, .1);
  game.sniperScope.fillCircle(x, y, scopeRadius);
  game.sniperScope.closePath();

  game.sniperScope.lineStyle(2, 0xffffff, 1);
  game.sniperScope.beginPath();
  game.sniperScope.moveTo(x, y - scopeRadius);
  game.sniperScope.lineTo(x, y + scopeRadius);
  game.sniperScope.moveTo(x - scopeRadius, y);
  game.sniperScope.lineTo(x + scopeRadius, y);
  game.sniperScope.strokePath();
}
