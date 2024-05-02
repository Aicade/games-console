const assetsLoader = {
    "background": "background",
    "player": "player",
    "enemy": "enemy",
};

const title = `Angry Birds`
const description = `Aim and throw your character at targets with increasing difficulty to score the highest points possible.`
const instructions =
    `Instructions:
  1. Click, hold, and drag to aim.
  2. Release to shoot.
  3. Destroy all obstacles.
  4. You have 3 lives.`;

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

const orientation = "landscape";

const joystickEnabled = false;
const buttonEnabled = false;

const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

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

        for (const key in assetsLoader) {
            this.load.image(key, assets_list[assetsLoader[key]]);
        }

        this.load.image("platform", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Glass/s2+Glass+03.png")
        this.load.image("arrow", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/arrow.png")
        this.load.image("heart", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png");
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.audio('bgm', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-3.mp3']);
        this.load.audio('upgrade', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/upgrade_2.mp3']);
        this.load.audio('stretch', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/stretch.mp3']);
        this.load.audio('collect', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3']);
        this.load.audio('shoot', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_3.mp3']);

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);
    }

    create() {

        this.vfx = new VFXLibrary(this);
        this.physics.world.setFPS(120);
        this.sound.add('bgm', { loop: true, volume: 1 }).play();

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
        this.bg.setScrollFactor(0);
        this.bg.displayHeight = this.game.config.height;
        this.bg.displayWidth = this.game.config.width;

        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 64).setOrigin(0.5, 0.5);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

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

            this.buttonA.button.on('down', function (button, gameObject) {
                console.log("button clicked");
            });
        }

        this.vfx.addCircleTexture('red', 0xFF0000, 1, 10);
        this.vfx.addCircleTexture('orange', 0xFFA500, 1, 10);
        this.vfx.addCircleTexture('yellow', 0xFFFF00, 1, 10);

        this.addHearts(3);

        this.ground = this.physics.add.sprite(this.width / 2, this.height, 'platform').setFriction(100, 100).setOrigin(0.5, 1);
        this.ground.body.immovable = true;
        this.ground.body.moves = false;
        this.ground.setImmovable(true);
        this.ground.setGravity(0, 0);
        this.ground.setDisplaySize(this.width, this.height * 0.2);

        this.createPlayer();

        this.level = 1;

        this.boxesLeft = -1;

        this.startx = null;
        this.starty = null;

        this.canShoot = false;
        this.time.delayedCall(500, () => {
            this.canShoot = true
        });

        this.time.addEvent({
            delay: 100,
            callback: this.addObstacles,
            callbackScope: this,
            loop: false,
            args: [this]
        });

        this.boxes = this.physics.add.group({
            allowGravity: true,
        });

        this.input.on("pointerdown", this.click, this);
        this.input.on("pointerup", this.release, this);

        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.boxes, this.ground);
        this.physics.add.collider(this.player, this.boxes, this.removeBox, null, this);
        this.physics.add.collider(this.boxes, this.boxes);

    }

    update() {
        if (this.lives == 0) {
            this.respawnTimer.remove();
            this.gameOver();
        }
        if (this.boxesLeft == 0) {
            this.sound.add('upgrade', { loop: false, volume: 0.5 }).play();
            this.centerText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', "LEVEL UP!", 64).setOrigin(0.5, 0.5).setDepth(100);
            this.time.delayedCall(500, () => {
                this.centerText.destroy();
            });
            this.respawnTimer.remove();
            this.lives = 3;
            this.addHearts(3);
            this.level++;
            this.updateLives(this.lives);
            this.boxesLeft = -1;
            this.time.addEvent({
                delay: 500,
                callback: this.addObstacles,
                callbackScope: this,
                loop: false,
                args: [this]
            });
            this.canShoot = true;
            this.player.setPosition(256, this.ground.y - this.ground.displayHeight - 100);
            this.player.setVelocity(0, 0);
            this.startx = null;
            this.starty = null;
        }
        if (this.canShoot && this.startx && this.starty) {
            const pointerx = this.input.activePointer.x;
            const pointery = this.input.activePointer.y;
            this.arrow.setAngle(180 + Phaser.Math.Angle.Between(this.startx, this.starty, pointerx, pointery) * 180 / 3.14);
        }
    }

    createPlayer() {
        this.player = this.physics.add.sprite(256, this.ground.y - this.ground.displayHeight - 100, 'player');
        this.player.body.setDragX(200);
        this.player.setOrigin(0.5);
        this.player.setScale(0.08);
        this.player.setMass(2);
    }

    addHearts(count) {
        if (this.hearts) {
            this.hearts.destroy(true);
        }
        this.hearts = this.add.group();
        for (var i = 0; i < count; i++) {
            var heart = this.hearts.create(50 + (i * 60), 50, 'heart').setScale(0.05).setOrigin(0.5, 0.5);
            this.vfx.scaleGameObject(heart, 1.2, 500, -1);
        }
    }


    click(pointer) {
        this.startx = pointer.worldX;
        this.starty = pointer.worldY;
        if (this.canShoot == true) {
            this.arrow = this.add.sprite(this.player.x + this.player.displayWidth / 2, this.player.y - this.player.displayHeight / 2, 'arrow');
            this.sound.add('stretch', { loop: false, volume: 1 }).play();
        }
    }

    release(pointer) {
        if (this.canShoot == true) {
            this.arrow.destroy();
            this.sound.add('shoot', { loop: false, volume: 1 }).play();
            this.canShoot = false;
            let endx = pointer.worldX;
            let endy = pointer.worldY;
            let movx = endx - this.startx;
            let movy = endy - this.starty;
            this.moveplayer(movx, movy);
            this.respawnTimer = this.time.delayedCall(3000, () => {
                this.canShoot = true;
                this.lives--;
                var heartsChildren = this.hearts.getChildren();
                console.log(heartsChildren[heartsChildren - 1]);
                heartsChildren[heartsChildren.length - 1].destroy();
                this.addHearts(this.lives);
                this.updateLives(this.lives);
                this.player.setPosition(256, this.ground.y - this.ground.displayHeight - 100);
                this.player.setVelocity(0, 0);
                this.startx = null;
                this.starty = null;
            });

        }
    }

    removeBox(a, b) {
        this.sound.add('collect', { loop: false, volume: 1 }).play();
        this.vfx.createEmitter('red', b.x, b.y, 1, 0, 500).explode(10);
        this.vfx.createEmitter('yellow', b.x, b.y, 1, 0, 500).explode(10);
        this.vfx.createEmitter('orange', b.x, b.y, 1, 0, 500).explode(10);
        b.destroy();
        this.updateScore(1);
        this.boxesLeft -= 1;
    }

    addObstacles() {
        let x = parseInt(3 + this.level / 5);
        let y = parseInt(1 + this.level / 3);

        this.boxesLeft = x * y;

        const startX = this.width - x * 100 - 100;
        const startY = this.ground.y - this.ground.displayHeight - 60;

        for (var i = 0; i < y; i++) {
            for (var j = 0; j < x; j++) {
                let xPosition = startX + (j * 100) + Phaser.Math.Between(20, 60);
                let yPosition = startY - (i * 150);
                this.addBox(xPosition, yPosition);
            }
        }
    }

    addBox(x, y) {
        let box = this.boxes.getFirstDead(true, x, y, 'enemy');

        if (!box) {
            box = this.boxes.create(x, y, 'enemy').setOrigin(0.5, 1);
        }

        box.body.setBounce(0.5);
        box.setScale(0.08);
        box.checkWorldBounds = true;
        box.outOfBoundsKill = true;
    }

    moveplayer(velx, vely) {
        this.player.body.immovable = false;
        this.player.body.moves = true;
        this.player.setImmovable(false);
        velx = -1 * velx * (50 + this.level);
        vely = -1 * vely * (50 + this.level);
        // velx = velx * -1;
        // vely = vely * -1;
        let movevelocity = new Phaser.Math.Vector2(velx, vely);
        this.player.body.velocity = movevelocity.normalize().scale(1000);
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(this.score);
    }

    updateLives(lives) {
        this.lives = lives;
        this.updateLivesText();
    }

    updateLivesText() {
        // this.livesText.setText(`Lives: ${this.lives}`);
    }

    gameOver() {
        initiateGameOver.bind(this)({
            "score": this.score
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
    this.load.on('fileprogress', function (file) {
        console.log(file.src);
    });
    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
    });
}

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
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false,
        },
    },
    orientation: true,
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
};
