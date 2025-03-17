import Camera from './Camera.js'
import { Scene, Vector3 } from 'three'

class SceneManager {
    constructor() {
        // Scene
        this.scene = new Scene()

        // Camera
        this.camera = new Camera()

        // Add to scene
        this.scene.add(this.camera)
    }
    add(item) {
        this.scene.add(item)
    }
    remove(item) {
        this.scene.remove(item)
    }
    updateMovement(delta) {
        let moveSpeed = 5

        const dir = new Vector3()
        this.camera.getWorldDirection(dir)
        dir.y = 0
        dir.normalize()

        const keys = BlockGame.instance.input.keys
        if (keys.KeyW) {
            this.camera.position.add(dir.multiplyScalar(moveSpeed * delta))
        }

        if (keys.KeyA) {
            dir.cross(new Vector3(0, -1, 0))
            this.camera.position.add(dir.multiplyScalar(moveSpeed * delta))
        }

        if (keys.KeyD) {
            dir.cross(new Vector3(0, 1, 0))
            this.camera.position.add(dir.multiplyScalar(moveSpeed * delta))
        }

        if (keys.KeyS) {
            dir.negate()
            this.camera.position.add(dir.multiplyScalar(moveSpeed * delta))
        }

        if (keys.Space) {
            this.camera.position.y += moveSpeed * delta
        }

        if (keys.ShiftLeft) {
            this.camera.position.y -= moveSpeed * delta
        }
    }
}

export default SceneManager
