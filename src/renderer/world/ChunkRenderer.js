import {
    BufferGeometry,
    BufferAttribute,
    MeshBasicMaterial,
    Mesh,
    Vector3,
} from 'three'
import BlockGame from '../../BlockGame'
import Blocks from '../../blocks/Blocks.js'
import BlockModel from '../models/BlockModel.js'

class ChunkRenderer {
    render(world, chunk) {
        var mesh = {}
        mesh.vertices = []
        mesh.uvs = []
        mesh.indices = []

        this.chunk = chunk

        const hasFace = (x, y, z) => {
            const blockId = chunk.getBlock(x, y, z)

            if (blockId != 0) {
                return new Vector3(x, y, z)
            }
        }

        const getFaces = (callback) => {
            const faces = []

            let breakLoops = false
            let width = 0
            let height = 0

            for (let w = 0; w < this.chunk.chunkSize; w++) {
                for (let h = 0; h < this.chunk.chunkSize; h++) {
                    const face = callback(w, h)
                    if (face != null) {
                        height++
                    } else {
                        breakLoops = true
                        break
                    }
                }
                width++

                if (breakLoops) {
                    break
                }
            }

            faces.push({ width, height })
            return faces
        }

        for (let x = 0; x < this.chunk.chunkSize; x++) {
            const faces = getFaces((y, z) => {
                return hasFace(x, y, z)
            })
            console.log(faces)
            this.addFaceToMeshX(x, mesh, faces)
        }

        // for (let z = 0; z < this.chunk.chunkSize; z++) {}

        // for (let i = 0; i < chunk.chunkData.length; i++) {
        //     const { x, y, z } = chunk.getXYZ(i)

        //     const index = chunk.chunkData[i]
        //     if (index > 0) {
        //         const block = Blocks.ids[index]
        //         const worldX = x + this.chunk.chunkX * 16
        //         const worldZ = z + this.chunk.chunkY * 16

        //         if (world.getBlock(worldX - 1, y, worldZ) == 0) {
        //             // this.drawFaces(block, BlockModel.LEFT, x, y, z)
        //         }
        //         if (world.getBlock(worldX + 1, y, worldZ) == 0) {
        //             // this.drawFaces(block, BlockModel.RIGHT, x, y, z)
        //         }
        //         if (world.getBlock(worldX, y, worldZ - 1) == 0) {
        //             // this.drawFaces(block, BlockModel.BACK, x, y, z)
        //         }
        //         if (world.getBlock(worldX, y, worldZ + 1) == 0) {
        //             // this.drawFaces(block, BlockModel.FRONT, x, y, z)
        //         }
        //         if (world.getBlock(worldX, y + 1, worldZ) == 0) {
        //             // this.drawFaces(block, BlockModel.TOP, x, y, z)
        //             blockFaces['TOP'].push(new Vector3(x, y, z))
        //         }
        //         if (world.getBlock(worldX, y - 1, worldZ) == 0) {
        //             // this.drawFaces(block, BlockModel.BOTTOM, x, y, z)
        //         }
        //     }
        // }
    }

    addFaceToMeshX(x, mesh, faces) {
        const geometry = new BufferGeometry()

        const block = Blocks.ids[1]

        const length = faces.length
        const vertices = new Float32Array([
            // eslint-disable-next-line prettier/prettier
            0.0,          1.0, 1.0,
            // eslint-disable-next-line prettier/prettier
            1.0 * length, 1.0, 1.0,
            // eslint-disable-next-line prettier/prettier
            1.0 * length, 1.0, 0.0,
            // eslint-disable-next-line prettier/prettier
            0.0,          1.0, 0.0,
        ])
        console.log(vertices)
        const indices = [0, 1, 2, 2, 3, 0]
        const uvs = new Float32Array(BlockModel.UV)

        geometry.setIndex(indices)
        geometry.setAttribute('position', new BufferAttribute(vertices, 3))
        geometry.setAttribute('uv', new BufferAttribute(uvs, 2))

        const material = new MeshBasicMaterial({
            color: 0x000000,
        })

        const Tmesh = new Mesh(geometry, material)
        Tmesh.material.wireframe = true
        Tmesh.position.set(0, 0, x)
        BlockGame.instance.renderer.sceneManager.scene.add(Tmesh)
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
