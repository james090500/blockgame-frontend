import workerpool from 'workerpool'
import { HemisphereLight, Color } from 'three'
import Chunk from './Chunk.js'
import BlockGame from '../BlockGame.js'
import ChunkTerrain from '../workers/ChunkTerrain.js?url&worker'

class World {
    chunks = new Map()
    pool = workerpool.pool(ChunkTerrain, {
        maxWorkers: 1,
        workerOpts: {
            type: import.meta.env.PROD ? undefined : 'module',
        },
    })
    worldSeed = 0

    constructor() {
        // Ambient Light
        this.ambientLight = new HemisphereLight(0xffffff, 0xffffff, 5)
        BlockGame.instance.renderer.sceneManager.add(this.ambientLight)

        BlockGame.instance.renderer.sceneManager.scene.background = new Color(
            0x99ddff
        )
    }

    loadChunks() {
        const playerPos =
            BlockGame.instance.renderer.sceneManager.camera.position

        const playerPosX = Math.floor(playerPos.x / 16)
        const playerPosZ = Math.floor(playerPos.z / 16)

        const worldSize = 8
        const worldSizeSq = worldSize * worldSize

        for (let dx = -worldSize; dx <= worldSize; dx++) {
            for (let dy = -worldSize; dy <= worldSize; dy++) {
                const distSq = dx * dx + dy * dy
                if (distSq > worldSizeSq) continue

                const chunkX = playerPosX + dx
                const chunkY = playerPosZ + dy
                const key = `${chunkX},${chunkY}`

                if (this.chunks.has(key)) continue

                // Create and store new chunk
                const chunk = new Chunk(chunkX, chunkY)
                this.chunks.set(key, chunk)

                const self = this
                this.pool
                    .exec('chunkTerrain', [
                        {
                            seed: this.worldSeed,
                            x: chunkX,
                            y: chunkY,
                            size: chunk.chunkSize,
                            height: chunk.chunkHeight,
                        },
                    ])
                    .then((chunkData) => {
                        chunk.chunkData = chunkData
                    })
                    .catch(function (err) {
                        console.error(err)
                    })
                    .then(function () {
                        // Render new chunks
                        if (!chunk.rendered) {
                            chunk.render(self)
                        }
                        pool.terminate() // terminate all workers when done
                    })

                // Mark adjacent chunks for re-rendering
                for (let d = -1; d <= 1; d++) {
                    for (let e = -1; e <= 1; e++) {
                        if (d === 0 && e === 0) continue
                        const neighborKey = `${chunkX + d},${chunkY + e}`
                        if (this.chunks.has(neighborKey)) {
                            this.chunks.get(neighborKey).rendered = false
                        }
                    }
                }
            }
        }

        // Remove old chunks
        for (const [key, chunk] of this.chunks) {
            const [keyX, keyY] = key.split(',').map(Number)
            if (
                keyX > playerPosX + worldSize ||
                keyX < playerPosX - worldSize ||
                keyY > playerPosZ + worldSize ||
                keyY < playerPosZ - worldSize
            ) {
                chunk.chunkRenderer.dispose()
                this.chunks.delete(key)
            }
        }
    }

    getBlock(x, y, z) {
        const chunkX = Math.floor(x / 16)
        const chunkY = Math.floor(z / 16)

        x = x & 15
        z = z & 15

        return this.getChunkBlock(chunkX, chunkY, x, y, z)
    }

    setBlock(x, y, z, value) {
        const chunkX = Math.floor(x / 16)
        const chunkY = Math.floor(z / 16)

        const localX = x & 15
        const localZ = z & 15

        const chunk = this.chunks.get(`${chunkX},${chunkY}`)
        if (!chunk) return

        chunk.setBlock(localX, y, localZ, value)
        chunk.render(this)

        // Helper function to render adjacent chunks if necessary
        const renderAdjacentChunk = (adjX, adjY) => {
            const adjacentChunk = this.chunks.get(`${adjX},${adjY}`)
            if (adjacentChunk) adjacentChunk.render(this)
        }

        // Check and render adjacent chunks if necessary
        if (localX === 0) renderAdjacentChunk(chunkX - 1, chunkY)
        if (localX === 15) renderAdjacentChunk(chunkX + 1, chunkY)
        if (localZ === 0) renderAdjacentChunk(chunkX, chunkY - 1)
        if (localZ === 15) renderAdjacentChunk(chunkX, chunkY + 1)
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
            const block = chunk.getBlock(chunkBlockX, y, chunkBlockZ)
            return block
        } else {
            return null
        }
    }

    render(delta) {
        this.loadChunks()
    }
}

export default World
