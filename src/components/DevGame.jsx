import Phaser from "phaser";
import config from "../games/game";
import { useEffect } from "react";

const DevGame = () => {

    useEffect(() => {
        config.parent = "game-container";
        const game = new Phaser.Game(config);

        return () => {
            game.destroy(true, false);
        }
    })

    return (
        <div className="h-screen" id="game-container"></div>
    )
}

export default DevGame;