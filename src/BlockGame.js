import Config from './Config.js'
import Renderer from './renderer/Renderer.js'
import Input from './core/Input.js'
import GameManager from './GameManager.js'
import { Clock } from 'three'

class BlockGame {
    static instance
    clock = new Clock()

    constructor(options) {
        if (BlockGame.instance) {
            throw new Error('There can only be one instance of BlockGame')
        }

        //Set the instance
        BlockGame.instance = this

        // Config
        this.config = new Config(options)

        // Instances
        this.renderer = new Renderer()
        this.input = new Input()

        // Game Logic
        this.gameManager = new GameManager()

        this.loop = this.loop.bind(this)
        this.loop()
    }
    loop() {
        requestAnimationFrame(this.loop)

        const delta = this.clock.getDelta()
        const time = this.clock.getElapsedTime()

        // Scene Renderer
        this.renderer.render()

        // Game Loop
        this.gameManager.gameLoop(delta, time)
    }
    /**
     * Dispose
     */
    dispose() {
        console.log('Disposed')
    }
    /**
     * API Methods
     */
    lock() {
        this.input.lock()
    }
}

window.BlockGame = BlockGame

export default BlockGame
