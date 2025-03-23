import { PerspectiveCamera } from 'three'

class Camera {
    constructor() {
        this.camera = new PerspectiveCamera(
            75,
            BlockGame.instance.config.CANVAS.clientWidth /
                BlockGame.instance.config.CANVAS.clientHeight,
            0.1,
            512
        )

        this.camera.position.y = 80
        // this.camera.rotation.x = Math.PI

        return this.camera
    }
}

export default Camera
