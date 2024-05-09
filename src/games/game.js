import Phaser from "phaser";
import * as braincadeSDK from "../braincadeSDK";
import VFXLibrary from "../vfxLibrary";
import { populateAssetsLoader } from "./assets_list";
import { populateSoundsLoader } from "./sounds_list";

let assetsLoader = {
    "background": "background",
    "collectible_1": "collectible_1",
    "collectible_2": "collectible_2",
    "collectible_3": "collectible_3"
}

let soundsLoader = {
    "background": "background",
    "collect": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3",
    "move": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_3.mp3",
}

assetsLoader = populateAssetsLoader(assetsLoader);
soundsLoader = populateSoundsLoader(soundsLoader);

const title = `Slot Match`
const description = `Slot Match is a Match3 game where the player needs to match similar elements like casino slot machine elements to progress through levels and earn points.`
const instructions =
    `Instructions:
    Match 3 of the same type to score points
    Swipe to swap objects`;

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
    }

    preload() {
        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }

        braincadeSDK.addEventListenersPhaser.bind(this)();

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');
    }

    create() {
        this.vfx = new VFXLibrary(this);

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(1).setLoop(true).play()
        var me = this;

        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
        this.bg.displayWidth = this.game.config.width;
        this.bg.displayHeight = this.game.config.height;


        this.width = this.game.config.width;
        this.height = this.game.config.height;

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 50, 'pixelfont', '0', 64).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(100)
        // here u can remove the keyword to have less tile sheet
        this.pauseButton = this.add.sprite(this.width - 150, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.setDepth(11)
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        me.tileTypes = ['collectible_1', 'collectible_2', 'collectible_3'];
        for (const tileType of me.tileTypes) {
            this.vfx.createEmitter(tileType)
        }
        // this.vfx.createEmitter()
        me.candyscore = 0;
        me.activeTile1 = null;
        me.activeTile2 = null;
        me.canMove = false;

        // In Phaser 3, we need to use this.textures.get() to get image data
        // me.tileWidth = this.textures.get('blue').getSourceImage().width;
        // me.tileHeight = this.textures.get('blue').getSourceImage().height;


        // In Phaser 3, groups are created a bit differently
        me.tiles = this.add.group({
            key: me.tileTypes,
            frameQuantity: 0 // Assuming you want 6 of each type
        });

        me.tileGrid = [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
        ];

        me.tileWidth = (this.width) / me.tileGrid.length;
        me.tileHeight = this.height / (me.tileGrid[0].length + 1);
        var seed = Date.now();
        me.random = new Phaser.Math.RandomDataGenerator([seed]);

        me.initTiles();

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        timerEvent = this.time.addEvent({
            delay: 120000, // 120 seconds in milliseconds
            callback: () => this.gameOver(),
            callbackScope: this,
            loop: false
        });


        // Create a text object for displaying the time
        timerText = this.add.bitmapText(150, 50, 'pixelfont', '0', 64).setOrigin(0.5).setDepth(100);
    }

    update(delta) {
        var me = this;

        if (me.activeTile1 && !me.activeTile2) {
            var hoverX = me.input.activePointer.x;
            var hoverY = me.input.activePointer.y;

            var hoverPosX = Math.floor(hoverX / me.tileWidth);
            var hoverPosY = Math.floor((hoverY - me.tileHeight) / me.tileHeight);
            console.log(hoverPosX, hoverPosY);

            var difX = (hoverPosX - me.startPosX);
            var difY = (hoverPosY - me.startPosY);

            if (!(hoverPosY > me.tileGrid[0].length - 1 || hoverPosY < 0) && !(hoverPosX > me.tileGrid.length - 1 || hoverPosX < 0)) {
                if ((Math.abs(difY) == 1 && difX == 0) || (Math.abs(difX) == 1 && difY == 0)) {
                    me.canMove = false;
                    me.activeTile2 = me.tileGrid[hoverPosX][hoverPosY];

                    me.swapTiles();

                    // Phaser 3 uses a different syntax for time events
                    me.time.delayedCall(500, function () {
                        me.checkMatch();
                    });
                }
            }
        }

        if (timerEvent) {
            // Calculate remaining time in seconds
            var remainingTime = Math.floor((timerEvent.delay - timerEvent.getElapsed()) / 1000);
            timerText.setText(remainingTime.toString());
            if (remainingTime <= 0) {
                timerEvent = null;
            }
        }
    }

    initTiles() {
        var me = this;

        for (var i = 0; i < me.tileGrid.length; i++) {
            for (var j = 0; j < me.tileGrid[i].length; j++) {
                var tile = me.addTile(i, j);
                me.tileGrid[i][j] = tile;
            }
        }

        // Phaser 3 uses a different syntax for time events
        me.time.delayedCall(600, function () {
            me.checkMatch();
        });
    }
    addTile(x, y) {
        var me = this;

        var tileToAdd = me.tileTypes[Phaser.Math.Between(0, me.tileTypes.length - 1)];

        // Creating the tile
        var tile = me.add.sprite((x * me.tileWidth) + me.tileWidth / 2, 0, tileToAdd);
        tile.setScale(.15);
        tile.setOrigin(0.5, 0.5); // Setting the anchor point to the center

        // Adding tween for the tile
        me.tweens.add({
            targets: tile,
            y: me.tileHeight + (y * me.tileHeight) + (me.tileHeight / 2),
            duration: 500,
            ease: 'Linear'
        });

        // Enabling input and setting up a click event
        tile.setInteractive();
        tile.on('pointerdown', function () {
            me.tileDown(tile);
        });

        tile.tileType = tileToAdd;

        return tile;
    }
    tileDown(tile) {
        var me = this;

        if (me.canMove) {
            me.activeTile1 = tile;

            me.startPosX = (tile.x - me.tileWidth / 2) / me.tileWidth;
            me.startPosY = (tile.y - (me.tileHeight / 2) - me.tileHeight) / me.tileHeight;
        }
    }

    tileUp() {
        var me = this;
        me.activeTile1 = null;
        me.activeTile2 = null;
    }
    swapTiles() {
        var me = this;

        if (me.activeTile1 && me.activeTile2) {
            this.sounds.move.setVolume(1).setLoop(false).play();
            console.log(me.activeTile1.x, me.activeTile1.y, me.tileWidth, me.tileHeight);
            var tile1Pos = {
                x: (me.activeTile1.x - me.tileWidth / 2) / me.tileWidth,
                y: ((me.activeTile1.y - (me.tileHeight / 2) - me.tileHeight) / me.tileHeight)
            }
            console.log(me.activeTile2.x, me.activeTile2.y, me.tileWidth, me.tileHeight);
            var tile2Pos = {
                x: (me.activeTile2.x - me.tileWidth / 2) / me.tileWidth,
                y: ((me.activeTile2.y - (me.tileHeight / 2) - me.tileHeight) / me.tileHeight)
            };

            console.log(tile1Pos, tile2Pos);

            me.tileGrid[tile1Pos.x][tile1Pos.y] = me.activeTile2;
            me.tileGrid[tile2Pos.x][tile2Pos.y] = me.activeTile1;

            // Phaser 3 Tween
            me.tweens.add({
                targets: me.activeTile1,
                x: tile2Pos.x * me.tileWidth + (me.tileWidth / 2),
                y: me.tileHeight + (tile2Pos.y * me.tileHeight) + (me.tileHeight / 2),
                duration: 200,
                ease: 'Linear'
            });

            // Phaser 3 Tween
            me.tweens.add({
                targets: me.activeTile2,
                x: tile1Pos.x * me.tileWidth + (me.tileWidth / 2),
                y: me.tileHeight + (tile1Pos.y * me.tileHeight) + (me.tileHeight / 2),
                duration: 200,
                ease: 'Linear'
            });

            me.activeTile1 = me.tileGrid[tile1Pos.x][tile1Pos.y];
            me.activeTile2 = me.tileGrid[tile2Pos.x][tile2Pos.y];

            me.comboActive = true;
            me.combo = 0;
        }
    }

    checkMatch() {
        var me = this;

        var matches = me.getMatches(me.tileGrid);

        if (matches.length > 0) {
            if (this.comboActive) {
                this.combo++;
            }
            me.removeTileGroup(matches);
            this.vfx.shakeCamera(200);
            this.sounds.collect.setVolume(1).setLoop(false).play();
            if (this.comboActive) {
                var text = "NICE!"
                switch (this.combo) {
                    case 2:
                        text = "GREAT!!"
                        break;
                    case 3:
                        text = "AWESOME!!!"
                        break;
                }
                if (this.combo >= 4) {
                    text = "UNSTOPPABLE!!!!"
                }
                this.centerText = this.add.bitmapText(this.width / 2, this.height / 2.5, 'pixelfont', text, 128).setOrigin(0.5, 0.5).setDepth(100);
                this.comboText = this.add.bitmapText(this.width / 2, this.height / 2.5 + 200, 'pixelfont', "COMBO x" + this.combo, 128).setOrigin(0.5, 0.5).setDepth(100);
                this.time.delayedCall(400, () => {
                    this.centerText.destroy();
                    this.comboText.destroy();
                });
            }
            me.resetTile();
            me.fillTile();

            // Phaser 3 Time Events
            me.time.delayedCall(500, function () {
                me.tileUp();
            });

            // Phaser 3 Time Events
            me.time.delayedCall(600, function () {
                me.checkMatch();
            });

        } else {
            me.swapTiles();
            me.combo = 0;
            me.comboActive = false;

            // Phaser 3 Time Events
            me.time.delayedCall(500, function () {
                me.tileUp();
                me.canMove = true;
            });
        }
    }
    getMatches(tileGrid) {
        var matches = [];
        var groups = [];

        for (var i = 0; i < tileGrid.length; i++) {
            var tempArr = tileGrid[i];
            groups = [];
            for (var j = 0; j < tempArr.length; j++) {
                if (j < tempArr.length - 2)
                    if (tileGrid[i][j] && tileGrid[i][j + 1] && tileGrid[i][j + 2]) {
                        if (tileGrid[i][j].tileType == tileGrid[i][j + 1].tileType && tileGrid[i][j + 1].tileType == tileGrid[i][j + 2].tileType) {
                            if (groups.length > 0) {
                                if (groups.indexOf(tileGrid[i][j]) == -1) {
                                    matches.push(groups);
                                    groups = [];
                                }
                            }

                            if (groups.indexOf(tileGrid[i][j]) == -1) {
                                groups.push(tileGrid[i][j]);
                            }
                            if (groups.indexOf(tileGrid[i][j + 1]) == -1) {
                                groups.push(tileGrid[i][j + 1]);
                            }
                            if (groups.indexOf(tileGrid[i][j + 2]) == -1) {
                                groups.push(tileGrid[i][j + 2]);
                            }
                        }
                    }
            }
            if (groups.length > 0) matches.push(groups);
        }

        for (j = 0; j < tileGrid.length; j++) {
            var tempArr = tileGrid[j];
            groups = [];
            for (i = 0; i < tempArr.length; i++) {
                if (i < tempArr.length - 2)
                    if (tileGrid[i][j] && tileGrid[i + 1][j] && tileGrid[i + 2][j]) {
                        if (tileGrid[i][j].tileType == tileGrid[i + 1][j].tileType && tileGrid[i + 1][j].tileType == tileGrid[i + 2][j].tileType) {
                            if (groups.length > 0) {
                                if (groups.indexOf(tileGrid[i][j]) == -1) {
                                    matches.push(groups);
                                    groups = [];
                                }
                            }

                            if (groups.indexOf(tileGrid[i][j]) == -1) {
                                groups.push(tileGrid[i][j]);
                            }
                            if (groups.indexOf(tileGrid[i + 1][j]) == -1) {
                                groups.push(tileGrid[i + 1][j]);
                            }
                            if (groups.indexOf(tileGrid[i + 2][j]) == -1) {
                                groups.push(tileGrid[i + 2][j]);
                            }
                        }
                    }
            }
            if (groups.length > 0) matches.push(groups);
        }

        return matches;
    }
    removeTileGroup(matches) {
        var me = this;

        for (var i = 0; i < matches.length; i++) {
            var tempArr = matches[i];

            for (var j = 0; j < tempArr.length; j++) {
                var tile = tempArr[j];
                var tilePos = me.getTilePos(me.tileGrid, tile);
                if (tile) {
                    this.vfx.createEmitter(tile.tileType, tile.x, tile.y, 0.01, 0.02, 500).explode(100);
                    tile.destroy();
                }

                me.incrementScore();
                // me.updateScore(10);

                if (tilePos.x != -1 && tilePos.y != -1) {
                    me.tileGrid[tilePos.x][tilePos.y] = null;
                }
            }
        }
    }
    getTilePos(tileGrid, tile) {
        var pos = { x: -1, y: -1 };

        for (var i = 0; i < tileGrid.length; i++) {
            for (var j = 0; j < tileGrid[i].length; j++) {
                if (tile == tileGrid[i][j]) {
                    pos.x = i;
                    pos.y = j;
                    break;
                }
            }
        }

        return pos;
    }
    resetTile() {
        var me = this;

        for (var i = 0; i < me.tileGrid.length; i++) {
            for (var j = me.tileGrid[i].length - 1; j > 0; j--) {
                if (me.tileGrid[i][j] == null && me.tileGrid[i][j - 1] != null) {
                    var tempTile = me.tileGrid[i][j - 1];
                    me.tileGrid[i][j] = tempTile;
                    me.tileGrid[i][j - 1] = null;

                    // Phaser 3 Tween
                    me.tweens.add({
                        targets: tempTile,
                        y: me.tileHeight + (me.tileHeight * j) + (me.tileHeight / 2),
                        duration: 200,
                        ease: 'Linear'
                    });

                    j = me.tileGrid[i].length;
                }
            }
        }
    }
    fillTile() {

        var me = this;

        for (var i = 0; i < me.tileGrid.length; i++) {

            for (var j = 0; j < me.tileGrid.length; j++) {

                if (me.tileGrid[i][j] == null) {
                    var tile = me.addTile(i, j);

                    me.tileGrid[i][j] = tile;
                }

            }
        }

    }

    incrementScore() {

        var me = this;

        gameScore += 10 * this.combo || 1;
        me.updateScore(gameScore);
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(gameScore);
    }

    gameOver() {
        braincadeSDK.initiateGameOver.bind(this)({
            "score": this.score
        });
    }

    pauseGame() {
        braincadeSDK.handlePauseGame.bind(this)();
    }
}

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
            gravity: { y: 0 },
            debug: false,
        },
    },
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: true,
};

export default config;

let gameScore = 0;
let gameLevel = 1;
let timerEvent;
let timerText;
var timeDown = 120000;