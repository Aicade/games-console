const assets_list = {

  //"player": "player",
  "key":"/assets/key.jpg",
  "exit": "/assets/door.jpg",
  "circleSpike":"/assets/sawsmall.jpg",
  "tiles":"assets/marbel.jpg",
  "player_2": "/assets/player_2.png",
  "player_3": "/assets/player_3.png",
  //  "singing": "enemy",
   //"rock":"assets/collectible_1",
   "platform_3": "/assets/house2.png",
   "collectible_6": "/assets/circle.png",


  "player": "/assets/player.png",
  "player_1": "/assets/player_1.png",
  "background": "/assets/background.png",
  "background1": "/assets/background1.png",
  "background_1": "/assets/background_1.png",
  "background_2": "/assets/background_2.png",
  "background_3": "/assets/background_3.png",
  "collectible": "/assets/collectible.png",
  "collectible_1": "/assets/collectible_1.png",
  "collectible_2": "/assets/collectible_2.png",
  "collectible_3": "/assets/collectible_3.png",
  "collectible_4": "/assets/collectible_4.png",
  "collectible_5": "/assets/collectible_5.png",
  "enemy": "/assets/enemy.png",
  "enemy_1": "/assets/enemy_1.png",
  "enemy_2": "/assets/enemy_2.png",
  "enemy_3": "/assets/enemy_3.png",
  "projectile": "/assets/projectile.png",
  "projectile_1": "/assets/projectile_1.png",
  "projectile_2": "/assets/projectile_2.png",
  "projectile_3": "/assets/projectile_3.png",
  "projectile_4": "/assets/projectile_4.png",
  "avoidable": "/assets/avoidable.png",
  "avoidable_1": "/assets/avoidable_1.png",
  "platform": "/assets/platform.png",
  "platform_1": "/assets/platform_1.png",
  "platform_2": "/assets/platform_2.png",
  "class1": "/assets/class1.jpg",
}

for (const key in _CONFIG.imageLoader) {
  _CONFIG.imageLoader[key] = assets_list[_CONFIG.imageLoader[key]]
}