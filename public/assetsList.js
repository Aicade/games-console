const assets_list = {
    "player": "/assets/stu2.png",
    "background": "/assets/class.jpg",
    "background_1": "/assets/background_1.png",
    "background_2": "/assets/background_2.png",
    "collectible": "/assets/x_logo.png",
    "collectible_1": "/assets/collectible_1.png",
    "collectible_2": "/assets/collectible_2.png",
    "collectible_3": "/assets/collectible_3.png",
    "enemy": "/assets/mark.png",
    "enemy_1": "/assets/enemy_1.png",
    "projectile": "/assets/meta_logo.png",
    "projectile_1": "/assets/projectile_1.png",
    "projectile_2": "/assets/projectile_2.png",
    "avoidable": "/assets/shield.png",
    "platform": "/assets/tex.jpg",
    "platform_1": "/assets/platform_1.png",
}

for (const key in _CONFIG.imageLoader) {
    _CONFIG.imageLoader[key] = assets_list[_CONFIG.imageLoader[key]]
}