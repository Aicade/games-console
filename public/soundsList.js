const sounds_list = {
    "background": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-2.mp3"
}

for (const key in _CONFIG.soundsLoader) {
    if (!sounds_list[_CONFIG.soundsLoader[key]]) continue;
    _CONFIG.soundsLoader[key] = sounds_list[_CONFIG.soundsLoader[key]]
}