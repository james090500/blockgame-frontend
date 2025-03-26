import Blocks from '../blocks/Blocks.js'
import ChunkRenderer from '../renderer/world/ChunkRenderer.js'

class Chunk {
    rendered = false
    chunkRenderer = new ChunkRenderer()
    chunkX = 0
    chunkY = 0
    chunkSize = 16
    chunkHeight = 300
    chunkData
    chunkWorker

    constructor(chunkX, chunkY) {
        this.chunkX = chunkX
        this.chunkY = chunkY

        this.chunkData = new Uint32Array(
            this.chunkSize * this.chunkSize * this.chunkHeight
        )
    }

    render(world) {
        this.chunkRenderer.dispose()
        this.chunkRenderer.render(world, this)
        this.chunkRenderer.renderTransparent(world, this)
        this.rendered = true
    }

    getIndex(x, y, z) {
        if (
            x < 0 ||
            x > this.chunkSize ||
            y < 0 ||
            y > this.chunkHeight ||
            z < 0 ||
            z > this.chunkSize
        ) {
            return null
        }

        const index =
            y * this.chunkSize * this.chunkSize + z * this.chunkSize + x
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
