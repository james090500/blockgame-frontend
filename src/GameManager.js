import PlayerGui from './gui/PlayerGui.js'
import BlockGame from './BlockGame.js'
import World from './world/World.js'
import LocalPlayer from './core/LocalPlayer.js'

class GameManager {
    constructor() {
        // Gui
        this.playerGui = new PlayerGui()

        // Terrain
        this.world = new World()

        // Local Player
        this.thePlayer = new LocalPlayer()

        // Start Game Loop
        this.gameTick = this.gameTick.bind(this)
        this.gameTickInterval = setInterval(this.gameTick, 50)
    }

    /**
     * A 20TPS LOOP
     */
    gameTick() {}
    /**
     * The render loop
     */
    gameLoop(delta, time) {
        BlockGame.instance.input.controls.update(delta)

        BlockGame.instance.renderer.sceneManager.updateMovement(delta)

        this.world.render(delta)
        this.playerGui.render()

        this.thePlayer.render(delta)
    }
}

export default GameManager
