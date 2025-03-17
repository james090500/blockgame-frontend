import { BufferGeometry, BufferAttribute, MeshBasicMaterial, Mesh } from 'three'
import BlockGame from '../../BlockGame'
import Blocks from '../../blocks/Blocks.js'
import BlockModel from '../models/BlockModel.js'

class ChunkRenderer {
    render(world, chunk) {
        this.chunk = chunk

        for (let i = 0; i < chunk.chunkData.length; i++) {
            const { x, y, z } = chunk.getXYZ(i)

            const index = chunk.chunkData[i]
            if (index > 0) {
                const block = Blocks.ids[index]
                const worldX = x + this.chunk.chunkX * 16
                const worldZ = z + this.chunk.chunkY * 16

                if (world.getBlock(worldX - 1, y, worldZ) == 0) {
                    this.drawFaces(block, BlockModel.LEFT, x, y, z)
                }
                if (world.getBlock(worldX + 1, y, worldZ) == 0) {
                    this.drawFaces(block, BlockModel.RIGHT, x, y, z)
                }
                if (world.getBlock(worldX, y, worldZ - 1) == 0) {
                    this.drawFaces(block, BlockModel.BACK, x, y, z)
                }
                if (world.getBlock(worldX, y, worldZ + 1) == 0) {
                    this.drawFaces(block, BlockModel.FRONT, x, y, z)
                }
                if (world.getBlock(worldX, y + 1, worldZ) == 0) {
                    this.drawFaces(block, BlockModel.TOP, x, y, z)
                }
                if (world.getBlock(worldX, y - 1, worldZ) == 0) {
                    this.drawFaces(block, BlockModel.BOTTOM, x, y, z)
                }
            }
        }
    }
    drawFaces(block, face, x, y, z) {
        const geometry = new BufferGeometry()

        const vertices = new Float32Array(face.vertices)
        const uvs = new Float32Array(BlockModel.UV)

        geometry.setAttribute('position', new BufferAttribute(vertices, 3))
        geometry.setAttribute('uv', new BufferAttribute(uvs, 2))

        const material = new MeshBasicMaterial({
            map: block.texture,
        })
        const mesh = new Mesh(geometry, material)

        const worldX = x + this.chunk.chunkX * 16
        const worldZ = z + this.chunk.chunkY * 16
        mesh.position.set(worldX, y, worldZ)

        BlockGame.instance.renderer.sceneManager.scene.add(mesh)
    }
}

export default ChunkRenderer
