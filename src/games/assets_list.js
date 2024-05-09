export const assets_list = {
    "player": "/assets/player.png",
    "background": "/assets/background.png",
    "background_1": "/assets/background_1.png",
    "background_2": "/assets/background_2.png",
    "collectible": "/assets/collectible.png",
    "collectible_1": "/assets/collectible_1.png",
    "collectible_2": "/assets/collectible_2.png",
    "collectible_3": "/assets/collectible_3.png",
    "enemy": "/assets/enemy.png",
    "enemy_1": "/assets/enemy_1.png",
    "projectile": "/assets/projectile.png",
    "projectile_1": "/assets/projectile_1.png",
    "avoidable": "/assets/avoidable.png",
    "platform": "/assets/platform.png",
}

export function populateAssetsLoader(assetsLoader) {
    for (const key in assetsLoader) {
        assetsLoader[key] = assets_list[assetsLoader[key]]
    }
    return assetsLoader
}
