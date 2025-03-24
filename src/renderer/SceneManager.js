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
}

export default SceneManager
