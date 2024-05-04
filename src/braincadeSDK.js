const kResumeGame = "resumeGame";
const kRestartGame = "restartGame";
const kStartGame = "startGame";
const kDestroyGame = "destroyGame";
const kGameOver = "gameOver";
const kPauseGame = "pauseGame";
const kToggleBackgroundMusic = "toggleBackgroundMusic";
const kToggleGameSounds = "toggleGameSounds";

export function addEventListenersPhaser() {
  this.resumeGameHandler = handleResumeGame.bind(this);
  this.restartGameHandler = handleRestartGame.bind(this);
  this.destroyGameHandler = handleDestroyGame.bind(this);

  window.addEventListener(kResumeGame, this.resumeGameHandler);
  window.addEventListener(kRestartGame, this.restartGameHandler);
  window.addEventListener(kDestroyGame, this.destroyGameHandler);

  this.events.on("destroy", () => {
    removeEventListenersPhaser.bind(this)();
  });
}

function removeEventListenersPhaser() {
  window.removeEventListener(kResumeGame, this.resumeGameHandler);
  window.removeEventListener(kRestartGame, this.restartGameHandler);
  window.removeEventListener(kDestroyGame, this.destroyGameHandler);
}

function handleResumeGame() {
  this.scene.resume();
}

function handleRestartGame() {
  removeEventListenersPhaser.bind(this)();
  this.scene.restart();
}

function handleDestroyGame() {
  this.game.destroy(true, false);
}

export function initiateGameOver() {
  window.dispatchEvent(new Event(kGameOver));

  this.scene.pause();
  // initiateDestroyGame();
}

export function initiateResumeGame() {
  window.dispatchEvent(new Event(kResumeGame));
}

export function initiateRestartGame() {
  window.dispatchEvent(new Event(kRestartGame));
}

export function initiateDestroyGame() {
  window.dispatchEvent(new Event(kDestroyGame));
}

export function handlePauseGame() {
  window.dispatchEvent(new Event(kPauseGame));

  this.scene.pause();
}
