import { Mesh, BoxGeometry, MeshBasicMaterial, MathUtils } from 'three'
import BlockGame from '../BlockGame.js'
import TextureManager from '../utils/TextureManager.js'

class PlayerHand {
    constructor() {
        this.mesh = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshBasicMaterial({ map: TextureManager.terrain })
        )

        this.updateBlock(0, 0.9375)

        this.mesh.renderOrder = 999
        this.mesh.material.depthTest = false
        this.mesh.material.transparent = true

        this.mesh.position.set(1.8, -1, -1.5)
        this.mesh.rotation.set(
            MathUtils.degToRad(10),
            MathUtils.degToRad(10),
            MathUtils.degToRad(0)
        )

        BlockGame.instance.renderer.sceneManager.camera.add(this.mesh)
    }

    updateBlock(tileX, tileY, tileSize = 1 / 16) {
        const geom = this.mesh.geometry
        const uv = geom.attributes.uv

        // Standard box UVs per face (4 corners)
        const baseUVs = [
            [0, 1],
            [1, 1],
            [0, 0],
            [1, 0],
        ]

        // Loop through all 6 faces (each with 4 vertices)
        for (let face = 0; face < 6; face++) {
            for (let i = 0; i < 4; i++) {
                const index = face * 4 + i

                const [u, v] = baseUVs[i]

                uv.setXY(index, u * tileSize + tileX, v * tileSize + tileY)
            }
        }

        uv.needsUpdate = true
    }
}

export default PlayerHand
