let assetsLoader = {
    "background": "background",
    "player": "player",
    "collectible": "collectible"
};

let soundsLoader = {
    "background": "background",
    "collect": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3",
    "move": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/car.mp3",
    "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3",
};

// Custom UI Elements
const title = `Hill Climb Racing`
const description = `Drive as far as you can!`
const instructions =
    `Instructions:
    1. Press & hold anywhere to accelerate.
    2. Let go to brake.
    3. Use joystick to tilt back and forward.`;

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

// Touuch Screen Controls
const joystickEnabled = true;
const buttonEnabled = true;

const gameOptions = {

    // start vertical point of the terrain, 0 = very top; 1 = very bottom
    startTerrainHeight: 0.6,

    // max slope amplitude, in pixels
    amplitude: 150,

    // slope length range, in pixels
    slopeLength: [150, 350],

    // a mountain is a a group of slopes.
    mountainsAmount: 3,

    // amount of slopes for each mountain
    slopesPerMountain: 10,

    // positive and negative car acceleration
    carAcceleration: [0.01, -0.005],

    // maximum car velocity
    maxCarVelocity: 1.2,

    fuelSpawnTime: 15,
}

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

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        displayProgressLoader.call(this);
    }

    create() {

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.input.keyboard.disableGlobalCapture();

        this.flipped = false;

        this.sounds.background.setVolume(1).setLoop(true).play()
        this.carSound = this.sounds.move.setVolume(1).setLoop(true);

        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
        this.bg.setScrollFactor(0);
        this.bg.displayHeight = this.height;
        this.bg.displayWidth = this.width;

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', '0', 128).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(11)

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
                base: this.add.circle(0, 0, 80, 0x888888, 0.5).setDepth(1),
                thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.5).setDepth(1),
                // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
                // forceMin: 16,
            });
        }

        if (buttonEnabled) {
            this.buttonA = this.add.rectangle(this.width - 80, this.height - 100, 80, 80, 0xcccccc, 0.5).setDepth(1);
            this.buttonA.button = this.plugins.get('rexbuttonplugin').add(this.buttonA, {
                mode: 1,
                clickInterval: 100,
            });

            this.buttonA.button.on('down', function (button, gameObject) {
            });
        }

        this.bodyPool = [];
        this.bodyPoolId = [];
        this.mountainGraphics = [];
        this.mountainStart = new Phaser.Math.Vector2(-200, 0);
        for (let i = 0; i < gameOptions.mountainsAmount; i++) {

            // each mountain is a graphics object
            this.mountainGraphics[i] = this.add.graphics();

            // generateTerrain is the method to generate the terrain. The arguments are the graphics object and the start position
            this.mountainStart = this.generateTerrain(this.mountainGraphics[i], this.mountainStart);
        }

        this.addPlayer();
        this.collectibles = this.add.group();

        this.timer = this.time.addEvent({
            delay: Phaser.Math.Between(8000, 12000),
            loop: true,
            callback: this.spawnCollectible,
            callbackScope: this
        });

        this.matter.world.on('collisionstart', function (event) {
            event.pairs.forEach(function (pair) {
                if ((pair.bodyA.gameObject === this.body || pair.bodyA.gameObject === this.frontWheel || pair.bodyA.gameObject === this.rearWheel) || (pair.bodyB.gameObject === this.body || pair.bodyB.gameObject === this.frontWheel || pair.bodyB.gameObject === this.rearWheel)) {
                    var collectible = (pair.bodyA.gameObject === this.body || pair.bodyA.gameObject === this.frontWheel || pair.bodyA.gameObject === this.rearWheel) ? pair.bodyB.gameObject : pair.bodyA.gameObject;
                    if (this.collectibles.contains(collectible)) {
                        collectible.destroy();
                        this.sounds.collect.setVolume(1).setLoop(false).play()
                        this.centerText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', "FUEL +10", 64).setOrigin(0.5, 0.5).setDepth(100);
                        this.timerEvent.reset({
                            delay: this.timerEvent.getRemaining() + 10000,
                            callback: () => this.gameOver(),
                            callbackScope: this,
                            loop: false
                        });
                        this.time.delayedCall(1000, () => {
                            this.centerText.destroy();
                        });
                    }
                }
            }, this);
        }, this);


        this.input.on("pointerdown", this.accelerate, this);
        this.input.on("pointerup", this.decelerate, this);
        this.input.keyboard.on("keydown-SPACE", this.accelerate, this);
        this.input.keyboard.on("keyup-SPACE", this.decelerate, this);
        this.input.keyboard.on("keydown-D", this.tiltForward, this);
        this.input.keyboard.on("keydown-A", this.tiltBack, this);

        this.velocity = 0;
        this.acceleration = 0;

        this.timerEvent = this.time.addEvent({
            delay: 20000,
            callback: () => this.gameOver(),
            callbackScope: this,
            loop: false
        });

        // Create a text object for displaying the time
        this.collectibleImage = this.add.image(50, 100, 'collectible').setOrigin(0).setScale(0.08);
        this.timerText = this.add.bitmapText(this.collectibleImage.x + 75, 70, 'pixelfont', '10', 64).setOrigin(0).setDepth(100);
        this.lowFuel = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', "LOW FUEL", 64).setOrigin(0.5, 0.5).setDepth(100).setVisible(false);
        this.flipText = this.add.bitmapText(this.width / 2, this.height - 200, 'pixelfont', "NICE FLIP! +100", 32).setOrigin(0.5, 0.5).setDepth(100).setVisible(false);
        this.cameraUI = this.cameras.add(0, 0, this.width, this.height);
        const ignoredElements = [
            this.pauseButton,
            this.scoreText,
            this.timerText,
            this.lowFuel,
            this.flipText,
            this.collectibleImage
        ]
        this.cameras.main.ignore(ignoredElements);
        this.cameraUI.ignore(this.children.list.filter(item => !ignoredElements.includes(item)));
    }

    update() {

        // How to use joystick with keyboard

        var joystickKeys = this.joyStick.createCursorKeys();
        var keyboardKeys = this.input.keyboard.createCursorKeys();
        if (joystickKeys.right.isDown || keyboardKeys.right.isDown) {
            this.tiltForward();
        }

        if (joystickKeys.left.isDown || keyboardKeys.left.isDown) {
            this.tiltBack();
        }

        // How to use button

        // if (this.buttonA.button.isDown) {
        //     console.log("button pressed");
        // }

        this.cameras.main.scrollX = this.body.x - this.width / 8;

        this.velocity += this.acceleration;
        this.velocity = Phaser.Math.Clamp(this.velocity, 0, gameOptions.maxCarVelocity);

        this.matter.body.setAngularVelocity(this.frontWheelBody, this.velocity);
        this.matter.body.setAngularVelocity(this.rearWheelBody, this.velocity);

        this.mountainGraphics.forEach(function (item) {

            if (this.cameras.main.scrollX > item.x + item.width + 100) {
                this.mountainStart = this.generateTerrain(item, this.mountainStart)
            }
        }.bind(this));

        if (this.frontWheel.y < this.playerBody.position.y && this.rearWheel.y < this.playerBody.position.y) {
            this.flipText.setVisible(true);
            if (!this.flipped) {
                this.updateScore(100);
                this.flipped = true;
            }
        } else {
            this.flipText.setVisible(false);
            this.flipped = false;
        }

        this.updateScore(parseInt(this.player.x / 100 - this.score));

        if (this.timerEvent) {
            var remaining = (1 - this.timerEvent.getProgress()) * 100;
            if (remaining < 15) {
                this.lowFuel.setVisible(true);
            } else {
                this.lowFuel.setVisible(false);
            }
            this.timerText.setText(parseInt(remaining).toString());
        }
    }

    interpolate(vFrom, vTo, delta) {
        let interpolation = (1 - Math.cos(delta * Math.PI)) * 0.5;
        return vFrom * (1 - interpolation) + vTo * interpolation;
    }

    generateTerrain(graphics, mountainStart) {

        // array to store slope points
        let slopePoints = [];

        // variable to count the amount of slopes
        let slopes = 0;

        // slope start point
        let slopeStart = new Phaser.Math.Vector2(0, mountainStart.y);

        // set a random slope length
        let slopeLength = Phaser.Math.Between(gameOptions.slopeLength[0], gameOptions.slopeLength[1]);

        // determine slope end point, with an exception if this is the first slope of the fist mountain: we want it to be flat
        let slopeEnd = (mountainStart.x == 0) ? new Phaser.Math.Vector2(slopeStart.x + gameOptions.slopeLength[1] * 1.5, 0) : new Phaser.Math.Vector2(slopeStart.x + slopeLength, Math.random());

        // current horizontal point
        let pointX = 0;

        // while we have less slopes than regular slopes amount per mountain...
        while (slopes < gameOptions.slopesPerMountain) {

            // slope interpolation value
            let interpolationVal = this.interpolate(slopeStart.y, slopeEnd.y, (pointX - slopeStart.x) / (slopeEnd.x - slopeStart.x));

            // if current point is at the end of the slope...
            if (pointX == slopeEnd.x) {

                // increase slopes amount
                slopes++;

                // next slope start position
                slopeStart = new Phaser.Math.Vector2(pointX, slopeEnd.y);

                // next slope end position
                slopeEnd = new Phaser.Math.Vector2(slopeEnd.x + Phaser.Math.Between(gameOptions.slopeLength[0], gameOptions.slopeLength[1]), Math.random());

                // no need to interpolate, we use slope start y value
                interpolationVal = slopeStart.y;
            }

            // current vertical point
            let pointY = this.height * gameOptions.startTerrainHeight + interpolationVal * gameOptions.amplitude;

            // add new point to slopePoints array
            slopePoints.push(new Phaser.Math.Vector2(pointX, pointY));

            // move on to next point
            pointX++;
        }

        // simplify the slope
        let simpleSlope = simplify(slopePoints, 1, true);

        // place graphics object
        graphics.x = mountainStart.x;

        // draw the ground
        graphics.clear();
        graphics.moveTo(0, this.height);
        graphics.fillStyle(0x654b35);
        graphics.beginPath();
        simpleSlope.forEach(function (point) {
            graphics.lineTo(point.x, point.y);
        }.bind(this))
        graphics.lineTo(pointX, this.height);
        graphics.lineTo(0, this.height);
        graphics.closePath();
        graphics.fillPath();

        // draw the grass
        graphics.lineStyle(16, 0x6b9b1e);
        graphics.beginPath();
        simpleSlope.forEach(function (point) {
            graphics.lineTo(point.x, point.y);
        })
        graphics.strokePath();

        // loop through all simpleSlope points starting from the second
        for (let i = 1; i < simpleSlope.length; i++) {

            // define a line between previous and current simpleSlope points
            let line = new Phaser.Geom.Line(simpleSlope[i - 1].x, simpleSlope[i - 1].y, simpleSlope[i].x, simpleSlope[i].y);

            // calculate line length, which is the distance between the two points
            let distance = Phaser.Geom.Line.Length(line);

            // calculate the center of the line
            let center = Phaser.Geom.Line.GetPoint(line, 0.5);

            // calculate line angle
            let angle = Phaser.Geom.Line.Angle(line);

            // if the pool is empty...
            if (this.bodyPool.length == 0) {

                // create a new rectangle body
                this.matter.add.rectangle(center.x + mountainStart.x, center.y, distance, 10, {
                    isStatic: true,
                    angle: angle,
                    friction: 1,
                    restitution: 0
                });
            }

            // if the pool is not empty...
            else {

                // get the body from the pool
                let body = this.bodyPool.shift();
                this.bodyPoolId.shift();

                // reset, reshape and move the body to its new position
                this.matter.body.setPosition(body, {
                    x: center.x + mountainStart.x,
                    y: center.y
                });
                let length = body.area / 10;
                this.matter.body.setAngle(body, 0)
                this.matter.body.scale(body, 1 / length, 1);
                this.matter.body.scale(body, distance, 1);
                this.matter.body.setAngle(body, angle);
            }
        }

        // assign a custom "width" property to the graphics object
        graphics.width = pointX - 1

        // return the coordinates of last mountain point
        return new Phaser.Math.Vector2(graphics.x + pointX - 1, slopeStart.y);
    }

    addPlayer() {
        // this.player = this.matter.add.sprite(100, 0, 'player', 0);
        // this.player.setScale(0.1);

        this.player = this.add.sprite(this.width / 8, 0, 'player').setScale(0.1);
        this.player.y -= this.player.displayHeight + 400;

        this.playerBody = this.matter.add.rectangle(this.width / 8, 0, 70, 10, {
            friction: 1,
            restitution: 0
        });

        this.flipped = false;

        this.body = this.matter.add.gameObject(this.player, this.playerBody);

        this.frontWheelUI = this.add.circle(this.width / 8 + 25, 25, 15, 0x000000);
        this.frontWheelBody = this.matter.add.polygon(this.width / 8 + 25, 25, 8, 15, {
            friction: 1,
            restitution: 0
        });
        this.frontWheel = this.matter.add.gameObject(this.frontWheelUI, this.frontWheelBody);

        this.rearWheelUI = this.add.circle(this.width / 8 - 25, 25, 15, 0x000000);
        this.rearWheelBody = this.matter.add.polygon(this.width / 8 - 25, 25, 8, 15, {
            friction: 1,
            restitution: 0
        });
        this.rearWheel = this.matter.add.gameObject(this.rearWheelUI, this.rearWheelBody);

        // these two constraints will bind front wheel to the body
        this.matter.add.constraint(this.body, this.frontWheel, 20, 0, {
            pointA: {
                x: 25,
                y: 10
            }
        });
        this.matter.add.constraint(this.body, this.frontWheel, 20, 0, {
            pointA: {
                x: 40,
                y: 10
            }
        });

        // same thing for rear wheel
        this.matter.add.constraint(this.body, this.rearWheel, 20, 0, {
            pointA: {
                x: -25,
                y: 10
            }
        });
        this.matter.add.constraint(this.body, this.rearWheel, 20, 0, {
            pointA: {
                x: -40,
                y: 10
            }
        });
    }

    spawnCollectible() {
        var collectible = this.matter.add.sprite(this.player.x + this.width, 400, 'collectible').setScale(0.1);
        this.collectibles.add(collectible);
    }

    accelerate() {
        this.acceleration = gameOptions.carAcceleration[0];
        this.carSound.setVolume(1).play();

    }

    decelerate() {
        this.acceleration = gameOptions.carAcceleration[1];
        this.tweens.add({
            targets: this.carSound,
            volume: 0,
            duration: 200
        });
    }

    tiltForward() {
        this.matter.body.setAngularVelocity(this.playerBody, 0.05);
    }

    tiltBack() {
        this.matter.body.setAngularVelocity(this.playerBody, -0.05);
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(this.score);
    }

    gameOver() {
        initiateGameOver.bind(this)({
            score: this.score
        });
    }

    pauseGame() {
        handlePauseGame.bind(this)();
    }
}

