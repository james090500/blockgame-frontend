import { PerspectiveCamera } from 'three'

class Camera {
    constructor() {
        this.camera = new PerspectiveCamera(
            75,
            BlockGame.instance.config.CANVAS.clientWidth /
                BlockGame.instance.config.CANVAS.clientHeight,
            0.1,
            520
        )

        this.camera.position.y = 85
        // this.camera.rotation.x = Math.PI

        return this.camera
    }
}

export default Camera
