const assetsLoader = {}

const soundsLoader = {}


class GameScene {
    preload() {
        // Preload all #sounds
        for (const key in soundsLoader) {
            this.load.audio(key, [sounds_list[soundsLoader[key]]]);
        }
    }

    create() {
        // Add all sound instances to the #sounds object
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }
    }
}

// this.sound.add('jump', { loop: false, volume: 1 }).play();  --OLD
// this.sounds.jump.setVolume(1).setLoop(false).play()  --NEW