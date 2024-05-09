export const sounds_list = {
    "background": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-2.mp3"
}

export function populateSoundsLoader(soundsLoader) {
    for (const key in soundsLoader) {
        if (!sounds_list[soundsLoader[key]]) continue;
        soundsLoader[key] = sounds_list[soundsLoader[key]]
    }

    return soundsLoader
}
