import {
    BoxGeometry,
    EdgesGeometry,
    LineSegments,
    LineBasicMaterial,
} from 'three'
import BlockGame from '../BlockGame.js'

class BlockOverlay {
    constructor() {
        // Create the text
        const geometry = new BoxGeometry(1.01, 1.01, 1.01)
        const edges = new EdgesGeometry(geometry)
        const line = new LineSegments(
            edges,
            new LineBasicMaterial({ color: 0x000000 })
        )

        this.mesh = line

        BlockGame.instance.renderer.sceneManager.add(this.mesh)
    }
    updatePosition(pos) {
        this.mesh.position.set(pos[0] + 0.5, pos[1] + 0.5, pos[2] + 0.5)
    }
    hide() {
        this.mesh.visible = false
    }
    show() {
        this.mesh.visible = true
    }
}

export default BlockOverlay
