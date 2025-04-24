import workerpool from 'workerpool'
import { HemisphereLight, Color } from 'three'
import Chunk from './Chunk.js'
import BlockGame from '../BlockGame.js'
import ChunkTerrain from '../workers/ChunkTerrain.js?url&worker'
import ChunkMesh from '../workers/ChunkMesh.js?url&worker'

class World {
    wireframe = false
    lastPlayerX = null
    lastPlayerZ = null
    chunks = new Map()
    terrainPool = workerpool.pool(ChunkTerrain, {
        maxWorkers: 1,
        workerOpts: {
            type: import.meta.env.PROD ? undefined : 'module',
        },
    })
    chunkMeshPool = workerpool.pool(ChunkMesh, {
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

        // This needs moving I believe to stop infinite loops
        for (const chunk of this.chunks.values()) {
            chunk.maybeRenderChunk(this)
        }

        const playerPosX = Math.floor(playerPos.x / 16)
        const playerPosZ = Math.floor(playerPos.z / 16)

        // Check if player moved
        if (playerPosX == this.lastPlayerX && playerPosZ == this.lastPlayerZ) {
            return
        }

        this.lastPlayerX = playerPosX
        this.lastPlayerZ = playerPosZ

        const worldSize = 1
        const worldSizeSq = worldSize * worldSize

        // Loop through the render distance
        const offsets = []

        for (let dx = -worldSize; dx <= worldSize; dx++) {
            for (let dy = -worldSize; dy <= worldSize; dy++) {
                const distSq = dx * dx + dy * dy
                if (distSq <= worldSizeSq) {
                    offsets.push({ dx, dy, distSq })
                }
            }
        }

        // Sort by distance from center (0,0), so we radiate outward
        offsets.sort((a, b) => a.distSq - b.distSq)

        // Loop through the sorted offsets
        for (const { dx, dy } of offsets) {
            const distSq = dx * dx + dy * dy
            if (distSq > worldSizeSq) continue

            const chunkX = playerPosX + dx
            const chunkY = playerPosZ + dy
            const key = `${chunkX},${chunkY}`

            if (this.chunks.has(key)) continue

            // Create and store new chunk
            const chunk = new Chunk(chunkX, chunkY)
            this.chunks.set(key, chunk)

            // Add chunks to a promise so we render when completed
            this.terrainPool
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
                    chunk.generated = true

                    chunk.maybeRenderChunk(this)
                })
                .catch((err) => {
                    console.error('Error generating chunk:', err)
                })

            // Mark adjacent chunks for re-rendering
            for (let d = -1; d <= 1; d++) {
                for (let e = -1; e <= 1; e++) {
                    if (d === 0 && e === 0) continue
                    const neighborKey = `${chunkX + d},${chunkY + e}`
                    if (this.chunks.has(neighborKey)) {
                        const chunk = this.chunks.get(neighborKey)
                        chunk.rendered = false
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
        const offsetChunkX = Math.floor(x / 16)
        chunkX += offsetChunkX
        x = ((x % 16) + 16) % 16

        // Adjust Z coordinate and chunk
        const offsetChunkY = Math.floor(z / 16)
        chunkY += offsetChunkY
        z = ((z % 16) + 16) % 16

        const chunk = this.chunks.get(`${chunkX},${chunkY}`)
        if (chunk != null && chunk.generated) {
            return chunk.getBlock(x, y, z)
        } else {
            return null
        }
    }

    render(delta) {
        this.loadChunks()

        //Wireframe here tempoarily
        const keys = BlockGame.instance.input.keys
        if (keys.KeyP) {
            keys.KeyP = false
            this.wireframe = !this.wireframe
            for (const chunk of this.chunks.values()) {
                chunk.render(this)
            }
        }
    }
}

export default World
