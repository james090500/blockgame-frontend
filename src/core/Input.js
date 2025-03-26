import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import BlockGame from '../BlockGame.js'

class Controls {
    mouse = {
        LeftClick: false,
        RightClick: false,
    }

    keys = {
        KeyW: false,
        KeyS: false,
        KeyA: false,
        KeyD: false,
        KeyC: false,
        KeyV: false,
        Space: false,
        ShiftLeft: false,
    } // Movement keys`

    constructor() {
        // Controls
        this.controls = new PointerLockControls(
            BlockGame.instance.renderer.sceneManager.camera,
            BlockGame.instance.renderer.renderer.domElement
        )

        this.controls.addEventListener('lock', (event) => {
            BlockGame.instance.config.PAUSED = false
            BlockGame.instance.config.ON_LOCK(event)
        })
        this.controls.addEventListener('unlock', (event) => {
            BlockGame.instance.config.PAUSED = true
            BlockGame.instance.config.ON_UNLOCK(event)
        })
        this.controls.lookSpeed = 0.1

        // Mouse events
        window.addEventListener('mousedown', (event) => {
            if (!BlockGame.instance.config.PAUSED) {
                if (event.button == 0) {
                    this.mouse.LeftClick = true
                } else if (event.button == 2) {
                    this.mouse.RightClick = true
                }
            }
        })

        // Keyboard event listeners
        window.addEventListener('keydown', (event) => {
            if (!BlockGame.instance.config.PAUSED) {
                if (this.keys.hasOwnProperty(event.code)) {
                    this.keys[event.code] = true
                }
            }
        })
        window.addEventListener('keyup', (event) => {
            if (!BlockGame.instance.config.PAUSED) {
                if (this.keys.hasOwnProperty(event.code)) {
                    this.keys[event.code] = false
                }
            }
        })
    }
    /**
     * Lock the controls
     */
    lock() {
        //https://issues.chromium.org/issues/40662608
        BlockGame.instance.renderer.renderer.domElement.requestPointerLock({
            unadjustedMovement: true,
        })
    }
}

export default Controls
