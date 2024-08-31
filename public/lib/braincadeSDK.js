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
  this.toggleGameSoundsHandler = handleToggleGameSounds.bind(this);

  window.addEventListener(kResumeGame, this.resumeGameHandler);
  window.addEventListener(kRestartGame, this.restartGameHandler);
  window.addEventListener(kDestroyGame, this.destroyGameHandler);
  window.addEventListener(kToggleGameSounds, this.toggleGameSoundsHandler);


  this.events.on("destroy", () => {
    removeEventListenersPhaser.bind(this)();
  })
}

function removeEventListenersPhaser() {
  window.removeEventListener(kResumeGame, this.resumeGameHandler);
  window.removeEventListener(kRestartGame, this.restartGameHandler);
  window.removeEventListener(kDestroyGame, this.destroyGameHandler);
  window.removeEventListener(kToggleGameSounds, this.toggleGameSoundsHandler);
}

function handleResumeGame() {
  this.scene.resume();
}

function handleToggleGameSounds(e) {
  const status = e.detail.status;
  if (status != null) {
    this.sound.setMute(!status);
  } else {
    this.sound.setMute(!this.sound.mute);
  }
}

function handleRestartGame() {
  removeEventListenersPhaser.bind(this)();
  this.scene.restart();
}

function handleDestroyGame() {
  this.game.destroy(true, false);
}

export function initiateGameOver(results) {
  window.dispatchEvent(new CustomEvent(kGameOver, {
    detail: results
  }));

  this.scene.pause();
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

export function initiateToggleGameSounds(status = null) {
  window.dispatchEvent(new CustomEvent(kToggleGameSounds, {
    detail: {
      status: status
    }
  }));
}

export function handlePauseGame() {
  window.dispatchEvent(new Event(kPauseGame));

  this.scene.pause();
}