function displayProgressLoader() {
    let width = 320;
    let height = 50;
    let x = (this.width / 2) - 160;
    let y = (this.height / 2) - 50;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(x, y, width, height);

    const loadingText = this.make.text({
        x: this.width / 2,
        y: this.height / 2 + 20,
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
        matter: {
            debug: false,
        }
    },
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: true,
};

function getSqDist(p1, p2) {

    var dx = p1.x - p2.x,
        dy = p1.y - p2.y;

    return dx * dx + dy * dy;
}

// square distance from a point to a segment
function getSqSegDist(p, p1, p2) {

    var x = p1.x,
        y = p1.y,
        dx = p2.x - x,
        dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {

        var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2.x;
            y = p2.y;

        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p.x - x;
    dy = p.y - y;

    return dx * dx + dy * dy;
}
// rest of the code doesn't care about point format

// basic distance-based simplification
function simplifyRadialDist(points, sqTolerance) {

    var prevPoint = points[0],
        newPoints = [prevPoint],
        point;

    for (var i = 1, len = points.length; i < len; i++) {
        point = points[i];

        if (getSqDist(point, prevPoint) > sqTolerance) {
            newPoints.push(point);
            prevPoint = point;
        }
    }

    if (prevPoint !== point) newPoints.push(point);

    return newPoints;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
    var maxSqDist = sqTolerance,
        index;

    for (var i = first + 1; i < last; i++) {
        var sqDist = getSqSegDist(points[i], points[first], points[last]);

        if (sqDist > maxSqDist) {
            index = i;
            maxSqDist = sqDist;
        }
    }

    if (maxSqDist > sqTolerance) {
        if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
        simplified.push(points[index]);
        if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
}

// simplification using Ramer-Douglas-Peucker algorithm
function simplifyDouglasPeucker(points, sqTolerance) {
    var last = points.length - 1;

    var simplified = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);

    return simplified;
}

// both algorithms combined for awesome performance
function simplify(points, tolerance, highestQuality) {

    if (points.length <= 2) return points;

    var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

    points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
    points = simplifyDouglasPeucker(points, sqTolerance);

    return points;
}