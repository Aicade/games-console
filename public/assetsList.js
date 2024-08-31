const assets_list = {
  player: "./assets/player.png",
  background: "./assets/1.png",
  background_1: "./assets/background_1.png",
  background_2: "./assets/background_2.png",
  collectible: "./assets/Collectible_rg.png",
  collectible_1: "./assets/collectible_1.png",
  collectible_2: "./assets/collectible_2.png",
  collectible_3: "./assets/collectible_3.png",
  enemy: "./assets/Enemy_rg.png",
  enemy_1: "./assets/enemy_1.png",
  projectile: "./assets/laser_RG.png",
  projectile_1: "./assets/projectile_1.png",
  projectile_2: "./assets/projectile_2.png",
  avoidable: "./assets/shield.png",
  platform: "./assets/plat.jpg",
  platform_1: "./assets/platform_1.png",
};

for (const key in assetsLoader) {
  assetsLoader[key] = assets_list[assetsLoader[key]];
}
