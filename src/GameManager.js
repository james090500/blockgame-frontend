import DebugGui from './gui/DebugGui.js'
import BlockGame from './BlockGame.js'
import World from './world/World.js'

class GameManager {
    constructor() {
        // Gui
        this.debug = new DebugGui()

        // Terrain
        this.world = new World()

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
        this.debug.render()
    }
}

export default GameManager
