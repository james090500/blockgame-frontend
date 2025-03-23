import { HemisphereLight, Color } from 'three'
import noisePkg from 'noisejs'
import Chunk from './Chunk.js'
import ChunkRenderer from '../renderer/world/ChunkRenderer.js'
const { Noise } = noisePkg

class World {
    chunks = new Map()

    constructor() {
        // Ambient Light
        this.ambientLight = new HemisphereLight(0xffffff, 0xffffff, 5)
        BlockGame.instance.renderer.sceneManager.add(this.ambientLight)

        BlockGame.instance.renderer.sceneManager.scene.background = new Color(
            0x99ddff
        )

        // Noise
        this.worldNoise = new Noise(65536)

        const worldSize = 8
        for (let x = -worldSize; x < worldSize; x++) {
            for (let y = -worldSize; y < worldSize; y++) {
                const chunk = new Chunk(x, y)
                this.chunks.set(`${x},${y}`, chunk)
                chunk.generateTerrain(this.worldNoise)
            }
        }

        const chunkRenderer = new ChunkRenderer()

        for (const chunk of this.chunks.values()) {
            chunkRenderer.render(this, chunk)
        }

        for (const chunk of this.chunks.values()) {
            chunkRenderer.renderTransparent(this, chunk)
        }
    }

    getBlock(x, y, z) {
        const chunkX = Math.floor(x / 16)
        const chunkY = Math.floor(z / 16)

        x = x & 15
        z = z & 15

        return this.getChunkBlock(chunkX, chunkY, x, y, z)
    }

    getChunkBlock(chunkX, chunkY, x, y, z) {
        // Adjust X coordinate and chunk
        while (x < 0) {
            chunkX--
            x += 16
        }
        while (x >= 16) {
            chunkX++
            x -= 16
        }

        // Adjust Z coordinate and chunk
        while (z < 0) {
            chunkY--
            z += 16
        }
        while (z >= 16) {
            chunkY++
            z -= 16
        }

        const chunk = this.chunks.get(`${chunkX},${chunkY}`)
        if (chunk != null) {
            const chunkBlockX = x
            const chunkBlockZ = z
            return chunk.getBlock(chunkBlockX, y, chunkBlockZ)
        } else {
            return 0
        }
    }

    render(delta) {}
}

export default World
