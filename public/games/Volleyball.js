// Touuch Screen Controls
const joystickEnabled = true;
const buttonEnabled = true;
const hideButtons = true;
var isMobile = false;

// JOYSTICK DOCUMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/
const rexJoystickUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js";

// BUTTON DOCMENTATION: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/button/
const rexButtonUrl = "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexbuttonplugin.min.js";

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



class GameScene extends Phaser.Scene {
    constructor() {
        super();
        this.init = this.init.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
    }

    init() {
        this.ball = null;
        this.net = null;
        this.players = [];
        this.score = { left: 0, right: 0 };
        this.lastScore = { left: 0, right: 0 };
        this.scoreText = null;
        this.difficultyText = null;
        this.difficultyModifier = 0;
        this.lastMatchPointDifference = 0;
        this.canScore = true;
        this.currentDifficulty = 0.7;
        this.bestClear = 0;
        this.ground = null;
        this.camera = null;
        this.GROUND_Y = 600;
        this.CEILING_Y = 0;
        this.cursors = null;
        this.serveState = 'idle';
        this.canJump = false;
        this.serveTimer = 0;
        this.servingPlayer = null;
        this.servingTeam = 0;
        this.isFirstServe = true;
    }

        preload() {
            for (const key in _CONFIG.imageLoader) {
                this.load.image(key, _CONFIG.imageLoader[key]);
            }
    
            for (const key in _CONFIG.soundsLoader) {
                this.load.audio(key, [_CONFIG.soundsLoader[key]]);
            }
    
            if (joystickEnabled) this.load.plugin('rexvirtualjoystickplugin', rexJoystickUrl, true);
            if (buttonEnabled) this.load.plugin('rexbuttonplugin', rexButtonUrl, true);
    
            this.load.image("heart", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png");
            this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
            this.load.bitmapFont('pixelfont','https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png','https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
    
            
            displayProgressLoader.call(this);
            addEventListenersPhaser.bind(this)();
        }

        create() {
            //for Keyboard control
            this.input.keyboard.disableGlobalCapture();
            
    
            this.sounds = {};
            for (const key in _CONFIG.soundsLoader) {
                this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
            }
    
            this.sounds.background.setVolume(3).setLoop(true).play();
            this.vfx = new VFXLibrary(this);


            // Add input listeners
            this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
            this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
            this.pauseButton.setInteractive({ cursor: 'pointer' });
            this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
            this.pauseButton.on('pointerdown', () => this.pauseGame());
    
    

            // Set custom world bounds
            this.physics.world.setBounds(0, 0, 1200, 600);
            this.initializePlayerData(); // Add this line to initialize player data
            this.isFirstServe = true; // Set the first serve flag
            // Create the difficulty text
            // this.difficultyText = this.add.text(10, 10, '', {
            //     fontSize: '16px',
            //     fill: '#ffffff'
            // });
            //this.updateDifficultyText(); // Now update the difficulty text
            // Create the court
            const sky = this.add.image(600, 300, 'background');
            sky.setDisplaySize(this.scale.width, this.scale.height); // Set to full screen
            //this.sky.setOrigin(0, 0); // Set origin to top-left corner
           //this.sky.displayWidth = this.sys.game.config.width;
            //this.sky.displayHeight = this.sys.game.config.height;

            // Create the sand
            this.sand = this.add.tileSprite(600, this.GROUND_Y - -30, 1280, 65, 'platform');
            
             // Create the ground (invisible physics body)
            this.ground = this.add.rectangle(600, this.GROUND_Y, 1300, 2, 0x000000);
            this.ground.setAlpha(0); // Make it invisible
            this.physics.add.existing(this.ground, true);

            
            // Static bodies are already immovable, so we don't need to set it
            // Static bodies also don't have gravity by default

           // Create the ceiling (invisible physics body)
           this.ceiling = this.add.rectangle(600, this.CEILING_Y, 1200, 2, 0x000000);
           this.ceiling.setAlpha(0); // Make it invisible
           this.physics.add.existing(this.ceiling, true);

            // Create the net (reduced height)
            this.net = this.physics.add.image(600, this.GROUND_Y - 75, 'platform_1');
            this.net.setScale(0.025,0.15)
            this.net.setImmovable(true);
            
            this.net.body.allowGravity = false;
            this.physics.add.existing(this.net, true);


            // // Create an invisible barrier extending upwards from the net
            this.netBarrier = this.add.rectangle(600, 225, 25.6, 450, 0xffffff);
            this.netBarrier.setAlpha(0); // Make it invisible
            this.physics.add.existing(this.netBarrier, true);

            // Create the ball
            // Create the ball
            this.ball = this.physics.add.image(600, 300, 'collectible');
            this.ball.setScale(0.2);
            this.physics.add.existing(this.ball);
            const collisionRadius = this.ball.width * 1; 
            //this.ball.body.setCircle(150,0,0); // Set the physics body to match the visual size
            this.ball.body.setCollideWorldBounds(false);
            this.ball.body.setBounce(1);
            this.ball.body.setVelocity(Phaser.Math.Between(-200, 200), -200);
            this.ball.body.setImmovable(true); // Start with the ball immovable

            // Create players
            const playerPositions = [{
                x: 300,
                y: this.GROUND_Y - 30
            }, {
                x: 450,
                y: this.GROUND_Y - 30
            }, // Team 1
            {
                x: 750,
                y: this.GROUND_Y - 30
            }, {
                x: 900,
                y: this.GROUND_Y - 30
            } // Team 2
           ];
            playerPositions.forEach((pos, index) => {
                const playerImage = index < 2 ? 'player' : 'player_1';
                const player = this.physics.add.image(pos.x, pos.y, playerImage);
                player.setScale(0.2); // Adjust scale as needed
                
                player.setCollideWorldBounds(true);
                player.setBounce(0.2);
                player.setFriction(0, 0);
                
                // Set the player's body size and offset for more accurate collisions
                const bodyWidth = player.width * 0.7;
                const bodyHeight = player.height * 0.8;
                player.body.setSize(bodyWidth, bodyHeight);
                player.body.setOffset((player.width - bodyWidth) / 2, player.height - bodyHeight);
        
                // Adjust the player's position so they're standing on the ground
                player.y -= player.height * player.scale * 0.5;
        
                this.players.push(player);
            });
        

            // Add flashing effect to the back red player
            this.flashingTween = this.tweens.add({
                targets: this.players[1],
                alpha: { from: 1, to: 0.5 },
                tint: { from: 0xff0000, to: 0xff8080 },
                duration: 500,
                yoyo: true,
                repeat: -1
             });
            // Initialize player data
            this.initializePlayerData();

            // Set up collisions
            this.physics.add.collider(this.ball, this.players, this.hitBall, null, this);
            this.physics.add.collider(this.ball, this.net, this.hitNet, null, this);
            this.physics.add.collider(this.ball, this.ceiling, this.hitCeiling, null, this);
            this.players.forEach(player => {
                this.physics.add.collider(player, this.ground);
                this.physics.add.collider(player, this.netBarrier, this.handleNetCollision, null, this);
                this.physics.add.collider(player, this.net, this.handleNetCollision, null, this);
            });
            // Add colliders between teammates with custom handling
            this.physics.add.collider(this.players[0], this.players[1], this.handleTeammateCollision, null, this); // Left team
            this.physics.add.collider(this.players[2], this.players[3], this.handleTeammateCollision, null, this); // Right team
            // Add black bar behind score text
            const scoreBar = this.add.rectangle(600, 30, 300, 40, 0x000000);
            scoreBar.setAlpha(0.7);
            // Add score text
                    this.scoreText = this.add.bitmapText(600, 30, 'pixelfont', 'Team A: 0 | Team B: 0', 28).setOrigin(0.5, 0.5);

            this.scoreText.setOrigin(0.5, 0.5);
            // Add difficulty text
            // this.difficultyText = this.add.text(10, 10, '', {
            //     fontSize: '32px',
            //     fill: '#000000'
            // });

            this.updateDifficultyText();
            // Add Best Clear text
            // this.bestClearText = this.add.bitmapText(10, 50, 'pixelfont', '', 32);

            this.updateBestClearText();
            // Add game information text to the top right corner
            this.add.bitmapText(1190, 10, 'pixelfont', '10 points to win\nArrow keys to move/jump', 28).setOrigin(1, 0);
            this.camera = this.cameras.main;
            this.camera.setBounds(0, 0, 1200, 600);
            // No need to center the camera as it now covers the entire terrain
            // Initialize cursor keys
            this.cursors = this.input.keyboard.createCursorKeys();
            // Start the first serve
            this.resetBall();
        }
        pauseGame() {
            
            handlePauseGame.bind(this)();
        }
        gameOver() {
            initiateGameOver.bind(this)({ score: this.score });
            if (this.bgMusic.isPlaying) {
                this.bgMusic.stop();
            }
        }

        update(time, delta) {
            // // Update glow sprite position
            // if (this.players[1].glowSprite) {
            //     this.players[1].glowSprite.x = this.players[1].x;
            //     this.players[1].glowSprite.y = this.players[1].y;
            // }


            const isPreServeOrAnnouncement = this.serveState === 'preparing' || this.serveState === 'announcement';
            if (isPreServeOrAnnouncement && !this.isFirstServe) {
                this.ball.body.setImmovable(true);
                this.ball.body.setAllowGravity(false);
                this.serveTimer += delta;
                const serveHeight = this.CEILING_Y + (this.GROUND_Y - this.CEILING_Y) * 0.2; // 20% from ceiling
                if (this.serveTimer < 1900) { // Keep ball in fixed position for 1.9 seconds
                    // Determine which team is serving
                    const servingTeam = this.servingTeam;
                    // Set fixed serve position based on serving team
                    let serveX;
                    if (servingTeam === 0) { // Left team serving
                        serveX = 390; // 35% of 600 (left half width) from left
                    } else { // Right team serving
                        serveX = 810; // 35% of 600 (right half width) from right
                    }
                    this.ball.setPosition(serveX, serveHeight);
                }
                if (this.serveTimer >= 2000 && this.serveState !== 'announcement') { // 2 seconds
                    this.serveState = 'idle';
                    this.ball.body.setImmovable(false);
                    this.ball.body.setAllowGravity(true);
                    // Apply only vertical velocity when releasing the ball
                    this.ball.body.setVelocity(0, -200);
                }
            } else if (isPreServeOrAnnouncement && this.isFirstServe) {
                const serveHeight = this.CEILING_Y + (this.GROUND_Y - this.CEILING_Y) * 0.2; // 20% from ceiling
                let serveX = this.servingTeam === 0 ? 390 : 810;
                this.ball.setPosition(serveX, serveHeight);
            } else {
                // Ensure the ball is interactive during normal gameplay
                this.ball.body.setImmovable(false);
                this.ball.body.setAllowGravity(true);
            }

            const landingPrediction = this.predictBallLanding();
            const ballOnLeftSide = this.ball.x < 600;
            // Player-controlled movement for the back red player
            const backRedPlayer = this.players[1];
            if (this.cursors.left.isDown) {
                backRedPlayer.body.setVelocityX(-300); // Increased from -250 to -300
            } else if (this.cursors.right.isDown) {
                backRedPlayer.body.setVelocityX(300); // Increased from 250 to 300
            } else {
                backRedPlayer.body.setVelocityX(0);
            }

            // Check if the player is touching the ground
            this.canJump = backRedPlayer.body.touching.down || backRedPlayer.body.blocked.down;
            // Jump for the back red player
            if (this.cursors.up.isDown && this.canJump) {
                const jumpVelocity = -600; // Increased from -500 to -600
                backRedPlayer.body.setVelocityY(jumpVelocity);
                this.canJump = false;
            }
            // AI movement for other players
            this.players.forEach((player, index) => {
                // Robust check to keep players above sand
                const minY = this.GROUND_Y - player.height * player.scale * 0.5;
                if (player.y > minY) {
                    player.y = minY;
                    player.body.setVelocityY(0);
                    player.body.setAccelerationY(0);
                    player.body.touching.down = true;
                    player.body.blocked.down = true;
                } else {
                    player.body.touching.down = false;
                    player.body.blocked.down = false;
                }
            
                if (index === 1) return; // Skip the back red player (player-controlled)
                
                const isLeftSide = index < 2;
                const isFrontPlayer = index % 2 === 0;
                const minX = isLeftSide ? 20 : 605;
                const maxX = isLeftSide ? 595 : 1180;
                const teammate = this.players[isLeftSide ? (isFrontPlayer ? 1 : 0) : (isFrontPlayer ? 3 : 2)];
                let targetX;
                // Adjust AI calculations based on difficulty for blue team
                const difficultyFactor = isLeftSide ? 1 : (1 / this.currentDifficulty);
            
                const calculateSafePosition = (desiredX) => {
                    const playerWidth = player.width * player.scale;
                    const safeDistance = playerWidth * 1.5;
                    if (Math.abs(desiredX - teammate.x) < safeDistance) {
                        return desiredX < teammate.x ?
                            teammate.x - safeDistance :
                            teammate.x + safeDistance;
                    }
                    return desiredX;
                };
            
                const ballHeight = this.ball.y;
                const netX = 600;
                const isPreServe = this.serveState === 'preparing';
                const ballVelocity = this.ball.body.velocity;
                const landingPrediction = this.predictBallLanding(difficultyFactor);
                const timeToLand = landingPrediction.time;
                const isBallHigh = this.ball.y < 300 && ballVelocity.y > 0;
                const isBallComingTowardsTeam = (isLeftSide && ballVelocity.x < 0) || (!isLeftSide && ballVelocity.x > 0);
                const isServeBall = this.ball.body.velocity.y < 0 && this.ball.y < 300;
            
                if (isPreServe) {
                    const isServingTeam = (this.servingTeam === 0 && isLeftSide) || (this.servingTeam === 1 && !isLeftSide);
                    if (isLeftSide) {
                        // Red team serve positioning
                        const playerControlled = this.players[1];
                        const aiPlayer = this.players[0];
                        if (player === aiPlayer) {
                            if (isServingTeam) {
                                const offset = playerControlled.x < aiPlayer.x ? -100 : 100;
                                targetX = Phaser.Math.Clamp(playerControlled.x + offset, 100, 500);
                            } else {
                                const offset = playerControlled.x < 300 ? 150 : (playerControlled.x > 450 ? -150 : 0);
                                targetX = Phaser.Math.Clamp(playerControlled.x + offset, 100, 500);
                            }
                        }
                    } else {
                        // Improved Blue team serve positioning
                        if (isServingTeam) {
                            targetX = isFrontPlayer ? 900 : 1050;
                        } else {
                            // Smarter serve reception positioning
                            const redTeamAverageX = (this.players[0].x + this.players[1].x) / 2;
                            if (redTeamAverageX < 300) {
                                targetX = isFrontPlayer ? 800 : 1000;
                            } else if (redTeamAverageX > 450) {
                                targetX = isFrontPlayer ? 1000 : 1100;
                            } else {
                                targetX = isFrontPlayer ? 900 : 1050;
                            }
                        }
                    }
                } else if (!isLeftSide) {
                    // Improved Blue team positioning during play
                    if (this.ball.x < 600) {
                        // Ball on opponent's side, take strategic positions
                        const distanceFromNet = this.ball.x < 300 ? 0.7 : (this.ball.x < 450 ? 0.5 : 0.3);
                        targetX = isFrontPlayer ?
                            netX + (maxX - netX) * distanceFromNet :
                            netX + (maxX - netX) * (distanceFromNet + 0.2);
                    } else {
                        // Ball on blue team's side
                        const ballToPlayerX = this.ball.x - player.x;
                        const ballToPlayerY = this.ball.y - player.y;
                        const timeToReachPlayer = ballToPlayerX / ballVelocity.x;
                        const ballYAtPlayer = this.ball.y + ballVelocity.y * timeToReachPlayer +
                            0.5 * this.physics.world.gravity.y * timeToReachPlayer * timeToReachPlayer;
                        if (isServeBall || timeToLand < 0.5) {
                            // Quick reaction to serve or fast approaching ball
                            targetX = Phaser.Math.Clamp(landingPrediction.x, 700, 1100);
                        } else if (isBallHigh) {
                            // Prepare for a high ball
                            targetX = Phaser.Math.Clamp(this.ball.x - 50, 700, 1100);
                        } else if (isBallComingTowardsTeam) {
                            // Aggressive positioning for incoming ball
                            const interceptX = this.ball.x + (ballVelocity.x * timeToReachPlayer);
                            targetX = Phaser.Math.Clamp(interceptX, 650, 1150);
                        } else {
                            // Default defensive positioning
                            targetX = isFrontPlayer ? 800 : 1000;
                        }
                        // More aggressive approach when ball is close
                        if (Math.abs(ballToPlayerX) < 200 && ballToPlayerY < 0 && ballToPlayerY > -250) {
                            targetX = this.ball.x;
                        }
                    }
                } else {
                    // Red team positioning
                    if (this.ball.x < 600) {
                        if (isFrontPlayer) {
                            targetX = Phaser.Math.Clamp(landingPrediction.x, 100, 500);
                        } else {
                            targetX = Phaser.Math.Clamp(landingPrediction.x + 100, 150, 550);
                        }
                    } else {
                        targetX = isFrontPlayer ? 450 : 150;
                    }
                }
            
                // Adjust for potential pole hits
                if (this.predictPoleCollision(player.x, player.y, ballVelocity.x, ballVelocity.y, difficultyFactor)) {
                    targetX += isLeftSide ? -50 : 50;
                }
            
                // Jumping logic for all AI-controlled players
                const canJumpFromGround = player.body.touching.down || player.body.blocked.down;
                const canJumpFromTeammate = this.canJumpFromTeammate(player, teammate);
                if (!isPreServe) {
                    const ballToPlayerX = this.ball.x - player.x;
                    const ballToPlayerY = this.ball.y - player.y;
                    const shouldAttemptHit = Math.abs(ballToPlayerX) < 180 &&
                        ballToPlayerY < 0 &&
                        ballToPlayerY > -360;
                    if (shouldAttemptHit && (canJumpFromGround || canJumpFromTeammate || player.data.jumpGracePeriod > 0)) {
                        const jumpVelocity = -600;
                        player.body.setVelocityY(jumpVelocity);
                        player.body.setVelocityX(Phaser.Math.Clamp(ballToPlayerX, -300, 300));
                        player.data.jumpGracePeriod = 0;
                    }
                }
            
                // Adjust positions to prevent teammate collisions
                targetX = calculateSafePosition(targetX);
                // Ensure players stay within their court boundaries
                targetX = Phaser.Math.Clamp(targetX, minX, maxX);
                // Improved movement towards target position
                const distanceToTarget = targetX - player.x;
                let moveSpeed = Math.min(300, Math.abs(distanceToTarget) * 6);
            
                // Adjust speed based on difficulty for blue team
                if (!isLeftSide) {
                    moveSpeed *= this.currentDifficulty;
                }
            
                const direction = distanceToTarget > 0 ? 1 : -1;
                // Gradual movement towards target position
                const newVelocityX = Phaser.Math.Linear(player.body.velocity.x, direction * moveSpeed, 0.15);
                player.body.setVelocityX(newVelocityX);
                // Ensure player stays within court boundaries
                player.x = Phaser.Math.Clamp(player.x, minX, maxX);
            
                // Check for current collision with teammate
                const isCollidingWithTeammate = Phaser.Geom.Intersects.RectangleToRectangle(
                    player.getBounds(),
                    teammate.getBounds()
                );
                if (isCollidingWithTeammate) {
                    // If colliding, move away from teammate
                    const pushDirection = player.x < teammate.x ? -1 : 1;
                    player.body.setVelocityX(pushDirection * 150);
                }
            
                // Update jump grace period for all players
                if (canJumpFromGround || canJumpFromTeammate) {
                    player.data.jumpGracePeriod = 100; // Set grace period to 100ms
                } else {
                    player.data.jumpGracePeriod = Math.max(0, player.data.jumpGracePeriod - this.game.loop.delta);
                }
            
                // Ensure the player doesn't stick to the ground
                if (player.body.touching.down && Math.abs(player.body.velocity.y) < 1) {
                    player.body.setVelocityY(-1);
                }
            
                // Prevent ball riding
                if (this.ball.body.bottom <= player.body.top &&
                    Math.abs(this.ball.x - player.x) < player.width * player.scale * 0.5) {
                    const pushDirection = index < 2 ? -1 : 1; // Left for red team, right for blue team
                    player.body.setVelocityX(300 * pushDirection);
                }
            });
            // Robust check to keep players above sand
            this.players.forEach(player => {
                const minY = this.GROUND_Y - player.height * player.scale * 0.5;
                if (player.y > minY) {
                    player.y = minY;
                    player.body.setVelocityY(0);
                    player.body.setAccelerationY(0);
                }
            });

            // Check if ball is resting on the net
            if (this.ball.body.bottom >= this.net.y - this.net.height / 2 &&
                this.ball.body.bottom <= this.net.y - this.net.height / 2 + 5 &&
                Math.abs(this.ball.x - this.net.x) < this.net.width / 2 &&
                Math.abs(this.ball.body.velocity.y) < 10) {

                // Apply a small random impulse to prevent the ball from resting
                const impulseX = Phaser.Math.Between(-50, 50);
                const impulseY = -Phaser.Math.Between(100, 150);
                this.ball.body.setVelocity(impulseX, impulseY);
            }
            // Check for scoring
            if (this.ball.y + this.ball.body.height / 2 >= this.GROUND_Y && this.serveState === 'idle' && this.canScore) {
                let scoreUpdated = false;
                if (this.ball.x < 600) {
                    this.score.right++;
                    this.servingTeam = 1; // Right team scores, they serve next
                    scoreUpdated = true;
                } else {
                    this.score.left++;
                    this.servingTeam = 0; // Left team scores, they serve next
                    scoreUpdated = true;
                }
                if (scoreUpdated) {
                    this.updateScoreText();
                    if (this.score.left === 10 || this.score.right === 10) {
                        this.canScore = false; // Prevent immediate scoring after match reset
                        this.resetMatch();
                    } else {
                        this.resetBall();
                    }
                }
            }

            // Update last score
            this.lastScore = {
                ...this.score
            };
        }

        hitBall(ball, player) {
            const isJumpShot = player.body.velocity.y < -50; // Consider it a jump shot if player is moving upwards
            const baseVelocity = 800;
            let velocity = baseVelocity + Phaser.Math.Between(-100, 100);
    
            // Increase velocity by 5% for jump shots
            if (isJumpShot) {
                velocity *= 1.05;
            }
    
            let angle;
            if (isJumpShot) {
                // For jump shots, use a variable angle
                angle = Phaser.Math.DegToRad(Phaser.Math.Between(45, 75));
            } else {
                // For non-jump shots, use a fixed 60-degree angle
                angle = Phaser.Math.DegToRad(60);
            }
    
            // Determine direction based on which side the player is on
            const direction = player.x < 600 ? 1 : -1; // 1 for left side, -1 for right side
            let velocityX = Math.cos(angle) * velocity * direction;
            let velocityY = -Math.sin(angle) * velocity; // Negative because y-axis is inverted
    
            // Add some horizontal variation based on where the ball hit the player
            const horizontalVariation = (ball.x - player.x) / player.width * 150;
            velocityX += horizontalVariation;
            ball.body.setVelocity(velocityX, velocityY);
    
            // Add a slight spin to the ball for more interesting gameplay
            ball.body.setAngularVelocity(Phaser.Math.Between(-100, 100));
    
            // Prevent the player from sticking to the ball
            const pushDirection = player.x < 600 ? -1 : 1; // Left for left side, right for right side
            player.body.setVelocityX(200 * pushDirection);
    
            // Add spark effect for jump shots
            if (isJumpShot) {
                this.createSparkEffect(ball, player);
            }
        }
    
        createSparkEffect(ball, player) {
            const midX = (ball.x + player.x) / 2;
            const midY = (ball.y + player.y) / 2;
    
            // Create spark particles
            for (let i = 0; i < 20; i++) {
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const distance = Phaser.Math.FloatBetween(5, 15);
                const x = midX + Math.cos(angle) * distance;
                const y = midY + Math.sin(angle) * distance;
    
                const spark = this.add.circle(x, y, 2, 0xFFFF00);
    
                this.tweens.add({
                    targets: spark,
                    x: x + Math.cos(angle) * 20,
                    y: y + Math.sin(angle) * 20,
                    alpha: 0,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => spark.destroy()
                });
            }
    
            // Add a flash effect
            const flash = this.add.circle(midX, midY, 20, 0xFFFFFF);
            this.tweens.add({
                targets: flash,
                scale: 0,
                alpha: 0,
                duration: 200,
                ease: 'Power2',
                onComplete: () => flash.destroy()
            });
        }


        resetBall() {
            this.serveState = 'preparing';
            this.serveTimer = 0;
            // Use the servingTeam property to determine which team serves
            const teamPlayers = this.players.slice(this.servingTeam * 2, this.servingTeam * 2 + 2);
            // Calculate the midpoint between the two team members
            const midX = (teamPlayers[0].x + teamPlayers[1].x) / 2;
            const midY = (teamPlayers[0].y + teamPlayers[1].y) / 2;
            this.ball.body.setVelocity(0, 0);
            this.ball.body.setAllowGravity(false);
            this.ball.body.setImmovable(true);
            // Set the ball's initial position high above the midpoint of the serving team
            const hoverHeight = 200;
            this.ball.setPosition(midX, midY - hoverHeight);
            // Set a longer delay for the first serve
            if (this.isFirstServe) {
                this.time.delayedCall(5000, () => {
                    this.isFirstServe = false;
                    this.serveState = 'idle';
                    this.ball.body.setImmovable(false);
                    this.ball.body.setAllowGravity(true);
                    this.ball.body.setVelocity(0, -200);
                });
            }
        }

        updateScoreText() {
            this.scoreText.setText(`Team A: ${this.score.left} | Team B: ${this.score.right}`);
        }
        resetMatch() {
            let pointDifference;
            let winningTeam;
            if (this.score.left >= 10) {
                pointDifference = this.score.left - this.score.right;
                this.servingTeam = 1; // Blue team serves after Red wins
                winningTeam = "Team A";
                // Update Best Clear if Red team wins and current difficulty is higher
                if (this.currentDifficulty > this.bestClear) {
                    this.bestClear = this.currentDifficulty;
                    this.updateBestClearText();
                }
            } else {
                pointDifference = this.score.right - this.score.left;
                this.servingTeam = 0; // Red team serves after Blue wins
                winningTeam = "Team B";
            }
            // Update difficulty modifier based on point difference
            this.lastMatchPointDifference = pointDifference;
            // Calculate new difficulty based on the current difficulty
            const difficultyPerPoint = 0.5 / 20 * 0.65 * 0.75 * 4; // Quadrupled the scaling factor
            let newDifficultyModifier = pointDifference * difficultyPerPoint;
            // Invert the difficulty change if the red team lost
            if (winningTeam === "Team B") {
                newDifficultyModifier = -newDifficultyModifier;
            }
            // Update the current difficulty
            if (newDifficultyModifier > 0) {
                this.currentDifficulty *= (1 + newDifficultyModifier);
            } else {
                this.currentDifficulty /= (1 - newDifficultyModifier);
            }
            // Set the new difficulty modifier
            this.difficultyModifier = (this.currentDifficulty - 1) / 3;
            // Update the difficulty text
            this.updateDifficultyText();
            // Reset scores
            this.score.left = 0;
            this.score.right = 0;
            this.updateScoreText();
            // Reset last score
            this.lastScore = {
                left: 0,
                right: 0
            };
            // Set game state to announcement
            this.serveState = 'announcement';
            this.canScore = false;
            // Display winning team message and teleport players
            this.displayNewRoundMessage(winningTeam);
            // Add a delay before the next serve
            this.time.delayedCall(4000, () => {
                this.canScore = true;
                this.serveState = 'preparing';
                this.resetBall();
            });
        }
        resetPlayers() {
            this.players.forEach((player) => {
                player.y = this.GROUND_Y - player.height * player.scale * 0.5;
                player.body.setVelocity(0, 0);
                player.body.setAcceleration(0, 0);
            });
        }

        predictBallLanding(difficultyFactor = 1) {
            const gravity = this.physics.world.gravity.y;
            const vx = this.ball.body.velocity.x * difficultyFactor;
            const vy = this.ball.body.velocity.y * difficultyFactor;
            const x0 = this.ball.x;
            const y0 = this.ball.y;
            // Calculate time to reach the ground
            const timeToGround = (-vy + Math.sqrt(vy * vy + 2 * gravity * (this.GROUND_Y - y0))) / gravity;
            // Calculate x position at landing
            const landingX = x0 + vx * timeToGround;
            return {
                x: landingX,
                time: timeToGround
            };
        }
        predictPoleCollision(startX, startY, velocityX, velocityY, difficultyFactor = 1) {
            const gravity = this.physics.world.gravity.y;
            const poleX = 600;
            const poleWidth = 20;
            const poleTopY = this.GROUND_Y - 150; // Assuming the pole is 150px tall

            // Adjust velocities based on difficulty
            velocityX *= difficultyFactor;
            velocityY *= difficultyFactor;

            // Time to reach pole's x position
            const timeToReachPole = Math.abs((poleX - startX) / velocityX);
            // Y position when reaching pole's x
            const yAtPole = startY + velocityY * timeToReachPole + 0.5 * gravity * timeToReachPole * timeToReachPole;
            // Check if the ball would hit the pole
            return yAtPole > poleTopY && Math.abs(startX + velocityX * timeToReachPole - poleX) < poleWidth / 2;
        }
        hitNet(ball, net) {
            // Check if the ball hit the side of the net
            if (Math.abs(ball.y - net.y) < net.height / 2) {
                // Ball hit the side of the net
                if (ball.x < 600) {
                    this.score.right++;
                    this.servingTeam = 1; // Right team scores, they serve next
                    this.displayFaultMessage("Team A");
                } else {
                    this.score.left++;
                    this.servingTeam = 0; // Left team scores, they serve next
                    this.displayFaultMessage("Team B");
                }
                this.updateScoreText();
                if (this.score.left === 10 || this.score.right === 10) {
                    this.canScore = false; // Prevent immediate scoring after match reset
                    this.resetMatch();
                } else {
                    this.resetBall();
                }
            }
        }
        isOnTopOfPlayer(player1, player2) {
            return (
                player1.body.bottom <= player2.body.top + 5 &&
                player1.body.bottom >= player2.body.top - 5 &&
                Math.abs(player1.x - player2.x) < player1.width / 2
            );
        }
        handleNetCollision(player, netObject) {
            // Check if the player is the one controlled by the user (assuming it's the second player in the array)
            if (player === this.players[1]) {
                // If it's the player-controlled character, don't apply any net collision effects
                return;
            }
        
            const pushForce = 150; // Reduced from 250 to make the push gentler
            const netCenterX = 600; // Assuming the net is at x = 600
            const playerHalfWidth = player.width * player.scale * 0.5;
            const playerHalfHeight = player.height * player.scale * 0.5;
            const netHalfWidth = netObject.width * 0.5;
            const cornerBuffer = 5; // Reduced buffer zone
        
            // Determine which side of the net the player should be on
            const shouldBeOnLeft = player.x < netCenterX;
        
            // Store original position for debugging
            const originalX = player.x;
            const originalY = player.y;
        
            // Horizontal collision handling
            if (shouldBeOnLeft) {
                // Player should be on the left side
                if (player.x + playerHalfWidth > netCenterX - netHalfWidth) {
                    player.x = Math.max(player.x, netCenterX - netHalfWidth - playerHalfWidth - cornerBuffer);
                    player.body.setVelocityX(-pushForce);
                }
            } else {
                // Player should be on the right side
                if (player.x - playerHalfWidth < netCenterX + netHalfWidth) {
                    player.x = Math.min(player.x, netCenterX + netHalfWidth + playerHalfWidth + cornerBuffer);
                    player.body.setVelocityX(pushForce);
                }
            }
        
            // Vertical collision handling
            const netTop = netObject.y - netObject.height * 0.5;
            if (player.y + playerHalfHeight > netTop &&
                Math.abs(player.x - netCenterX) < netHalfWidth + playerHalfWidth) {
                player.y = Math.max(player.y, netTop - playerHalfHeight - cornerBuffer);
                player.body.setVelocityY(-pushForce); // Push upward
            }
        
            // Prevent sticking to the net
            if (Math.abs(player.body.velocity.x) < 10) {
                player.body.setVelocityX(shouldBeOnLeft ? -50 : 50);
            }
        
            // Ensure player stays within court boundaries
            const minX = shouldBeOnLeft ? 20 : 605;
            const maxX = shouldBeOnLeft ? 595 : 1180;
            player.x = Phaser.Math.Clamp(player.x, minX, maxX);
        
            // Debug: Log significant position changes
            const positionChange = Math.sqrt(Math.pow(player.x - originalX, 2) + Math.pow(player.y - originalY, 2));
            if (positionChange > 50) {
                console.log(`Large position change for player ${this.players.indexOf(player)}:`, 
                            `(${originalX.toFixed(2)}, ${originalY.toFixed(2)}) -> (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`);
            }
        }
        handleTeammateCollision(player1, player2) {
            const verticalOverlap = Math.min(player1.body.bottom, player2.body.bottom) - Math.max(player1.body.top, player2.body.top);
            const horizontalOverlap = Math.min(player1.body.right, player2.body.right) - Math.max(player1.body.left, player2.body.left);

            // Only handle collision if there's a significant overlap
            if (verticalOverlap > 5 && horizontalOverlap > 5) {
                const topPlayer = player1.y < player2.y ? player1 : player2;
                const bottomPlayer = player1.y < player2.y ? player2 : player1;

                // Vertical collision handling
                if (verticalOverlap > 0) {
                    const separation = verticalOverlap / 2;
                    topPlayer.y -= separation;
                    bottomPlayer.y += separation;

                    // Prevent vertical velocity transfer
                    topPlayer.body.setVelocityY(Math.min(topPlayer.body.velocity.y, 0));
                    bottomPlayer.body.setVelocityY(Math.max(bottomPlayer.body.velocity.y, 0));
                }

                // Horizontal collision handling
                if (horizontalOverlap > 0) {
                    const leftPlayer = player1.x < player2.x ? player1 : player2;
                    const rightPlayer = player1.x < player2.x ? player2 : player1;
                    const separation = horizontalOverlap / 2;
                    const separationForce = 150;

                    leftPlayer.x -= separation;
                    rightPlayer.x += separation;
                    leftPlayer.body.setVelocityX(leftPlayer.body.velocity.x - separationForce);
                    rightPlayer.body.setVelocityX(rightPlayer.body.velocity.x + separationForce);
                }

                // Prevent sliding up
                if (verticalOverlap < horizontalOverlap) {
                    const slidePreventionForce = 200;
                    if (topPlayer.body.velocity.y > 0) {
                        topPlayer.body.setVelocityY(-slidePreventionForce);
                    }
                    if (bottomPlayer.body.velocity.y < 0) {
                        bottomPlayer.body.setVelocityY(slidePreventionForce);
                    }
                }
            }
        }
        canJumpFromTeammate(player, teammate) {
            const verticalTolerance = 20; // Increased from 10
            const horizontalTolerance = player.width * 1.2; // Increased from 0.8
            return (
                player.body.bottom <= teammate.body.top + verticalTolerance &&
                player.body.bottom >= teammate.body.top - verticalTolerance &&
                Math.abs(player.x - teammate.x) < horizontalTolerance &&
                player.body.velocity.y > -100 // Allow small upward velocity
            );
        }
        initializePlayerData() {
            this.players.forEach(player => {
                if (!player.data) {
                    player.setData('jumpGracePeriod', 0);
                } else {
                    player.data.jumpGracePeriod = 0;
                }
            });
        }
        displayFaultMessage(team) {
            const message = `Fault from ${team}`;
            const faultText = this.add.text(600, 300, message, {
                fontSize: '64px',
                fill: '#000000',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // Fade out the text
            this.tweens.add({
                targets: faultText,
                alpha: {
                    from: 1,
                    to: 0
                },
                ease: 'Linear',
                duration: 1500, // Total duration of 1.5 seconds
                onComplete: () => {
                    faultText.destroy();
                }
            });
        }
        // predictPoleCollision(startX, startY, velocityX, velocityY) {
        //     const gravity = this.physics.world.gravity.y;
        //     const poleX = 600;
        //     const poleWidth = 20;
        //     const poleTopY = this.GROUND_Y - 150; // Assuming the pole is 150px tall
        //     // Time to reach pole's x position
        //     const timeToReachPole = Math.abs((poleX - startX) / velocityX);
        //     // Y position when reaching pole's x
        //     const yAtPole = startY + velocityY * timeToReachPole + 0.5 * gravity * timeToReachPole * timeToReachPole;
        //     // Check if the ball would hit the pole
        //     return yAtPole > poleTopY && Math.abs(startX + velocityX * timeToReachPole - poleX) < poleWidth / 2;
        // }
        displayNewRoundMessage(winningTeam) {
            const message = `${winningTeam} Team Wins!`;
            const newRoundText = this.add.bitmapText(600, 200, 'pixelfont', message, 64).setOrigin(0.5);
            // Set ball position to match pre-serve state
            const serveHeight = this.CEILING_Y + (this.GROUND_Y - this.CEILING_Y) * 0.2; // 20% from ceiling
            const serveX = this.servingTeam === 0 ? 390 : 810; // 35% from left or right
            this.ball.setPosition(serveX, serveHeight);
            this.ball.body.setVelocity(0, 0);
            this.ball.body.setAllowGravity(false);
            this.ball.body.setImmovable(true);
            // Teleport players to their default positions immediately
            this.teleportPlayersToDefaultPositions();
            // Fade out the text
            this.tweens.add({
                targets: newRoundText,
                alpha: {
                    from: 1,
                    to: 0
                },
                ease: 'Linear',
                duration: 2000,
                onComplete: () => {
                    newRoundText.destroy();
                    this.ball.body.setImmovable(false);
                }
            });
        }
        teleportPlayersToDefaultPositions() {
            const defaultPositions = [{
                x: 300,
                y: this.GROUND_Y - 30
            }, {
                x: 450,
                y: this.GROUND_Y - 30
            }, {
                x: 750,
                y: this.GROUND_Y - 30
            }, {
                x: 900,
                y: this.GROUND_Y - 30
            }];
            this.players.forEach((player, index) => {
                player.setPosition(defaultPositions[index].x, defaultPositions[index].y);
                player.body.setVelocity(0, 0);
                player.body.setAcceleration(0, 0);
            });
        }
        updateDifficultyText() {
            if (this.difficultyText) {
                const difficultyValue = Math.round((this.currentDifficulty / 0.7) * 100);
                this.difficultyText.setText(`Difficulty: ${difficultyValue}`);
                this.difficultyText.setFontSize('32px');
            }
        }
        updateBestClearText() {
            if (this.bestClearText) {
                const bestClearValue = Math.round((this.bestClear / 0.7) * 100);
                this.bestClearText.setText(`Best Clear: ${bestClearValue}`);
            }
        }
        hitCeiling(ball, ceiling) {
            // Reverse the vertical velocity of the ball
            ball.body.setVelocityY(Math.abs(ball.body.velocity.y));
        }
}
    
const config = {
    type: Phaser.AUTO,
    width: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].width,
    height: _CONFIG.orientationSizes[_CONFIG.deviceOrientation].height,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.Orientation.LANDSCAPE
    },
    pixelArt: true,
    /* ADD CUSTOM CONFIG ELEMENTS HERE */
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 1200 },
            debug: true,
        },
    },
    dataObject: {
        name: _CONFIG.title,
        description: _CONFIG.description,
        instructions: _CONFIG.instructions,
    },
    deviceOrientation: _CONFIG.deviceOrientation==="landscape"
};
