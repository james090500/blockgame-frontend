import Blocks from '../blocks/Blocks.js'
import ChunkRenderer from '../renderer/world/ChunkRenderer.js'

class Chunk {
    generated = false
    rendered = false
    chunkRenderer = new ChunkRenderer()
    chunkX = 0
    chunkY = 0
    chunkSize = 16
    chunkHeight = 300
    chunkData = null

    constructor(chunkX, chunkY) {
        this.chunkX = chunkX
        this.chunkY = chunkY
    }

    maybeRenderChunk(world) {
        if (this.rendered || this.chunkData == null) return

        const getChunk = (x, y) => world.chunks.get(`${x},${y}`)

        const neighbors = [
            getChunk(this.chunkX + 1, this.chunkY),
            getChunk(this.chunkX - 1, this.chunkY),
            getChunk(this.chunkX, this.chunkY + 1),
            getChunk(this.chunkX, this.chunkY - 1),
        ]

        // Check ifall neighbors are generated, or if they dont exist
        const allReady = neighbors.every((c) => !c || c.generated)

        if (allReady && !this.rendered) {
            this.render(world)
        }
    }

    render(world) {
        this.chunkRenderer.render(world, this)
        this.chunkRenderer.renderTransparent(world, this)
        this.rendered = true
    }

    getIndex(x, y, z) {
        if (
            x < 0 ||
            x >= this.chunkSize ||
            y < 0 ||
            y >= this.chunkHeight ||
            z < 0 ||
            z >= this.chunkSize
        ) {
            return null
        }

        if (this.chunkData == null) {
            throw new Error('Chunk data not populated')
        }

        const index = x + this.chunkSize * (y + this.chunkHeight * z)
        return index
    }

    getXYZ(index) {
        const S = this.chunkSize
        const y = Math.floor(index / (S * S))
        const z = Math.floor((index % (S * S)) / S)
        const x = index % S
        return { x, y, z }
    }

    getBlock(x, y, z) {
        const index = this.getIndex(x, y, z)
        if (index == null) {
            return null
        } else {
            const blockIndex = this.chunkData[index]
            return Blocks.ids[blockIndex]
        }
    }

    setBlock(x, y, z, value) {
        if (y < this.chunkHeight) {
            const index = this.getIndex(x, y, z)
            if (index != null) {
                this.chunkData[index] = value
            }
        }
    }
}

export default Chunk
